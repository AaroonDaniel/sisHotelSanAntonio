<?php

namespace App\Console\Commands;

use App\Services\SiatService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SiatRefreshCodesCommand extends Command
{
    /**
     * Margen de anticipación: si al CUFD vigente le quedan menos de estas
     * horas de vida, se renueva preventivamente.
     */
    private const RENEWAL_THRESHOLD_HOURS = 2;

    protected $signature = 'siat:refresh-codes';

    protected $description = 'Mantiene fresco el CUFD del SIAT: renueva si expiró o le queda poco tiempo de vigencia.';

    public function handle(SiatService $siat): int
    {
        $this->info('Verificando vigencia del CUFD del SIAT...');

        $current = $siat->peekActiveCufd();

        // 1. Decidir si hace falta renovar.
        if ($current) {
            $hoursLeft = now()->diffInHours($current->expires_at, false);

            if ($hoursLeft > self::RENEWAL_THRESHOLD_HOURS) {
                $msg = "CUFD vigente sin necesidad de renovar. Horas restantes: {$hoursLeft}.";
                $this->info($msg);
                Log::info("SIAT refresh-codes: {$msg}");
                return self::SUCCESS;
            }

            $this->warn("CUFD próximo a expirar ({$hoursLeft}h restantes). Forzando renovación...");
            // Desactiva la fila vigente para que getActiveCufd() solicite una nueva.
            $siat->invalidateCufdCache();
        } else {
            $this->warn('No hay CUFD vigente en BD. Solicitando uno nuevo...');
        }

        // 2. Forzar la renovación a través del flujo normal del servicio.
        $fresh = $siat->getActiveCufd();

        if (!$fresh || empty($fresh['codigo'])) {
            $error = 'SIAT refresh-codes: FALLÓ la renovación del CUFD. Revisar logs del SiatService para el motivo exacto.';
            $this->error($error);
            Log::error($error);
            return self::FAILURE;
        }

        $success = 'SIAT refresh-codes: CUFD renovado correctamente. Código: ' . $fresh['codigo'];
        $this->info($success);
        Log::info($success);

        return self::SUCCESS;
    }
}