<?php

namespace App\Http\Controllers;

use App\Models\Price;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PriceController extends Controller
{
    public function index()
    {
        $prices = Price::all();
        // CORRECCIÓN 1: Respetamos tu carpeta 'prices/index' (minúscula como en la imagen)
        // PERO enviamos la variable 'Prices' (Mayúscula) para que React la entienda
        return Inertia::render('prices/index', [
            'Prices' => $prices 
        ]);
    }

    public function create()
    {
        return Inertia::render('prices/create');
    }

    public function store(Request $request)
    {
        // CORRECCIÓN 2: Validamos lo que envía el formulario (Privado/Compartido)
        $validated = $request->validate([
            'bathroom_type' => 'required|in:Privado,Compartido',
            'amount' => 'required|numeric|min:0',
        ]);
        
        // Agregamos el estado activo por defecto
        $validated['is_active'] = true;

        Price::create($validated);
        return redirect()->route('prices.index');
    }

    public function update(Request $request, Price $price)
    {
        $validated = $request->validate([
            'bathroom_type' => 'required|in:Privado,Compartido',
            'amount' => 'required|numeric|min:0',
        ]);

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $price->update($validated);
        return redirect()->route('prices.index');
    }

    public function destroy(Price $price)
    {
        $price->delete();
        return redirect()->route('prices.index');
    }

    // CORRECCIÓN 3: Agregamos la función Toggle
    public function toggleStatus(Price $price)
    {
        $price->update(['is_active' => !$price->is_active]);
        return back();
    }
}