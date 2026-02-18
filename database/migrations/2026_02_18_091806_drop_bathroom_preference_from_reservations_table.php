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
        Schema::table('reservations', function (Blueprint $table) {
            // Eliminamos la columna que causa el conflicto
            $table->dropColumn('bathroom_preference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Si revertimos, la volvemos a crear (opcional)
            $table->enum('bathroom_preference', ['private', 'shared'])->nullable();
        });
    }
};