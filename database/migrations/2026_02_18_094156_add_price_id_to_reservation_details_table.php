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
        Schema::table('reservation_details', function (Blueprint $table) {
            // Agregamos la columna price_id relacionada con la tabla prices
            // La ponemos 'nullable' por si tienes reservas antiguas sin este dato
            $table->foreignId('price_id')
                  ->nullable()
                  ->after('room_id') // Para ordenar visualmente en la BD
                  ->constrained('prices')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservation_details', function (Blueprint $table) {
            // Eliminar la clave foránea primero y luego la columna
            $table->dropForeign(['price_id']);
            $table->dropColumn('price_id');
        });
    }
};