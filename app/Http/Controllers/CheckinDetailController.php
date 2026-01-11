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
     */
    public function index()
    {
        // Asegúrate de que la carpeta en resources/js/pages se llame 'checkin_details'
        return Inertia::render('checkin_details/index', [
            'checkinDetails' => CheckinDetail::with(['service', 'checkin.room', 'checkin.guest']) // Agregué relaciones útiles para la tabla
                ->latest()
                ->get(),
            'services' => Service::where('is_active', true)->get(),
        ]);
    }

    public function create()
    {
        // Nota: Si usas modales en el index, este método quizás no se use, 
        // pero si se usa, la ruta debe ser coherente.
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

    // Nota: cambié el parámetro $id a $checkinDetail para usar Route Model Binding si lo prefieres,
    // pero mantuve tu lógica con $id para no romper lo que ya tienes.
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