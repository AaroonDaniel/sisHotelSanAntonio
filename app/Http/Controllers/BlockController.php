<?php

namespace App\Http\Controllers;

use App\Models\Block;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BlockController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $blocks = Block::all();
        return Inertia::render('blocks/index', [
            'blocks' => $blocks
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('blocks/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required/string/max:10',
            'description' => 'nullable/string',
        ]);
        Block::create($validated);
        return redirect()->route('blocks.index');  
    }

    /**
     * Display the specified resource.
     */
    public function show(Block $block)
    {
        
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Block $block)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Block $block)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Block $block)
    {
        //
    }
}
