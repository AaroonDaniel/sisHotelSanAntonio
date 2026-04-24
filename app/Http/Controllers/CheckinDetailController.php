<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Checkin;
use App\Models\CheckinDetail;
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
        $checkins = Checkin::with([
            'guest:id,full_name,identification_number',
            'room:id,number'
        ])
            ->where('status', 'activo')
            ->orderBy('created_at', 'desc')
            ->get();

        $services = Service::all();

        $checkindetails = CheckinDetail::with([
            'service:id,name,price',
            'checkin:id,room_id,guest_id',
            'checkin.room:id,number',
            'checkin.guest:id,full_name'
        ])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('checkindetails/index', [
            'checkindetails' => $checkindetails,
            'checkins' => $checkins,
            'services' => $services,
        ]);
    }

    public function create() {}

    public function store(Request $request)
    {
        // 1. Validamos los datos de entrada incluyendo la nueva fecha
        $validated = $request->validate([
            'checkin_id' => 'required|exists:checkins,id',
            'service_id' => 'required|exists:services,id',
            'quantity' => 'required|integer|min:1',
            'consumed_at' => 'nullable|date', // NUEVO: Atrapa la fecha desde React
        ]);

        // Asignamos la fecha enviada desde el front, o la hora actual si viene vacía
        $fechaConsumo = $validated['consumed_at'] ?? now();

        $service = \App\Models\Service::findOrFail($validated['service_id']);

        // 2. Buscador estricto por auditoría (Módulo 2)
        // Solo sumará cantidades si el servicio se consumió EXACTAMENTE en el mismo momento.
        $detalleExistente = \App\Models\CheckinDetail::where('checkin_id', $validated['checkin_id'])
            ->where('service_id', $validated['service_id'])
            ->where('consumed_at', $fechaConsumo) // Condición de trazabilidad
            ->first();

        if ($detalleExistente) {
            $detalleExistente->quantity += $validated['quantity'];
            $detalleExistente->save();
            $nuevoDetalle = $detalleExistente;
        } else {
            // 3. Crear el registro inborrable
            $nuevoDetalle = \App\Models\CheckinDetail::create([
                'checkin_id' => $validated['checkin_id'],
                'service_id' => $validated['service_id'],
                'quantity' => $validated['quantity'],
                'selling_price' => $service->price,
                'consumed_at' => $fechaConsumo // NUEVO: Registro de tiempo explícito
            ]);
        }

        // --- SOLUCIÓN INTELIGENTE ---
        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json($nuevoDetalle, 201);
        }

        return redirect()->back()->with('success', 'Servicio agregado correctamente con fecha de consumo.');
    }

    public function update(Request $request, $id)
    {
        $detail = CheckinDetail::findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            'service_id' => 'required|exists:services,id',
            'consumed_at' => 'nullable|date', // NUEVO: Permitir corregir la fecha
        ]);

        // Actualizamos los campos
        $detail->update([
            'quantity' => $validated['quantity'],
            'service_id' => $validated['service_id'],
            'consumed_at' => $validated['consumed_at'] ?? $detail->consumed_at, // Mantiene la fecha si no se envía una nueva
        ]);

        return Redirect::back()->with('success', 'Consumo y fecha actualizados correctamente.');
    }

    public function destroy($id)
    {
        $detail = CheckinDetail::findOrFail($id);
        $detail->delete();

        return Redirect::back()->with('success', 'Consumo eliminado.');
    }

    public function listByCheckin($checkin_id)
    {
        $details = CheckinDetail::with('service')
            ->where('checkin_id', $checkin_id)
            ->orderBy('consumed_at', 'desc') // NUEVO: Ordenado por fecha real de consumo, no de creación
            ->get();

        return response()->json($details);
    }
}