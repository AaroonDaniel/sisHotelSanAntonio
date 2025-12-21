<?php

namespace App\Http\Controllers;

use App\Models\RoomType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoomTypeController extends Controller
{
    public function index()
    {
        // Enviamos 'RoomTypes' al frontend
        return Inertia::render('roomTypes/index', [ 
        'Roomtypes' => RoomType::all()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1', // Validamos que sea número
            'description' => 'nullable|string|max:255',
        ]);

        RoomType::create($validated);
        return redirect()->route('room_types.index');
    }

    public function update(Request $request, RoomType $roomType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
            'description' => 'nullable|string|max:255',
        ]);

        $roomType->update($validated);
        return redirect()->route('room_types.index');
    }

    public function destroy(RoomType $roomType)
    {
        // Aquí podrías agregar el try-catch si hay relaciones con habitaciones
        $roomType->delete();
        return redirect()->route('room_types.index');
    }

    public function toggleStatus(RoomType $roomType)
    {
        $roomType->update(['is_active' => !$roomType->is_active]);
        return back();
    }
}