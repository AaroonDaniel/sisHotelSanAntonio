<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Verificamos que no haya errores previos
        $duplicados = DB::table('cash_registers')
            ->select('user_id', DB::raw('COUNT(*) as total'))
            ->where('status', 'ABIERTA')
            ->groupBy('user_id')
            ->having(DB::raw('COUNT(*)'), '>', 1)
            ->get();

        if ($duplicados->isNotEmpty()) {
            $ids = $duplicados->pluck('user_id')->implode(', ');
            throw new \RuntimeException(
                "No se puede migrar. Los usuarios [{$ids}] tienen cajas duplicadas. Ciérralas primero en tu base de datos."
            );
        }

        // 2. Índice compuesto para hacer el sistema más rápido
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'idx_cash_registers_user_status');
        });

        // 3. Índice Único (El bloqueo maestro)
        DB::statement("
            CREATE UNIQUE INDEX uniq_caja_abierta_por_usuario
            ON cash_registers (user_id)
            WHERE status = 'ABIERTA'
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS uniq_caja_abierta_por_usuario');
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropIndex('idx_cash_registers_user_status');
        });
    }
};