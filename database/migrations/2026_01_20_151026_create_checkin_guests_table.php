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
        Schema::create('checkin_guests', function (Blueprint $table) {
            $table->id();

            // Relacionamos la Estadía (Checkin)
            $table->foreignId('checkin_id')->constrained()->onDelete('cascade');

            // Relacionamos al Acompañante (Guest)
            $table->foreignId('guest_id')->constrained()->onDelete('cascade');

            // Guardamos qué es del titular (Hijo, Esposa, etc.)
            $table->string('relationship')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checkin_guests');
    }
};
