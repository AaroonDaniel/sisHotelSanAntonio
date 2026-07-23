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
        Schema::table('checkin_guests', function (Blueprint $table) {
            // Precio individual de ESTE acompañante. checkins.agreed_price
            // (el total de la habitación) se recalcula solo como
            // titular_price + SUM(price) de todos los acompañantes — ver
            // Checkin::recalculateAgreedPrice() / CheckinGuestObserver.
            $table->decimal('price', 10, 2)->nullable()->after('origin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkin_guests', function (Blueprint $table) {
            $table->dropColumn('price');
        });
    }
};
