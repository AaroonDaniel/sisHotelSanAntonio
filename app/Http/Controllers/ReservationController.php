<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\ReservationDetail;
use App\Models\Guest;
use App\Models\Room;
use App\Models\Payment;
use App\Models\Checkin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class ReservationController extends Controller
{

    public function index()
    {
        // 1. Obtenemos TODAS las reservas con toda su información relacionada
        $allReservations = Reservation::with([
            'guest',
            'details.room.roomType',
            'details.requestedRoomType',
            'payments',
            'specialAgreement'
        ])->latest()->get();

        return Inertia::render('reservations/index', [

            // MANTENEMOS TUS NOMBRES ORIGINALES INTACTOS:

            // 1. Con "R" mayúscula (recibe todas las reservas)
            'Reservations' => $allReservations,

            // 2. Con "G" mayúscula
            'Guests' => Guest::all(),

            // 3. Con "R" mayúscula y tu filtro original de estado intacto
            'Rooms' => Room::with(['roomType', 'price'])
                ->whereIn('status', ['LIBRE', 'RESERVADO'])
                ->get(),

            // 4. Con "r" minúscula (antes solo recibía las pendientes, AHORA recibe todas)
            'reservations' => $allReservations,
        ]);
    }

    public function store(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('=== INICIANDO CREACIÓN DE RESERVA ===');

        try {
            $validatedData = $request->validate([
                'is_new_guest' => 'boolean',
                'guest_id' => 'required_if:is_new_guest,false',
                'new_guest_name' => 'required_if:is_new_guest,true',
                'guest_count' => 'required|integer|min:1',
                'arrival_date' => 'required|date|after_or_equal:today',
                'duration_days' => 'required|integer|min:1',

                'payment_type' => 'required|string',
                'qr_bank' => 'nullable|string',
                'advance_payment' => 'nullable|numeric|min:0', // Aseguramos la validación del adelanto

                // --- NUEVOS CAMPOS (y mantenemos los viejos por compatibilidad con React por ahora) ---
                'is_corporate' => 'boolean|nullable',
                'is_delegation' => 'boolean|nullable',
                'type' => 'nullable|string|in:estandar,corporativo,delegacion',
                'agreed_price' => 'nullable|numeric|min:0',
                'corporate_days' => 'nullable|integer',

                'details' => 'required|array|min:1',
                'details.*.room_id' => 'nullable',
                'details.*.requested_room_type_id' => 'nullable',
                'details.*.requested_bathroom' => 'nullable',
                'details.*.price_id' => 'nullable',
                'details.*.price' => 'nullable|numeric',
            ], [
                'arrival_date.after_or_equal' => 'No se aceptan fechas anteriores a la fecha de hoy.',
                'arrival_date.required' => 'Debe indicar la fecha de llegada.',
                'arrival_date.date' => 'La fecha de llegada no es válida.',
                'duration_days.required' => 'Debe indicar la cantidad de noches.',
                'duration_days.min' => 'La estadía debe ser de al menos 1 noche.',
                'details.required' => 'Debe asignar al menos una habitación a la reserva.',
                'details.min' => 'Debe asignar al menos una habitación a la reserva.',
                'guest_id.required_if' => 'Debe seleccionar un huésped.',
                'new_guest_name.required_if' => 'Debe ingresar el nombre del nuevo huésped.',
                'guest_count.min' => 'Debe haber al menos 1 huésped.',
                'payment_type.required' => 'Debe seleccionar un método de pago.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('❌ Falló validación:', $e->errors());
            return redirect()->back()->withErrors($e->errors());
        }

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($request) {
                $guestId = $request->guest_id;

                if ($request->is_new_guest) {
                    $newGuest = \App\Models\Guest::create([
                        'full_name' => strtoupper($request->new_guest_name),
                        'identification_number' => $request->new_guest_ci ?? null,
                        'nationality' => 'BOLIVIA', // Adaptado a mayúsculas como en el resto de tu sistema
                        'profile_status' => 'INCOMPLETE',
                    ]);
                    $guestId = $newGuest->id;
                }

                // =========================================================
                // 🆕 LÓGICA DE ACUERDO ESPECIAL (SPECIAL AGREEMENT)
                // =========================================================
                $typeRequest = $request->input('type');
                $isSpecialDeal = $request->is_corporate || $request->is_delegation || in_array($typeRequest, ['corporativo', 'delegacion']);

                $specialAgreementId = null;

                // ... dentro del método store, en la lógica de SpecialAgreement ...
                if ($isSpecialDeal) {
                    $tipoTrato = $typeRequest ?? ($request->is_delegation ? 'delegacion' : 'corporativo');

                    // Obtener precio base del primer detalle
                    $basePrice = $request->details[0]['price'] ?? 0;

                    // 🌟 LÓGICA DE DESCUENTO AUTOMÁTICO:
                    // Si es corporativo y no mandaron un precio manual, restamos 20 Bs
                    $agreedPrice = $request->input('agreed_price');
                    if ($tipoTrato === 'corporativo' && (!$agreedPrice || $agreedPrice == 0)) {
                        $agreedPrice = max(0, $basePrice - 20);
                    } else {
                        $agreedPrice = $agreedPrice ?? $basePrice;
                    }

                    $corporateDays = (int) $request->input('corporate_days', 1);

                    $agreement = \App\Models\SpecialAgreement::create([
                        'type' => $tipoTrato,
                        'agreed_price' => $agreedPrice,
                        'payment_frequency_days' => $corporateDays,
                    ]);

                    $specialAgreementId = $agreement->id;
                }

                // =========================================================
                // CREACIÓN DE RESERVA
                // =========================================================
                $reservation = \App\Models\Reservation::create([
                    'user_id' => \Illuminate\Support\Facades\Auth::id(),
                    'guest_id' => $guestId,
                    'guest_count' => $request->guest_count,
                    'arrival_date' => $request->arrival_date,
                    'arrival_time' => $request->arrival_time ?? '14:00:00', // Formato de 24 horas mantenido
                    'duration_days' => $request->duration_days,

                    'payment_type' => $request->payment_type,

                    // Conectamos el acuerdo en lugar de usar los booleanos
                    'special_agreement_id' => $specialAgreementId,

                    'status' => 'pendiente',
                ]);

                if (!empty($request->details)) {
                    // 🔒 PREVENCIÓN DE OVERBOOKING POR CONCURRENCIA (RNF-04 / Escenario 3, Tabla 4.23)
                    //
                    // Cuando se asigna una habitación específica al crear la reserva,
                    // existe una carrera potencial entre dos recepcionistas (o entre
                    // recepción y el portal web) reservando la misma habitación para
                    // fechas que se solapen. La validación de disponibilidad previa
                    // (checkAvailability) NO toma lock; entre esa consulta y este INSERT
                    // otra petición puede haberse colado.
                    //
                    // Solución: por cada detalle con habitación específica,
                    //   (1) tomamos lock pesimista sobre la fila de rooms,
                    //   (2) revalidamos cruces de reservas DENTRO del lock,
                    //   (3) recién entonces creamos el detalle.
                    //
                    // Esto cierra el Escenario 3 de la Tabla 4.23: "El sistema impide
                    // el overbooking mediante el control transaccional de PostgreSQL".
                    $arrivalDate   = $request->arrival_date;
                    $durationDays  = (int) $request->duration_days;
                    $departureDate = date('Y-m-d', strtotime("{$arrivalDate} +{$durationDays} days"));

                    foreach ($request->details as $detail) {
                        $roomId = $detail['room_id'] ?? null;

                        if ($roomId) {
                            // (1) Lock pesimista sobre la habitación
                            $room = \App\Models\Room::where('id', $roomId)->lockForUpdate()->first();

                            if (!$room) {
                                throw new \RuntimeException("La habitación #{$roomId} ya no existe.");
                            }

                            // (2) Revalidar cruces de fecha DENTRO del lock
                            $conflicto = \App\Models\ReservationDetail::where('room_id', $roomId)
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
                        }

                        // (3) Insertar el detalle (con o sin habitación específica)
                        \App\Models\ReservationDetail::create([
                            'reservation_id' => $reservation->id,
                            'room_id' => $roomId,
                            'requested_room_type_id' => $detail['requested_room_type_id'] ?? null,
                            'requested_bathroom' => $detail['requested_bathroom'] ?? null,
                            'price_id' => $detail['price_id'] ?? null,
                            'price' => $detail['price'] ?? null,
                        ]);

                        if ($roomId) {
                            \App\Models\Room::where('id', $roomId)->update(['status' => 'RESERVADO']);
                        }
                    }
                }

                // =========================================================
                // --- PAGOS (MODIFICADO PARA MÓDULO 1) ---
                // =========================================================
                if ($request->advance_payment > 0) {
                    // 1. Buscar la caja abierta del usuario activo
                    $cajaAbierta = \App\Models\CashRegister::where('user_id', \Illuminate\Support\Facades\Auth::id())
                        ->where('status', 'ABIERTA')
                        ->first();

                    // 2. Guardar el pago relacionándolo con la caja y la reserva
                    \App\Models\Payment::create([
                        'reservation_id' => $reservation->id,
                        'user_id' => \Illuminate\Support\Facades\Auth::id(),
                        'cash_register_id' => $cajaAbierta ? $cajaAbierta->id : null, // Conexión a la caja para auditoría
                        'amount' => $request->advance_payment,
                        'method' => $request->payment_type,
                        'bank_name' => ($request->payment_type === 'EFECTIVO') ? null : $request->qr_bank,
                        'type' => 'ADELANTO', // Estandarizado a 'ADELANTO' según Módulo 1
                        'payment_date' => now(), // Fecha real exigida
                        // 'description' => 'ADELANTO RESERVA #' . $reservation->id // (Opcional si lo añadiste al modelo Payment)
                    ]);
                }
            });

            return redirect()->back()->with('success', 'Reserva registrada correctamente');
        } catch (\Illuminate\Database\QueryException $e) {
            // Error de base de datos: NO mostramos el SQL al usuario, solo un mensaje interno.
            \Illuminate\Support\Facades\Log::error("❌ Error SQL en reserva: " . $e->getMessage());
            return redirect()->back()->withErrors([
                'error' => 'Ocurrió un error interno al guardar la reserva. Intente nuevamente o contacte al administrador.'
            ]);
        } catch (\Exception $e) {
            // Errores de negocio (ej. habitación ya reservada): estos SÍ son útiles para el usuario.
            \Illuminate\Support\Facades\Log::error("❌ Error en reserva: " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, Reservation $reservation)
    {
        $newStatus = $request->status;
        Log::info("=== ACTUALIZANDO RESERVA {$reservation->id} ===");

        try {
            $checkinIds = [];

            DB::transaction(function () use ($request, $reservation, $newStatus, &$checkinIds) {
                $statusUpper = $newStatus ? strtoupper($newStatus) : strtoupper($reservation->status);

                // --- 1. SI CANCELAN LA RESERVA ---
                if ($statusUpper === 'CANCELADO' || $statusUpper === 'CANCELADA') {
                    $reservation->update([
                        'status' => 'cancelado',
                        'cancellation_date' => now() // ✅ MÓDULO 2: Registra la fecha y hora exacta
                    ]);
                    foreach ($reservation->details as $detail) {
                        if ($detail->room_id) {
                            Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                        }
                    }
                }

                // --- 2. SI CONFIRMAN LLEGADA (CHECK-IN) ---
                elseif ($statusUpper === 'CONFIRMADO' || $statusUpper === 'CONFIRMADA') {

                    // 🛑 VALIDACIÓN PREVIA: ninguna habitación de la reserva puede tener
                    // ya un check-in activo de otro huésped. Si alguna lo tiene, abortamos
                    // TODA la confirmación (no se crea ningún check-in) y avisamos cuál falta reasignar.
                    $habitacionesOcupadas = [];
                    foreach ($reservation->details as $detail) {
                        if (!$detail->room_id) continue;

                        $yaOcupada = Checkin::where('room_id', $detail->room_id)
                            ->where('status', 'activo')
                            ->exists();

                        if ($yaOcupada) {
                            $room = Room::find($detail->room_id);
                            $habitacionesOcupadas[] = $room->number ?? "ID {$detail->room_id}";
                        }
                    }

                    if (!empty($habitacionesOcupadas)) {
                        Log::warning("⛔ Confirmación bloqueada para Reserva #{$reservation->id}. Habitaciones ya ocupadas: " . implode(', ', $habitacionesOcupadas));

                        throw new \Exception(
                            'No se puede confirmar la reserva: la(s) habitación(es) ' .
                                implode(', ', $habitacionesOcupadas) .
                                ' ya están ocupadas por otro huésped. Asigne otra habitación disponible antes de confirmar.'
                        );
                    }

                    $reservation->update(['status' => 'confirmada']);
                    $primerCheckinId = null;
                    Log::info("✅ Reserva confirmada. Creando check-ins para cada habitación asignada... #{$reservation->id}");

                    foreach ($reservation->details as $index => $detail) {
                        if (!$detail->room_id) continue;

                        $notaAsignacion = 'RESERVA #' . $reservation->id . ' - RESERVADO POR: ' . $reservation->guest->full_name;

                        if ($index > 0) {
                            $notaAsignacion .= ' (HABITACIÓN ADICIONAL)';
                        }

                        // ⚠️ CAMBIO CRUCIAL: El checkin hereda el special_agreement_id de la reserva
                        $checkin = Checkin::create([
                            'guest_id' => $reservation->guest_id,
                            'room_id'  => $detail->room_id,
                            'user_id'  => Auth::id() ?? 1,
                            'check_in_date' => $reservation->arrival_date ?? now(),
                            'actual_arrival_date' => now(),
                            'duration_days' => $reservation->duration_days ?? 1,

                            'origin' => null,
                            'status' => 'activo',
                            'is_temporary' => true,
                            'notes' => $notaAsignacion,
                            'agreed_price' => $detail->price ?? 0,
                            // Enlazar el acuerdo financiero y omitir la columna vieja 'agreed_price'
                            'special_agreement_id' => $reservation->special_agreement_id,
                        ]);

                        Log::info("Check-in Temporal creado (ID: {$checkin->id}) para la Habitación ID: {$detail->room_id}.");
                        $checkinIds[] = $checkin->id;
                        if ($index === 0) {
                            $primerCheckinId = $checkin->id;
                        }

                        Room::where('id', $detail->room_id)->update(['status' => 'OCUPADO']);
                    }

                    $pagos = Payment::where('reservation_id', $reservation->id)->get();

                    if ($primerCheckinId && $pagos->isNotEmpty()) {
                        foreach ($pagos as $pago) {
                            $pago->update([
                                'checkin_id'     => $primerCheckinId,
                                'reservation_id' => null,
                            ]);
                        }

                        $totalPagos = $pagos->sum('amount');

                        Log::info("Adelanto de Bs {$totalPagos} transferido al Check-in Principal ID: {$primerCheckinId}.");
                    }
                }

                // --- 3. SI SOLO ESTÁN EDITANDO DATOS DE LA RESERVA (FASE 1) ---
                else {
                    // Evaluamos los cambios en el trato especial
                    $typeRequest = $request->input('type');
                    $isSpecialGroupNow = $request->boolean('is_corporate') || $request->boolean('is_delegation') || in_array($typeRequest, ['corporativo', 'delegacion']);
                    $tipoTratoNuevo = $typeRequest ?? ($request->boolean('is_delegation') ? 'delegacion' : 'corporativo');
                    $frecuenciaDias = (int) $request->input('corporate_days', 0);
                    $agreedPrice = $request->input('agreed_price', 0);

                    $hadSpecialAgreement = !is_null($reservation->special_agreement_id);

                    if (!$hadSpecialAgreement && $isSpecialGroupNow) {
                        // De Estandar a Especial
                        $agreement = \App\Models\SpecialAgreement::create([
                            'type' => $tipoTratoNuevo,
                            'agreed_price' => $agreedPrice,
                            'payment_frequency_days' => $frecuenciaDias,
                        ]);
                        $reservation->special_agreement_id = $agreement->id;
                    } elseif ($hadSpecialAgreement && !$isSpecialGroupNow) {
                        // De Especial a Estandar (Pierde el privilegio)
                        $oldAgreementId = $reservation->special_agreement_id;
                        $reservation->special_agreement_id = null;
                        \App\Models\SpecialAgreement::where('id', $oldAgreementId)->delete();
                    } elseif ($hadSpecialAgreement && $isSpecialGroupNow) {
                        // Sigue siendo Especial, actualizamos datos por si cambiaron el precio en la edicion
                        $reservation->specialAgreement->update([
                            'type' => $tipoTratoNuevo,
                            'agreed_price' => $agreedPrice,
                            'payment_frequency_days' => $frecuenciaDias,
                        ]);
                    }

                    // Actualizamos los datos base de la reserva omitiendo is_corporate/is_delegation
                    $reservation->update([
                        'arrival_date' => $request->arrival_date ?? $reservation->arrival_date,
                        'arrival_time' => $request->arrival_time ?? $reservation->arrival_time,
                        'duration_days' => $request->duration_days ?? $reservation->duration_days,
                        'guest_count' => $request->guest_count ?? $reservation->guest_count,
                        'advance_payment' => $request->advance_payment ?? $reservation->advance_payment,
                        'payment_type' => $request->payment_type ?? $reservation->payment_type,
                        'special_agreement_id' => $reservation->special_agreement_id,
                        'status' => 'pendiente' // Forzamos pendiente porque se acaba de editar
                    ]);

                    // Sincronizamos las Habitaciones (Detalles)
                    if ($request->has('details')) {
                        $detailIdsToKeep = [];

                        foreach ($request->details as $detailData) {
                            if (isset($detailData['id'])) {
                                // A. Actualizar cuarto existente
                                $detail = ReservationDetail::find($detailData['id']);
                                if ($detail) {
                                    $detail->update([
                                        'room_id' => $detailData['room_id'] ?? null,
                                        'price_id' => $detailData['price_id'] ?? null,
                                        'price' => $detailData['price'] ?? 0,
                                        'requested_room_type_id' => $detailData['requested_room_type_id'] ?? null,
                                        'requested_bathroom' => $detailData['requested_bathroom'] ?? null,
                                    ]);
                                    $detailIdsToKeep[] = $detail->id;
                                }
                            } else {
                                // B. Insertar nuevo cuarto a la reserva
                                $newDetail = ReservationDetail::create([
                                    'reservation_id' => $reservation->id,
                                    'room_id' => $detailData['room_id'] ?? null,
                                    'price_id' => $detailData['price_id'] ?? null,
                                    'price' => $detailData['price'] ?? 0,
                                    'requested_room_type_id' => $detailData['requested_room_type_id'] ?? null,
                                    'requested_bathroom' => $detailData['requested_bathroom'] ?? null,
                                ]);
                                $detailIdsToKeep[] = $newDetail->id;

                                if (isset($detailData['room_id'])) {
                                    Room::where('id', $detailData['room_id'])->update(['status' => 'RESERVADO']);
                                }
                            }
                        }

                        // C. Borrar los cuartos que el usuario eliminó en la interfaz (Trash2)
                        $detailsToDelete = ReservationDetail::where('reservation_id', $reservation->id)
                            ->whereNotIn('id', $detailIdsToKeep)
                            ->get();

                        foreach ($detailsToDelete as $det) {
                            if ($det->room_id) {
                                Room::where('id', $det->room_id)->update(['status' => 'LIBRE']);
                            }
                            $det->delete();
                        }
                    }
                }
            });

            // Si fue confirmada, redirigir a status de habitaciones
            if ($newStatus && (strtoupper($newStatus) === 'CONFIRMADO' || strtoupper($newStatus) === 'CONFIRMADA')) {
                return redirect()->route('rooms.status')
                    ->with('success', 'Llegada confirmada. Por favor, complete los datos de las habitaciones.')
                    ->with('auto_open_checkins', $checkinIds);
            }

            return redirect()->back()->with('success', 'Reserva actualizada y sincronizada correctamente.');
        } catch (\Exception $e) {
            Log::error("❌ ERROR ACTUALIZANDO RESERVA: " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }

    public function destroy(Reservation $reservation)
    {
        try {
            DB::transaction(function () use ($reservation) {
                foreach ($reservation->details as $detail) {
                    if ($detail->room_id) {
                        Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                    }
                }
                $reservation->delete();
            });
            return redirect()->back()->with('success', 'Reserva eliminada.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }

    public function assignRooms(Request $request, $id)
{
    $request->validate([
        'assignments' => 'required|array',
        'assignments.*.detail_id' => 'required|exists:reservation_details,id',
        'assignments.*.room_id' => 'required|exists:rooms,id',
        'assignments.*.price' => 'nullable|numeric|min:0', // 👈 NUEVO
    ]);

    DB::transaction(function () use ($request) {
        foreach ($request->assignments as $assignment) {
            $detail = \App\Models\ReservationDetail::find($assignment['detail_id']);

            // Resguardo del punto 1: no asignar sobre habitación ya ocupada
            $ocupada = Checkin::where('room_id', $assignment['room_id'])
                ->where('status', 'activo')
                ->exists();
            if ($ocupada) {
                $room = Room::find($assignment['room_id']);
                throw new \Exception("La habitación {$room->number} ya está ocupada. Elija otra.");
            }

            if ($detail->room_id && $detail->room_id != $assignment['room_id']) {
                Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
            }

            $detail->room_id = $assignment['room_id'];

            // 👇 NUEVO: se guarda el precio real calculado en el frontend (90/60/50 si es Delegación)
            if (isset($assignment['price'])) {
                $detail->price = $assignment['price'];
            }

            $detail->save();

            Room::where('id', $assignment['room_id'])->update(['status' => 'RESERVADO']);
        }
    });

    return back()->with('success', 'Habitaciones asignadas correctamente y bloqueadas en el sistema.');
}

    public function reception()
    {
        // 1. Obtenemos la fecha actual exacta en la zona horaria de Bolivia
        $today = Carbon::now('America/La_Paz')->format('Y-m-d');

        $reservations = Reservation::with([
            'guest',
            'details.room.roomType',
            'details.requestedRoomType',
            'payments',
            'specialAgreement'
        ])
            ->whereIn('status', ['pendiente'])
            // 👇 2. NUEVO FILTRO: Solo trae reservas cuya fecha de llegada sea HOY o en el futuro
            ->where('arrival_date', '>=', $today)
            ->orderBy('arrival_date', 'asc')
            ->get();


        $guests = Guest::all();

        // 👇 AQUÍ ESTÁ EL CAMBIO: Agregamos 'price' a la lista 👇
        $rooms = Room::with(['roomType', 'floor', 'price'])->get();

        return Inertia::render('reservations/viewReservationModal', [
            'reservations' => $reservations,
            'guests' => $guests,
            'rooms' => $rooms
        ]);
    }

    public function checkAvailability(Request $request)
    {
        $request->validate(['arrival_date' => 'required|date']);
        $targetDate = Carbon::parse($request->arrival_date)->startOfDay();

        $rooms = Room::with('roomType')->whereNotIn('status', ['MANTENIMIENTO', 'INHABILITADO'])->get();
        $availableRooms = [];
        $freeingUpRooms = [];

        foreach ($rooms as $room) {
            if ($room->status === 'LIBRE') {
                $availableRooms[] = $room;
            } elseif ($room->status === 'OCUPADO' || $room->status === 'RESERVADO') {
                $activeCheckin = Checkin::where('room_id', $room->id)
                    ->where('status', 'activo')
                    ->latest()
                    ->first();

                if ($activeCheckin) {
                    $startDate = $activeCheckin->actual_arrival_date ?? $activeCheckin->check_in_date;
                    $expectedCheckout = Carbon::parse($startDate)
                        ->addDays($activeCheckin->duration_days)
                        ->startOfDay();

                    if ($expectedCheckout->lte($targetDate)) {
                        $freeingUpRooms[] = $room;
                        $availableRooms[] = $room;
                    }
                }
            }
        }

        return response()->json([
            'target_date' => $targetDate->format('Y-m-d'),
            'total_available' => count($availableRooms),
            'currently_free' => count($availableRooms) - count($freeingUpRooms),
            'will_be_freed' => count($freeingUpRooms),
        ]);
    }
}
