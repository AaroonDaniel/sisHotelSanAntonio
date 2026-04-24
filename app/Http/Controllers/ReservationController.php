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
        $pendingReservations = Reservation::with(['guest', 'details.room.roomType'])
            ->where('status', 'pendiente')
            ->get();

        return Inertia::render('reservations/index', [
            // 👇 AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL 👇
            'Reservations' => Reservation::with([
                'guest',
                'details.room.roomType',
                'details.requestedRoomType' // 👈 Cambiamos details.price por requestedRoomType
            ])->latest()->get(),

            'Guests' => Guest::all(),

            'Rooms' => Room::with(['roomType', 'price'])
                ->whereIn('status', ['LIBRE', 'RESERVADO'])
                ->get(),
            'reservations' => $pendingReservations,
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
                'arrival_date' => 'required|date',
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

                if ($isSpecialDeal) {
                    $tipoTrato = $typeRequest ?? ($request->is_delegation ? 'delegacion' : 'corporativo');
                    // Si el front manda el precio total del acuerdo, lo usamos; si no, asumimos el del primer detalle o 0.
                    $agreedPrice = $request->input('agreed_price', $request->details[0]['price'] ?? 0);
                    $corporateDays = (int) $request->input('corporate_days', 0);

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
                    foreach ($request->details as $detail) {
                        $roomId = $detail['room_id'] ?? null;

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
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("❌ Error en BD: " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al guardar: ' . $e->getMessage()]);
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
                    $reservation->update(['status' => 'cancelada']);
                    foreach ($reservation->details as $detail) {
                        if ($detail->room_id) {
                            Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                        }
                    }
                }

                // --- 2. SI CONFIRMAN LLEGADA (CHECK-IN) ---
                elseif ($statusUpper === 'CONFIRMADO' || $statusUpper === 'CONFIRMADA') {
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
                            'advance_payment' => 0,
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

                    if ($primerCheckinId && $reservation->advance_payment > 0) {
                        $pagos = Payment::where('reservation_id', $reservation->id)->get();
                        foreach ($pagos as $pago) {
                            $pago->update([
                                'checkin_id' => $primerCheckinId,
                                'reservation_id' => null
                            ]);
                        }

                        $totalPagos = $pagos->sum('amount') > 0 ? $pagos->sum('amount') : $reservation->advance_payment;
                        Checkin::where('id', $primerCheckinId)->update(['advance_payment' => $totalPagos]);

                        Log::info("Adelanto de pagos transferido al Check-in Principal ID: {$primerCheckinId}.");
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
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->assignments as $assignment) {
                $detail = \App\Models\ReservationDetail::find($assignment['detail_id']);

                // 1. Si el detalle ya tenía una habitación asignada antes y la están cambiando,
                // debemos liberar la habitación vieja para que vuelva a estar disponible.
                if ($detail->room_id && $detail->room_id != $assignment['room_id']) {
                    Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                }

                // 2. Asignamos la nueva habitación al detalle de reserva
                $detail->room_id = $assignment['room_id'];
                $detail->save();

                // 3. Bloqueamos físicamente la nueva habitación
                Room::where('id', $assignment['room_id'])->update(['status' => 'RESERVADO']);
            }
        });

        return back()->with('success', 'Habitaciones asignadas correctamente y bloqueadas en el sistema.');
    }

    public function reception()
    {
        $reservations = Reservation::with([
            'guest',
            'details.room.roomType',
            'details.requestedRoomType'
        ])
            ->whereIn('status', ['pendiente'])
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
