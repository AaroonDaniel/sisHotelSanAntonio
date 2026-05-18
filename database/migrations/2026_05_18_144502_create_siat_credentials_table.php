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
        Schema::create('siat_credentials', function (Blueprint $table) {
            $table->id();

            // Tipo de credencial: 'cuis' (vigencia anual) o 'cufd' (vigencia 24h).
            // Enum a nivel de esquema para impedir typos que romperían la lógica de consulta.
            $table->enum('type', ['cuis', 'cufd']);

            // Tripleta que identifica el punto de venta ante el SIAT.
            $table->integer('environment');  // 1 = Producción, 2 = Piloto
            $table->integer('branch_code');  // Código de sucursal
            $table->integer('pos_code');     // Código de punto de venta

            // Códigos devueltos por el SIAT. 'text' evita truncamientos sorpresa.
            $table->text('code');                          // CUIS o CUFD
            $table->text('control_code')->nullable();      // codigoControl: solo aplica a CUFD

            // Fechas de ciclo de vida.
            $table->dateTime('issued_at');   // Fecha de emisión según el SIAT (auditoría fiscal)
            $table->dateTime('expires_at');  // Fecha límite de validez (fechaVigencia del SIAT)

            // Distingue la credencial vigente del historial conservado.
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            // ÍNDICE ÚNICO PARCIAL: garantiza que solo exista UNA credencial activa
            // por tipo + entorno + sucursal + punto de venta. Esto traslada la regla
            // del SIAT al esquema y vuelve imposible el Error 980 desde la aplicación,
            // mientras permite acumular CUFDs vencidos (is_active = false) para el
            // historial de contingencia (cufdEvento).
            $table->unique(
                ['type', 'environment', 'branch_code', 'pos_code'],
                'uq_siat_active_credential'
            )->where('is_active', true);

            // Índice de lectura: acelera la búsqueda de la credencial vigente.
            $table->index(
                ['type', 'environment', 'branch_code', 'pos_code', 'is_active'],
                'idx_siat_credential_lookup'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('siat_credentials');
    }
};