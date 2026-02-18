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
        Schema::table('payments', function (Blueprint $table) {
            // 1. Agregamos la columna reservation_id (puede ser nula)
            // La colocamos después de checkin_id para mantener el orden
            $table->foreignId('reservation_id')
                  ->nullable()
                  ->after('checkin_id')
                  ->constrained()
                  ->onDelete('cascade');

            // 2. Modificamos checkin_id para que acepte valores nulos (nullable)
            // Esto es vital porque al pagar una reserva, aún no existe un checkin
            $table->unsignedBigInteger('checkin_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Revertimos los cambios si hacemos rollback
            $table->dropForeign(['reservation_id']);
            $table->dropColumn('reservation_id');

            // Volvemos a poner checkin_id como obligatorio (cuidado si hay datos nulos al revertir)
            $table->unsignedBigInteger('checkin_id')->nullable(false)->change();
        });
    }
};