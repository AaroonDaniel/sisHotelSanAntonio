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
            // --- CASO: NUEVO HUÉSPED (Con Verificación de Duplicados) ---
            $isComplete = $request->filled('identification_number');
            
            $request->validate([
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

            // Preparar datos para la búsqueda y guardado
            $fullName = strtoupper($request->full_name);
            $birthDate = $request->birth_date;
            $idNumber = $request->filled('identification_number') ? strtoupper($request->identification_number) : null;

            // A. BÚSQUEDA INTELIGENTE
            // Buscamos coincidencia exacta de nombre
            $query = \App\Models\Guest::where('full_name', $fullName);

            // Refinamos: Si hay fecha de nacimiento, esa es la llave maestra (la más segura)
            if (!empty($birthDate)) {
                $query->where('birth_date', $birthDate);
            } 
            // Si no hay fecha, usamos el CI como respaldo
            elseif (!empty($idNumber)) {
                $query->where('identification_number', $idNumber);
            }

            $existingGuest = $query->first();

            if ($existingGuest) {
                // B1. SI YA EXISTE: Actualizamos sus datos con lo nuevo que llegó
                $existingGuest->update([
                    'identification_number' => $idNumber ?? $existingGuest->identification_number,
                    'nationality' => $request->nationality ? strtoupper($request->nationality) : $existingGuest->nationality,
                    'civil_status' => $request->civil_status ?? $existingGuest->civil_status,
                    'birth_date' => $birthDate ?? $existingGuest->birth_date,
                    'profession' => $request->profession ? strtoupper($request->profession) : $existingGuest->profession,
                    'origin' => $request->origin ? strtoupper($request->origin) : $existingGuest->origin,
                    'phone' => $request->phone ?? $existingGuest->phone,
                    'issued_in' => $request->issued_in ? strtoupper($request->issued_in) : $existingGuest->issued_in,
                    // Si completó el CI, actualizamos el estado, si no, se queda como estaba
                    'profile_status' => $isComplete ? 'COMPLETE' : $existingGuest->profile_status,
                ]);
                $guestId = $existingGuest->id;
            } else {
                // B2. SI NO EXISTE: Creamos uno nuevo
                $guest = \App\Models\Guest::create([
                    'full_name' => $fullName,
                    'identification_number' => $idNumber,
                    'nationality' => $request->nationality ? strtoupper($request->nationality) : 'BOLIVIA',
                    'civil_status' => $request->civil_status,
                    'birth_date' => $birthDate,
                    'profession' => $request->profession ? strtoupper($request->profession) : null,
                    'origin' => $request->origin ? strtoupper($request->origin) : null,
                    'phone' => $request->phone,
                    'issued_in' => $request->issued_in ? strtoupper($request->issued_in) : null,
                    'profile_status' => $isComplete ? 'COMPLETE' : 'INCOMPLETE',
                ]);
                $guestId = $guest->id;
            }

        } else {
            // --- CASO: HUÉSPED EXISTENTE (Seleccionado por ID) ---
            $guestId = $request->guest_id;
            
            // Actualizamos el teléfono si enviaron uno nuevo
            if ($request->filled('phone')) {
                $existingGuest = \App\Models\Guest::find($guestId);
                if ($existingGuest) {
                    $existingGuest->update(['phone' => $request->phone]);
                }
            }
        }

        // 2. Crear Check-in si envían room_id (Lógica Original Mantenida)
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
                'notes' => isset($validatedCheckin['notes']) ? strtoupper($validatedCheckin['notes']) : null,
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