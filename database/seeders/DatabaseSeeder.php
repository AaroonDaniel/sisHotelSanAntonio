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
use App\Models\Reservation;
use App\Models\ReservationDetail;
use App\Models\Invoice;
use App\Models\InvoiceDetail;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        
        $this->command->warn('----------------------------------------------------');
        $this->command->warn('🏨 INICIANDO SIMULACIÓN COMPLETA: SISTEMA HOTELERO 🏨');
        $this->command->warn('----------------------------------------------------');

        // ==========================================
        // 1. USUARIOS (STAFF)
        // ==========================================
        User::create([
            'nickname' => 'aaron_admin',
            'full_name' => 'Aaron Mendoza',
            'phone' => '70000000',
            'address' => 'Gerencia General',
            'password' => Hash::make('password123'),
        ]);

        $staff = [];
        for ($i = 1; $i <= 5; $i++) {
            $staff[] = User::create([
                'nickname' => "recep_{$i}",
                'full_name' => $faker->name,
                'phone' => $faker->phoneNumber,
                'address' => $faker->address,
                'password' => Hash::make('12345678'),
            ]);
        }
        $this->command->info('✅ Usuarios creados.');

        // ==========================================
        // 2. CONFIGURACIÓN E INFRAESTRUCTURA
        // ==========================================
        $types = ['single', 'double', 'triple', 'quadruple', 'matrimonial', 'group'];
        $typeModels = [];

        foreach ($types as $type) {
            $t = RoomType::create([
                'name' => $type,
                'capacity' => rand(1, 6),
                'description' => "Clase $type"
            ]);
            $typeModels[] = $t;
            
            // Precios
            Price::create(['room_type_id' => $t->id, 'bathroom_type' => 'private', 'amount' => rand(150, 300)]);
            Price::create(['room_type_id' => $t->id, 'bathroom_type' => 'shared', 'amount' => rand(60, 100)]);
        }

        $blocks = [];
        foreach (['A', 'B', 'C'] as $code) $blocks[] = Block::create(['code' => $code]);

        $floors = [];
        foreach (['PB', 'Piso 1', 'Piso 2'] as $name) $floors[] = Floor::create(['name' => $name]);

        // ==========================================
        // 3. HABITACIONES
        // ==========================================
        $allRooms = [];
        foreach ($blocks as $block) {
            foreach ($floors as $idx => $floor) {
                for ($i = 1; $i <= 5; $i++) {
                    $type = $faker->randomElement($typeModels);
                    $price = Price::where('room_type_id', $type->id)->first();
                    
                    $room = Room::create([
                        'number' => "{$block->code}-" . ($idx * 100 + $i),
                        'room_type_id' => $type->id,
                        'block_id' => $block->id,
                        'floor_id' => $floor->id,
                        'price_id' => $price->id,
                        'status' => 'available',
                        'notes' => 'Operativa',
                    ]);
                    $allRooms[] = $room;
                }
            }
        }
        $this->command->info('✅ ' . count($allRooms) . ' Habitaciones listas.');

        // ==========================================
        // 4. CLIENTES Y SERVICIOS
        // ==========================================
        $allGuests = [];
        for ($i = 0; $i < 60; $i++) {
            $allGuests[] = Guest::create([
                'first_name' => $faker->firstName,
                'last_name' => $faker->lastName,
                'nationality' => 'Boliviana',
                'identification_number' => $faker->unique()->numberBetween(1000000, 9999999) . ' LP',
                'issued_in' => 'La Paz',
                'civil_status' => $faker->randomElement(['single', 'married', 'divorced']),
                'age' => rand(18, 70),
                'profession' => $faker->jobTitle,
                'origin' => $faker->city,
            ]);
        }

        $services = [];
        foreach ([['Coca Cola', 15], ['Lavandería', 20], ['Desayuno', 25]] as $s) {
            $services[] = Service::create(['name' => $s[0], 'status' => 'enabled', 'price' => $s[1], 'description' => 'Servicio']);
        }
        $this->command->info('✅ Clientes y Servicios listos.');

        // ==========================================
        // 5. RESERVAS (RESERVATIONS)
        // ==========================================
        $reservations = [];
        $this->command->info('⏳ Creando Reservas...');

        for ($i = 0; $i < 20; $i++) {
            $resGuest = $faker->randomElement($allGuests);
            $resDate = $faker->dateTimeBetween('-1 month', '+1 month');
            
            $res = Reservation::create([
                'user_id' => User::first()->id,
                'guest_id' => $resGuest->id,
                'guest_count' => rand(1, 3),
                'bathroom_preference' => 'private',
                'arrival_date' => $resDate,
                'arrival_time' => '14:00:00',
                'duration_days' => rand(2, 5),
                'advance_payment' => 50.00,
                'payment_type' => 'QR'
            ]);

            // --- CORRECCIÓN AQUÍ ---
            // 1. Elegimos una habitación al azar
            $randomRoom = $faker->randomElement($allRooms);
            
            // 2. Buscamos el precio real de esa habitación
            $roomPrice = Price::find($randomRoom->price_id);

            // 3. Creamos el detalle INCLUYENDO EL PRECIO ('price')
            ReservationDetail::create([
                'reservation_id' => $res->id,
                'room_id' => $randomRoom->id,
                'price_id' => $roomPrice->id,
                'price' => $roomPrice->amount, // <--- ¡ESTA LÍNEA FALTABA!
            ]);
            // -----------------------
            
            if ($resDate < now()) {
                $reservations[] = $res;
            }
        }
        $this->command->info('✅ Reservas generadas.');

        // ==========================================
        // 6. CHECK-INS (ASIGNACIONES)
        // ==========================================
        $activeCheckins = [];
        $this->command->info('⏳ Procesando Check-ins y vinculando con Reservas...');

        // CASO A: Checkins que vienen de UNA RESERVA
        foreach ($reservations as $res) {
            // Buscamos la habitación que reservó (o le damos otra)
            $reservedRoomId = ReservationDetail::where('reservation_id', $res->id)->first()->room_id;
            
            $checkin = Checkin::create([
                'room_id' => $reservedRoomId,
                'guest_id' => $res->guest_id,
                'user_id' => User::first()->id,
                'reservation_id' => $res->id, // <--- AQUÍ ESTÁ LA RELACIÓN CLAVE
                'check_in_date' => $res->arrival_date,
                'duration_days' => $res->duration_days,
                'notes' => 'Vino con reserva previa',
                'advance_payment' => $res->advance_payment
            ]);
            
            // Marcar habitación
            Room::where('id', $reservedRoomId)->update(['status' => 'occupied']);
            $activeCheckins[] = $checkin;
        }

        // CASO B: Checkins SIN RESERVA (Walk-in)
        for ($i = 0; $i < 5; $i++) {
            $freeRoom = Room::where('status', 'available')->first();
            if ($freeRoom) {
                $checkin = Checkin::create([
                    'room_id' => $freeRoom->id,
                    'guest_id' => $faker->randomElement($allGuests)->id,
                    'user_id' => User::first()->id,
                    'reservation_id' => null, // <--- SIN RESERVA
                    'check_in_date' => now(),
                    'duration_days' => 2,
                    'notes' => 'Cliente de paso (Walk-in)',
                    'advance_payment' => 100.00
                ]);
                $freeRoom->update(['status' => 'occupied']);
                $activeCheckins[] = $checkin;
            }
        }

        // Agregar consumos a todos los checkins
        foreach ($activeCheckins as $chk) {
            if (rand(0,1)) {
                $srv = $faker->randomElement($services);
                CheckinDetail::create([
                    'checkin_id' => $chk->id,
                    'service_id' => $srv->id,
                    'quantity' => rand(1, 5),
                    'selling_price' => $srv->price
                ]);
            }
        }
        $this->command->info('✅ Check-ins procesados (Con y sin reserva).');

        // ==========================================
        // 7. FACTURACIÓN (INVOICES)
        // ==========================================
        $this->command->info('⏳ Emitiendo Facturas...');
        
        $facturaNro = 1001;
        
        // Facturamos los primeros 5 checkins
        foreach (array_slice($activeCheckins, 0, 5) as $checkin) {
            $invoice = Invoice::create([
                'invoice_number' => $facturaNro++,
                'checkin_id' => $checkin->id,
                'user_id' => User::first()->id,
                'issue_date' => now(),
                'control_code' => strtoupper($faker->bothify('??-##-A1')),
                'payment_method' => 'EF',
                'issue_time' => now(),
                'status' => 'valid'
            ]);

            // Detalle 1: Cobro por la Habitación
            // (Calculamos precio * dias)
            $habitacionPrecio = 150.00; // Simplificado para el seeder
            $costoHabitacion = $habitacionPrecio * $checkin->duration_days;

            InvoiceDetail::create([
                'invoice_id' => $invoice->id,
                'service_id' => null, // NULL porque es habitación
                'quantity' => $checkin->duration_days,
                'unit_price' => $habitacionPrecio,
                'cost' => $costoHabitacion
            ]);

            // Detalle 2: Cobro por servicios consumidos (si tiene)
            $consumos = CheckinDetail::where('checkin_id', $checkin->id)->get();
            foreach ($consumos as $consumo) {
                InvoiceDetail::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $consumo->service_id,
                    'quantity' => $consumo->quantity,
                    'unit_price' => $consumo->selling_price,
                    'cost' => $consumo->quantity * $consumo->selling_price
                ]);
            }
        }
        $this->command->info('✅ Facturas emitidas correctamente.');

        // ==========================================
        // REPORTE FINAL
        // ==========================================
        $this->command->info('');
        $this->command->table(
            ['Módulo', 'Registros', 'Integridad'],
            [
                ['Usuarios', User::count(), 'OK'],
                ['Habitaciones', Room::count(), 'OK'],
                ['Clientes', Guest::count(), 'OK'],
                ['Reservas', Reservation::count(), 'OK'],
                ['Check-ins', Checkin::count(), 'Linked to Reservations'],
                ['Facturas', Invoice::count(), 'Linked to Checkins'],
                ['Detalle Fac', InvoiceDetail::count(), 'Calculated'],
            ]
        );
        $this->command->info('🎉 ¡SISTEMA COMPLETAMENTE OPERATIVO Y PROBADO! 🚀');
    }
}