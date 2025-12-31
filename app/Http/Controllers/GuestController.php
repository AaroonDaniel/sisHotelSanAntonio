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
        $guests = Guest::orderBy('last_name')->get();
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
        // 1. Detectamos si es una creación rápida desde el modal
        $isQuickCreate = $request->boolean('is_quick_create');

        // 2. Definimos las reglas. 
        // Si es creación rápida, permitimos nulos en datos no esenciales.
        // Si es creación normal (formulario completo), podemos ser más estrictos o dejarlos nullable también.
        $rules = [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'identification_number' => 'required|string|max:50|unique:guests,identification_number',
            'nationality' => 'nullable|string|max:100',
            
            // Campos que pueden venir vacíos desde el modal rápido:
            'issued_in' => 'nullable|string|max:100',
            'civil_status' => 'nullable|string|max:50',
            'birth_date' => 'required|date',
            'age' => 'exclude',
            'profession' => 'nullable|string|max:100',
            'origin' => 'nullable|string|max:255'
        ];

        $validated = $request->validate($rules);

        // 3. ¡IMPORTANTE! Asignar el resultado a la variable $guest
        $guest = Guest::create($validated);

        // 4. Retornar JSON si la petición lo pide (Axios/Modal)
        if ($request->wantsJson() || $isQuickCreate) {
            return response()->json($guest, 201);
        }

        // 5. Redirección normal si es desde la página de invitados
        return redirect()->route('guests.index')->with('success', 'Huésped creado correctamente.');
    }

    public function update(Request $request, Guest $guest)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'identification_number' => 'required|string|max:50|unique:guests,identification_number,' . $guest->id,
            'nationality' => 'nullable|string|max:100',
            'issued_in' => 'nullable|string|max:100',
            'civil_status' => 'nullable|string|max:50',
            'birth_date' => 'nullable|date',
            'age' => 'exclude',
            'profession' => 'nullable|string|max:100',
            'origin' => 'nullable|string|max:100',
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