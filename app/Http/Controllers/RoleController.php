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


    public function destroy(Role $role) {
        if ($role->name === 'Administrador') {
            return back()->with('error', 'No se puede eliminar el rol de Administrador');
        }
        $role->delete();
        return back()->with('success', 'Rol eliminado correctamente');
    }

}
