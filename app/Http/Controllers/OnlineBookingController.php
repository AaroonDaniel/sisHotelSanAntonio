<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomType;
use App\Models\Reservation;
use App\Models\Guest;
use App\Models\ReservationDetail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class OnlineBookingController extends Controller
{
    /**
     * Muestra la vista principal de la SPA pública de reservas.
     */
    public function index(Request $request)
    {
        // 1. Validar los datos de entrada
        $validated = $request->validate([
            'check_in' => 'nullable|date|after_or_equal:today',
            'check_out' => 'nullable|date|after:check_in',
            'guests' => 'nullable|integer|min:1|max:10',
        ]);

        $checkin = $validated['check_in'] ?? null;
        $checkout = $validated['check_out'] ?? null;
        $guests = $validated['guests'] ?? 1;
        
        // Calculamos los días de duración automáticamente para mandarlos a React
        $durationDays = 1;
        if ($checkin && $checkout) {
            $durationDays = Carbon::parse($checkin)->diffInDays(Carbon::parse($checkout));
            if ($durationDays === 0) $durationDays = 1; // Mínimo 1 noche
        }

        $availableRoomTypes = collect();

        // 2. Si hay fechas, el motor busca disponibilidad agrupada por Tipo de Habitación
        if ($checkin && $checkout) {

            Log::info("Buscando disponibilidad Online: CheckIn: {$checkin} | CheckOut: {$checkout} | Huéspedes: {$guests}");

            // Buscamos TODOS los Tipos de Habitación activos
            $availableRoomTypes = RoomType::where('is_active', true)
                ->with(['rooms' => function ($query) use ($checkin, $checkout) {

                    // Solo traemos las habitaciones físicas que NO estén ocupadas ni en mantenimiento
                    $query->where('status', '!=', 'MANTENIMIENTO')

                        // Excluimos las que tienen reservas cruzadas (Sintaxis PostgreSQL)
                        ->whereDoesntHave('reservationDetails', function ($q) use ($checkin, $checkout) {
                            $q->whereHas('reservation', function ($resQ) use ($checkin, $checkout) {
                                $resQ->where('arrival_date', '<', $checkout)
                                    ->whereRaw("arrival_date + (duration_days * INTERVAL '1 day') > ?", [$checkin])
                                    ->whereIn('status', ['Pendiente', 'Confirmada']);
                            });
                        })
                        // Traemos el precio relacionado
                        ->with('price');
                }])
                // Filtramos Tipos de Habitación que tengan al menos UNA habitación libre
                ->whereHas('rooms', function ($query) use ($checkin, $checkout) {
                    $query->where('status', '!=', 'MANTENIMIENTO')
                        ->whereDoesntHave('reservationDetails', function ($q) use ($checkin, $checkout) {
                            $q->whereHas('reservation', function ($resQ) use ($checkin, $checkout) {
                                $resQ->where('arrival_date', '<', $checkout)
                                    ->whereRaw("arrival_date + (duration_days * INTERVAL '1 day') > ?", [$checkin])
                                    ->whereIn('status', ['Pendiente', 'Confirmada']);
                            });
                        });
                })
                ->get();

            // 3. FORMATEO ANTI-ERRORES PARA REACT
            $availableRoomTypes = $availableRoomTypes->map(function ($type) {
                return [
                    'id' => $type->id,
                    'name' => $type->name,
                    'image' => null,
                    
                    'rooms' => $type->rooms->map(function ($room) use ($type) {
                        
                        // Extraemos el objeto precio
                        $precioObj = $room->price;
                        
                        // 👇 BUSCAMOS EL BAÑO PRIMERO EN EL PRECIO (private/shared)
                        $tipoBano = $precioObj->bathroom_type ?? $precioObj->bath ?? $room->bathroom_type ?? $type->bathroom_type ?? 'private';
                        
                        // Extraemos el valor del precio
                        $montoPrecio = $precioObj ? ($precioObj->price ?? $precioObj->amount ?? $precioObj->monto ?? 0) : 0;

                        return [
                            'id' => $room->id,
                            'name' => 'Habitación ' . ($room->number ?? $room->id),
                            'capacity' => $type->capacity ?? $room->capacity ?? 2,
                            'bath' => $tipoBano, // 👈 ESTO ES LO QUE HACE FUNCIONAR EL FILTRO EN REACT
                            'price' => $montoPrecio,
                            'price_id' => $precioObj ? $precioObj->id : null,
                            'room_type_id' => $type->id
                        ];
                    })->values()->toArray() // 👈 IMPORTANTE: ->toArray() para evitar problemas en React
                ];
            })->filter(function ($type) {
                // Filtro de seguridad: Quitar tipos de habitación que terminaron con 0 cuartos
                return count($type['rooms']) > 0;
            })->values()->toArray(); // 👈 IMPORTANTE: ->toArray() aquí también

            Log::info("Se encontraron " . count($availableRoomTypes) . " tipos de habitaciones válidas.");

            
        }

        // 4. Enviamos a la vista de React
        return Inertia::render('booking/index', [
        'availableRoomTypes' => $availableRoomTypes, // Lo enviamos directo a la raíz
        'filters' => [
            'check_in' => $checkin,
            'check_out' => $checkout,
            'duration_days' => $durationDays,
            'guests' => (int) $guests,
        ]
    ]);
    }

    /**
     * Procesa y guarda la reserva que viene de la web (React)
     */
    public function store(Request $request)
    {
        Log::info('=== INICIANDO CREACIÓN DE RESERVA ONLINE ===');

        // 1. Validamos lo que viene de React (ACTUALIZADO CON LOS NUEVOS CAMPOS)
        $validated = $request->validate([
            // Datos físicos del Huésped (Guest)
            'guest_name'         => 'required|string|max:255',
            'guest_ci'           => 'required|string|max:50',
            'guest_nationality'  => 'nullable|string|max:100',
            'guest_civil_status' => 'nullable|string|max:50',
            'guest_profession'   => 'nullable|string|max:100',
            'guest_phone'        => 'required|string|max:20', 
            
            // Dato exclusivo de contacto online (ReservationGuest)
            'guest_email'        => 'required|email|max:255',
            
            // Datos de la Reserva
            'check_in'           => 'required|date',
            'duration_days'      => 'required|integer|min:1',
            'guests'             => 'required|integer|min:1',
            
            // Datos del carrito de habitaciones
            'selectedRooms'                  => 'required|array|min:1',
            'selectedRooms.*.id'             => 'required|exists:rooms,id',
            'selectedRooms.*.capacity'       => 'required|integer',
            'selectedRooms.*.price'          => 'required|numeric',
            'selectedRooms.*.price_id'       => 'nullable|exists:prices,id',
            'selectedRooms.*.room_type_id'   => 'nullable|exists:room_types,id',
        ]);

        // =========================================================
        // 🛡️ REGLA ESTRICTA DE CONSOLA: VALIDACIÓN DE CAPACIDAD
        // =========================================================
        $capacidadTotalCarrito = 0;
        foreach ($validated['selectedRooms'] as $room) {
            $capacidadTotalCarrito += $room['capacity'];
        }

        if ($capacidadTotalCarrito < $validated['guests']) {
            Log::warning("Intento de reserva bloqueado: Capacidad ({$capacidadTotalCarrito}) insuficiente para Huéspedes ({$validated['guests']})");
            return back()->withErrors([
                'error' => 'La capacidad total de las habitaciones seleccionadas no es suficiente para todos los huéspedes.'
            ]);
        }

        try {
            DB::transaction(function () use ($validated) {

                // 2. Gestión del Huésped (ACTUALIZADO PARA GUARDAR TELÉFONO Y DATOS COMPLETOS)
                // Usamos updateOrCreate para no duplicar clientes si ya existen por su CI
                $guest = Guest::updateOrCreate(
                    ['identification_number' => $validated['guest_ci']],
                    [
                        'full_name'    => strtoupper($validated['guest_name']),
                        'nationality'  => strtoupper($validated['guest_nationality'] ?? 'BOLIVIA'),
                        'civil_status' => strtoupper($validated['guest_civil_status'] ?? 'SOLTERO'),
                        'profession'   => strtoupper($validated['guest_profession'] ?? 'NO ESPECIFICADO'),
                        'phone'        => $validated['guest_phone'],
                        'profile_status' => 'INCOMPLETE'
                    ]
                );

                // 3. Crear la Reserva (Cabecera)
                $reservation = Reservation::create([
                    'user_id'       => null, 
                    'guest_id'      => $guest->id,
                    'guest_count'   => $validated['guests'],
                    'arrival_date'  => $validated['check_in'],
                    'arrival_time'  => '14:00:00', 
                    'duration_days' => $validated['duration_days'],
                    'status'        => 'pendiente', 
                    'payment_type'  => 'EFECTIVO', 
                ]);

                // 👇 4. NUEVO: GUARDAR EL CORREO EN LA TABLA PIVOTE 👇
                \App\Models\ReservationGuest::create([
                    'reservation_id' => $reservation->id,
                    'guest_id'       => $guest->id,
                    'email'          => $validated['guest_email'],
                ]);

                // 5. Crear los Detalles (Las habitaciones asignadas)
                foreach ($validated['selectedRooms'] as $roomData) {
                    ReservationDetail::create([
                        'reservation_id'         => $reservation->id,
                        'room_id'                => $roomData['id'],
                        'price_id'               => $roomData['price_id'] ?? null,
                        'price'                  => $roomData['price'],
                        'requested_room_type_id' => $roomData['room_type_id'] ?? null,
                    ]);

                    // Bloqueamos físicamente la habitación
                    Room::where('id', $roomData['id'])->update(['status' => 'RESERVADO']);
                }

                Log::info("✅ Reserva Web exitosa. ID Reserva: {$reservation->id} | Email: {$validated['guest_email']}");
            });

            // Redirección SIN ZIGGY usando redirect() directo a la URL
            return redirect('/reservar/exito')->with('success', '¡Tu reserva ha sido registrada con éxito!');

        } catch (\Exception $e) {
            Log::error("❌ Error al guardar reserva web: " . $e->getMessage());
            return back()->withErrors(['error' => 'Ocurrió un error inesperado al procesar tu reserva. Por favor, intenta de nuevo.']);
        }
    }
}