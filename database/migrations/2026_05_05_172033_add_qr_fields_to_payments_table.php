<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Solo borra 'reference' si existe (en base nueva nunca se creó)
            if (Schema::hasColumn('payments', 'reference')) {
                $table->dropColumn('reference');
            }

            // 1. Campo para la ruta de la imagen
            if (!Schema::hasColumn('payments', 'voucher_path')) {
                $table->string('voucher_path')->nullable()->after('payment_method');
            }

            // 2. Campo para controlar si el pago es real o está en revisión
            if (!Schema::hasColumn('payments', 'status')) {
                $table->string('status')->default('Pendiente')->after('voucher_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'voucher_path')) {
                $table->dropColumn('voucher_path');
            }
            if (Schema::hasColumn('payments', 'status')) {
                $table->dropColumn('status');
            }
            if (!Schema::hasColumn('payments', 'reference')) {
                $table->string('reference')->nullable();
            }
        });
    }
};