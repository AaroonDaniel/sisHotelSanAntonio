<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rediseño de reservas: la reserva pasa a ser solo "intención" (sin
 * precio ni método de pago fijado); el precio real y el room_id se
 * definen recién al confirmar (ver ReservationController::update(),
 * rama CONFIRMADO). Decisión explícita: sin backup previo — ambas
 * tablas están en 0 filas al momento de esta migración, no hay dato
 * real que preservar.
 *
 * requested_room_type_id/requested_bathroom se eliminan sin
 * reemplazo: ya no se guarda la intención de tipo/baño pedida, el
 * recepcionista busca directo entre las habitaciones libres al
 * confirmar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('payment_type');
        });

        Schema::table('reservation_details', function (Blueprint $table) {
            // 🐛 requested_room_type_id NUNCA tuvo FK real (se agregó como
            // unsignedBigInteger simple en 2026_03_05_110738, sin
            // ->constrained()) — solo price_id tiene constraint que
            // dropear primero.
            $table->dropForeign(['price_id']);
            $table->dropColumn(['price', 'price_id', 'requested_room_type_id', 'requested_bathroom']);
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->string('payment_type', 20)->nullable();
        });

        Schema::table('reservation_details', function (Blueprint $table) {
            $table->decimal('price', 8, 2)->nullable();
            $table->foreignId('price_id')->nullable()->constrained('prices')->nullOnDelete();
            $table->unsignedBigInteger('requested_room_type_id')->nullable();
            $table->string('requested_bathroom')->nullable();
        });
    }
};
