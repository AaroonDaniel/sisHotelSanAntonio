<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 'operator_id' ya representa "quién hizo la asignación" (se llenaba
        // en CheckinController::store()). Lo renombramos a
        // 'checkin_operator_id' para que sea simétrico con el nuevo
        // 'checkout_operator_id', en vez de agregar una tercera columna
        // redundante. Raw SQL (Postgres) para no depender de doctrine/dbal.
        DB::statement('ALTER TABLE checkins RENAME COLUMN operator_id TO checkin_operator_id');

        Schema::table('checkins', function (Blueprint $table) {
            $table->foreignId('checkout_operator_id')
                ->nullable()
                ->after('checkin_operator_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkins', function (Blueprint $table) {
            $table->dropForeign(['checkout_operator_id']);
            $table->dropColumn('checkout_operator_id');
        });

        DB::statement('ALTER TABLE checkins RENAME COLUMN checkin_operator_id TO operator_id');
    }
};
