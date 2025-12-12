<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\RoomType;
use App\Models\Block;
use App\Models\Floor;
use App\Models\Price;
use App\Models\Room;
use App\Models\Guest;
use App\Models\Service;
use App\Models\Checkin;
use App\Models\CheckinDetail;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');

        $this->command->warn('----------------------------------------------------');
        $this->command->warn('🔥 INICIANDO PRUEBA DE ESTRÉS (CORE OPERATIVO) 🔥');
        $this->command->warn('----------------------------------------------------');

        // ==========================================
        // 1. USUARIOS
        // ==========================================
        User::create([
            'nickname' => 'aaron_admin',
            'full_name' => 'Aaron Mendoza',
            'phone' => '70000000',
            'address' => 'Av. Cívica',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        for ($i = 1; $i <= 20; $i++) {
            User::create([
                'nickname' => "recep_{$i}",
                'full_name' => $faker->name,
                'phone' => $faker->phoneNumber,
                'address' => $faker->address,
                'password' => Hash::make('12345678'),
                'is_active' => true,
            ]);
        }
        $this->command->info('✅ 21 Usuarios generados.');

        // ==========================================
        // 2. CONFIGURACIÓN (CORREGIDO AL INGLÉS)
        // ==========================================
        
        // CORRECCIÓN AQUÍ: Usamos los términos exactos de tu migración
        $types = ['single', 'double', 'triple', 'quadruple', 'matrimonial', 'group'];
        $typeModels = [];

        foreach ($types as $type) {
            $t = RoomType::create([
                'name' => $type,
                'capacity' => rand(1, 6),
                'description' => "Habitación tipo $type" // Esto es solo descripción, puede ir mixto
            ]);
            $typeModels[] = $t;
            
            Price::create(['room_type_id' => $t->id, 'bathroom_type' => 'private', 'amount' => rand(150, 350)]);
            Price::create(['room_type_id' => $t->id, 'bathroom_type' => 'shared', 'amount' => rand(60, 100)]);
        }

        $blockModels = [];
        $blockCodes = ['A', 'B', 'C']; // Mantenemos simple A, B, C
        foreach ($blockCodes as $code) {
            $blockModels[] = Block::create(['code' => $code, 'description' => "Pabellón $code"]);
        }

        $floorModels = [];
        for ($i = 0; $i < 4; $i++) { // 4 Pisos
            $floorModels[] = Floor::create(['name' => $i == 0 ? "Planta Baja" : "Piso $i"]);
        }

        $this->command->info('✅ Infraestructura configurada (Tipos EN, Bloques, Pisos).');

        // ==========================================
        // 3. HABITACIONES
        // ==========================================
        $allRooms = [];
        foreach ($blockModels as $block) {
            foreach ($floorModels as $index => $floor) {
                for ($i = 1; $i <= 5; $i++) {
                    $randomType = $faker->randomElement($typeModels);
                    $randomPrice = Price::where('room_type_id', $randomType->id)->inRandomOrder()->first();

                    $room = Room::create([
                        'number' => "{$block->code}-" . ($index * 100 + $i),
                        'room_type_id' => $randomType->id,
                        'block_id' => $block->id,
                        'floor_id' => $floor->id,
                        'price_id' => $randomPrice->id,
                        'status' => 'available',
                        'notes' => $faker->optional()->sentence,
                    ]);
                    $allRooms[] = $room;
                }
            }
        }
        $this->command->info('✅ ' . count($allRooms) . ' Habitaciones listas.');

        // ==========================================
        // 4. CLIENTES
        // ==========================================
        $allGuests = [];
        for ($i = 0; $i < 100; $i++) {
            $guest = Guest::create([
                'first_name' => $faker->firstName,
                'last_name' => $faker->lastName,
                'nationality' => 'Boliviana',
                'identification_number' => $faker->unique()->numberBetween(1000000, 9999999) . ' PT',
                'issued_in' => $faker->city,
                // CORRECCIÓN AQUÍ TAMBIÉN: Aseguramos minúsculas
                'civil_status' => $faker->randomElement(['single', 'married', 'divorced', 'widowed']),
                'age' => rand(18, 85),
                'profession' => $faker->jobTitle,
                'origin' => $faker->city,
            ]);
            $allGuests[] = $guest;
        }
        $this->command->info('✅ 100 Clientes registrados.');

        // ==========================================
        // 5. SERVICIOS
        // ==========================================
        $services = [];
        $serviceList = [
            ['Coca Cola 2L', 15], 
            ['Cerveza Paceña', 20], 
            ['Lavandería Express', 25], 
            ['Agua 2L', 10],
            ['Sandwich de Pollo', 12]
        ];

        foreach ($serviceList as $s) {
            $services[] = Service::create([
                'name' => $s[0],
                'status' => 'enabled',
                'price' => $s[1],
                'description' => 'Servicio a la habitación'
            ]);
        }
        $this->command->info('✅ Servicios creados.');

        // ==========================================
        // 6. CHECK-INS MASIVOS
        // ==========================================
        $this->command->info('⏳ Generando historial de hospedaje...');
        
        $recepcionistas = User::all();
        
        for ($i = 0; $i < 150; $i++) {
            $room = $faker->randomElement($allRooms);
            $guest = $faker->randomElement($allGuests);
            $user = $recepcionistas->random();
            
            $isCurrent = $i > 130; // Los últimos 20 son actuales

            $checkinDate = $isCurrent ? now() : $faker->dateTimeBetween('-6 months', '-1 week');
            
            $checkin = Checkin::create([
                'user_id' => $user->id,
                'guest_id' => $guest->id,
                'room_id' => $room->id,
                'check_in_date' => $checkinDate,
                'duration_days' => rand(1, 5),
                'notes' => $faker->sentence,
                'advance_payment' => rand(50, 200)
            ]);

            if ($isCurrent) {
                $room->update(['status' => 'occupied']);
            }

            // Consumos
            if (rand(0,1)) {
                $srv = $faker->randomElement($services);
                CheckinDetail::create([
                    'checkin_id' => $checkin->id,
                    'service_id' => $srv->id,
                    'quantity' => rand(1, 4),
                    'selling_price' => $srv->price,
                ]);
            }
        }

        $this->command->info('✅ 150 Estadías generadas.');

        // ==========================================
        // REPORTE FINAL
        // ==========================================
        $this->command->info('');
        $this->command->table(
            ['Tabla', 'Registros Totales', 'Estado'],
            [
                ['Users', User::count(), 'OK'],
                ['Config (Tipos)', RoomType::count(), 'OK'],
                ['Rooms', Room::count(), 'OK'],
                ['Guests', Guest::count(), 'OK'],
                ['Services', Service::count(), 'OK'],
                ['Checkins', Checkin::count(), 'OK'],
                ['CheckinDetails', CheckinDetail::count(), 'OK'],
            ]
        );
        $this->command->info('🎉 PRUEBA DE ESTRÉS COMPLETADA. CORE OPERATIVO LISTO.');
    }
}