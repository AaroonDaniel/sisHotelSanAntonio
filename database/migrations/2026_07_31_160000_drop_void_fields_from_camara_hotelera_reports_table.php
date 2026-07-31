<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Anular" un parte PENDIENTE ahora borra la fila directamente (nunca
     * se llegó a presentar ante la Cámara, no hay nada que dejar como
     * registro histórico) -- ver CamaraHoteleraController::destroy().
     * Estas columnas quedaban sin uso real bajo ese diseño.
     */
    public function up(): void
    {
        Schema::table('camara_hotelera_reports', function (Blueprint $table) {
            $table->dropForeign(['voided_by']);
            $table->dropColumn(['voided_by', 'voided_reason', 'voided_at']);
        });
    }

    public function down(): void
    {
        Schema::table('camara_hotelera_reports', function (Blueprint $table) {
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('voided_reason')->nullable();
            $table->timestamp('voided_at')->nullable();
        });
    }
};
