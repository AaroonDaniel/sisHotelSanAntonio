<?php

namespace App\Traits;

use App\Models\Schedule;
use Carbon\Carbon;

/**
 * Único punto de verdad del "día operativo" del hotel: cualquier momento
 * ANTES de la hora de check-in del horario pertenece al día operativo
 * ANTERIOR (una entrada de madrugada, ej. 02:00, es la noche de ayer — de
 * lo contrario se regalan casi 24h de habitación). Usado por
 * calculateBillableDays()/calculateLateCheckoutFee() en CheckinController
 * y por el libro mayor de cargos diarios de Cuentas Grupales
 * (ChargeGroupAccountsDailyCommand) — extraído a trait para que ambos
 * cuenten los días exactamente igual y nunca se desincronicen.
 */
trait ResolvesBusinessDate
{
    protected function resolveBusinessDate(Carbon $momento, ?Schedule $schedule = null): Carbon
    {
        $horaCorte = $schedule?->check_in_time
            ?? Schedule::where('is_active', true)->value('check_in_time')
            ?? '06:00:00';

        $corte = $momento->copy()->setTimeFromTimeString($horaCorte);

        return $momento->lt($corte)
            ? $momento->copy()->subDay()->startOfDay()
            : $momento->copy()->startOfDay();
    }
}
