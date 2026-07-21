<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Índices de performance. Nombres de columna mapeados al esquema REAL del
 * proyecto (no existen `group_accounts` ni `guests.ci`):
 *   - "group_accounts" del pedido -> `special_agreements` (Cuentas
 *     Grupales/convenios; `type` es el único campo equivalente, no existe
 *     columna `status` en esta tabla).
 *   - "guests.ci" del pedido -> `guests.identification_number`, que ya
 *     tiene UNIQUE (por lo tanto ya está indexada) — no se duplica aquí.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->index('status');
            $table->index('room_id');
            $table->index('special_agreement_id');
            // Combo más consultado en todo el sistema: "habitaciones
            // activas de esta habitación" (RoomController, CheckinController).
            $table->index(['room_id', 'status']);
        });

        Schema::table('special_agreements', function (Blueprint $table) {
            $table->index('type');
            // Filtrado real de Cuentas Grupales (scopeGroupAccounts):
            // whereNotNull('company_name')->whereIn('type', [...]).
            $table->index('company_name');
        });
    }

    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['room_id']);
            $table->dropIndex(['special_agreement_id']);
            $table->dropIndex(['room_id', 'status']);
        });

        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropIndex(['company_name']);
        });
    }
};
