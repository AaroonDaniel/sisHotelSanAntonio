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
        Schema::create('checkin_details', function (Blueprint $table) {
            $table->id(); 
            $table->foreignId('checkin_id')
                  ->constrained()
                  ->onDelete('cascade');

            $table->foreignId('service_id')
                  ->constrained()
                  ->onDelete('restrict');

            // Cantidad (Ej: 2 Lavanderías)
            $table->integer('quantity')->default(1);

            // Precio al momento del consumo (Snapshot)
            // Guardamos esto por si el precio del servicio cambia en el futuro
            $table->decimal('selling_price', 10, 2);

            // Opcional: Total calculado (quantity * selling_price)
            // A veces es útil guardarlo, o se puede calcular al vuelo.
            // Lo omito aquí para no redundar, pero si quieres puedes agregarlo.

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checkin_details');
    }
};