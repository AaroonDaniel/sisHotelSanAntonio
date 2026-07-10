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
        Schema::table('cash_registers', function (Blueprint $table) {
            // Snapshot inmutable del cuadre calculado AL MOMENTO DEL CIERRE
            // (apertura, ingresos por método, gastos, efectivo esperado,
            // listas detalladas de pagos/gastos/servicios). Se congela para
            // que el reporte histórico no cambie si luego se corrige un
            // pago o gasto vía God Mode.
            $table->json('snapshot_data')->nullable()->after('closed_at');

            // Ruta del PDF generado en el cierre (storage/app/public/...),
            // por si se prefiere reservir el archivo tal cual en vez de
            // reconstruirlo desde snapshot_data.
            $table->string('document_path')->nullable()->after('snapshot_data');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropColumn(['snapshot_data', 'document_path']);
        });
    }
};
