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
        Log::info('=== INICIANDO CREACIÓN DE RESERVA ===');

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
                'qr_bank' => 'nullable|string',
                'is_corporate' => 'boolean|nullable',
                'is_delegation' => 'boolean|nullable',
                'details' => 'required|array|min:1',
                'details.*.room_id' => 'nullable',
                'details.*.requested_room_type_id' => 'nullable',
                'details.*.requested_bathroom' => 'nullable',
                'details.*.price_id' => 'nullable',
                'details.*.price' => 'nullable|numeric',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('❌ Falló validación:', $e->errors());
            return redirect()->back()->withErrors($e->errors());
        }

        try {
            DB::transaction(function () use ($request) {
                $guestId = $request->guest_id;

                if ($request->is_new_guest) {
                    $newGuest = Guest::create([
                        'full_name' => strtoupper($request->new_guest_name),
                        'identification_number' => $request->new_guest_ci ?? null,
                        'nationality' => 'BOLIVIA',
                        'profile_status' => 'INCOMPLETE',
                    ]);
                    $guestId = $newGuest->id;
                }

                $reservation = Reservation::create([
                    'user_id' => Auth::id(),
                    'guest_id' => $guestId,
                    'guest_count' => $request->guest_count,
                    'arrival_date' => $request->arrival_date,
                    'arrival_time' => $request->arrival_time ?? '14:00:00',
                    'duration_days' => $request->duration_days,
                    'advance_payment' => $request->advance_payment ?? 0,
                    'payment_type' => $request->payment_type,
                    'is_corporate' => $request->is_corporate ?? false,
                    'is_delegation' => $request->is_delegation ?? false,
                    'status' => 'pendiente',
                ]);

                if (!empty($request->details)) {
                    foreach ($request->details as $detail) {
                        $roomId = $detail['room_id'] ?? null;

                        ReservationDetail::create([
                            'reservation_id' => $reservation->id,
                            'room_id' => $roomId,
                            'requested_room_type_id' => $detail['requested_room_type_id'] ?? null,
                            'requested_bathroom' => $detail['requested_bathroom'] ?? null,
                            'price_id' => $detail['price_id'] ?? null,
                            'price' => $detail['price'] ?? null,
                        ]);

                        if ($roomId) {
                            Room::where('id', $roomId)->update(['status' => 'RESERVADO']);
                        }
                    }
                }

                if ($request->advance_payment > 0) {
                    Payment::create([
                        'reservation_id' => $reservation->id,
                        'user_id' => Auth::id(),
                        'amount' => $request->advance_payment,
                        'method' => $request->payment_type,
                        'bank_name' => ($request->payment_type === 'EFECTIVO') ? null : $request->qr_bank,
                        'type' => 'INGRESO',
                        'description' => 'ADELANTO RESERVA #' . $reservation->id
                    ]);
                }
            });

            return redirect()->back()->with('success', 'Reserva registrada correctamente');
        } catch (\Exception $e) {
            Log::error("❌ Error en BD: " . $e->getMessage());
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

                        // Guardamos el nombre del titular original en la nota para que el frontend lo lea
                        $notaAsignacion = 'RESERVA #' . $reservation->id . ' - RESERVADO POR: ' . $reservation->guest->full_name;

                        if ($index > 0) {
                            $notaAsignacion .= ' (HABITACIÓN ADICIONAL)';
                        }

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
                            'agreed_price' => $detail->price ?? 0
                        ]);
                        Log::info("Check-in Temporal creado (ID: {$checkin->id}) para la Habitación ID: {$detail->room_id}. Faltan datos de origen/acompañantes.");
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
                    // Actualizamos los datos base
                    $reservation->update([
                        'arrival_date' => $request->arrival_date ?? $reservation->arrival_date,
                        'arrival_time' => $request->arrival_time ?? $reservation->arrival_time,
                        'duration_days' => $request->duration_days ?? $reservation->duration_days,
                        'guest_count' => $request->guest_count ?? $reservation->guest_count,
                        'advance_payment' => $request->advance_payment ?? $reservation->advance_payment,
                        'payment_type' => $request->payment_type ?? $reservation->payment_type,
                        'is_corporate' => $request->has('is_corporate') ? $request->is_corporate : $reservation->is_corporate,
                        'is_delegation' => $request->has('is_delegation') ? $request->is_delegation : $reservation->is_delegation,
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
                                // Liberar la habitación física antes de borrar el detalle
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
