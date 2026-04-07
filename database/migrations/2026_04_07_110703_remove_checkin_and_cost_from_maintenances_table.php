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
        Schema::table('maintenances', function (Blueprint $table) {
            // 1. Primero eliminamos la restricción de la llave foránea
            $table->dropForeign(['checkin_id']);
            
            // 2. Luego eliminamos ambas columnas
            $table->dropColumn(['checkin_id', 'repair_cost']);
        });
    }

    public function down(): void
    {
        Schema::table('maintenances', function (Blueprint $table) {
            // Por si algún día necesitas deshacer este commit (rollback):
            $table->foreignId('checkin_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('repair_cost', 10, 2)->nullable();
        });
    }
};
