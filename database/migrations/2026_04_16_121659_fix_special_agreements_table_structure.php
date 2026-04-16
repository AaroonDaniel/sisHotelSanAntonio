<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Agregamos las columnas faltantes solo si no existen
        Schema::table('special_agreements', function (Blueprint $table) {
            if (!Schema::hasColumn('special_agreements', 'agreed_price')) {
                $table->decimal('agreed_price', 10, 2)->default(0);
            }
            if (!Schema::hasColumn('special_agreements', 'payment_frequency_days')) {
                $table->integer('payment_frequency_days')->default(0);
            }
            if (!Schema::hasColumn('special_agreements', 'type')) {
                $table->string('type', 50)->default('estandar');
            }
        });

        // 2. Forzamos a PostgreSQL a convertir el "enum" a un "String" (Varchar) nativo
        DB::statement("ALTER TABLE special_agreements ALTER COLUMN type TYPE VARCHAR(50);");
        DB::statement("ALTER TABLE special_agreements ALTER COLUMN type SET DEFAULT 'estandar';");
    }

    public function down(): void
    {
        // No hacemos nada destructivo en el rollback para proteger las llaves foráneas
    }
};