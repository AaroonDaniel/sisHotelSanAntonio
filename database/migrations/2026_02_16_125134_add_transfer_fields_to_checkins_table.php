<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            // 1. Marca para saber si el huesped está "de paso" en esta habitación
            $table->boolean('is_temporary')->default(false)->after('status');

            // 2. Para saber de qué Check-in vino (El "Padre")
            $table->foreignId('parent_checkin_id')
                ->nullable()
                ->after('id')
                ->constrained('checkins')
                ->nullOnDelete();

            // 3. Para traer la deuda (o saldo a favor) de la habitación anterior
            // No usamos advance_payment para no ensuciar la caja diaria.
            $table->decimal('carried_balance', 10, 2)->default(0)->after('advance_payment');

            // 4. Motivo del cambio (opcional)
            $table->string('transfer_reason')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            //
        });
    }
};
