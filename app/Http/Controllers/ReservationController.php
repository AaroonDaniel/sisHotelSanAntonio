<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\ReservationDetail;
use App\Models\Guest;
use App\Models\Room;
use App\Models\Payment; // Necesario para registrar el ingreso en caja
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReservationController extends Controller
{
    public function index()
    {
        return Inertia::render('reservations/index', [
            // Cargamos la reserva con sus detalles y la habitación asociada a cada detalle
            'Reservations' => Reservation::with(['guest', 'details.room'])->latest()->get(),
            'Guests' => Guest::all(),
            // Para el select del modal: Habitaciones con sus precios
            'Rooms' => Room::with(['type', 'prices'])->where('status', 'DISPONIBLE')->get(),
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validación estricta de los campos que vamos a usar
        $request->validate([
            // Lógica para huesped nuevo/existente
            'is_new_guest' => 'boolean',
            'guest_id' => 'required_if:is_new_guest,false',
            'new_guest_name' => 'required_if:is_new_guest,true',
            'new_guest_ci' => 'nullable', 

            // Campos directos de la tabla 'reservations'
            'guest_count' => 'required|integer|min:1',
            'arrival_date' => 'required|date',
            'arrival_time' => 'nullable', 
            'duration_days' => 'required|integer|min:1',
            'advance_payment' => 'nullable|numeric|min:0',
            'payment_type' => 'required|string', // EFECTIVO, QR, etc.
            'observation' => 'nullable|string',

            // Campos para la tabla 'reservation_details'
            'details' => 'required|array|min:1', // El array de habitaciones
            'details.*.room_id' => 'required',
            'details.*.price_id' => 'required', // ID de la tarifa usada
            'details.*.price' => 'required|numeric', // El precio final pactado
        ]);

        try {
            DB::transaction(function () use ($request) {
                
                // A. GESTIÓN DEL HUÉSPED (Obtener el ID correcto)
                $guestId = $request->guest_id;

                if ($request->is_new_guest) {
                    $newGuest = Guest::create([
                        'name' => strtoupper($request->new_guest_name),
                        'last_name' => '', // Ajusta según tu migración de guests
                        'identification_number' => $request->new_guest_ci,
                        // Añade aquí otros campos obligatorios de tu tabla guests si los hay
                    ]);
                    $guestId = $newGuest->id;
                }

                // B. CREAR RESERVA (Tabla: reservations)
                // Respetando estrictamente tu $fillable
                $reservation = Reservation::create([
                    'user_id' => Auth::id(),
                    'guest_id' => $guestId,
                    'guest_count' => $request->guest_count,
                    'arrival_date' => $request->arrival_date,
                    'arrival_time' => $request->arrival_time,
                    'duration_days' => $request->duration_days,
                    'advance_payment' => $request->advance_payment ?? 0,
                    'payment_type' => $request->payment_type,
                    'status' => 'PENDIENTE', // Valor por defecto
                    'observation' => $request->observation,
                ]);

                // C. CREAR DETALLES (Tabla: reservation_details)
                // Respetando estrictamente tu $fillable
                foreach ($request->details as $detail) {
                    ReservationDetail::create([
                        'reservation_id' => $reservation->id,
                        'room_id' => $detail['room_id'],
                        'price_id' => $detail['price_id'],
                        'price' => $detail['price'], // El precio pactado
                    ]);
                }

                // D. REGISTRAR EL PAGO EN CAJA (Opcional pero recomendado)
                // Esto guarda el movimiento de dinero real, aparte del dato en la reserva
                if ($request->advance_payment > 0) {
                    Payment::create([
                        'reservation_id' => $reservation->id,
                        'user_id' => Auth::id(),
                        'amount' => $request->advance_payment,
                        'method' => $request->payment_type,
                        'type' => 'INGRESO',
                        'description' => 'ADELANTO RESERVA'
                    ]);
                }
            });

            return redirect()->back()->with('success', 'Reserva registrada correctamente');

        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error al guardar: ' . $e->getMessage()]);
        }
    }

    public function update(Request $request, Reservation $reservation)
    {
        // Solo permitimos actualizar ciertos datos para no romper la integridad financiera
        $reservation->update($request->only([
            'arrival_date', 
            'arrival_time', 
            'guest_count', 
            'observation',
            'status'
        ]));
        
        return redirect()->back();
    }

    public function destroy(Reservation $reservation)
    {
        // Al eliminar la reserva, por cascada (si está configurado en BD) o por lógica,
        // se borran los detalles.
        $reservation->delete();
        return redirect()->back();
    }
}