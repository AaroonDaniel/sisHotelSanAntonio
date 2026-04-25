<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // LIMPIEZA EN CHECKINS
        Schema::table('checkins', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('checkins', 'is_corporate')) $columnsToDrop[] = 'is_corporate';
            if (Schema::hasColumn('checkins', 'is_delegation')) $columnsToDrop[] = 'is_delegation';
            if (Schema::hasColumn('checkins', 'payment_frequency')) $columnsToDrop[] = 'payment_frequency';
            if (Schema::hasColumn('checkins', 'corporate_days')) $columnsToDrop[] = 'corporate_days';
            
            if (count($columnsToDrop) > 0) {
                $table->dropColumn($columnsToDrop);
            }
        });

        // LIMPIEZA EN RESERVATIONS
        Schema::table('reservations', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('reservations', 'is_corporate')) $columnsToDrop[] = 'is_corporate';
            if (Schema::hasColumn('reservations', 'is_delegation')) $columnsToDrop[] = 'is_delegation';
            if (Schema::hasColumn('reservations', 'payment_frequency')) $columnsToDrop[] = 'payment_frequency';
            if (Schema::hasColumn('reservations', 'corporate_days')) $columnsToDrop[] = 'corporate_days';
            
            if (count($columnsToDrop) > 0) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    public function down(): void
    {
        // En caso de querer revertirlo, recreamos las columnas
        Schema::table('checkins', function (Blueprint $table) {
            if (!Schema::hasColumn('checkins', 'is_corporate')) $table->boolean('is_corporate')->nullable();
            if (!Schema::hasColumn('checkins', 'payment_frequency')) $table->string('payment_frequency')->nullable();
            if (!Schema::hasColumn('checkins', 'corporate_days')) $table->integer('corporate_days')->nullable();
        });

        Schema::table('reservations', function (Blueprint $table) {
            if (!Schema::hasColumn('reservations', 'is_corporate')) $table->boolean('is_corporate')->nullable();
            if (!Schema::hasColumn('reservations', 'payment_frequency')) $table->string('payment_frequency')->nullable();
            if (!Schema::hasColumn('reservations', 'corporate_days')) $table->integer('corporate_days')->nullable();
        });
    }
};