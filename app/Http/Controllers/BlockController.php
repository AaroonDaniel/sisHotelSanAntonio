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
        $validated = $request->validate([
            'code' => 'required|string|max:10|unique:blocks,code', 
            'description' => 'nullable|string',
        ]);

        Block::create($validated);
        
        return redirect()->route('blocks.index');  
    }

    // --- FUNCIONES QUE TE FALTABAN ---

    public function update(Request $request, Block $block)
    {
        // 1. Validar (Importante: ignorar el ID actual en la validación unique)
        $validated = $request->validate([
            'code' => 'required|string|max:10|unique:blocks,code,' . $block->id,
            'description' => 'nullable|string',
        ]);

        // 2. Actualizar en BD
        $block->update($validated);

        // 3. Redirigir
        return redirect()->route('blocks.index');
    }

    public function destroy(Block $block)
    {
        // 1. Eliminar de BD
        $block->delete();

        // 2. Redirigir
        return redirect()->route('blocks.index');
    }

    // Estas las puedes dejar vacías o borrarlas si no las usas
    public function show(Block $block) {}
    public function edit(Block $block) {}
}