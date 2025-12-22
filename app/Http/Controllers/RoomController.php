<?php

namespace App\Http\Controllers;

use App\Models\Block;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\Price;
use App\Models\Floor;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoomController extends Controller
{
    public function index()
    {
        // Usamos 'with' para cargar las relaciones y evitar consultas N+1
        $rooms = Room::with(['roomType', 'price', 'floor', 'block'])->get();
        
        return Inertia::render('rooms/index', [
            'Rooms' => $rooms,
            'RoomTypes' => RoomType::where('is_active', true)->get(),
            'Prices' => Price::where('is_active', true)->get(),
            'Floors' => Floor::where('is_active', true)->get(),
            'Blocks' => Block::where('is_active', true)->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('rooms/create', [
            'RoomTypes' => RoomType::where('is_active', true)->get(),
            'Prices' => Price::where('is_active', true)->get(),
            'Floors' => Floor::where('is_active', true)->get(),
            'Blocks' => Block::where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validación (Aceptamos español e inglés para el status)
        $validated = $request->validate([
            'number' => 'required|unique:rooms,number', 
            'room_type_id' => 'required|exists:room_types,id',
            'price_id' => 'required|exists:prices,id',
            'floor_id' => 'required|exists:floors,id',
            'block_id' => 'required|exists:blocks,id',
            'status' => 'required|in:libre,ocupado,reservado,limpieza,mantenimiento,inhabilitado,available,occupied,reserved,cleaning,maintenance,disabled',
            'notes' => 'nullable|string',
            'image_path' => 'nullable|string',
        ]);

        // 2. Mapeo de Español a Inglés para la Base de Datos
        $mapStatus = [
            'libre' => 'available',
            'ocupado' => 'occupied',
            'reservado' => 'reserved',
            'limpieza' => 'cleaning',
            'mantenimiento' => 'maintenance',
            'inhabilitado' => 'disabled'
        ];

        // Si el status viene en español, lo traducimos
        if (isset($mapStatus[$validated['status']])) {
            $validated['status'] = $mapStatus[$validated['status']];
        }
        
        // 3. Valores por defecto
        $validated['is_active'] = true;

        Room::create($validated);
        return redirect()->route('rooms.index');
    }

    public function update(Request $request, Room $room)
    {
        // 1. Validación
        $validated = $request->validate([
            'number' => 'required|unique:rooms,number,' . $room->id,
            'block_id' => 'required|exists:blocks,id',
            'floor_id' => 'required|exists:floors,id',
            'price_id' => 'required|exists:prices,id',
            'room_type_id' => 'required|exists:room_types,id',
            'status' => 'required|in:libre,ocupado,reservado,limpieza,mantenimiento,inhabilitado,available,occupied,reserved,cleaning,maintenance,disabled',
            'notes' => 'nullable|string',
            'image_path' => 'nullable|string',
        ]);

        // 2. Mapeo de Español a Inglés
        $mapStatus = [
            'libre' => 'available',
            'ocupado' => 'occupied',
            'reservado' => 'reserved',
            'limpieza' => 'cleaning',
            'mantenimiento' => 'maintenance',
            'inhabilitado' => 'disabled'
        ];

        if (isset($mapStatus[$validated['status']])) {
            $validated['status'] = $mapStatus[$validated['status']];
        }

        // 3. Manejo del checkbox 'is_active' (si se envía)
        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $room->update($validated);
        return redirect()->route('rooms.index');
    }

    public function destroy(Room $room)
    {
        $room->delete();
        return redirect()->route('rooms.index');
    }

    public function toggleStatus(Room $room)
    {
        $room->update(['is_active' => !$room->is_active]);
        return back();
    }
}