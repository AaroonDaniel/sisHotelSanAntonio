<?php

namespace App\Http\Controllers;

use App\Models\Price;
use App\Models\RoomType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PriceController extends Controller
{
    public function index()
    {
        // No necesitas la variable $prices aquí si no la usas
        return Inertia::render('prices/index', [
            'Prices' => Price::with('roomType')->get(),
            'RoomTypes' => RoomType::where('is_active', true)->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'bathroom_type' => 'required|in:Privado,Compartido,private,shared', // Aceptamos ambos por seguridad
            'amount' => 'required|numeric|min:0',
        ]);
        
        // TRADUCCIÓN: Si viene en español, lo pasamos a inglés para la BD
        $mapBathroom = [
            'Privado' => 'private',
            'Compartido' => 'shared'
        ];
        if (isset($mapBathroom[$validated['bathroom_type']])) {
            $validated['bathroom_type'] = $mapBathroom[$validated['bathroom_type']];
        }

        $validated['is_active'] = true;

        Price::create($validated);
        return redirect()->back();
    }

    // CORRECCIÓN IMPORTANTE: Quitamos 'RoomType $roomType' de los argumentos
    public function update(Request $request, Price $price)
    {
        $validated = $request->validate([
            'room_type_id' => 'required|exists:room_types,id',
            'bathroom_type' => 'required|in:Privado,Compartido,private,shared',
            'amount' => 'required|numeric|min:0',
        ]);

        // TRADUCCIÓN (Igual que en store)
        $mapBathroom = [
            'Privado' => 'private',
            'Compartido' => 'shared'
        ];
        if (isset($mapBathroom[$validated['bathroom_type']])) {
            $validated['bathroom_type'] = $mapBathroom[$validated['bathroom_type']];
        }

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $price->update($validated);
        return redirect()->back();
    }

    public function destroy(Price $price)
    {
        $price->delete();
        return redirect()->back();
    }

    public function toggleStatus(Price $price)
    {
        $price->update(['is_active' => !$price->is_active]);
        return back();
    }
    
}