<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Módulo "Cuentas Grupales" (fusión de Delegación + Corporativo):
     * saldo simple de bolsa — cuánto se adelantó y cuánto se ha consumido
     * ya en habitaciones asignadas — en vez del prorrateo por días
     * transcurridos que ya usa CorporateBillingService::getRoomBalances()
     * para las Cuentas Maestra existentes. Ambos modelos conviven: este es
     * el saldo "de bolsa" que ve el recepcionista al asignar una
     * habitación rápida; el prorrateo sigue existiendo para el detalle
     * histórico por habitación.
     */
    public function up(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->decimal('total_advance', 10, 2)->default(0)->after('agreed_price');
            $table->decimal('total_consumed', 10, 2)->default(0)->after('total_advance');
        });
    }

    public function down(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropColumn(['total_advance', 'total_consumed']);
        });
    }
};
