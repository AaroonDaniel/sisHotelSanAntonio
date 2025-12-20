<?php

namespace App\Http\Controllers;

use App\Models\Block;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BlockController extends Controller
{
    public function index()
    {
        $blocks = Block::all();
        return Inertia::render('blocks/index', [
            'blocks' => $blocks
        ]);
    }

    public function create()
    {
        return Inertia::render('blocks/create');
    }

    public function store(Request $request)
    {
        // CORRECCIÓN 1: Validamos 'code', no 'name' (para coincidir con el React)
        // CORRECCIÓN 2: Usamos '|' para separar reglas, no '/'
        $validated = $request->validate([
            'code' => 'required|string|max:10', 
            'description' => 'nullable|string',
        ]);

        Block::create($validated);
        
        return redirect()->route('blocks.index');  
    }

    // ... (El resto de funciones vacías que tenías se quedan igual) ...
    public function show(Block $block) {}
    public function edit(Block $block) {}
    public function update(Request $request, Block $block) {}
    public function destroy(Block $block) {}
}