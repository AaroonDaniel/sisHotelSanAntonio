<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Guest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create();
    }

    public function test_admin_can_view_guests_list(): void
    {
        $response = $this->actingAs($this->admin)->get('/invitados');
        $response->assertStatus(200);
    }

    public function test_admin_can_register_new_guest(): void
    {
        $response = $this->actingAs($this->admin)->post('/invitados', [
            'full_name' => 'JUAN PEREZ',
            'identification_number' => '1234567',
            'issued_in' => 'LP',
            'nationality' => 'BOLIVIA',
            'civil_status' => 'SOLTERO',
            'birth_date' => '1990-01-01',
            'profession' => 'INGENIERO',
            'phone' => '77777777'
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('guests', ['identification_number' => '1234567']);
    }

    public function test_guest_validation_fails_without_identification(): void
    {
        $response = $this->actingAs($this->admin)->post('/invitados', [
            'full_name' => 'MARIA GOMEZ',
            // Falta identificación
        ]);

        $response->assertSessionHasErrors(['identification_number']);
    }

    public function test_admin_can_update_guest_information(): void
    {
        $guest = Guest::create([
            'full_name' => 'CARLOS RUIZ',
            'identification_number' => '9876543',
            'profile_status' => 'INCOMPLETE'
        ]);

        $response = $this->actingAs($this->admin)->put("/invitados/{$guest->id}", [
            'full_name' => 'CARLOS RUIZ ACTUALIZADO',
            'identification_number' => '9876543',
            'phone' => '66666666'
        ]);

        $this->assertDatabaseHas('guests', ['full_name' => 'CARLOS RUIZ ACTUALIZADO', 'phone' => '66666666']);
    }
}