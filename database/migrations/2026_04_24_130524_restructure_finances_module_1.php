<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. PREPARAR LA TABLA PAYMENTS
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('cash_register_id')->nullable()->constrained('cash_registers')->nullOnDelete();
            $table->dateTime('payment_date')->nullable(); // Guardará la fecha exacta del cobro
        });

        // 2. MIGRAR DATOS EXISTENTES (¡Para no perder el dinero ya registrado!)
        // Traspasamos los adelantos de Checkins
        $checkins = DB::table('checkins')
            ->whereNotNull('advance_payment')
            ->where('advance_payment', '>', 0)
            ->get();

        foreach ($checkins as $checkin) {
            DB::table('payments')->insert([
                'checkin_id' => $checkin->id,
                'user_id' => $checkin->user_id,
                'amount' => $checkin->advance_payment,
                'method' => 'Efectivo', // Por defecto para datos antiguos
                'type' => 'ADELANTO',
                'payment_date' => $checkin->created_at, // Usamos la fecha de creación como fecha de pago para los antiguos
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Traspasamos los adelantos de Reservas
        $reservations = DB::table('reservations')
            ->whereNotNull('advance_payment')
            ->where('advance_payment', '>', 0)
            ->get();

        foreach ($reservations as $reservation) {
            DB::table('payments')->insert([
                'reservation_id' => $reservation->id,
                'user_id' => $reservation->user_id,
                'amount' => $reservation->advance_payment,
                'method' => 'Efectivo',
                'type' => 'ADELANTO',
                'payment_date' => $reservation->created_at,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. LIMPIAR LAS TABLAS VIEJAS (Cortar el cordón umbilical)
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropColumn('advance_payment');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('advance_payment');
        });
    }

    public function down(): void
    {
        // Si nos arrepentimos, Laravel sabe cómo deshacerlo:
        Schema::table('checkins', function (Blueprint $table) {
            $table->decimal('advance_payment', 10, 2)->nullable()->default(0);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->decimal('advance_payment', 10, 2)->nullable()->default(0);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['cash_register_id']);
            $table->dropColumn(['cash_register_id', 'payment_date']);
        });
    }
};