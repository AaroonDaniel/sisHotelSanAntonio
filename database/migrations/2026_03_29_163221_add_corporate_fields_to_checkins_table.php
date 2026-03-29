<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('checkins', function (Blueprint $table) {
            // 1. Eliminamos SOLO transfer_reason
            if (Schema::hasColumn('checkins', 'transfer_reason')) {
                $table->dropColumn('transfer_reason');
            }

            // 2. Agregamos los campos corporativos
            $table->boolean('is_corporate')->default(false);
            // payment_frequency queda como string para que puedan escribir "Diario", "Semanal", "Mensual" o cualquier texto libre
            $table->string('payment_frequency')->nullable(); 
            $table->integer('corporate_days')->default(0);
        });
    }

    public function down()
    {
        Schema::table('checkins', function (Blueprint $table) {
            // Revertir los cambios en caso de emergencia
            $table->dropColumn(['is_corporate', 'payment_frequency', 'corporate_days']);
            $table->string('transfer_reason')->nullable();
        });
    }
};