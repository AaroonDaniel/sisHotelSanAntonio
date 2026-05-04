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
        Schema::create('reservation_guests', function (Blueprint $table) {
            $table->id();
            
            // Relación con la tabla reservas (si se borra la reserva, se borra este registro)
            $table->foreignId('reservation_id')->constrained('reservations')->onDelete('cascade');
            
            // Relación con el titular (huésped) de la reserva
            $table->foreignId('guest_id')->constrained('guests')->onDelete('cascade');
            
            // El campo de correo electrónico exclusivo para la reserva online
            $table->string('email');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservation_guests');
    }
};