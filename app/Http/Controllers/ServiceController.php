<?php

namespace App\Http\Controllers;

use App\Models\Service; // Asegúrate de tener el modelo Service
use Illuminate\Http\Request;
use Inertia\Inertia;

class ServiceController extends Controller
{
    public function index()
    {
        // Enviamos los servicios ordenados por los más recientes
        $services = Service::orderBy('created_at', 'desc')->get();

        return Inertia::render('services/index', [
            'Services' => $services,
        ]);
    }

    public function create()
    {
        // Si tuvieras una página separada para crear, iría aquí.
        // Como usas modal, esto no se usa mucho, pero lo dejamos por si acaso.
        return Inertia::render('services/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'quantity' => 'nullable|integer|min:0',
        ]);

        // --- CORRECCIÓN FINAL ---
        // Usamos 'enabled' porque es lo que dice tu migración
        $validated['quantity'] = $validated['quantity'] ?? 0;
        $validated['status'] = 'enabled'; 
        
        $validated['is_active'] = true;

        Service::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Service $service)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'quantity' => 'nullable|integer|min:0',
        ]);

        $validated['quantity'] = $validated['quantity'] ?? 0;

        $service->update($validated);

        return redirect()->back();
    }

    public function destroy(Service $service)
    {
        $service->delete();
        return redirect()->back();
    }

    public function toggleStatus(Service $service)
    {
        $service->update(['is_active' => !$service->is_active]);
        return redirect()->back();
    }
}