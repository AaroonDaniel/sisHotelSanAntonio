<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Solo para PostgreSQL
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_status_check');
            
            DB::statement("ALTER TABLE checkins ADD CONSTRAINT checkins_status_check 
                           CHECK (status IN ('activo', 'finalizado', 'transferido', 'cancelado'))");
        }
    }

    public function down(): void
    {
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_status_check');
            
            DB::statement("ALTER TABLE checkins ADD CONSTRAINT checkins_status_check 
                           CHECK (status IN ('activo', 'finalizado', 'cancelado'))");
        }
    }
};