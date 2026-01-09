<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\CheckinDetail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Redirect;

class CheckinDetailController extends Controller
{
    /**
     * Display a listing of the resource.
     * (Generalmente no se usa si cargas los detalles dentro de la vista de Checkin)
     */
    public function index()
    {
        // Corregí el typo 'intex' a 'Index' por convención
        return Inertia::render('checkin_details/index', [
            'checkinDetails' => CheckinDetail::with(['service', 'checkin'])->latest()->get(),
            'services' => Service::where('is_active', true)->get(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * (No suele ser necesario con Modales, pero aquí está la corrección de sintaxis)
     */
    public function create()
    {
        return Inertia::render('checkindetail/create', [
            'services' => Service::where('is_active', true)->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 1. Validar los datos que vienen del Modal React
        $validated = $request->validate([
            'checkin_id' => 'required|exists:checkins,id',
            'service_id' => 'required|exists:services,id',
            'quantity'   => 'required|integer|min:1',
        ]);

        // 2. Crear el registro
        // Nota: Ya no calculamos selling_price porque eliminaste la columna.
        CheckinDetail::create([
            'checkin_id' => $validated['checkin_id'],
            'service_id' => $validated['service_id'],
            'quantity'   => $validated['quantity'],
        ]);

        // 3. Redirigir atrás (Mantiene al usuario en la página del Checkin donde abrió el modal)
        return Redirect::back()->with('message', 'Servicio agregado correctamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(CheckinDetail $checkinDetail)
    {
        // Generalmente no se necesita vista individual para un detalle
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(CheckinDetail $checkinDetail)
    {
        // Al usar modales, no solemos renderizar una vista de edición aparte.
        // Los datos se pasan directamente al modal desde el padre.
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        // Buscamos el detalle por ID
        $checkinDetail = CheckinDetail::findOrFail($id);

        // 1. Validar
        $validated = $request->validate([
            'service_id' => 'required|exists:services,id',
            'quantity'   => 'required|integer|min:1',
        ]);

        // 2. Actualizar
        $checkinDetail->update([
            'service_id' => $validated['service_id'],
            'quantity'   => $validated['quantity'],
        ]);

        // 3. Redirigir
        return Redirect::back()->with('message', 'Consumo actualizado correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $checkinDetail = CheckinDetail::findOrFail($id);
        
        $checkinDetail->delete();

        return Redirect::back()->with('message', 'Consumo eliminado correctamente.');
    }
}