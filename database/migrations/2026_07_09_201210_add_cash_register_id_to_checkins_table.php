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
            // Vincula la asignación a la caja/turno que estaba abierto al
            // momento de crearla. Nullable porque no siempre habrá una caja
            // abierta (asignación no bloquea sin turno, a diferencia de
            // pagos y gastos, que sí lo exigen).
            $table->foreignId('cash_register_id')
                ->nullable()
                ->after('checkout_operator_id')
                ->constrained('cash_registers')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cash_register_id');
        });
    }
};
