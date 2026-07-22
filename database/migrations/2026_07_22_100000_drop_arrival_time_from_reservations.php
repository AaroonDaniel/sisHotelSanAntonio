<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * arrival_time ya no se usa: la hora real de llegada se define recién
 * al asignar/confirmar (checkin), no en la reserva. Inventario previo
 * confirmó que no había ninguna lógica de negocio atada a este campo
 * (nunca se leía para calcular nada, solo se escribía con un default
 * o se mostraba como texto) — código ya limpio antes de este DROP.
 * Backup de 'reservations' hecho antes (dump .sql + tabla espejo
 * reservations_backup_20260722).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('arrival_time');
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->time('arrival_time')->nullable();
        });
    }
};
