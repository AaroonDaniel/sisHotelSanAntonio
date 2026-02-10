<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. LIMPIEZA PREVENTIVA: 
        // Convertimos cualquier cadena vacía "" en NULL real. 
        // La base de datos permite muchos NULL, pero NO permite muchos "" si es único.
        DB::table('guests')
            ->where('identification_number', '')
            ->update(['identification_number' => null]);

        // 2. APLICAR EL CANDADO
        Schema::table('guests', function (Blueprint $table) {
            $table->unique('identification_number');
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            $table->dropUnique(['identification_number']);
        });
    }
};