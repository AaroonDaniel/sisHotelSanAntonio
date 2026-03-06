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
            'Reservations' => Reservation::with([
                'guest',
                'details.room.roomType',
                'details.price'
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
                    'arrival_time' => $request->arrival_time,
                    'duration_days' => $request->duration_days,
                    'advance_payment' => $request->advance_payment ?? 0,
                    'payment_type' => $request->payment_type,
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
        Log::info("=== ACTUALIZANDO RESERVA {$reservation->id} A: {$newStatus} ===");

        try {
            $checkinIds = []; // 🚀 Cola de check-ins a llenar

            DB::transaction(function () use ($request, $reservation, $newStatus, &$checkinIds) {
                $statusUpper = strtoupper($newStatus);

                if ($statusUpper === 'CANCELADO' || $statusUpper === 'CANCELADA') {
                    $reservation->update(['status' => 'cancelada']);
                    foreach ($reservation->details as $detail) {
                        if ($detail->room_id) {
                            Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                        }
                    }
                } 
                elseif ($statusUpper === 'CONFIRMADO' || $statusUpper === 'CONFIRMADA') {
                    $reservation->update(['status' => 'confirmada']);

                    $primerCheckinId = null;

                    foreach ($reservation->details as $index => $detail) {
                        if (!$detail->room_id) continue; // Seguridad anti-error

                        $notaAsignacion = 'Reserva #' . $reservation->id;
                        if ($index > 0) {
                            $notaAsignacion .= ' - ADICIONAL'; 
                        }

                        // 🚨 CREAMOS EL CHECKIN PERO CON ORIGEN NULL
                        // Esto asegura que la tarjeta se pinte de AMARILLO (Falta de datos)
                        $checkin = Checkin::create([
                            'guest_id' => $reservation->guest_id,
                            'room_id'  => $detail->room_id,
                            'user_id'  => Auth::id() ?? 1,
                            'check_in_date' => $reservation->arrival_date ?? now(),
                            'actual_arrival_date' => now(),
                            'duration_days' => $reservation->duration_days ?? 1,
                            'advance_payment' => 0,
                            'origin' => null, // 👈 CLAVE PARA EL ESTADO ÁMBAR
                            'status' => 'activo',
                            'is_temporary' => false,
                            'notes' => $notaAsignacion,
                            'agreed_price' => $detail->price ?? 0 // Rescatamos el precio acordado en la reserva
                        ]);

                        $checkinIds[] = $checkin->id;

                        if ($index === 0) {
                            $primerCheckinId = $checkin->id;
                        }

                        // La habitación pasa a estar ocupada físicamente
                        Room::where('id', $detail->room_id)->update(['status' => 'OCUPADO']);
                    }

                    // Movemos el adelanto al primer check-in
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
                    }
                } else {
                    $reservation->update($request->only([
                        'arrival_date', 'arrival_time', 'guest_count', 'status'
                    ]));
                }
            });

            // 🚀 SI FUE CONFIRMADA, REDIRIGIMOS PASANDO LA COLA DE IDs
            if (strtoupper($newStatus) === 'CONFIRMADO' || strtoupper($newStatus) === 'CONFIRMADA') {
                return redirect()->route('rooms.status')
                    ->with('success', 'Llegada confirmada. Por favor, complete los datos de las habitaciones.')
                    ->with('auto_open_checkins', $checkinIds); // Envía la cola al Frontend
            }

            return redirect()->back()->with('success', 'Reserva actualizada.');
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

    public function assignRooms(Request $request, Reservation $reservation)
    {
        try {
            DB::transaction(function () use ($request, $reservation) {
                $assignments = $request->input('assignments'); 

                foreach ($assignments as $detailId => $roomId) {
                    $detail = ReservationDetail::find($detailId);
                    if ($detail) {
                        $detail->room_id = $roomId;
                        $detail->save();
                    }

                    // Habitaciones pasan a estado MORADO
                    $room = Room::find($roomId);
                    if ($room) {
                        $room->status = 'RESERVADO';
                        $room->save();
                    }
                }
            });

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            Log::error("Error asignando habitaciones: " . $e->getMessage());
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
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