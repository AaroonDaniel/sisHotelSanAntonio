<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Libro mayor de cobros POR PERSONA en bloques de N días (frecuencia
     * de App\Models\CorporatePaymentSchedule), a diferencia de
     * group_account_charges (que cobra por CHECKIN completo, un día a la
     * vez, vía ChargeGroupAccountsDailyCommand).
     *
     * Un checkin cuyos huéspedes ya tienen fila en
     * corporate_payment_schedules se excluye del libro diario (ver
     * ChargeGroupAccountsDailyCommand::handle()) -- entre los dos nunca
     * cobran el mismo checkin/persona por partida doble.
     *
     * El UNIQUE de (guest_id, special_agreement_id, cycle_start_date) es
     * la misma idea que group_account_charges: aunque el comando corra
     * dos veces el mismo día, el segundo intento choca contra el índice
     * en vez de cobrar el mismo bloque dos veces.
     */
    public function up(): void
    {
        Schema::create('corporate_payment_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guest_id')->constrained()->cascadeOnDelete();
            $table->foreignId('special_agreement_id')->constrained()->cascadeOnDelete();
            $table->foreignId('checkin_id')->constrained()->cascadeOnDelete();
            $table->date('cycle_start_date');
            $table->date('cycle_end_date');
            $table->unsignedInteger('days_charged');
            $table->decimal('amount', 10, 2);
            $table->string('status', 20)->default('cubierto');
            $table->timestamp('covered_at')->nullable();
            $table->timestamps();

            $table->unique(
                ['guest_id', 'special_agreement_id', 'cycle_start_date'],
                'corporate_payment_charges_unique_per_cycle',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('corporate_payment_charges');
    }
};
