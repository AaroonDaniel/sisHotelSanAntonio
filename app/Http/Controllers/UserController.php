<?php

namespace App\Http\Controllers;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Muestra la lista de usuarios.
     */
    public function index(Request $request)
    {
        $users = User::with('roles')->orderBy('id', 'desc')->get();
        $roles = Role::all();

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles
        ]);
    }

   
    public function store(Request $request)
    {
        $request->validate([
            'nickname' => 'required|string|max:255|unique:users',
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'address' => 'required|string|max:255',
            'shift' => 'required|string|max:50',
            'role' => 'required|string|exists:roles,name',
        ]);

        // Generamos la contraseña inicial basada en el nickname (Ej: "jperez" -> "Jperez1234")
        $passwordInicial = ucfirst(strtolower($request->nickname)) . '1234';

        // CORRECCIÓN: Asignamos el resultado a la variable $user
        $user = User::create([
            'nickname' => $request->nickname,
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'address' => $request->address,
            'shift' => $request->shift,
            'password' => Hash::make($passwordInicial), // Encriptamos la contraseña inicial
            'is_active' => true,
            'must_change_password' => true,
            'password_changed_at' => now(),
        ]);

        // Ahora sí podemos asignarle el rol
        if ($request->role) {
            $user->assignRole($request->role);
        }

        // Devolvemos la contraseña generada en el mensaje para el administrador
        return redirect()->back()->with('success', "Usuario creado correctamente. Contraseña inicial: {$passwordInicial} (deberá cambiarla al iniciar sesión).");
    }

    /**
     * Actualiza un usuario existente.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'nickname' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($id)],
            'full_name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'address' => 'required|string|max:255',
            'shift' => 'required|string|max:50',
            'password' => 'nullable|string|min:4',
            'role' => 'required|string|exists:roles,name', // Validamos el rol
        ]);

        $user = User::findOrFail($id);

        $data = [
            'nickname' => $request->nickname,
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'address' => $request->address,
            'shift' => $request->shift,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
            $data['must_change_password'] = true;
            $data['password_changed_at'] = now();
        }

        $user->update($data);

        // CORRECCIÓN: Sincronizamos el nuevo rol del usuario
        if ($request->role) {
            // syncRoles borra el rol viejo y le pone el nuevo
            $user->syncRoles([$request->role]);
        }

        return redirect()->back()->with('success', 'Usuario actualizado correctamente.');
    }

    /**
     * Habilita o Deshabilita un usuario (Eliminado lógico)
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        if (Auth::id() === $user->id) {
            return redirect()->back()->with('error', 'No puedes desactivar tu propio usuario.');
        }

        // Protección adicional opcional: evitar apagar al Administrador
        if ($user->hasRole('Administrador')) {
            return redirect()->back()->with('error', 'Seguridad: No se puede desactivar al Administrador principal.');
        }

        $user->update([
            'is_active' => !$user->is_active
        ]);

        $mensaje = $user->is_active ? 'Usuario reactivado.' : 'Usuario desactivado.';
        return redirect()->back()->with('success', $mensaje);
    }
}
