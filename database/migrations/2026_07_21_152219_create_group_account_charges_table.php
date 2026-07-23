<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Libro mayor de cargos diarios de Cuentas Grupales (Fase 1 los
     * empezará a poblar; esta migración solo crea la tabla vacía).
     *
     * El UNIQUE de (special_agreement_id, checkin_id, charge_date) es la
     * razón de ser de esta tabla: aunque el comando diario (Fase 1) corra
     * dos veces el mismo día — doble disparo del scheduler, servidor
     * reiniciado a mitad de proceso — el segundo intento de insertar el
     * mismo cargo revienta contra este índice en vez de cobrar dos veces.
     */
    public function up(): void
    {
        Schema::create('group_account_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('special_agreement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checkin_id')->constrained()->cascadeOnDelete();
            $table->date('charge_date');
            $table->decimal('amount', 10, 2);
            // Mismo criterio que 'status' en special_agreements: string en
            // vez de enum nativo, para no repetir el problema ya resuelto
            // en esa tabla (2026_04_16_121659_fix_special_agreements_table_structure.php).
            $table->string('status', 20)->default('cubierto');
            $table->timestamp('covered_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['special_agreement_id', 'checkin_id', 'charge_date'],
                'group_account_charges_unique_per_day',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_account_charges');
    }
};
