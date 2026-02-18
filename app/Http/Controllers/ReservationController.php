<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\ReservationDetail;
use App\Models\Guest;
use App\Models\Room;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReservationController extends Controller
{
    public function index()
    {
        return Inertia::render('reservations/index', [
            'Reservations' => Reservation::with(['guest', 'details.room'])->latest()->get(),
            'Guests' => Guest::all(),
            'Rooms' => Room::with(['roomType', 'prices'])->where('status', 'LIBRE')->get(),
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
                
                // 1. Gestión del Huésped
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

                // 2. Crear Reserva
                $reservation = Reservation::create([
                    'user_id' => Auth::id(),
                    'guest_id' => $guestId,
                    'guest_count' => $request->guest_count,
                    'arrival_date' => $request->arrival_date,
                    'arrival_time' => $request->arrival_time,
                    'duration_days' => $request->duration_days,
                    'advance_payment' => $request->advance_payment ?? 0,
                    'payment_type' => $request->payment_type,
                    // CORRECCIÓN: 'pendiente' en minúsculas para cumplir la restricción de la BD
                    'status' => 'pendiente', 
                ]);

                // 3. Detalles de Habitaciones
                foreach ($request->details as $detail) {
                    ReservationDetail::create([
                        'reservation_id' => $reservation->id,
                        'room_id' => $detail['room_id'],
                        'price_id' => $detail['price_id'],
                        'price' => $detail['price'],
                    ]);
                }

                // 4. Pago (Adelanto)
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
        $reservation->update($request->only([
            'arrival_date', 
            'arrival_time', 
            'guest_count', 
            'status'
        ]));
        return redirect()->back();
    }

    public function destroy(Reservation $reservation)
    {
        $reservation->delete();
        return redirect()->back();
    }
}