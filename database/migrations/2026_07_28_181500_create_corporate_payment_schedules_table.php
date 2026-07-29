<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Frecuencia de cobro POR PERSONA, para corporativo/delegación.
     *
     * payment_frequency_days vivía en special_agreements, compartido por
     * TODOS los checkins de un mismo convenio/Cuenta Grupal -- eso no
     * alcanza cuando distintas personas del mismo grupo se cobran cada
     * quien a su propio ritmo (ej. titular cada 3 días, un acompañante
     * cada 4, otro cada 2).
     *
     * Clavada por (guest_id, special_agreement_id), a propósito SIN
     * checkin_id: así sobrevive cualquier transferencia de habitación
     * sin tocar código (special_agreement_id se preserva siempre en
     * transfer(), completa o parcial). Solo una fusión (merge()) que
     * cambia a la persona de convenio necesita crear una fila nueva bajo
     * el special_agreement_id destino -- la fila vieja se queda como
     * historial, no se borra.
     *
     * El precio POR PERSONA sigue viviendo aparte, en
     * checkins.titular_price / checkin_guests.price -- no se duplica acá.
     */
    public function up(): void
    {
        Schema::create('corporate_payment_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guest_id')->constrained()->cascadeOnDelete();
            $table->foreignId('special_agreement_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('payment_frequency_days');
            $table->timestamps();

            $table->unique(['guest_id', 'special_agreement_id'], 'corporate_payment_schedules_unique_per_guest_agreement');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('corporate_payment_schedules');
    }
};
