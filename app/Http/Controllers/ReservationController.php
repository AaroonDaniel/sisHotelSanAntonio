<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\ReservationDetail;
use App\Models\Guest;
use App\Models\Room;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReservationController extends Controller
{
    public function index()
    {
        $pendingReservations = Reservation::with(['guest', 'details.room.roomType'])
        ->where('status', 'pendiente') // O el estado que uses para "pendiente"
        // ->whereDate('expected_check_in', today()) // Opcional: solo las de hoy
        ->get();
        return Inertia::render('reservations/index', [
            'Reservations' => Reservation::with([
                'guest',
                'details.room.roomType',
                'details.price'
            ])->latest()->get(),

            'Guests' => Guest::all(),

            // Buscamos los estados reales en la BD
            'Rooms' => Room::with(['roomType', 'price'])
                ->whereIn('status', ['LIBRE', 'RESERVADO'])
                ->get(),
            'reservations' => $pendingReservations,
        ]);
    }

    public function store(Request $request)
    {
        // 🔴 1. LOG INICIAL: Imprimimos ABSOLUTAMENTE TODO lo que manda React
        Log::info('=== INICIANDO CREACIÓN DE RESERVA ===');
        Log::info('Datos recibidos desde el Frontend (React):', $request->all());

        // 2. Validación
        try {
            $validatedData = $request->validate([
                'is_new_guest' => 'boolean',
                'guest_id' => 'required_if:is_new_guest,false',
                'new_guest_name' => 'required_if:is_new_guest,true',
                'guest_count' => 'required|integer|min:1',
                'arrival_date' => 'required|date',
                'duration_days' => 'required|integer|min:1',
                'advance_payment' => 'nullable|numeric|min:0',
                'payment_type' => 'required|string',
                'details' => 'required|array|min:1',
                'details.*.room_id' => 'required',
                'details.*.price_id' => 'required',
                'details.*.price' => 'required|numeric',
            ]);
            Log::info('✅ Validación superada con éxito.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Si la validación falla, lo guardamos en el Log y retornamos el error
            Log::error('❌ Falló la validación de los datos:', $e->errors());
            return redirect()->back()->withErrors($e->errors());
        }

        // 3. Inserción en la Base de Datos
        try {
            DB::transaction(function () use ($request) {
                Log::info('Iniciando transacción de Base de Datos...');

                $guestId = $request->guest_id;
                
                // Si es un huésped nuevo, lo creamos primero
                if ($request->is_new_guest) {
                    Log::info('Creando nuevo huésped...');
                    $newGuest = Guest::create([
                        'full_name' => strtoupper($request->new_guest_name),
                        'identification_number' => $request->new_guest_ci ?? null, // Manejo seguro de null
                        'nationality' => 'BOLIVIA',
                        'profile_status' => 'INCOMPLETE',
                    ]);
                    $guestId = $newGuest->id;
                    Log::info("Nuevo huésped creado con ID: {$guestId}");
                }

                // Creamos la Reserva Principal
                Log::info('Creando registro principal de Reserva...');
                $reservation = Reservation::create([
                    'user_id' => Auth::id(),
                    'guest_id' => $guestId,
                    'guest_count' => $request->guest_count,
                    'arrival_date' => $request->arrival_date,
                    'arrival_time' => $request->arrival_time,
                    'duration_days' => $request->duration_days,
                    'advance_payment' => $request->advance_payment ?? 0,
                    'payment_type' => $request->payment_type,
                    'status' => 'pendiente', // ⚠️ OJO: Según tu BD debe ser minúscula
                ]);
                Log::info("Reserva principal creada con ID: {$reservation->id}");

                // Agregamos los detalles (Habitaciones)
                Log::info('Procesando ' . count($request->details) . ' habitaciones...');
                foreach ($request->details as $detail) {
                    ReservationDetail::create([
                        'reservation_id' => $reservation->id,
                        'room_id' => $detail['room_id'],
                        'price_id' => $detail['price_id'],
                        'price' => $detail['price'],
                    ]);
                    
                    // Pasamos la habitación a RESERVADO
                    Room::where('id', $detail['room_id'])->update(['status' => 'RESERVADO']);
                    Log::info("Habitación {$detail['room_id']} apartada y marcada como RESERVADO.");
                }

                // Registramos el pago si dejó algún adelanto
                if ($request->advance_payment > 0) {
                    Log::info("Registrando pago de adelanto por: {$request->advance_payment}");
                    Payment::create([
                        'reservation_id' => $reservation->id,
                        'user_id' => Auth::id(),
                        'amount' => $request->advance_payment,
                        'method' => $request->payment_type,
                        'type' => 'INGRESO',
                        'description' => 'ADELANTO RESERVA #' . $reservation->id
                    ]);
                }
            });

            Log::info('=== CREACIÓN DE RESERVA FINALIZADA CON ÉXITO ===');
            return redirect()->back()->with('success', 'Reserva registrada correctamente');
            
        } catch (\Exception $e) {
            // Si cualquier consulta SQL falla, explotará aquí
            Log::error("❌ Error CRÍTICO en la Base de Datos (store): " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al guardar en la BD: ' . $e->getMessage()]);
        }
    }

    public function update(Request $request, \App\Models\Reservation $reservation)
    {
        $newStatus = $request->status;

        \Illuminate\Support\Facades\Log::info("=== INTENTANDO ACTUALIZAR RESERVA ID: {$reservation->id} ===");
        \Illuminate\Support\Facades\Log::info("Estado recibido: " . $newStatus);

        try {
            // 🚀 AÑADIDO: Array para recolectar los Checkins y armar la "Cola"
            $checkinIds = [];

            \Illuminate\Support\Facades\DB::transaction(function () use ($request, $reservation, $newStatus, &$checkinIds) {

                // Convertimos a mayúsculas para evaluar lo que manda React
                $statusUpper = strtoupper($newStatus);

                // React manda 'cancelado', evaluamos 'CANCELADO'
                if ($statusUpper === 'CANCELADO' || $statusUpper === 'CANCELADA') {
                    
                    // Lo guardamos en la BD tal cual lo exige el ENUM
                    $reservation->update(['status' => 'cancelada']);
                    \Illuminate\Support\Facades\Log::info("✅ Reserva actualizada a 'cancelada' en la BD.");

                    // Liberamos las habitaciones
                    foreach ($reservation->details as $detail) {
                        \App\Models\Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                        \Illuminate\Support\Facades\Log::info("✅ Habitación ID {$detail->room_id} liberada.");
                    }
                }
                // Si en algún momento confirmas, también debes respetar el ENUM ('confirmada')
                elseif ($statusUpper === 'CONFIRMADO' || $statusUpper === 'CONFIRMADA') {
                    
                    $reservation->update(['status' => 'confirmada']); 
                    
                    // ========================================================
                    // 🚨 CREAR EL CHECK-IN AUTOMÁTICAMENTE AL CONFIRMAR 🚨
                    // ========================================================
                    $primerCheckinId = null;

                    foreach ($reservation->details as $index => $detail) {
                        
                        // 🚀 AQUÍ ESTÁ LA NUEVA LÓGICA: Etiquetar las habitaciones secundarias
                        $notaAsignacion = 'Reserva' . $reservation->id;
                        if ($index > 0) {
                            $notaAsignacion .= ' - ADICIONAL'; // Etiqueta clave para que React vacíe el formulario
                        }

                        // Creamos el Checkin en blanco para que el sistema sepa quién está en la habitación
                        $checkin = \App\Models\Checkin::create([
                            'guest_id' => $reservation->guest_id,
                            'room_id'  => $detail->room_id,
                            'user_id'  => \Illuminate\Support\Facades\Auth::id() ?? 1,
                            'check_in_date' => $reservation->arrival_date ?? now(),
                            'actual_arrival_date' => now(),
                            'duration_days' => $reservation->duration_days ?? 1,
                            'advance_payment' => 0, 
                            'origin' => null, // 🚨 ESTO ES CLAVE: Fuerza a React a mostrar "Faltan Datos" (Ámbar)
                            'status' => 'activo',
                            'is_temporary' => false,
                            'notes' => $notaAsignacion, // Guardamos la nota con o sin la etiqueta
                        ]);

                        // 🚀 AÑADIDO: Guardamos el ID del Checkin en nuestra lista de cola
                        $checkinIds[] = $checkin->id;

                        // Guardamos el ID del primer checkin para moverle la plata del adelanto
                        if ($index === 0) {
                            $primerCheckinId = $checkin->id;
                        }

                        // Al confirmar, la habitación pasa a OCUPADO
                        \App\Models\Room::where('id', $detail->room_id)->update(['status' => 'OCUPADO']);
                    }

                    // Trasladar pagos (Adelantos) de la reserva al Check-in
                    if ($primerCheckinId && $reservation->advance_payment > 0) {
                        $pagos = \App\Models\Payment::where('reservation_id', $reservation->id)->get();
                        foreach ($pagos as $pago) {
                            $pago->update([
                                'checkin_id' => $primerCheckinId,
                                'reservation_id' => null 
                            ]);
                        }
                        
                        // Actualizar el saldo visible
                        $totalPagos = $pagos->sum('amount') > 0 ? $pagos->sum('amount') : $reservation->advance_payment;
                        \App\Models\Checkin::where('id', $primerCheckinId)->update(['advance_payment' => $totalPagos]);
                    }
                    // ========================================================
                }
                else {
                    $reservation->update($request->only([
                        'arrival_date',
                        'arrival_time',
                        'guest_count',
                        // Si actualizas otros estados desde otro lado, ten cuidado de mandar las minúsculas exactas
                        'status' 
                    ]));
                }
            });

            \Illuminate\Support\Facades\Log::info("=== PROCESO TERMINADO CON ÉXITO ===");

            // 🚀 AÑADIDO: Si confirmamos la reserva, lo mandamos a la vista de Habitaciones y le pasamos la cola de IDs
            if (strtoupper($newStatus) === 'CONFIRMADO' || strtoupper($newStatus) === 'CONFIRMADA') {
                return redirect()->route('rooms.status')
                    ->with('success', 'Reserva confirmada. Por favor, complete los datos de las habitaciones asignadas.')
                    ->with('auto_open_checkins', $checkinIds); // Pasamos el array invisible a React
            }

            // Si fue otra acción (Cancelar, etc), vuelve a donde estaba
            return redirect()->back()->with('success', 'Reserva actualizada.');
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("❌ ERROR: " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al actualizar: ' . $e->getMessage()]);
        }
    }

    public function destroy(Reservation $reservation)
    {
        try {
            DB::transaction(function () use ($reservation) {
                foreach ($reservation->details as $detail) {
                    // 🚀 CORRECCIÓN: Al eliminar vuelve a LIBRE
                    Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                }
                $reservation->delete();
            });
            return redirect()->back()->with('success', 'Reserva eliminada.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }
}