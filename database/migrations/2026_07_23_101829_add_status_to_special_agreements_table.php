<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Regulariza `status`/`closed_at` en `special_agreements`: estas columnas
 * ya existían en algunas bases (drift — se corrieron fuera de una
 * migración versionada, ver auditoría de 2026-07-23) pero nunca quedaron
 * en el historial de git. Con guards `hasColumn` para no romper en bases
 * donde ya existen ni fallar en bases nuevas que arrancan de cero.
 *
 * Uso: al cancelar una reserva con SpecialAgreement asociado
 * (ReservationController::update(), rama CANCELADO), se marca
 * status='cerrado' + closed_at=now() si el convenio no tiene Checkins ni
 * otras reservas vivas — ver ReservationController.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            if (!Schema::hasColumn('special_agreements', 'status')) {
                $table->string('status', 20)->default('activo')->after('total_consumed');
            }
            if (!Schema::hasColumn('special_agreements', 'closed_at')) {
                $table->timestamp('closed_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropColumn(['status', 'closed_at']);
        });
    }
};
