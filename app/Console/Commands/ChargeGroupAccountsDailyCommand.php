<?php

namespace App\Console\Commands;

use App\Models\Checkin;
use App\Models\CorporatePaymentSchedule;
use App\Traits\ChargesGroupAccountLedger;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Libro mayor diario de Cuentas Grupales (Delegación/Corporativo con
 * company_name — ver SpecialAgreement::scopeGroupAccounts()). Por cada
 * habitación (Checkin) activa de una Cuenta Grupal abierta, descuenta
 * internamente el consumo de cada día operativo YA transcurrido (nunca
 * el de hoy — todavía no terminó) contra el saldo prepagado. NUNCA crea
 * un Payment ni mueve caja: el dinero ya entró cuando se registró el
 * adelanto (store()/addAdvance()).
 *
 * Si el saldo no alcanza para el día, el cargo queda 'pendiente' (el
 * "pause" de Corporativo) — no se genera deuda ni se bloquea nada, ese día
 * se cubre después con un abono nuevo (Fase 2) o al finalizar la cuenta
 * (Fase 4).
 *
 * El núcleo del cargo (día por día, idempotencia, cubierto/pendiente)
 * vive en App\Traits\ChargesGroupAccountLedger::chargeUpToBusinessDay() —
 * el MISMO método que usa CheckinController al cerrar el día del
 * checkout (Fase 3), para que nunca existan dos formas de cobrar una
 * noche.
 *
 * 🚀 EXCLUSIÓN: un checkin con al menos un huésped (titular o
 * acompañante) en corporate_payment_schedules se salta acá -- lo cobra
 * ChargeCorporatePaymentSchedulesCommand en bloques de su propia
 * frecuencia, no este comando día a día con el precio combinado. Sin
 * esta exclusión, el mismo consumo se descontaría dos veces del mismo
 * fondo.
 */
class ChargeGroupAccountsDailyCommand extends Command
{
    use ChargesGroupAccountLedger;

    protected $signature = 'groupaccounts:daily-charge';

    protected $description = 'Descuenta el consumo diario de las Cuentas Grupales activas contra su saldo prepagado.';

    public function handle(): int
    {
        $checkins = Checkin::query()
            ->where('status', 'activo')
            ->whereHas('specialAgreement', function ($q) {
                $q->whereNotNull('company_name')
                    ->where('status', '!=', 'cerrado');
            })
            ->with(['specialAgreement', 'schedule', 'companions'])
            ->get()
            ->filter(function ($checkin) {
                $guestIds = array_merge([$checkin->guest_id], $checkin->companions->pluck('id')->toArray());

                return !CorporatePaymentSchedule::where('special_agreement_id', $checkin->special_agreement_id)
                    ->whereIn('guest_id', $guestIds)
                    ->exists();
            });

        $this->info("Procesando {$checkins->count()} checkin(s) de Cuentas Grupales activas (sin frecuencia por persona)...");

        $totalCargosNuevos = 0;

        foreach ($checkins as $checkin) {
            // Noches "limpias" transcurridas hasta AYER (nunca hoy —
            // todavía no terminó): mismo criterio sin +1 que usa
            // calculateBillableDays() para un checkin que aún no hizo
            // checkout. Si el checkin hace checkout hoy, es
            // CheckinController quien cierra esas noches con el
            // $finalDays real que calculó (ver applyGroupAccountCoverage())
            // — nunca este comando, que ya lo habrá dejado en 0 noches
            // nuevas para hoy mismo.
            $agreement = $checkin->specialAgreement;
            $anchor = Carbon::parse($checkin->price_effective_since ?? $agreement->starts_at);
            $anchorDay = $this->resolveBusinessDate($anchor, $checkin->schedule);
            $todayDay = $this->resolveBusinessDate(now(), $checkin->schedule);
            $nochesTranscurridas = $anchorDay->diffInDays($todayDay);

            $totalCargosNuevos += $this->chargeUpToBusinessDay($checkin, $nochesTranscurridas);
        }

        $this->info("Listo. {$totalCargosNuevos} cargo(s) nuevo(s) creado(s).");

        return self::SUCCESS;
    }
}
