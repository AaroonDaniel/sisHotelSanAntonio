<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Amplía la columna invoices.control_code de VARCHAR(50) a TEXT.
 *
 * MOTIVO:
 * La columna fue creada como string(50) en la migración original
 * (2025_12_13_022603_create_invoices_table.php) suponiendo que sería el
 * "código de control" tradicional (~16-32 caracteres). Sin embargo, ahora
 * almacena el CUFD del SIAT (Código Único de Facturación Diaria) que
 * habitualmente mide ~56 caracteres y puede crecer en futuras versiones del
 * protocolo SIAT (RND-102100000011).
 *
 * Síntoma corregido:
 *   SQLSTATE[22001]: String data, right truncated:
 *   "el valor es demasiado largo para el tipo character varying(50)"
 *
 * La tabla siat_credentials YA tenía esta columna como TEXT (sin límite),
 * por lo que esta migración solo alinea invoices con esa decisión.
 *
 * Se usa SQL crudo porque doctrine/dbal puede no estar instalado y el
 * método ->change() de Laravel lo requiere.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::statement('ALTER TABLE invoices ALTER COLUMN control_code TYPE TEXT');
    }

    public function down(): void
    {
        // Volver a VARCHAR(50) puede fallar si hay datos > 50 chars.
        // Truncamos preventivamente para que el rollback no rompa.
        DB::statement('UPDATE invoices SET control_code = LEFT(control_code, 50) WHERE LENGTH(control_code) > 50');
        DB::statement('ALTER TABLE invoices ALTER COLUMN control_code TYPE VARCHAR(50)');
    }
};