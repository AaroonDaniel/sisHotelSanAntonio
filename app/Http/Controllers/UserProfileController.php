<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserProfileController extends Controller
{
    /**
     * Muestra la vista del perfil.
     */
    public function edit(Request $request)
    {
        return Inertia::render('profile/index', [
            'user' => $request->user(),
        ]);
    }

    /**
     * Actualiza la información personal del usuario logueado.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        // 1. Validamos los datos (Incluyendo el nuevo campo 'shift')
        $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            
            // Le decimos a Laravel que el nickname debe ser único, EXCEPTO para el ID de este usuario
            'nickname'  => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            
            'phone'     => ['required', 'string', 'max:50'],
            'address'   => ['required', 'string', 'max:255'],
            'shift'     => ['required', 'string', 'max:50'], // Validamos el turno
        ]);

        // 2. Guardamos los cambios en la base de datos
        $user->update([
            'full_name' => $request->full_name,
            'nickname'  => $request->nickname,
            'phone'     => $request->phone,
            'address'   => $request->address,
            'shift'     => $request->shift,
        ]);

        return back()->with('success', 'Perfil actualizado correctamente.');
    }

    /**
     * Actualiza la contraseña del usuario logueado.
     */
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', 'Contraseña actualizada correctamente.');
    }
}