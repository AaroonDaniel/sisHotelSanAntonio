<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Inertia\Inertia;

class PermissionController extends Controller
{
    public function index(){
        $permissions = Permission::orderBy('name', 'asc')->get();

        return Inertia::render('permissions/index', [
            'permissions' => $permissions,
        ]);
    }

    public function store(Request $request) {
        $request->validate([
            'name' => 'required|string|unique:permissions,name|max:100', 
        ]);
        
        $name = strtolower(str_replace(' ', '_', $request->name));
        Permission::create(['name' => $name]);
        
        return back()->with('success', 'Permiso creado correctamente');
    }

    public function update(Request $request, Permission $permission) { 
        $request->validate([
            'name' => 'required|string|max:100|unique:permissions,name,'.$permission->id,
        ]);
        
        $name = strtolower(str_replace(' ', '_', $request->name));
        $permission->update(['name' => $name]);
        
        return back()->with('success', 'Permiso actualizado correctamente');
    }

    public function destroy(Permission $permission) {
        $permission->delete();
        return back()->with('success', 'Permiso eliminado correctamente');
    }
}