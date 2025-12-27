<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\Guest;
use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class CheckinController extends Controller
{
    public function index()
    {
        $checkins = Checkin::with(['guest', 'room.roomType'])
            ->orderBy('created_at', 'desc')
            ->get();

        // --- CORRECCIÓN AQUÍ ---
        // ANTES: $guests = Guest::where('is_active', true)->orderBy('last_name')->get();
        // AHORA (Quitamos el where):
        $guests = Guest::orderBy('last_name')->get();

        $rooms = Room::with(['roomType', 'price'])->get(); 

        return Inertia::render('checkins/index', [
            'Checkins' => $checkins,
            'Guests' => $guests, // Ahora enviamos todos los huéspedes sin filtrar por activo
            'Rooms' => $rooms,
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validación
        $validated = $request->validate([
            'guest_id' => 'required|exists:guests,id',
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:1',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // 2. Datos adicionales automáticos
        $validated['user_id'] = Auth::id(); // Registramos qué recepcionista hizo el checkin
        
        // Calculamos fecha de salida estimada
        $checkInDate = \Carbon\Carbon::parse($validated['check_in_date']);
        $validated['check_out_date'] = $checkInDate->copy()->addDays($validated['duration_days']);

        // 3. Crear el Checkin
        $checkin = Checkin::create($validated);

        // 4. ACTUALIZAR ESTADO DE LA HABITACIÓN
        // Al hacer checkin, la habitación pasa a estar 'occupied'
        $room = Room::find($validated['room_id']);
        if ($room) {
            $room->update(['status' => 'occupied']);
        }

        return redirect()->back()->with('success', 'Check-in registrado correctamente.');
    }

    public function update(Request $request, Checkin $checkin)
    {
        $validated = $request->validate([
            'guest_id' => 'required|exists:guests,id',
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:1',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // Recalcular fecha de salida si cambiaron la fecha de entrada o duración
        $checkInDate = \Carbon\Carbon::parse($validated['check_in_date']);
        $validated['check_out_date'] = $checkInDate->copy()->addDays($validated['duration_days']);

        // Si cambiaron de habitación, liberar la anterior y ocupar la nueva
        if ($checkin->room_id != $validated['room_id']) {
            // Liberar anterior
            Room::where('id', $checkin->room_id)->update(['status' => 'available']); // O 'cleaning'
            // Ocupar nueva
            Room::where('id', $validated['room_id'])->update(['status' => 'occupied']);
        }

        $checkin->update($validated);

        return redirect()->back()->with('success', 'Hospedaje actualizado.');
    }

    public function destroy(Checkin $checkin)
    {
        // Al eliminar un checkin (cancelar), liberamos la habitación
        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'available']);
        }

        $checkin->delete();
        return redirect()->back()->with('success', 'Registro eliminado y habitación liberada.');
    }

    // Método extra para "Finalizar Estadía" (Checkout)
    public function checkout(Checkin $checkin)
    {
        // 1. Marcar checkin como finalizado (si tuvieras un campo status en checkins, ej: 'completed')
        // Si no tienes campo status en checkin, asumimos que checkout libera la habitación.

        // 2. Cambiar estado de habitación a 'cleaning' (Limpieza) o 'available'
        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'cleaning']); 
        }

        // Opcional: Registrar fecha real de salida si difiere de la estimada
        $checkin->update(['check_out_date' => now()]);

        return redirect()->back()->with('success', 'Checkout realizado. Habitación en limpieza.');
    }
}