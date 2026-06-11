<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleAndPermissionSeeder::class, // Roles y permisos: SIEMPRE primero
            // GuestSeeder::class, // Coméntalo si no quieres borrar/duplicar clientes
            // RoomSeeder::class,  // Coméntalo si tus habitaciones ya están creadas
            // CheckinSeeder::class, // Datos de PRUEBA: comentado para producción
        ]);
    }
}
