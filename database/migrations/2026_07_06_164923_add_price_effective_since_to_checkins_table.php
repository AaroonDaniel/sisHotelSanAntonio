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
        Schema::table('checkins', function (Blueprint $table) {
            // Ancla de facturación: cuando una estadía cambia de precio a
            // mitad de camino (transferencia de habitación, fusión de
            // cuentas), aquí se guarda el momento exacto desde el cual
            // aplica el precio NUEVO. calculateBillableDays() usa esta
            // fecha (si existe) en vez de check_in_date, para no volver a
            // cobrar las noches ya transcurridas (esas quedan como deuda
            // fija en carried_balance) al precio nuevo.
            $table->timestamp('price_effective_since')->nullable()->after('agreed_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropColumn('price_effective_since');
        });
    }
};
