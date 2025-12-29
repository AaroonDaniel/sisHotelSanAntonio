<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // USUARIO 1
        User::create([
            'nickname'  => 'Ricardo', // <--- IMPORTANTE: Todo en minúscula
            'full_name' => 'DON RICARDO',
            'phone'     => '70000001',
            'address'   => 'Oficina Gerencia',
            'password'  => '123',     // <--- IMPORTANTE: Texto plano (sin Hash::make)
            'is_active' => true,
        ]);

        // USUARIO 2
        User::create([
            'nickname'  => 'Carlos',  // <--- Minúscula
            'full_name' => 'RECEPCION CARLOS',
            'phone'     => '60000002',
            'address'   => 'Mostrador Entrada',
            'password'  => '123',     // <--- Texto plano
            'is_active' => true,
        ]);

        // USUARIO 3
        User::create([
            'nickname'  => 'Raul',    // <--- Minúscula
            'full_name' => 'RAUL RECEPCION',
            'phone'     => '60000003',
            'address'   => 'Mostrador Entrada',
            'password'  => '123',     // <--- Texto plano
            'is_active' => true,
        ]);
    }
}