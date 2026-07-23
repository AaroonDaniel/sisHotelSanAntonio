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
        Schema::table('special_agreements', function (Blueprint $table) {
            // Base para la Fase 4 (Finalizar Cuenta Grupal): 'cerrado'
            // bloquea nuevos cargos del comando diario (Fase 1) y saca a la
            // cuenta de los listados activos. Ningún flujo actual escribe
            // esta columna todavía — default 'activo' preserva el
            // comportamiento de hoy para todas las filas existentes.
            $table->string('status', 20)->default('activo')->after('type');
            $table->timestamp('closed_at')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropColumn(['status', 'closed_at']);
        });
    }
};
