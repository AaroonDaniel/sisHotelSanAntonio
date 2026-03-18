<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Muestra la lista de usuarios.
     */
    public function index(Request $request)
    {
        $users = User::orderBy('id', 'desc')->get();

        // DEBE SER TODO MINÚSCULAS para que coincida con tu carpeta y archivo
        return Inertia::render('users/index', [
            'users' => $users
        ]);
    }

    /**
     * Guarda un nuevo usuario.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nickname' => 'required|string|max:255|unique:users',
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'address' => 'required|string|max:255',
            'password' => 'required|string|min:8',
        ]);

        User::create([
            'nickname' => $request->nickname,
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'address' => $request->address,
            'password' => Hash::make($request->password), // Encriptamos la contraseña
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Usuario creado correctamente.');
    }

    /**
     * Actualiza un usuario existente.
     */
    public function update(Request $request, User $user)
    {
        $request->validate([
            'nickname' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'address' => 'required|string|max:255',
            'password' => 'nullable|string|min:8', // Opcional al editar
        ]);

        // Datos básicos a actualizar
        $data = [
            'nickname' => $request->nickname,
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'address' => $request->address,
        ];

        // Si escribió una nueva contraseña, la encriptamos y la agregamos
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return redirect()->back()->with('success', 'Usuario actualizado correctamente.');
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Usamos la Facade Auth que Intelephense sí reconoce
        if (Auth::id() === $user->id) {
            return redirect()->back()->with('error', 'No puedes desactivar tu propio usuario.');
        }

        $user->update([
            'is_active' => !$user->is_active
        ]);

        $mensaje = $user->is_active ? 'Usuario reactivado.' : 'Usuario desactivado.';
        return redirect()->back()->with('success', $mensaje);
    }
}