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
        Schema::create('payments', function (Blueprint $table) {
        $table->id();
        $table->foreignId('checkin_id')->constrained()->onDelete('cascade');
        $table->foreignId('user_id')->constrained(); // Para saber qué recepcionista cobró (Cierre de caja)
        $table->decimal('amount', 10, 2);
        $table->string('method', 20); // 'EFECTIVO', 'QR', 'TARJETA', 'TRANSFERENCIA'
        $table->string('bank_name', 50)->nullable(); // 'BNB', 'BCP', etc.
        $table->string('type', 20)->default('PAGO'); // 'PAGO' o 'DEVOLUCION'
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
