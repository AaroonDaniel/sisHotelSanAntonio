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
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('opening_amount', 10, 2); // Efectivo inicial
            $table->string('status')->default('ABIERTA'); // ABIERTA o CERRADA
            $table->timestamp('opened_at')->useCurrent(); // Se llena solo al crear
            $table->timestamp('closed_at')->nullable(); // Se llena al cerrar
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_registers');
    }
};
