<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            // 1. Agregar columna de estado del perfil
            $table->string('profile_status')->default('COMPLETE')->after('full_name'); 
            // Valores: 'COMPLETE', 'INCOMPLETE'

            // 2. Hacer campos opcionales (nullable)
            $table->string('identification_number')->nullable()->change();
            $table->string('nationality')->nullable()->change();
            $table->string('issued_in')->nullable()->change();
            $table->string('civil_status')->nullable()->change();
            $table->string('profession')->nullable()->change();
            $table->string('origin')->nullable()->change();
            $table->date('birth_date')->nullable()->change();
            
            // Si identification_number tenía unique, asegúrate de que tu motor DB soporte múltiples nulos (Postgres lo hace por defecto)
        });
    }

    public function down(): void
    {
        // Revertir cambios es complejo si hay datos nulos, esto es aproximado
        Schema::table('guests', function (Blueprint $table) {
            $table->dropColumn('profile_status');
            // No podemos revertir a nullable=false fácilmente sin borrar datos
        });
    }
};