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
        Schema::table('payments', function (Blueprint $table) {
            // Pago hecho contra la CUENTA MAESTRA (el convenio corporativo
            // como grupo), no contra una habitación específica. checkin_id
            // ya es nullable, así que un pago de grupo puede dejarlo en
            // null y quedar vinculado únicamente aquí.
            $table->foreignId('special_agreement_id')
                ->nullable()
                ->after('checkin_id')
                ->constrained('special_agreements')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['special_agreement_id']);
            $table->dropColumn('special_agreement_id');
        });
    }
};
