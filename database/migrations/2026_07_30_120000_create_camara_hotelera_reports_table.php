<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Partes diarios presentados ante la Cámara Hotelera Departamental de
     * Potosí. A diferencia del "Generador de Parte Diario" (que arma el
     * PDF al vuelo desde `checkins` sin guardar nada, ver
     * ReportController::index()/generateGuestsReportPdf()), acá SÍ queda
     * un registro persistido de qué parte se armó, con qué huéspedes y en
     * qué estado quedó (pendiente/generado/anulado) — es el trámite
     * formal ante la Cámara, no el checklist operativo de recepción.
     *
     * `guest_ids` congela la selección de huéspedes/acompañantes hecha en
     * el modal (misma fuente que ids= en generate-pdf), y `numero_parte`
     * congela el correlativo al momento de crear el parte -- ya no se
     * recalcula por fórmula en cada request como en el generador crudo,
     * porque acá el número sí necesita quedar fijo para siempre.
     */
    public function up(): void
    {
        Schema::create('camara_hotelera_reports', function (Blueprint $table) {
            $table->id();
            // NO unique: es determinístico por fecha (ver
            // ReportController::numeroSerieForDate()) -- si un parte se
            // anula y se rehace para el mismo report_date, el correlativo
            // vuelve a salir igual a propósito, no es un conflicto real.
            $table->string('numero_parte', 6);
            $table->date('report_date');
            $table->json('guest_ids');
            $table->string('status', 20)->default('pendiente');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('voided_reason')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('camara_hotelera_reports');
    }
};
