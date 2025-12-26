<?php

namespace App\Http\Controllers;

use App\Models\Guest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GuestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $guest = Guest::all();
        return Inertia::render('guests/index', [
            'Guests' => $guest
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('guests/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'last_name' => 'required|string|max:100',
            'first_name' => 'required|string|max:100',
            'nationality' => 'required|string|max:100',
            'identification_number' => 'required|string|max:50|unique:guests,identification_number',
            'issued_in' => 'required|string|max:100',
            'civil_status' => 'required|string|max:50',
            'age' => 'required|integer|min:0',
            'profession' => 'required|string|max:100',
            'origin' => 'required|string|max:100',
        ]);
        Guest::create($validated);
        return redirect()->route('guests.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Guest $guest)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Guest $guest)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Guest $guest)
    {
        $validated = $request->validate([
            'last_name' => 'required|string|max:100',
            'first_name' => 'required|string|max:100',
            'nationality' => 'required|string|max:100',
            'identification_number' => 'required|string|max:50|unique:guests,identification_number,' . $guest->id,
            'issued_in' => 'required|string|max:100',
            'civil_status' => 'required|string|max:50',
            'age' => 'required|integer|min:0',
            'profession' => 'required|string|max:100',
            'origin' => 'required|string|max:100',
        ]);
        $guest->update($validated);
        return redirect()->route('guests.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Guest $guest)
    {
        $guest->delete();
        return redirect()->route('guests.index');
    }

}
