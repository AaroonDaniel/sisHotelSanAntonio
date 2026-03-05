<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservation_details', function (Blueprint $table) {
            // 1. Agregamos los campos temporales para saber qué tipo de cuarto pidió el huésped
            $table->unsignedBigInteger('requested_room_type_id')->nullable()->after('room_id');
            $table->string('requested_bathroom')->nullable()->after('requested_room_type_id');

            // 2. Hacemos que la habitación y el precio sean opcionales (nullable) para la "Reserva Rápida"
            $table->unsignedBigInteger('room_id')->nullable()->change();
            $table->unsignedBigInteger('price_id')->nullable()->change();
            $table->decimal('price', 8, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reservation_details', function (Blueprint $table) {
            // Si nos arrepentimos, borramos las columnas nuevas
            $table->dropColumn(['requested_room_type_id', 'requested_bathroom']);
            
            // Nota: Revertir el nullable de room_id puede ser complejo si ya hay datos nulos, 
            // por lo que usualmente lo dejamos así en el método down.
        });
    }
};