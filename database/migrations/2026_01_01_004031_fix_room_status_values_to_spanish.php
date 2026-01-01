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
        // 1. Quitar valor por defecto temporalmente
        DB::statement("ALTER TABLE rooms ALTER COLUMN status DROP DEFAULT");

        // 2. Eliminar la restricción antigua si existe
        DB::statement("ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check");

        // 3. ACTUALIZACIÓN BLINDADA
        // Usamos un CASE exhaustivo. Si algo no coincide, lo forzamos a 'LIBRE'.
        DB::statement("
            UPDATE rooms SET status = CASE
                -- Casos conocidos (Inglés, Español minúscula, Español Mayúscula, Mixto)
                WHEN UPPER(status) IN ('AVAILABLE', 'LIBRE') THEN 'LIBRE'
                WHEN UPPER(status) IN ('OCCUPIED', 'OCUPADO') THEN 'OCUPADO'
                WHEN UPPER(status) IN ('RESERVED', 'RESERVADO') THEN 'RESERVADO'
                WHEN UPPER(status) IN ('CLEANING', 'LIMPIEZA') THEN 'LIMPIEZA'
                WHEN UPPER(status) IN ('MAINTENANCE', 'MANTENIMIENTO') THEN 'MANTENIMIENTO'
                WHEN UPPER(status) IN ('DISABLED', 'INHABILITADO') THEN 'INHABILITADO'
                
                -- SALVAVIDAS: Si el valor es cualquier otra cosa rara, ponlo como LIBRE
                ELSE 'LIBRE'
            END
        ");

        // 4. Ahora sí, agregamos la restricción. No fallará porque todos los datos son válidos.
        DB::statement("ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
            CHECK (status IN ('LIBRE', 'OCUPADO', 'RESERVADO', 'LIMPIEZA', 'MANTENIMIENTO', 'INHABILITADO'))");

        // 5. Establecer valor por defecto
        DB::statement("ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'LIBRE'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // En caso de rollback, volvemos a inglés (opcional, pero recomendado por seguridad)
        DB::statement("ALTER TABLE rooms ALTER COLUMN status DROP DEFAULT");
        DB::statement("ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check");

        DB::statement("
            UPDATE rooms SET status = CASE
                WHEN status = 'LIBRE' THEN 'available'
                WHEN status = 'OCUPADO' THEN 'occupied'
                WHEN status = 'RESERVADO' THEN 'reserved'
                WHEN status = 'LIMPIEZA' THEN 'cleaning'
                WHEN status = 'MANTENIMIENTO' THEN 'maintenance'
                WHEN status = 'INHABILITADO' THEN 'disabled'
                ELSE LOWER(status)
            END
        ");

        DB::statement("ALTER TABLE rooms ADD CONSTRAINT rooms_status_check 
            CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'disabled'))");
            
        DB::statement("ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'available'");
    }
};