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
        Schema::table('checkins', function (Blueprint $table) {
            // Agregamos el campo phone, nullable por si no tienen celular
            $table->string('phone', 20)->nullable()->after('advance_payment'); 
        });
    }

    public function down()
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};
