<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index(){
        // Traemos todos los roles y permisos 
        $roles = Role::with('permissions')->get();
        $permissions = Permission::all();

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function store(Request $request) {
        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'array'
        ]);
        $role = Role::create(['name' => $request->name]);

        if($request->has('permissions')){
            $role->syncPermissions($request->permissions);
        }
        return back()->with('success', 'Rol creado correctamente');
    }

    public function update(Request $request, Role $role) {
        if($role->name === 'Administrador'){
            return back()->with('error', 'No se puede modificar el rol de Administrador');
        }
        $request->validate([
            'name' => 'required|string|unique:roles,name,'.$role->id,
            'permissions' => 'array'
        ]);

        $role->update(['name' => $request->name]);

        if($request->has('permissions')){
            $role->syncPermissions($request->permissions);
        }

        return back()->with('success', 'Rol actualizado correctamente');
    }


    public function destroy($id) {
        try {
            // 1. Buscamos el rol manualmente (Evita errores de traducción de Laravel)
            $role = \Spatie\Permission\Models\Role::find($id);

            // 2. Si alguien intenta borrar un rol que ya no existe (o doble clic)
            if (!$role) {
                return back()->with('error', 'El cargo no existe o ya fue eliminado.');
            }

            // 3. Protección Nivel Dios
            if ($role->name === 'Administrador') {
                return back()->with('error', 'Seguridad: No se puede eliminar el cargo principal de Administrador.');
            }
            
            // 4. Eliminamos
            $role->delete();
            return back()->with('success', 'Cargo eliminado del sistema correctamente.');

        } catch (\Exception $e) {
            // 5. Si hay un error SQL (Ej: está atado a otro registro), no rompemos el JSON de React
            return back()->with('error', 'Error al eliminar el cargo: Puede que haya usuarios usándolo.');
        }
    }

}
