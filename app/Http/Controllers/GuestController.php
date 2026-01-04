<?php

namespace App\Http\Controllers;

use App\Models\Guest;
use Illuminate\Http\Request;
use Inertia\Inertia;


class GuestController extends Controller
{
    public function index()
    {
        // Ordenamos por apellido para que la lista se vea mejor
        $guests = Guest::orderBy('full_name')->get();
        return Inertia::render('guests/index', [
            'Guests' => $guests
        ]);
    }

    public function create()
    {
        return Inertia::render('guests/create');
    }

    public function store(Request $request)
    {
        // 1. Lógica para Huésped Nuevo vs Existente
        $guestId = null;

        if (!$request->filled('guest_id')) {
            // --- CASO: NUEVO HUÉSPED ---
            $isComplete = $request->filled('identification_number');
            
            $guestData = $request->validate([
                'full_name' => 'required|string|max:150',
                'identification_number' => 'nullable|string|max:50', 
                'nationality' => 'nullable|string',
                'civil_status' => 'nullable|string',
                'birth_date' => 'nullable|date',
                'profession' => 'nullable|string',
                'origin' => 'nullable|string',
                'phone' => 'nullable|string|max:20',
                'issued_in' => 'nullable|string',
            ]);

            $guest = \App\Models\Guest::create([
                'full_name' => $guestData['full_name'],
                'identification_number' => $request->identification_number,
                'nationality' => $request->nationality ?? 'BOLIVIA',
                'civil_status' => $request->civil_status,
                'birth_date' => $request->birth_date,
                'profession' => $request->profession,
                'origin' => $request->origin,
                'phone' => $request->phone,
                'issued_in' => $request->issued_in,
                'profile_status' => $isComplete ? 'COMPLETE' : 'INCOMPLETE',
            ]);

            $guestId = $guest->id;
        } else {
            // --- CASO: HUÉSPED EXISTENTE ---
            $guestId = $request->guest_id;
        }

        // 2. CORRECCIÓN: Solo creamos el Check-in si envían el 'room_id'
        // Esto permite usar el modal de "Solo crear Huésped" sin errores.
        if ($request->filled('room_id')) {
            
            $validatedCheckin = $request->validate([
                'room_id' => 'required|exists:rooms,id',
                'check_in_date' => 'required|date',
                'duration_days' => 'required|integer|min:1',
                'advance_payment' => 'nullable|numeric',
                'notes' => 'nullable|string',
            ]);

            $checkin = \App\Models\Checkin::create([
                'guest_id' => $guestId,
                'room_id' => $validatedCheckin['room_id'],
                'user_id' => auth()->id(),
                'check_in_date' => $validatedCheckin['check_in_date'],
                'duration_days' => $validatedCheckin['duration_days'],
                'advance_payment' => $validatedCheckin['advance_payment'] ?? 0,
                'notes' => $validatedCheckin['notes'],
                'status' => 'active',
            ]);

            if ($request->has('selected_services')) {
                $checkin->services()->sync($request->selected_services);
            }
            
            \App\Models\Room::where('id', $request->room_id)->update(['status' => 'OCUPADO']);
        }

        // Retornamos éxito para que se cierre el modal
        return redirect()->back()->with('success', 'Operación realizada correctamente.');
    }

    public function update(Request $request, Guest $guest)
    {
        $validated = $request->validate([
            //'first_name' => 'required|string|max:100',
            'full_name' => 'required|string|max:100',
            'identification_number' => 'required|string|max:50|unique:guests,identification_number,' . $guest->id,
            'nationality' => 'nullable|string|max:100',
            'issued_in' => 'nullable|string|max:100',
            'civil_status' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date',
            'age' => 'exclude',
            'profession' => 'nullable|string|max:100',
            'origin' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
        ]);

        $guest->update($validated);
        return redirect()->route('guests.index')->with('success', 'Huésped actualizado.');
    }

    public function destroy(Guest $guest)
    {
        $guest->delete();
        return redirect()->route('guests.index');
    }

    
}