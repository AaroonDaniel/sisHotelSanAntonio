<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Documentación: Registro de Eventos Significativos del SIAT (RND-102100000011).
     *
     * Catálogo de códigos:
     *  1 = Corte del servicio de internet
     *  2 = Inaccesibilidad al servicio web del SIN
     *  3 = Corte de suministro de energía eléctrica
     *  4 = Virus informático o falla de software
     *  5 = Cambio de infraestructura del servicio o sistema
     *  6 = Falla en los medios de comunicación
     *  7 = Otros casos de fuerza mayor
     */
    public function up(): void
    {
        Schema::create('significant_events', function (Blueprint $table) {
            $table->id();

            // Catálogo SIAT
            $table->unsignedTinyInteger('event_code'); // 1-7
            $table->string('description');

            // Ventana del evento
            $table->timestamp('start_at');
            $table->timestamp('end_at')->nullable();

            // CUFD vigente al momento del evento (se usa para emitir offline)
            $table->string('cufd_event');
            $table->string('cufd_event_control_code');

            // Datos de registro ante el SIAT (se llenan cuando vuelve la conexión)
            $table->string('siat_reception_code')->nullable();
            $table->enum('status', ['active', 'closed', 'registered', 'failed'])
                  ->default('active');

            // Trazabilidad
            $table->foreignId('user_id')->constrained()->comment('Gerente que registró el evento');
            $table->timestamp('registered_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'event_code']);
        });

        // Agregamos campos a invoices para soportar contingencia
        Schema::table('invoices', function (Blueprint $table) {
            $table->foreignId('significant_event_id')
                  ->nullable()
                  ->after('siat_reception_code')
                  ->constrained()
                  ->nullOnDelete();

            $table->string('offline_xml_path')->nullable()->after('significant_event_id');
            $table->unsignedTinyInteger('void_reason_code')->nullable()->after('offline_xml_path');
            $table->timestamp('voided_at')->nullable()->after('void_reason_code');
            $table->foreignId('voided_by_user_id')->nullable()->after('voided_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('significant_event_id');
            $table->dropConstrainedForeignId('voided_by_user_id');
            $table->dropColumn(['offline_xml_path', 'void_reason_code', 'voided_at']);
        });

        Schema::dropIfExists('significant_events');
    }
};