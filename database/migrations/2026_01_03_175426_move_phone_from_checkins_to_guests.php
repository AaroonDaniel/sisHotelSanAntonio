<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    // 1. Eliminar de checkins
    Schema::table('checkins', function (Blueprint $table) {
        $table->dropColumn('phone');
    });

        // 2. Agregar a guests
        Schema::table('guests', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('origin');
        });
    }

    public function down()
    {
        // Revertir los cambios si fuera necesario
        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn('phone');
        });

        Schema::table('checkins', function (Blueprint $table) {
            $table->string('phone', 20)->nullable();
        });
    }
};
