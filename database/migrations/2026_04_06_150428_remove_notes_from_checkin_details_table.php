<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checkin_details', function (Blueprint $table) {
            // Eliminamos la columna
            $table->dropColumn('notes');
        });
    }

    public function down(): void
    {
        Schema::table('checkin_details', function (Blueprint $table) {
            // La volvemos a crear por si hacemos rollback de esta migración
            $table->string('notes')->nullable()->after('total_price');
        });
    }
};
