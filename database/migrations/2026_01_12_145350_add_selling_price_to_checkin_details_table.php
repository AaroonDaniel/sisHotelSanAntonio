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
        Schema::table('checkin_details', function (Blueprint $table) {
            // Agregamos la columna que falta
            $table->decimal('selling_price', 10, 2)->nullable()->after('quantity');
        });
    }

    public function down()
    {
        Schema::table('checkin_details', function (Blueprint $table) {
            $table->dropColumn('selling_price');
        });
    }
};
