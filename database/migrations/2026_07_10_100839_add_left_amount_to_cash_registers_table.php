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
        Schema::table('cash_registers', function (Blueprint $table) {
            // NULL = no se preguntó (turnos antiguos) / aún no cerrado.
            // 0 = se preguntó y dijo que no deja nada. >0 = monto dejado
            // en caja física para el siguiente operador.
            $table->decimal('left_amount', 10, 2)->nullable()->after('closed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropColumn('left_amount');
        });
    }
};
