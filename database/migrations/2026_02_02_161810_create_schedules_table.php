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
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // Ej: "Turno Mañana"

            
            $table->time('check_in_time');  // Ej: 06:00:00
            $table->time('check_out_time'); // Ej: 13:00:00

            
            $table->integer('entry_tolerance_minutes')->default(60); // Ej: 60 min (Permite llegar 5:00)

            // Cuánto tiempo después puede salir sin que cuente como día extra
            $table->integer('exit_tolerance_minutes')->default(60);  // Ej: 60 min (Permite salir 14:00)

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
