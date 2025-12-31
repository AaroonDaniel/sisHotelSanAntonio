<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            // 1. Eliminamos first_name para evitar el error SQLSTATE[23502]
            $table->dropColumn('first_name');

            // 2. Renombramos last_name a full_name (donde están tus datos actuales)
            $table->renameColumn('last_name', 'full_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('guests', function (Blueprint $table) {
            // Revertir: Volvemos a 'last_name'
            $table->renameColumn('full_name', 'last_name');

            // Recreamos 'first_name' como nullable para no perder datos si revertimos
            $table->string('first_name')->nullable(); 
        });
    }
};