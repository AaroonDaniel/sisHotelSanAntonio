<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('special_agreements', function (Blueprint $table) {
            $table->id();
            
            // Identificador estricto del tipo de trato
            $table->enum('type', ['corporativo', 'delegacion']); 
            
            // Precio acordado
            $table->decimal('agreed_price', 10, 2); 
            
            // Frecuencia de pago en números (días)
            $table->integer('payment_frequency_days')->default(0); 
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('special_agreements');
    }
};