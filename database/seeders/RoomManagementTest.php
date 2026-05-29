<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Room;
use App\Models\Floor;
use App\Models\RoomType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['is_active' => true]);
    }

    public function test_admin_can_view_rooms_page(): void
    {
        $response = $this->actingAs($this->admin)->get('/habitaciones');
        $response->assertStatus(200);
    }

    public function test_admin_can_create_a_room(): void
    {
        $floor = Floor::create(['name' => 'Piso 1', 'is_active' => true]);
        $type = RoomType::create(['name' => 'Matrimonial', 'capacity' => 2, 'is_active' => true]);

        $response = $this->actingAs($this->admin)->post('/habitaciones', [
            'number' => '101',
            'floor_id' => $floor->id,
            'room_type_id' => $type->id,
            'status' => 'LIBRE',
            'details' => 'Vista a la calle'
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('rooms', ['number' => '101', 'status' => 'LIBRE']);
    }

    public function test_room_can_be_put_into_maintenance(): void
    {
        $floor = Floor::create(['name' => 'Piso 1', 'is_active' => true]);
        $type = RoomType::create(['name' => 'Simple', 'capacity' => 1, 'is_active' => true]);
        $room = Room::create(['number' => '102', 'floor_id' => $floor->id, 'room_type_id' => $type->id, 'status' => 'LIBRE']);

        $response = $this->actingAs($this->admin)->post("/rooms/{$room->id}/maintenance", [
            'reason' => 'Reparación de ducha'
        ]);

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'MANTENIMIENTO']);
        $this->assertDatabaseHas('maintenances', ['room_id' => $room->id, 'reason' => 'Reparación de ducha']);
    }

    public function test_room_maintenance_can_be_finished(): void
    {
        $floor = Floor::create(['name' => 'Piso 1', 'is_active' => true]);
        $type = RoomType::create(['name' => 'Simple', 'capacity' => 1, 'is_active' => true]);
        $room = Room::create(['number' => '103', 'floor_id' => $floor->id, 'room_type_id' => $type->id, 'status' => 'MANTENIMIENTO']);

        $response = $this->actingAs($this->admin)->put("/rooms/{$room->id}/finish-maintenance");

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'LIMPIEZA']);
    }

    public function test_room_can_be_marked_as_clean(): void
    {
        $floor = Floor::create(['name' => 'Piso 1', 'is_active' => true]);
        $type = RoomType::create(['name' => 'Simple', 'capacity' => 1, 'is_active' => true]);
        $room = Room::create(['number' => '104', 'floor_id' => $floor->id, 'room_type_id' => $type->id, 'status' => 'LIMPIEZA']);

        $response = $this->actingAs($this->admin)->put("/rooms/{$room->id}/clean");

        $this->assertDatabaseHas('rooms', ['id' => $room->id, 'status' => 'LIBRE']);
    }
}