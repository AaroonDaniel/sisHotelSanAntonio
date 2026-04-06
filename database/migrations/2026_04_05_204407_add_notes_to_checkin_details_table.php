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
        Schema::table('checkin_details', function (Blueprint $table) {
            // Agregamos la columna notes después del precio total
            $table->string('notes')->nullable()->after('total_price');
        });
    }

    public function down(): void
    {
        Schema::table('checkin_details', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
