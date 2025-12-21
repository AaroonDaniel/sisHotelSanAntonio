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
            Schema::table('string', function (Blueprint $table) {
                DB::statement("
                ALTER TABLE room_types
                ALTER COLUMN name TYPE VARCHAR(50)
                USING name::text
            ");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("
            CREATE TYPE room_types_name_enum AS ENUM (
                'single','double','triple','quadruple','matrimonial','group'
            )
        ");

        DB::statement("
            CREATE TYPE room_types_name_enum AS ENUM (
                'single','double','triple','quadruple','matrimonial','group'
            )
        ");
    }
};
