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
    // ── 0) Limpiar caché de permisos ANTES de todo ──
    app(PermissionRegistrar::class)->forgetCachedPermissions();

    // ── 1) Crear roles base PRIMERO (antes de asignarlos a nadie) ──
    $admin         = Role::findOrCreate('administrador', 'web');
    $gerente       = Role::findOrCreate('gerente', 'web');
    $recepcionista = Role::findOrCreate('recepcionista', 'web');

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

    // ── Terminal Compartida (Kiosk Mode) ──
    $recepcion = User::firstOrCreate(
        ['nickname' => 'recepcion'],
        [
            'full_name' => 'Recepción',
            'phone' => '00000000',
            'address' => 'Terminal de Recepción',
            'password' => Hash::make('recepcion123'),
            'shift' => 'Terminal',
            'is_active' => true,
        ]
    );
    if (!$recepcion->hasRole('recepcionista')) {
        $recepcion->assignRole('recepcionista');
    }

    // ── Normalizar TODOS los roles a minúsculas ──
    foreach (Role::all() as $r) {
        $lower = strtolower($r->name);
        if ($r->name !== $lower) {
            $r->name = $lower;
            $r->save();
        }
    }

    // ── Crear permisos que faltan según la lista del tutor ──
    $extra = [
        'reportes.parte_diario',
        'reportes.camara_hotelera',
        'reportes.cierre_caja',
        'facturas.ver_todas',
        'dashboard.ver',
        'huespedes.ver_todos',
        'auditoria.ver',
        'config.gestionar',
        'usuarios.ver',
        'usuarios.gestionar',
        'roles.gestionar',
        'permisos.gestionar',
    ];
    foreach ($extra as $p) {
        Permission::findOrCreate($p, 'web');
    }

    // Corregir el permiso de precios mal escrito
    $typo = Permission::where('name', 'precios.gestioanr')->first();
    if ($typo) {
        $typo->name = 'precios.gestionar';
        $typo->save();
    } else {
        Permission::findOrCreate('precios.gestionar', 'web');
    }

    // ── Garantizar que TODOS los permisos usados existan ──
    // Reúne todos los permisos referenciados en los syncPermissions de abajo
    // y los crea si faltan (en base limpia no existen todavía).
    $todosLosPermisos = [
        // Recepcionista
        'huespedes.crear', 'huespedes.buscar', 'huespedes.ver',
        'reservas.crear', 'reservas.editar', 'reservas.cancelar',
        'checkin.realizar', 'checkout.realizar',
        'habitaciones.cambiar_estado', 'mantenimiento.notificar_averia',
        'caja.abrir', 'caja.cerrar', 'caja.registrar_pago',
        'gastos.registrar', 'facturar.emitir', 'recibos.imprimir',
        'reportes.parte_diario', 'reportes.camara_hotelera', 'reportes.cierre_caja',
        // Gerente
        'dashboard.ver', 'reportes.financiero', 'reportes.ocupacion', 'reportes.ventas',
        'huespedes.historial', 'huespedes.ver_todos',
        'reservas.ver_todos', 'checkins.ver_todos',
        'caja.ver_todo', 'facturas.ver_todas',
        'gastos.ver', 'gastos.aprobar', 'anulaciones.autorizar',
        'habitaciones.estado_actual', 'auditoria.ver',
        // Otros
        'config.gestionar', 'usuarios.ver', 'usuarios.gestionar',
        'roles.gestionar', 'permisos.gestionar', 'precios.gestionar',
    ];
    foreach ($todosLosPermisos as $p) {
        Permission::findOrCreate($p, 'web');
    }

    // ── RECEPCIONISTA (operativo) ──
    $recepcionista->syncPermissions([
        'huespedes.crear',
        'huespedes.buscar',
        'huespedes.ver',
        'reservas.crear',
        'reservas.editar',
        'reservas.cancelar',
        'checkin.realizar',
        'checkout.realizar',
        'habitaciones.cambiar_estado',
        'mantenimiento.notificar_averia',
        'caja.abrir',
        'caja.cerrar',
        'caja.registrar_pago',
        'gastos.registrar',
        'facturar.emitir',
        'recibos.imprimir',
        'reportes.parte_diario',
        'reportes.camara_hotelera',
        'reportes.cierre_caja',
    ]);

    // ── GERENTE (supervisión / solo lectura) ──
    $gerente->syncPermissions([
        'dashboard.ver',
        'reportes.financiero',
        'reportes.ocupacion',
        'reportes.ventas',
        'reportes.parte_diario',
        'reportes.camara_hotelera',
        'reportes.cierre_caja',
        'huespedes.ver',
        'huespedes.historial',
        'huespedes.ver_todos',
        'reservas.ver_todos',
        'checkins.ver_todos',
        'caja.ver_todo',
        'facturas.ver_todas',
        'gastos.ver',
        'gastos.aprobar',
        'anulaciones.autorizar',
        'habitaciones.estado_actual',
        'auditoria.ver',
    ]);

    // ── ADMINISTRADOR: TODOS los permisos ──
    $admin->syncPermissions(Permission::all());

    // ── ADMINISTRADOR DE SISTEMA: rol máximo ──
    $adminSistema = Role::findOrCreate('administrador_sistema', 'web');
    $adminSistema->syncPermissions(Permission::all());

    $aaron = User::where('nickname', 'aaron')->first();
    if ($aaron && !$aaron->hasRole('administrador_sistema')) {
        $aaron->assignRole('administrador_sistema');
    }

    // ── Limpiar caché de permisos al final también ──
    app(PermissionRegistrar::class)->forgetCachedPermissions();
}
}
