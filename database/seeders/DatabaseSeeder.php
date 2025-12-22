<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Usuario Administrador
        User::create([
            'nickname'  => 'admin',
            'full_name' => 'Administrador Principal',
            'phone'     => '70000001',
            'address'   => 'Oficina Gerencia',
            'password'  => 'admin123', // Se encripta automático por el cast 'hashed' en tu Modelo
            'is_active' => true,
        ]);

        // 2. Usuario Recepcionista
        User::create([
            'nickname'  => 'recepcion',
            'full_name' => 'Juan Perez',
            'phone'     => '60000002',
            'address'   => 'Mostrador Entrada',
            'password'  => 'recepcion123',
            'is_active' => true,
        ]);
        
        // Puedes llamar a otros seeders aquí si los creas después
        // $this->call([
        //     RoomTypeSeeder::class,
        // ]);
    }
}