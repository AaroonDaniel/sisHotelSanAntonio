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
            
            $table->id(); // asiid

            // --- RELACIONES (Foreign Keys) ---

            // 1. Habitación Ocupada (habid)
            $table->foreignId('room_id')
                  ->constrained()
                  ->onDelete('restrict'); 

            // 2. Cliente Huésped (cliid)
            $table->foreignId('guest_id')
                  ->constrained()
                  ->onDelete('restrict');

            // 3. Usuario/Recepcionista que registró (Importante para auditoría)
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('restrict');
            // 4. Usuario 
            /*$table->foreignId('reservation_id')
                  ->nullable()
                  ->constrained()
                  ->onDelete('set null');*/

            // --- DATOS DE LA ESTADÍA ---

            // Fecha y hora de entrada real (asifching)
            $table->dateTime('check_in_date');

            // Cantidad de días pactados (asidiacan)
            $table->integer('duration_days');

            // Fecha de salida estimada/real (asifchsal)
            // Puede ser nula si aún no han salido o se define al entrar
            $table->dateTime('check_out_date')->nullable();

            // Observaciones (asiobs)
            $table->string('notes', 150)->nullable();

            // Adelanto de dinero (asiade)
            // Usamos decimal para dinero, no float
            $table->decimal('advance_payment', 10, 2)->default(0);
            $table->enum('status', ['activo', 'cancelado', 'finalizado', 'pendiente', 'suspendido', 'nunca llego', 'reubicado', 'extendido'])->default('activo');
            

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