<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Documentación: Agregando campos requeridos por el SIAT para facturación electrónica.
     * Se usa nullable() y default() para compatibilidad con registros antiguos.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Datos del cliente "congelados" al momento de emitir
            $table->string('customer_name')->nullable()->after('checkin_id');
            $table->string('customer_nit')->nullable()->after('customer_name');
            
            // Campos de montos e impuestos
            $table->decimal('total_amount', 10, 2)->default(0)->after('user_id');
            $table->decimal('additional_discount', 10, 2)->default(0)->after('total_amount');
            $table->decimal('total_subject_to_vat', 10, 2)->default(0)->after('additional_discount');
            
            // Campos específicos del SIAT
            $table->string('cuf')->nullable()->after('invoice_number');
            $table->integer('payment_method_code')->nullable()->after('cuf'); // Código de catálogo SIAT
            $table->string('siat_reception_code')->nullable()->after('payment_method_code');
            
            // Estado exclusivo del SIAT (separado del estado interno de la factura)
            $table->enum('siat_status', ['pending', 'accepted', 'rejected', 'offline'])->default('pending')->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'customer_name',
                'customer_nit',
                'total_amount',
                'additional_discount',
                'total_subject_to_vat',
                'cuf',
                'payment_method_code',
                'siat_reception_code',
                'siat_status'
            ]);
        });
    }
};