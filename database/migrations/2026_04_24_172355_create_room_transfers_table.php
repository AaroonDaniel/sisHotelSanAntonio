<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkin_id')->constrained('checkins')->cascadeOnDelete();
            $table->foreignId('from_room_id')->constrained('rooms');
            $table->foreignId('to_room_id')->constrained('rooms');
            $table->foreignId('user_id')->constrained('users'); // El recepcionista que autorizó
            $table->dateTime('transfer_date'); // Cuándo se hizo el cambio
            $table->string('reason'); // Motivo obligatorio
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_transfers');
    }
};