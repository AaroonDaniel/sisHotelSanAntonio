<?php

namespace App\Console\Commands;

use App\Models\Checkin;
use App\Models\CorporatePaymentSchedule;
use App\Traits\ChargesCorporatePaymentSchedule;
use App\Traits\ResolvesBusinessDate;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Libro mayor de cobros POR PERSONA (frecuencia propia de cada huésped,
 * ver App\Models\CorporatePaymentSchedule) — hermano de
 * ChargeGroupAccountsDailyCommand, pero en bloques de N días en vez de
 * un día a la vez, y por persona en vez de por checkin completo.
 *
 * Un checkin con al menos un huésped en corporate_payment_schedules
 * queda EXCLUIDO de ChargeGroupAccountsDailyCommand (ver su handle()) —
 * entre los dos comandos nunca cobran el mismo checkin/persona por
 * partida doble, aunque compartan el mismo fondo
 * (SpecialAgreement::availableLedgerBalance() descuenta de ambos libros).
 *
 * 🚀 Aplica a CUALQUIER convenio corporativo/delegación con frecuencia
 * por persona, tenga o no company_name -- una Cuenta Grupal real (con
 * fondo prepagado, se cobra normal 'cubierto') o un convenio ad-hoc
 * individual (sin fondo -- total_deposited=0, así que se acumula como
 * 'pendiente' cada bloque, sin bloquear nada; el checkout real sigue
 * cobrando lo que corresponda de todos modos).
 *
 * corporate_payment_schedules se clava por (guest_id,
 * special_agreement_id), no por checkin_id -- así que "¿este checkin
 * tiene alguna frecuencia por persona configurada?" se resuelve
 * consultando esa tabla con el special_agreement_id del checkin y los
 * guest_id de su titular + acompañantes, no con una relación directa.
 */
class ChargeCorporatePaymentSchedulesCommand extends Command
{
    use ChargesCorporatePaymentSchedule, ResolvesBusinessDate;

    protected $signature = 'groupaccounts:corporate-schedule-charge';

    protected $description = 'Descuenta, por persona y en bloques de su propia frecuencia de días, el consumo de convenios corporativo/delegación (Cuenta Grupal o ad-hoc) contra su saldo/deuda.';

    public function handle(): int
    {
        $candidatos = Checkin::query()
            ->where('status', 'activo')
            ->whereNotNull('special_agreement_id')
            ->whereHas('specialAgreement', function ($q) {
                $q->where('status', '!=', 'cerrado');
            })
            ->with(['specialAgreement', 'schedule', 'guest', 'companions'])
            ->get();

        $totalCargosNuevos = 0;
        $procesados = 0;

        foreach ($candidatos as $checkin) {
            $guestIds = array_merge([$checkin->guest_id], $checkin->companions->pluck('id')->toArray());

            $schedulesByGuestId = CorporatePaymentSchedule::with('specialAgreement')
                ->where('special_agreement_id', $checkin->special_agreement_id)
                ->whereIn('guest_id', $guestIds)
                ->get()
                ->keyBy('guest_id');

            if ($schedulesByGuestId->isEmpty()) {
                // Este checkin no tiene frecuencia por persona configurada
                // -- lo sigue cobrando ChargeGroupAccountsDailyCommand
                // como siempre, no se toca acá.
                continue;
            }

            $procesados++;
            // 🚀 PREPAGO: a diferencia del libro diario (que nunca cobra
            // hoy, solo días ya transcurridos), acá SÍ se incluye hoy --
            // un ciclo que arranca hoy mismo se cobra hoy mismo, no
            // mañana. Ver ChargesCorporatePaymentSchedule.
            $throughDay = $this->resolveBusinessDate(now(), $checkin->schedule);

            // --- Titular ---
            $titularSchedule = $schedulesByGuestId->get($checkin->guest_id);
            if ($titularSchedule) {
                $anchor = Carbon::parse($checkin->price_effective_since ?? $checkin->check_in_date);
                $arrivalDay = $this->resolveBusinessDate($anchor, $checkin->schedule);

                $totalCargosNuevos += $this->chargeGuestCycles(
                    $checkin,
                    $checkin->guest,
                    $titularSchedule,
                    $arrivalDay,
                    $throughDay,
                    (float) $checkin->titular_price,
                    false,
                );
            }

            // --- Acompañantes ---
            foreach ($checkin->companions as $companion) {
                $schedule = $schedulesByGuestId->get($companion->id);
                if (!$schedule) {
                    continue;
                }

                // 🚀 ANCLA POR PERSONA: checkin_guests.created_at -- cuándo
                // se sincronizó ESTE acompañante a este checkin (puede ser
                // muy posterior al check_in_date del titular si se sumó
                // por transferencia/fusión a mitad de estadía).
                $anchor = Carbon::parse($companion->pivot->created_at);
                $arrivalDay = $this->resolveBusinessDate($anchor, $checkin->schedule);

                $totalCargosNuevos += $this->chargeGuestCycles(
                    $checkin,
                    $companion,
                    $schedule,
                    $arrivalDay,
                    $throughDay,
                    (float) ($companion->pivot->price ?? 0),
                    false,
                );
            }
        }

        $this->info("Procesados {$procesados} checkin(s) con frecuencia por persona. {$totalCargosNuevos} cargo(s) nuevo(s) creado(s).");

        return self::SUCCESS;
    }
}
