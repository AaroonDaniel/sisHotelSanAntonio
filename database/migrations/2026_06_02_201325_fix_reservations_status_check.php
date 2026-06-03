<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 0. Por si quedó a medias
        DB::statement('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check');

        // 1. Normalizamos: 'cancelada' (femenino) -> 'cancelado' (oficial)
        DB::statement("UPDATE reservations SET status = 'cancelado' WHERE status = 'cancelada'");

        // 2. Creamos la restricción con los 4 estados válidos
        DB::statement("
            ALTER TABLE reservations
            ADD CONSTRAINT reservations_status_check
            CHECK (status IN ('pendiente', 'confirmada', 'completada', 'cancelado'))
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check');
    }
};