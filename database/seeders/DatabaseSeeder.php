<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
        // GuestSeeder::class, // Coméntalo si no quieres borrar/duplicar clientes
        // RoomSeeder::class,  // Coméntalo si tus habitaciones ya están creadas
        CheckinSeeder::class,  // Solo corre este para generar datos de prueba
    ]);
    }
}