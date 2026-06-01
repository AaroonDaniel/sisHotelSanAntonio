<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // ── Usuario exclusivo para las reservas web ──
        User::firstOrCreate(
            ['nickname' => 'sistema_web'],
            [
                'full_name' => 'Sistema Web',
                'phone' => '00000000',
                'address' => 'Sistema Web',
                'password' => Hash::make('password_sistema_123'),
                'shift' => 'Mañana',
            ]
        );

        // ── 1) Normalizar TODOS los roles a minúsculas (conserva ids y asignaciones) ──
        foreach (Role::all() as $r) {
            $lower = strtolower($r->name);
            if ($r->name !== $lower) {
                $r->name = $lower;
                $r->save();
            }
        }

        // ── 2) Crear permisos que faltan según la lista del tutor ──
        $extra = [
            'reportes.parte_diario',
            'reportes.cierre_caja',
            'facturas.ver_todas',
            'dashboard.ver',
            'huespedes.ver_todos',
            'auditoria.ver',
        ];
        foreach ($extra as $p) {
            Permission::findOrCreate($p, 'web');
        }

        // Corregir el permiso de precios mal escrito (precios.gestioanr -> precios.gestionar)
        $typo = Permission::where('name', 'precios.gestioanr')->first();
        if ($typo) {
            $typo->name = 'precios.gestionar';
            $typo->save();
        } else {
            Permission::findOrCreate('precios.gestionar', 'web');
        }

        // ── 3) Roles base ──
        $admin         = Role::findOrCreate('administrador', 'web');
        $gerente       = Role::findOrCreate('gerente', 'web');
        $recepcionista = Role::findOrCreate('recepcionista', 'web');

        // ── 4) RECEPCIONISTA (operativo) ──
        $recepcionista->syncPermissions([
            'huespedes.crear', 'huespedes.buscar', 'huespedes.ver',
            'reservas.crear', 'reservas.editar', 'reservas.cancelar',
            'checkin.realizar', 'checkout.realizar',
            'habitaciones.cambiar_estado', 'mantenimiento.notificar_averia',
            'caja.abrir', 'caja.cerrar', 'caja.registrar_pago',
            'gastos.registrar', 'facturar.emitir', 'recibos.imprimir',
            'reportes.parte_diario', 'reportes.cierre_caja',
        ]);

        // ── 5) GERENTE (supervisión / solo lectura) ──
        $gerente->syncPermissions([
            'dashboard.ver',
            'reportes.financiero', 'reportes.ocupacion', 'reportes.ventas',
            'reportes.parte_diario', 'reportes.cierre_caja',
            'huespedes.ver', 'huespedes.historial', 'huespedes.ver_todos',
            'reservas.ver_todos', 'checkins.ver_todos',
            'caja.ver_todo', 'facturas.ver_todas',
            'gastos.ver', 'gastos.aprobar',
            'anulaciones.autorizar',
            'habitaciones.estado_actual',
            'auditoria.ver',
        ]);

        // ── 6) ADMINISTRADOR: TODOS los permisos (+ Gate::before del provider) ──
        $admin->syncPermissions(Permission::all());

        // ── 7) Limpiar caché de permisos ──
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}