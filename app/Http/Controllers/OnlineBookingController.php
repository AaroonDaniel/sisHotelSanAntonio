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
        Log::info('=== INICIANDO CREACIÓN DE RESERVA ONLINE CON QR ===');

        Log::info('=== INICIANDO CREACIÓN DE RESERVA ONLINE ===');

        // 👇 AGREGA ESTO TEMPORALMENTE PARA COMPROBAR 👇
        dd([
            'todos_los_datos' => $request->all(),
            'el_archivo_recibido' => $request->file('payment_voucher')
        ]);
        // 1. Validamos lo que viene de React (INCLUYENDO EL COMPROBANTE)
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

            // 👇 NUEVO: Validación del comprobante de pago
            'payment_voucher'    => 'required|file|mimes:jpeg,png,jpg,pdf|max:5120', // Máx 5MB
        ]);

        // =========================================================
        // 🛡️ REGLA ESTRICTA DE CONSOLA: VALIDACIÓN DE CAPACIDAD
        // =========================================================
        $capacidadTotalCarrito = 0;
        $totalPrecioNoche = 0; // Agregamos esto para calcular el total
        foreach ($validated['selectedRooms'] as $room) {
            $capacidadTotalCarrito += $room['capacity'];
            $totalPrecioNoche += $room['price'];
        }

        if ($capacidadTotalCarrito < $validated['guests']) {
            Log::warning("Intento de reserva bloqueado: Capacidad ({$capacidadTotalCarrito}) insuficiente para Huéspedes ({$validated['guests']})");
            return back()->withErrors([
                'error' => 'La capacidad total de las habitaciones seleccionadas no es suficiente para todos los huéspedes.'
            ]);
        }

        // 👇 NUEVO: Guardar la imagen en el disco público
        $voucherPath = null;
        if ($request->hasFile('payment_voucher')) {
            // Se guardará en: storage/app/public/vouchers/...
            $voucherPath = $request->file('payment_voucher')->store('vouchers', 'public');
        }

        try {
            DB::transaction(function () use ($validated, $totalPrecioNoche, $voucherPath) {

                // 2. Gestión del Huésped
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

                // Calcular el total a pagar y el adelanto
                $totalAmount = $totalPrecioNoche * $validated['duration_days'];
                $advanceAmount = $totalAmount * 0.5; // El 50% que cobraste con el QR

                // 3. Crear la Reserva (Cabecera)
                $reservation = Reservation::create([
                    'user_id'       => null,
                    'guest_id'      => $guest->id,
                    'guest_count'   => $validated['guests'],
                    'arrival_date'  => $validated['check_in'],
                    'arrival_time'  => '14:00:00',
                    'duration_days' => $validated['duration_days'],
                    'total_price'   => $totalAmount, // Sugerido guardar el total
                    'advance_payment' => $advanceAmount, // Sugerido guardar cuánto adelantó

                    // 👇 NUEVO: Estado y método de pago
                    'status'        => 'Confirmada', // O 'Pendiente de Verificación' según prefieras
                    'payment_type'  => 'QR',
                    'voucher_path'  => $voucherPath, // <-- Guardamos la ruta de la imagen
                ]);

                // 4. GUARDAR EL CORREO EN LA TABLA PIVOTE
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

                Log::info("✅ Reserva Web QR exitosa. ID Reserva: {$reservation->id} | Email: {$validated['guest_email']}");
            });

            return redirect('/reservar/exito')->with('success', '¡Tu reserva ha sido registrada y tu pago está en validación!');
        } catch (\Exception $e) {
            // Si hay error en la base de datos, borramos la imagen que acabamos de subir para no acumular basura
            if ($voucherPath) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($voucherPath);
            }

            Log::error("❌ Error al guardar reserva web con QR: " . $e->getMessage());
            return back()->withErrors(['error' => 'Ocurrió un error inesperado al procesar tu reserva. Por favor, intenta de nuevo.']);
        }
    }
}
