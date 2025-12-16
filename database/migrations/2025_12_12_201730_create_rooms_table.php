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
        Schema::create('rooms', function (Blueprint $table) {
            $table->id(); 
            $table->string('number')->unique();
            $table->foreignId('room_type_id')->constrained()->onDelete('restrict');
            $table->foreignId('block_id')->constrained()->onDelete('restrict');
            $table->foreignId('floor_id')->constrained()->onDelete('restrict'); 
            $table->foreignId('price_id')->constrained()->onDelete('restrict');
            $table->enum('status', [
                'available',    // libre
                'occupied',     // ocupado
                'reserved',     // reservado
                'cleaning',     // limpieza
                'maintenance',  // mantenimiento
                'disabled'      // inhabilitado
            ])->default('available');
            $table->string('notes')->nullable();
            $table->string('image_path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
