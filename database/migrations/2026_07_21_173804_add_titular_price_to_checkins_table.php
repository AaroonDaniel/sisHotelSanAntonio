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
        Schema::table('checkins', function (Blueprint $table) {
            // Precio individual del TITULAR (checkins.guest_id) — el
            // titular no tiene fila en checkin_guests, así que necesita su
            // propio campo acá. checkins.agreed_price sigue existiendo
            // como el TOTAL de la habitación (titular_price + suma de
            // checkin_guests.price), recalculado automáticamente — nunca
            // se pisa a mano desde este campo.
            $table->decimal('titular_price', 10, 2)->nullable()->after('agreed_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropColumn('titular_price');
        });
    }
};
