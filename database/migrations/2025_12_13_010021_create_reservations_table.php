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
        Schema::create('reservations', function (Blueprint      $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('restrict');
            $table->foreignId('guest_id')->constrained()->onDelete('restrict');
            $table->integer('guest_count');
            $table->enum('bathroom_preference', ['private', 'shared']);
            $table->date('arrival_date');
            $table->time('arrival_time');
            $table->integer('duration_days');
            $table->decimal('advance_payment', 10, 2);
            $table->string('payment_type', 20);
            $table->timestamps();

            
        });

        // 2. AHORA que ya existe, modificamos 'checkins' para agregar la relación
        Schema::table('checkins', function (Blueprint $table) {
            $table->foreignId('reservation_id')
                ->nullable()               // Puede ser nulo
                ->after('user_id')         // (Opcional) Para ordenarlo visualmente
                ->constrained('reservations') // Apunta a la tabla que acabamos de crear arriba
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};