<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('reference');    
        // 1. Campo para la ruta de la imagen
            $table->string('voucher_path')->nullable()->after('payment_method');
            
            // 2. Campo para controlar si el pago es real o está en revisión
            $table->string('status')->default('Pendiente')->after('voucher_path');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['voucher_path', 'status']);
            $table->string('reference')->nullable();
        });
    }
};