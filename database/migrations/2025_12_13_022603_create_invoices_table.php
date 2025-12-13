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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id(); // facid
            
            $table->integer('invoice_number')->unique(); // facnro
            
            // Relación con el Checkin (Hospedaje)
            $table->foreignId('checkin_id')->constrained()->onDelete('cascade'); // asiid
            
            $table->date('issue_date'); // facfch
            
            // --- CAMPOS QUE FALTABAN ---
            
            // Código de Control (faccuf)
            $table->string('control_code', 50); 
            
            // Método de Pago (QR, EF, etc) - facmetpag
            $table->string('payment_method', 2); 
            
            // Usuario que emite la factura (usuid)
            $table->foreignId('user_id')->constrained()->onDelete('restrict'); 
            
            // Hora de emisión (fachor)
            $table->dateTime('issue_time'); 
            
            // Estado (facest): 1=valid, 0=voided
            $table->enum('status', ['valid', 'voided'])->default('valid');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
