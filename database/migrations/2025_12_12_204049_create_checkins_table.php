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
        Schema::create('checkins', function (Blueprint $table) {
            
            $table->id(); 
            $table->foreignId('room_id')->constrained()->onDelete('restrict');//habitacion
            $table->foreignId('guest_id')->constrained()->onDelete('restrict');//cliente
            $table->foreignId('user_id')->constrained()->onDelete('restrict');//usuario
            $table->dateTime('check_in_date');//hora de ingreso
            $table->integer('duration_days');//duracion en dias
            $table->dateTime('check_out_date')->nullable();//hora de salida
            $table->string('notes', 150)->nullable();//notas adicionales
            $table->decimal('advance_payment', 10, 2)->default(0);//pago adelantado
            $table->enum('status', ['activo', 'cancelado', 'finalizado', 'pendiente', 'suspendido', 'nunca llego', 'reubicado', 'extendido'])->default('activo');//estado del check-in
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checkins');
    }
};