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
        $request->validate([
            'is_new_guest' => 'boolean',
            'guest_id' => 'required_if:is_new_guest,false',
            'new_guest_name' => 'required_if:is_new_guest,true',
            'new_guest_ci' => 'nullable',
            'guest_count' => 'required|integer|min:1',
            'arrival_date' => 'required|date',
            'arrival_time' => 'nullable',
            'duration_days' => 'required|integer|min:1',
            'advance_payment' => 'nullable|numeric|min:0',
            'payment_type' => 'required|string',
            'details' => 'required|array|min:1',
            'details.*.room_id' => 'required',
            'details.*.price_id' => 'required',
            'details.*.price' => 'required|numeric',
        ]);

        try {
            DB::transaction(function () use ($request) {

                $guestId = $request->guest_id;
                if ($request->is_new_guest) {
                    $newGuest = Guest::create([
                        'full_name' => strtoupper($request->new_guest_name),
                        'identification_number' => $request->new_guest_ci,
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

                foreach ($request->details as $detail) {
                    ReservationDetail::create([
                        'reservation_id' => $reservation->id,
                        'room_id' => $detail['room_id'],
                        'price_id' => $detail['price_id'],
                        'price' => $detail['price'],
                    ]);
                    
                    // 🚀 CORRECCIÓN: Estado en español para no reventar la BD
                    Room::where('id', $detail['room_id'])->update(['status' => 'RESERVADO']);
                }

                if ($request->advance_payment > 0) {
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

            return redirect()->back()->with('success', 'Reserva registrada correctamente');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }

    public function update(Request $request, Reservation $reservation)
    {
        $newStatus = $request->status;

        Log::info("=== INTENTANDO ACTUALIZAR RESERVA ID: {$reservation->id} ===");
        Log::info("Estado recibido: " . $newStatus);

        try {
            DB::transaction(function () use ($request, $reservation, $newStatus) {

                // Convertimos a mayúsculas para evaluar lo que manda React
                $statusUpper = strtoupper($newStatus);

                // React manda 'cancelado', evaluamos 'CANCELADO'
                if ($statusUpper === 'CANCELADO' || $statusUpper === 'CANCELADA') {
                    
                    // 🚀 AQUÍ ESTÁ LA MAGIA: Lo guardamos en la BD tal cual lo exige el ENUM
                    $reservation->update(['status' => 'cancelada']);
                    Log::info("✅ Reserva actualizada a 'cancelada' en la BD.");

                    // Liberamos las habitaciones
                    foreach ($reservation->details as $detail) {
                        Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                        Log::info("✅ Habitación ID {$detail->room_id} liberada.");
                    }
                }
                // Si en algún momento confirmas, también debes respetar el ENUM ('confirmada')
                elseif ($statusUpper === 'CONFIRMADO' || $statusUpper === 'CONFIRMADA') {
                    
                    $reservation->update(['status' => 'confirmada']); 
                    
                    // Al confirmar, la habitación pasa a OCUPADO
                    foreach ($reservation->details as $detail) {
                        Room::where('id', $detail->room_id)->update(['status' => 'OCUPADO']);
                    }
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

            Log::info("=== PROCESO TERMINADO CON ÉXITO ===");
            return redirect()->back()->with('success', 'Reserva actualizada.');
            
        } catch (\Exception $e) {
            Log::error("❌ ERROR: " . $e->getMessage());
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