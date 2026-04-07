<?php

namespace App\Http\Controllers;

use App\Models\Maintenance;
use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MaintenanceController extends Controller
{
    // Mostrar la tabla de mantenimientos
    public function index()
    {
        // 1. Obtenemos los mantenimientos
        $maintenances = Maintenance::with(['room', 'user'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // 2. Obtenemos TODAS las habitaciones (con su tipo para mostrar el nombre)
        $rooms = \App\Models\Room::with('roomType')->get(); // O 'type' dependiendo de cómo se llame tu relación en el modelo Room

        // 3. Enviamos ambas variables a React
        return Inertia::render('maintenances/index', [
            'maintenances' => $maintenances,
            'rooms' => $rooms,
        ]);
    }

    // Registrar un nuevo daño (Se puede llamar desde la vista de habitaciones)
    public function store(Request $request)
    {
        $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'issue' => 'required|string|max:255',
            'description' => 'nullable|string',
            'photo' => 'nullable|image|max:5120',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('maintenances', 'public');
        }

        Maintenance::create([
            'room_id' => $request->room_id,
            'user_id' => auth()->$request()->id(),
            'issue' => $request->issue,
            'description' => $request->description,
            'photo_path' => $photoPath,
        ]);

        // Bloquear automáticamente la habitación
        Room::where('id', $request->room_id)->update(['status' => 'Mantenimiento']);

        return back()->with('success', 'Falla reportada. Habitación bloqueada por mantenimiento.');
    }

    // Marcar el daño como solucionado y liberar la habitación
    public function resolve(Request $request, Maintenance $maintenance)
    {
        $request->validate([
            'room_status' => 'required|string|in:Disponible,Limpieza'
        ]);

        // Registrar la fecha y hora de la solución
        $maintenance->update([
            'resolved_at' => now(),
        ]);

        // Devolver la habitación a estado Limpieza o Disponible
        $maintenance->room->update(['status' => $request->room_status]);

        return back()->with('success', 'Mantenimiento finalizado. Habitación actualizada.');
    }
}