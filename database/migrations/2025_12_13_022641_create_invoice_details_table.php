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
        Schema::create('invoice_details', function (Blueprint $table) {
            $table->id(); // facdetid

            // Relación con la Factura Principal (Si borras la factura, se borran sus detalles)
            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');

            // Relación con Servicio (Es NULLABLE porque puede ser cobro de habitación)
            $table->foreignId('service_id')->nullable()->constrained()->onDelete('restrict');

            $table->integer('quantity'); // facdetcnt
            
            // Usamos decimal para dinero (10 dígitos, 2 decimales)
            $table->decimal('unit_price', 10, 2); // facdetprc
            $table->decimal('cost', 10, 2); // facdetcos (Total de la línea)

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_details');
    }
};
