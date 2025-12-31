<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Eliminar la restricción antigua (check de minúsculas)
        // PostgreSQL suele nombrar esto como 'tabla_columna_check'
        DB::statement("ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_civil_status_check");

        // 2. Convertir los datos existentes a MAYÚSCULAS
        // Así 'single' se vuelve 'SINGLE' antes de aplicar la nueva regla
        DB::statement("UPDATE guests SET civil_status = UPPER(civil_status)");

        // 3. Agregar la nueva restricción CHECK con MAYÚSCULAS
        DB::statement("ALTER TABLE guests ADD CONSTRAINT guests_civil_status_check 
            CHECK (civil_status IN ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'CONCUBINAGE'))");
    }

    public function down(): void
    {
        // Revertir los cambios si fuera necesario
        DB::statement("ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_civil_status_check");
        DB::statement("UPDATE guests SET civil_status = LOWER(civil_status)");
        DB::statement("ALTER TABLE guests ADD CONSTRAINT guests_civil_status_check 
            CHECK (civil_status IN ('single', 'married', 'divorced', 'widowed'))");
    }
};