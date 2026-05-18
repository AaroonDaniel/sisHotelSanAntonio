<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Eliminar el índice único completo creado por error.
        DB::statement('ALTER TABLE siat_credentials DROP CONSTRAINT IF EXISTS uq_siat_active_credential');
        DB::statement('DROP INDEX IF EXISTS uq_siat_active_credential');

        // Crear el índice único PARCIAL real (PostgreSQL).
        DB::statement('
            CREATE UNIQUE INDEX uq_siat_active_credential
            ON siat_credentials (type, environment, branch_code, pos_code)
            WHERE is_active = true
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uq_siat_active_credential');
    }
};