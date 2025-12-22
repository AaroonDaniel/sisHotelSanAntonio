<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prices', function (Blueprint $table) {
            $table->id();

            // FK al tipo de habitación
            $table->foreignId('room_type_id')
                  ->constrained('room_types')
                  ->cascadeOnUpdate()
                  ->restrictOnDelete();

            // Tipo de baño
            $table->enum('bathroom_type', ['private', 'shared']);

            // Monto
            $table->decimal('amount', 8, 2);

            // Estado
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prices');
    }
};
