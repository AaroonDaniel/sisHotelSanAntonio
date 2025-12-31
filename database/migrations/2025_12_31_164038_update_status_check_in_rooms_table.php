<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Quitamos el valor por defecto actual ('available' en minúscula) para evitar conflictos
        DB::statement("ALTER TABLE rooms ALTER COLUMN status DROP DEFAULT");

        // 2. Eliminamos la restricción CHECK antigua que da el error
        // (Postgres generalmente la llama 'rooms_status_check')
        DB::statement("ALTER TABLE rooms DROP CONSTRAINT rooms_status_check");

        // 3. Convertimos cualquier dato existente a MAYÚSCULAS para que cumpla la nueva regla
        DB::statement("UPDATE rooms SET status = UPPER(status)");

        // 4. Agregamos la nueva restricción CHECK con tus valores en MAYÚSCULA
        DB::statement("ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
            CHECK (status IN ('LIBRE', 'OCUPADO', 'RESERVADO', 'LIMPIEZA', 'MANTENIMIENTO', 'INHABILITADO'))");

        // 5. Establecemos el nuevo valor por defecto en MAYÚSCULA
        DB::statement("ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'LIBRE'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Volver a minúsculas si deshacemos la migración
        DB::statement("ALTER TABLE rooms ALTER COLUMN status DROP DEFAULT");
        DB::statement("ALTER TABLE rooms DROP CONSTRAINT rooms_status_check");
        DB::statement("UPDATE rooms SET status = LOWER(status)");
        DB::statement("ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
            CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'disabled'))");
        DB::statement("ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'available'");
    }
};