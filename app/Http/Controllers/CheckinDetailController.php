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
        $validated = $request->validate([
            'checkin_id' => 'required|exists:checkins,id',
            'service_id' => 'required|exists:services,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $service = Service::findOrFail($validated['service_id']);

        // 1. Guardamos el registro en una variable
        $detail = CheckinDetail::create([
            'checkin_id' => $validated['checkin_id'],
            'service_id' => $validated['service_id'],
            'quantity' => $validated['quantity'],
            'selling_price' => $service->price
        ]);

        // 2. Si la petición quiere JSON (Axios), devolvemos el objeto con su ID
        if ($request->wantsJson()) {
            return response()->json($detail, 201);
        }

        // Retorno normal para Inertia (si se usara submit normal)
        return Redirect::back()->with('success', 'Servicio agregado correctamente.');
    }
    public function update(Request $request, $id)
    {
        $detail = CheckinDetail::findOrFail($id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
            // Si permites cambiar el servicio al editar, descomenta esto:
            'service_id' => 'required|exists:services,id',
        ]);

        // Actualizamos los campos
        $detail->update([
            'quantity' => $validated['quantity'],
            'service_id' => $validated['service_id'], // Actualiza servicio si cambió
        ]);

        // Opcional: Si cambia el servicio, ¿debería actualizarse el precio? 
        // Si es así, busca el servicio de nuevo y actualiza selling_price.

        return Redirect::back()->with('success', 'Consumo actualizado correctamente.');
    }

    /**
     * DESTROY: Elimina un consumo.
     * Ruta esperada: DELETE /checkin-details/{id}
     */
    public function destroy($id)
    {
        $detail = CheckinDetail::findOrFail($id);
        $detail->delete();

        return Redirect::back()->with('success', 'Consumo eliminado.');
    }

    // Lista los consumos de un check-in específico en formato JSON
    public function listByCheckin($checkin_id)
    {
        $details = CheckinDetail::with('service')
            ->where('checkin_id', $checkin_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($details);
    }
}
