<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            // 1. Eliminar columna edad
            $table->dropColumn('age');
            // 2. Agregar fecha de nacimiento
            $table->date('birth_date')->nullable()->after('last_name');
            // 3. Hacer procedencia nullable (si no lo era)
            $table->string('origin')->nullable()->change(); 
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->integer('age')->nullable();
            $table->dropColumn('birth_date');
            $table->string('origin')->nullable(false)->change();
        });
    }
};