<?php

namespace App\Http\Controllers;

use App\Models\Floor;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FloorController extends Controller
{
    public function index()
    {
        $floors = Floor::all();

        // CORRECCIÓN: Escribirlo en minúscula para coincidir con tu carpeta 'floors'
        return Inertia::render('floors/index', [
            'Floors' => $floors
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
        ]);
        Floor::create($validated);
        return redirect()->back();
    }

    public function update(Request $request, Floor $floor)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
        ]);
        $floor->update($validated);
        return redirect()->back();
    }

    public function destroy(Floor $floor)
    {
        $floor->delete();
        return redirect()->back();
    }
    public function toggleStatus(Floor $floor)
    {
        $floor->update([
            'is_active' => !$floor->is_active
        ]);

        return back();
    }
}