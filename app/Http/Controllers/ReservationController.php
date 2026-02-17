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
            // Cargamos reservas con sus relaciones necesarias
            'Reservations' => Reservation::with(['guest', 'details.room'])->latest()->get(),
            'Guests' => Guest::all(),
            // Traemos habitaciones con sus precios y tipos para el selector
            'Rooms' => Room::with(['type', 'prices'])->where('status', 'DISPONIBLE')->get(),
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validaciones
        $request->validate([
            'is_new_guest' => 'boolean',
            'guest_id' => 'required_if:is_new_guest,false',
            'new_guest_name' => 'required_if:is_new_guest,true',
            // 'new_guest_ci' => 'required_if:is_new_guest,true', // Opcional según tu regla
            'arrival_date' => 'required|date',
            'duration_days' => 'required|integer|min:1',
            'details' => 'required|array|min:1', // Obligatorio elegir habitaciones
            'details.*.room_id' => 'required',
            'details.*.price' => 'required|numeric',
        ]);

        try {
            DB::transaction(function () use ($request) {
                
                // 2. Gestionar Huésped (Existente o Nuevo)
                $guestId = $request->guest_id;

                if ($request->is_new_guest) {
                    $newGuest = Guest::create([
                        'name' => strtoupper($request->new_guest_name), // Guardar en mayúsculas
                        'last_name' => '', // Opcional si usas un solo campo
                        'identification_number' => $request->new_guest_ci,
                        // Añade otros campos default si son requeridos en tu DB
                    ]);
                    $guestId = $newGuest->id;
                }

                // 3. Crear Reserva Maestra
                $reservation = Reservation::create([
                    'user_id' => Auth::id(),
                    'guest_id' => $guestId,
                    'guest_count' => $request->guest_count,
                    'arrival_date' => $request->arrival_date,
                    'arrival_time' => $request->arrival_time,
                    'duration_days' => $request->duration_days,
                    'advance_payment' => $request->advance_payment ?? 0,
                    'payment_type' => $request->payment_type,
                    'status' => 'PENDIENTE',
                    'observation' => $request->observation,
                ]);

                // 4. Guardar Detalles (Las Habitaciones)
                foreach ($request->details as $detail) {
                    ReservationDetail::create([
                        'reservation_id' => $reservation->id,
                        'room_id' => $detail['room_id'],
                        'price_id' => $detail['price_id'] ?? null,
                        'price' => $detail['price'],
                    ]);
                    
                    // Opcional: ¿Cambiar estado de habitación a 'RESERVADO'?
                    // Room::where('id', $detail['room_id'])->update(['status' => 'RESERVADO']);
                }

                // 5. Registrar Pago en Caja (Si hubo adelanto)
                if ($request->advance_payment > 0) {
                    Payment::create([
                        'checkin_id' => null, // Ojo: Si tu tabla payments pide checkin_id, hazlo nullable o añade reservation_id
                        'reservation_id' => $reservation->id, // Asegúrate de tener esta columna en payments migration
                        'user_id' => Auth::id(),
                        'amount' => $request->advance_payment,
                        'method' => $request->payment_type,
                        'type' => 'INGRESO',
                        'description' => 'ADELANTO RESERVA #' . $reservation->id
                    ]);
                }
            });

            return redirect()->back()->with('success', 'Reserva creada exitosamente');

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error al guardar: ' . $e->getMessage()]);
        }
    }

    public function update(Request $request, Reservation $reservation)
    {
        // Lógica de actualización (similar al store pero editando)
        // Por ahora lo dejaremos simple
        $reservation->update($request->only(['status', 'observation']));
        return redirect()->back();
    }

    public function destroy(Reservation $reservation)
    {
        $reservation->delete();
        return redirect()->back();
    }
}