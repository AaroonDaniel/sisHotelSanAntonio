<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Checkin;
use App\Models\CheckinDetail;
use App\Models\Room; // <--- 1. IMPORTAMOS ROOM COMO PEDISTE
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class CheckinDetailController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
       return Inertia::render('checkin_details/index', [
            // 1. Historial de consumos (para la tabla principal)
            'checkinDetails' => CheckinDetail::with(['service', 'checkin.room', 'checkin.guest'])
                ->latest()
                ->get(),

            // 2. Servicios disponibles
            'services' => Service::where('is_active', true)->get(),

            // 3. ¡CORRECCIÓN! FILTRO POR ESTADO DE HABITACIÓN (OCUPADO)
            // Aquí usamos 'whereHas' para entrar a la tabla 'rooms' y ver si dice 'OCUPADO'
            'activeCheckins' => Checkin::with(['room', 'guest'])
                ->whereHas('room', function ($query) {
                    // Filtra basándose en la columna 'status' de tu imagen de BD
                    $query->whereIn('status', ['OCUPADO', 'ocupado']); 
                })
                // Aseguramos que sea el checkin actual (activo) para evitar historiales viejos
                ->where('status', 'activo') 
                ->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('checkin_details/create', [
            'services' => Service::where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'checkin_id' => 'required|exists:checkins,id',
            'service_id' => 'required|exists:services,id',
            'quantity'   => 'required|integer|min:1',
        ]);

        CheckinDetail::create([
            'checkin_id' => $validated['checkin_id'],
            'service_id' => $validated['service_id'],
            'quantity'   => $validated['quantity'],
        ]);

        return Redirect::back()->with('message', 'Servicio agregado correctamente.');
    }

    public function update(Request $request, $id)
    {
        $checkinDetail = CheckinDetail::findOrFail($id);

        $validated = $request->validate([
            'service_id' => 'required|exists:services,id',
            'quantity'   => 'required|integer|min:1',
        ]);

        $checkinDetail->update([
            'service_id' => $validated['service_id'],
            'quantity'   => $validated['quantity'],
        ]);

        return Redirect::back()->with('message', 'Consumo actualizado correctamente.');
    }

    public function destroy($id)
    {
        $checkinDetail = CheckinDetail::findOrFail($id);
        $checkinDetail->delete();

        return Redirect::back()->with('message', 'Consumo eliminado correctamente.');
    }
}