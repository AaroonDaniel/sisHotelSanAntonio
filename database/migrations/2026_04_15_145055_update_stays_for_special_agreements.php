<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Preparamos la tabla Reservations
        Schema::table('reservations', function (Blueprint $table) {
            $table->foreignId('special_agreement_id')
                  ->nullable()
                  ->constrained('special_agreements')
                  ->onDelete('set null');
        });

        // 2. Limpiamos la tabla Checkins y agregamos la llave foránea
        Schema::table('checkins', function (Blueprint $table) {
            // Eliminamos los 4 campos viejos
            $table->dropColumn([
                'agreed_price', 
                'is_corporate', 
                'payment_frequency', 
                'corporate_days'
            ]);
            
            // Agregamos la nueva conexión
            $table->foreignId('special_agreement_id')
                  ->nullable()
                  ->after('status')
                  ->constrained('special_agreements')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropForeign(['special_agreement_id']);
            $table->dropColumn('special_agreement_id');
            
            // Restaurar campos en caso de rollback
            $table->decimal('agreed_price', 10, 2)->nullable();
            $table->boolean('is_corporate')->default(false);
            $table->string('payment_frequency')->nullable();
            $table->integer('corporate_days')->default(0);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropForeign(['special_agreement_id']);
            $table->dropColumn('special_agreement_id');
        });
    }
};