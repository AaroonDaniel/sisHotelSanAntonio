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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};