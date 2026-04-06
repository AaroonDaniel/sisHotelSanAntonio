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
        Schema::create('maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            $table->string('issue'); // Qué pasó (Ej: TV Rota)
            $table->text('description')->nullable(); // Detalles
            
            // 👇 NUEVO: Campo para guardar la ruta de la foto de evidencia
            $table->string('photo_path')->nullable(); 
            
            $table->foreignId('checkin_id')->nullable()->constrained()->onDelete('set null'); 
            $table->decimal('repair_cost', 10, 2)->nullable(); 
            $table->timestamp('resolved_at')->nullable(); 
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenances');
    }
};
