<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            // Momento REAL desde el cual arranca el convenio (corporativo o
            // delegación). Antes el sistema usaba check_in_date del checkin
            // como ancla para calcular ciclos de pago vencidos, lo cual es
            // incorrecto si el convenio se activa/edita DESPUÉS del ingreso
            // real (ej: una estadía normal que días después se marca como
            // corporativa) — contaba ciclos retroactivos desde el check-in
            // en vez de desde que el convenio realmente empezó.
            $table->timestamp('starts_at')->nullable()->after('payment_frequency_days');
        });

        // Backfill de convenios ya existentes: created_at es la mejor
        // aproximación disponible de "cuándo empezó" un convenio que ya
        // existía antes de esta columna.
        DB::table('special_agreements')->whereNull('starts_at')->update([
            'starts_at' => DB::raw('created_at'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropColumn('starts_at');
        });
    }
};
