<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear usuario exclusivo para las reservas web
        User::firstOrCreate(
            ['nickname' => 'sistema_web'],
            [
                'full_name' => 'Sistema Web',
                'phone' => '00000000',      // Requerido por tu migración
                'address' => 'Sistema Web', // Requerido por tu migración
                'password' => \Illuminate\Support\Facades\Hash::make('password_sistema_123'),
                'shift' => 'Mañana'
            ]
        );
    }
}
