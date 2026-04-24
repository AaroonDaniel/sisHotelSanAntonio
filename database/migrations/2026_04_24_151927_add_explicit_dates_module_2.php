<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Añadimos los campos
        Schema::table('checkin_details', function (Blueprint $table) {
            $table->dateTime('consumed_at')->nullable()->after('selling_price');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dateTime('cancellation_date')->nullable()->after('status');
        });

        // 2. Traspasamos las fechas antiguas (Para no perder el historial)
        // Asumimos que los consumos antiguos se hicieron en la fecha de 'created_at'
        DB::table('checkin_details')
            ->whereNull('consumed_at')
            ->update(['consumed_at' => DB::raw('created_at')]);

        // A las reservas que YA estaban canceladas, les ponemos la fecha de su última actualización
        DB::table('reservations')
            ->where('status', 'cancelada')
            ->whereNull('cancellation_date')
            ->update(['cancellation_date' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('checkin_details', function (Blueprint $table) {
            $table->dropColumn('consumed_at');
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn('cancellation_date');
        });
    }
};