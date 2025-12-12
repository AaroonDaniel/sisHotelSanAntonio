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

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. CREAR USUARIO (RECEPCIONISTA)
        // Probamos que funcione el nickname y la contraseña
        $recepcionista = User::create([
            'nickname' => 'aaron_admin',
            'full_name' => 'Aaron Mendoza',
            'phone' => '70000000',
            'address' => 'Av. Cívica',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);
        
        $this->command->info('1. Usuario creado: ' . $recepcionista->nickname);

        // 2. CONFIGURACIÓN DEL HOTEL
        // Tipos de Habitación
        $tipoSimple = RoomType::create([
            'name' => 'single',
            'capacity' => 1,
            'description' => 'Habitación para una persona'
        ]);

        $tipoMatrimonial = RoomType::create([
            'name' => 'matrimonial',
            'capacity' => 2,
            'description' => 'Cama de dos plazas'
        ]);

        // Bloques y Pisos
        $bloqueA = Block::create(['code' => 'A', 'description' => 'Bloque Principal']);
        $piso1 = Floor::create(['name' => 'Primer Piso']);

        // Precios (Vinculamos Tipo con Precio)
        // Precio para Simple con Baño Privado
        $precioSimplePrivado = Price::create([
            'room_type_id' => $tipoSimple->id,
            'bathroom_type' => 'private',
            'amount' => 100.00
        ]);

        // Precio para Matrimonial con Baño Privado
        $precioMatriPrivado = Price::create([
            'room_type_id' => $tipoMatrimonial->id,
            'bathroom_type' => 'private',
            'amount' => 180.00
        ]);

        $this->command->info('2. Configuración (Tipos, Bloques, Precios) creada.');

        // 3. CREAR HABITACIÓN
        // Probamos las relaciones: Room -> Type, Block, Floor, Price
        $habitacion101 = Room::create([
            'number' => '101',
            'room_type_id' => $tipoSimple->id,
            'block_id' => $bloqueA->id,
            'floor_id' => $piso1->id,
            'price_id' => $precioSimplePrivado->id, // Precio por defecto
            'status' => 'available',
            'notes' => 'Vista a la calle',
        ]);

        $this->command->info('3. Habitación creada: ' . $habitacion101->number);

        // 4. CREAR CLIENTE
        $cliente = Guest::create([
            'first_name' => 'Juan',
            'last_name' => 'Perez',
            'nationality' => 'Boliviana',
            'identification_number' => '8888888 LP',
            'issued_in' => 'La Paz',
            'civil_status' => 'single',
            'age' => 30,
            'profession' => 'Ingeniero',
            'origin' => 'La Paz', // Procedencia
        ]);

        $this->command->info('4. Cliente creado: ' . $cliente->first_name);

        // 5. CREAR SERVICIO
        $cocaCola = Service::create([
            'name' => 'Coca Cola 2L',
            'status' => 'enabled',
            'price' => 15.00,
            'description' => 'Botella retornable'
        ]);

        $this->command->info('5. Servicio creado: ' . $cocaCola->name);

        // 6. REALIZAR CHECK-IN (LA PRUEBA MAESTRA)
        // Aquí probamos que las tablas Checkin unan User, Guest y Room correctamente
        $checkin = Checkin::create([
            'user_id' => $recepcionista->id,
            'guest_id' => $cliente->id,
            'room_id' => $habitacion101->id,
            'check_in_date' => now(), // Hora actual
            'duration_days' => 2,
            'notes' => 'Cliente VIP',
            'advance_payment' => 50.00 // Dejó 50bs de adelanto
        ]);

        // Actualizamos estado de la habitación (Simulación manual por ahora)
        $habitacion101->update(['status' => 'occupied']);

        $this->command->info('6. CHECK-IN EXITOSO: ID ' . $checkin->id);

        // 7. REGISTRAR CONSUMO (CheckinDetail)
        CheckinDetail::create([
            'checkin_id' => $checkin->id,
            'service_id' => $cocaCola->id,
            'quantity' => 2, // Pidió 2 cocas
            'selling_price' => $cocaCola->price, // Precio congelado (15.00)
        ]);

        $this->command->info('7. Consumo registrado: 2 Coca Colas cargadas a la habitación.');
        $this->command->info('--- PRUEBA DE RELACIONES COMPLETADA EXITOSAMENTE ---');
    }
}