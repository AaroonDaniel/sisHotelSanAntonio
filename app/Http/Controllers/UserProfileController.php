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

        $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            // Validamos que el nickname sea único, ignorando el del usuario actual
            'nickname' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $user->update($request->only('full_name', 'nickname', 'phone', 'address'));

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
