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
            // Eliminamos la columna 'relationship'
            $table->dropColumn('relationship');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkin_guests', function (Blueprint $table) {
            // Si revertimos, la volvemos a crear como opcional
            $table->string('relationship')->nullable();
        });
    }
};
