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
        Schema::table('special_agreements', function (Blueprint $table) {
            // Nombre de la empresa para convenios corporativos tipo
            // "Cuenta Maestra": UN SpecialAgreement puede agrupar VARIOS
            // Checkins (habitaciones) — la relación hasMany(Checkin::class)
            // ya existe — así que este campo va aquí (propiedad del
            // convenio/grupo), no en 'checkins' (propiedad de una
            // habitación individual).
            $table->string('company_name')->nullable()->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropColumn('company_name');
        });
    }
};
