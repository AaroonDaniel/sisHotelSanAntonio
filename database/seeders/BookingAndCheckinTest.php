<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\Floor;
use App\Models\Guest;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingAndCheckinTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Room $room;
    private Guest $guest;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create();
        
        $floor = Floor::create(['name' => 'Piso 1', 'is_active' => true]);
        $type = RoomType::create(['name' => 'Doble', 'capacity' => 2, 'is_active' => true]);
        
        $this->room = Room::create(['number' => '201', 'floor_id' => $floor->id, 'room_type_id' => $type->id, 'status' => 'LIBRE']);
        $this->guest = Guest::create(['full_name' => 'ANA LOPEZ', 'identification_number' => '11223344']);
    }

    public function test_public_online_booking_page_is_accessible(): void
    {
        $response = $this->get('/reservar');
        $response->assertStatus(200);
    }

    public function test_admin_can_create_internal_reservation(): void
    {
        $response = $this->actingAs($this->admin)->post('/reservas', [
            'is_new_guest' => false,
            'guest_id' => $this->guest->id,
            'guest_count' => 1,
            'arrival_date' => now()->addDays(2)->format('Y-m-d'),
            'duration_days' => 3,
            'payment_type' => 'EFECTIVO',
            'details' => [
                ['room_id' => $this->room->id, 'price' => 150]
            ]
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('reservations', ['guest_id' => $this->guest->id]);
        $this->assertDatabaseHas('rooms', ['id' => $this->room->id, 'status' => 'RESERVADO']);
    }

    public function test_admin_can_perform_direct_checkin(): void
    {
        $response = $this->actingAs($this->admin)->post('/checks', [
            'is_new_guest' => false,
            'guest_id' => $this->guest->id,
            'room_id' => $this->room->id,
            'duration_days' => 1,
            'origin' => 'COCHABAMBA',
            'price' => 200,
            'payment_type' => 'EFECTIVO',
            'advance_payment' => 200
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('checkins', ['guest_id' => $this->guest->id, 'room_id' => $this->room->id, 'status' => 'activo']);
        $this->assertDatabaseHas('rooms', ['id' => $this->room->id, 'status' => 'OCUPADO']);
        $this->assertDatabaseHas('payments', ['amount' => 200, 'type' => 'ADELANTO']);
    }

    public function test_checkout_frees_the_room_and_finalizes_checkin(): void
    {
        $checkin = \App\Models\Checkin::create([
            'guest_id' => $this->guest->id,
            'room_id' => $this->room->id,
            'user_id' => $this->admin->id,
            'check_in_date' => now(),
            'actual_arrival_date' => now(),
            'duration_days' => 1,
            'status' => 'activo'
        ]);
        
        $this->room->update(['status' => 'OCUPADO']);

        $response = $this->actingAs($this->admin)->put("/checks/{$checkin->id}/checkout");

        $this->assertDatabaseHas('checkins', ['id' => $checkin->id, 'status' => 'finalizado']);
        $this->assertDatabaseHas('rooms', ['id' => $this->room->id, 'status' => 'LIMPIEZA']);
    }
}