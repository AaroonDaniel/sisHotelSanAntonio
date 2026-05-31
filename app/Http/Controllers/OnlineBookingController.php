<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomType;
use App\Models\Reservation;
use App\Models\Guest;
use App\Models\User;
use App\Models\ReservationDetail;
use App\Models\Payment;
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
                                    ->whereIn('status', ['pendiente', 'confirmada']);
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
                                    ->whereIn('status', ['pendiente', 'confirmada']);
                            });
                        });
                })
                ->get();

            // 3. FORMATEO ANTI-ERRORES PARA REACT
            $availableRoomTypes = $availableRoomTypes->map(function ($type) {
                // Imagen representativa del tipo: tomamos la imagen de la PRIMERA
                // habitación disponible que tenga image_path. Si ninguna tiene,
                // el frontend mostrará el placeholder "Sin Imagen".
                //
                // Las rutas se guardan como "rooms/abc.jpg" en image_path, así que
                // las publicamos a través del symlink storage→public con asset().
                $firstWithImage = $type->rooms->first(function ($room) {
                    return !empty($room->image_path);
                });
                $imageUrl = $firstWithImage
                    ? asset('storage/' . ltrim($firstWithImage->image_path, '/'))
                    : null;

                return [
                    'id' => $type->id,
                    'name' => $type->name,
                    'image' => $imageUrl,

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

       $validated = $request->validate([
            'full_name'             => 'required|string|max:255',
            'identification_number' => 'required|string|max:50',
            'issued_in'             => 'required|string|max:20',
            'nationality'           => 'required|string|max:100',
            'civil_status'          => 'required|string|max:50',
            'birth_date'            => 'required|date',
            'profession'            => 'required|string|max:100',
            'phone'                 => 'required|string|max:20',
            'guest_email'           => 'required|email|max:255',
            'check_in'           => 'required|date',
            'duration_days'      => 'required|integer|min:1',
            'guests'             => 'required|integer|min:1',
            'selectedRooms'                  => 'required|array|min:1',
            'selectedRooms.*.id'             => 'required|exists:rooms,id',
            'selectedRooms.*.capacity'       => 'required|integer',
            'selectedRooms.*.price'          => 'required|numeric',
            'selectedRooms.*.price_id'       => 'nullable|exists:prices,id',
            'selectedRooms.*.room_type_id'   => 'nullable|exists:room_types,id',
            'payment_voucher'    => 'required|file|mimes:jpeg,png,jpg,pdf|max:5120', 
        ]);

        $capacidadTotalCarrito = 0;
        $totalPrecioNoche = 0; 
        foreach ($validated['selectedRooms'] as $room) {
            $capacidadTotalCarrito += $room['capacity'];
            $totalPrecioNoche += $room['price'];
        }

        if ($capacidadTotalCarrito < $validated['guests']) {
            Log::warning("Intento de reserva bloqueado: Capacidad insuficiente.");
            return back()->withErrors(['error' => 'La capacidad total no es suficiente para todos los huéspedes.']);
        }

        $voucherPath = null;
        if ($request->hasFile('payment_voucher')) {
            // Intentamos guardar la imagen
            $voucherPath = $request->file('payment_voucher')->store('vouchers', 'public');
            
            // 👇 SI LA CARPETA NO TIENE PERMISOS, DETENEMOS TODO 👇
            if (!$voucherPath) {
                return back()->withErrors(['error' => 'El servidor falló al guardar la imagen. Revisa los permisos de la carpeta storage/app/public.']);
            }
        } else {
            return back()->withErrors(['error' => 'El archivo nunca llegó al servidor backend.']);
        }

        try {
            // 👇 Necesitamos extraer el ID de la reserva fuera de la transacción 👇
            $reservationId = DB::transaction(function () use ($validated, $totalPrecioNoche, $voucherPath) {

                $guest = Guest::updateOrCreate(
                    ['identification_number' => $validated['identification_number']],
                    [
                        'full_name'      => $validated['full_name'],
                        'issued_in'      => $validated['issued_in'],
                        'nationality'    => $validated['nationality'],
                        'civil_status'   => $validated['civil_status'], // Llegará "SINGLE", "MARRIED", etc.
                        'birth_date'     => $validated['birth_date'],
                        'profession'     => $validated['profession'],
                        'phone'          => $validated['phone'],
                        'profile_status' => 'INCOMPLETE'
                    ]
                );

                $totalAmount = $totalPrecioNoche * $validated['duration_days'];
                // Pago anticipado: 20% del total. Política del Hotel San Antonio:
                // el usuario debe abonar al menos el 20% para que la reserva quede
                // formalizada. Este valor se muestra al usuario en paymentSummary.tsx
                // antes de confirmar la transferencia/QR.
                $advanceAmount = $totalAmount * 0.2;

                // 3. Crear la Reserva
                $reservation = Reservation::create([
                    'user_id'       => User::where('nickname', 'sistema_web')->value('id'),
                    'guest_id'      => $guest->id,
                    'guest_count'   => $validated['guests'],
                    'arrival_date'  => $validated['check_in'],
                    'arrival_time'  => '14:00:00',
                    'duration_days' => $validated['duration_days'],
                    
                    // Asegúrate de que tu migración soporte estos campos, o ponlos en Payment
                    // 'total_price'   => $totalAmount, 
                    // 'advance_payment' => $advanceAmount, 
                    
                    'status'        => 'pendiente', // 👈 ESTO ES CLAVE para que vaya a la Tabla 3
                    'payment_type'  => 'QR',
                ]);

                // 4. Guardar correo
                \App\Models\ReservationGuest::create([
                    'reservation_id' => $reservation->id,
                    'guest_id'       => $guest->id,
                    'email'          => $validated['guest_email'],
                ]);

                // 5. Crear Detalles de Habitación
                //
                // 🔒 PREVENCIÓN DE OVERBOOKING POR CONCURRENCIA (RNF-04 / Escenario 3, Tabla 4.23)
                //
                // El listado de habitaciones del portal pasó por una validación previa
                // (whereDoesntHave en index()), pero ese chequeo se hizo SIN lock. Entre
                // ese momento y este punto, otro usuario pudo haber reservado la misma
                // habitación para fechas que se cruzan. La validación funcional sola NO
                // basta — hay una carrera entre la consulta de disponibilidad y el INSERT.
                //
                // Solución: por cada habitación seleccionada,
                //   (1) tomamos un lock pesimista sobre la fila de la habitación,
                //   (2) revalidamos cruces de reservas DENTRO del lock,
                //   (3) recién entonces creamos el detalle.
                // Si la revalidación falla, abortamos la transacción y todo se revierte.
                //
                // Esto materializa la afirmación del Escenario 3 de la Tabla 4.23:
                // "El sistema impide el overbooking mediante el control transaccional de PostgreSQL"
                $arrivalDate     = $validated['check_in'];
                $durationDays    = (int) $validated['duration_days'];
                $departureDate   = date('Y-m-d', strtotime("{$arrivalDate} +{$durationDays} days"));

                foreach ($validated['selectedRooms'] as $roomData) {
                    $roomId = $roomData['id'];

                    // (1) Lock pesimista: bloquea esta fila de rooms hasta que la
                    //     transacción termine. Cualquier otra petición concurrente
                    //     que intente lo mismo queda en espera aquí.
                    $room = Room::where('id', $roomId)->lockForUpdate()->first();

                    if (!$room) {
                        throw new \RuntimeException("La habitación #{$roomId} ya no existe.");
                    }

                    // (2) Revalidar cruces de fechas DENTRO del lock.
                    //     Misma fórmula PostgreSQL usada en index() para detectar
                    //     reservas activas que se solapen con el rango solicitado.
                    $conflicto = ReservationDetail::where('room_id', $roomId)
                        ->whereHas('reservation', function ($q) use ($arrivalDate, $departureDate) {
                            $q->where('arrival_date', '<', $departureDate)
                              ->whereRaw("arrival_date + (duration_days * INTERVAL '1 day') > ?", [$arrivalDate])
                              ->whereIn('status', ['pendiente', 'confirmada']);
                        })
                        ->exists();

                    if ($conflicto) {
                        throw new \RuntimeException(
                            "La habitación #{$room->number} ya fue reservada para las fechas seleccionadas."
                        );
                    }

                    // (3) Insertar el detalle y actualizar el estado de la habitación.
                    ReservationDetail::create([
                        'reservation_id'         => $reservation->id,
                        'room_id'                => $roomId,
                        'price_id'               => $roomData['price_id'] ?? null,
                        'price'                  => $roomData['price'],
                        'requested_room_type_id' => $roomData['room_type_id'] ?? null,
                    ]);
                    Room::where('id', $roomId)->update(['status' => 'RESERVADO']);
                }

               // 👇 6. REGISTRAMOS EL PAGO (Campo por campo para evitar bloqueos de seguridad) 👇
                $payment = new Payment();
                $payment->user_id = User::where('nickname', 'sistema_web')->value('id'); // Usuario del sistema web
                $payment->reservation_id = $reservation->id;
                $payment->amount = $advanceAmount;
                $payment->method = 'Transferencia';
                $payment->voucher_path = $voucherPath;
                $payment->type = 'ingreso';
                $payment->status = 'PENDIENTE_VERIFICACION';
                
                // Guardamos el registro en la base de datos
                $payment->save();

                Log::info("✅ Reserva Web QR exitosa. ID Reserva: {$reservation->id}");
                
                return $reservation->id; // Retornamos el ID
            });

            // 👇 REDIRIGIMOS AL NUEVO CONTROLADOR DEL RECIBO 👇
            return redirect('/reservar/recibo/' . $reservationId);

        } catch (\Exception $e) {
            if ($voucherPath) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($voucherPath);
            }
            Log::error("❌ Error al guardar reserva web con QR: " . $e->getMessage());
           return back()->withErrors(['error' => 'Error SQL: ' . $e->getMessage()]);
        }
    }

    public function showReceipt($id) {
        $reservation = Reservation::with([
            'guest', 
            'details.room.roomType', 
            'reservationGuests', 
            'payments'
        ])->findOrFail($id);

        return Inertia::render('booking/Receipt', [
            'reservation' => $reservation
        ]);
    }
}