<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('checkin_guests', function (Blueprint $table) {
            // Agregamos la columna origin
            $table->string('origin')->nullable()->after('guest_id');
        });
    }

    public function down()
    {
        Schema::table('checkin_guests', function (Blueprint $table) {
            $table->dropColumn('origin');
        });
    }
};