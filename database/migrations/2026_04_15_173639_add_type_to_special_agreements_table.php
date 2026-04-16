<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            // Agregamos la columna como string para evitar errores con Postgres
            $table->string('type', 50)->default('corporativo')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('special_agreements', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};