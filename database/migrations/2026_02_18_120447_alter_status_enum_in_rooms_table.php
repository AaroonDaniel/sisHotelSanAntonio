<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE rooms 
            MODIFY status ENUM(
                'available',
                'occupied',
                'reserved',
                'cleaning',
                'maintenance',
                'disabled',
                'confirmed',
                'cancelled'
            ) DEFAULT 'available'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("
            ALTER TABLE rooms 
            MODIFY status ENUM(
                'available',
                'occupied',
                'reserved',
                'cleaning',
                'maintenance',
                'disabled'
            ) DEFAULT 'available'
        ");
    }
};
