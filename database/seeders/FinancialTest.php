<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\CashRegister;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create();
    }

    public function test_user_can_open_cash_register(): void
    {
        $response = $this->actingAs($this->admin)->post('/cash-registers/open', [
            'opening_amount' => 500
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('cash_registers', [
            'user_id' => $this->admin->id,
            'opening_amount' => 500,
            'status' => 'ABIERTA'
        ]);
    }

    public function test_user_cannot_open_two_registers_simultaneously(): void
    {
        CashRegister::create([
            'user_id' => $this->admin->id,
            'opening_amount' => 100,
            'opened_at' => now(),
            'status' => 'ABIERTA'
        ]);

        $response = $this->actingAs($this->admin)->post('/cash-registers/open', [
            'opening_amount' => 200
        ]);

        $response->assertSessionHasErrors(['error']);
    }

    public function test_admin_can_register_an_expense(): void
    {
        $response = $this->actingAs($this->admin)->post('/gastos', [
            'description' => 'Compra de suministros de limpieza',
            'amount' => 150.50
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('expenses', [
            'description' => 'Compra de suministros de limpieza',
            'amount' => 150.50
        ]);
    }

    public function test_daily_book_financial_report_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/reports/financial');
        $response->assertStatus(200);
    }
}