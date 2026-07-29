<?php

namespace App\Traits;

use App\Models\Checkin;
use App\Models\CorporatePaymentCharge;
use App\Models\CorporatePaymentSchedule;
use App\Models\Guest;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Núcleo COMPARTIDO del libro mayor de cobros POR PERSONA en bloques de
 * N días (frecuencia propia de cada huésped, App\Models\CorporatePaymentSchedule)
 * — usado tanto por ChargeCorporatePaymentSchedulesCommand (cobra cada
 * bloque de PREPAGO apenas arranca, no cuando termina) como por
 * CheckinController al hacer checkout (si el huésped se va a mitad de un
 * bloque que todavía no se cobró, se cobra solo lo que alcanzó a
 * quedarse).
 *
 * 🚀 MODELO DE PREPAGO: a diferencia del libro diario
 * (ChargesGroupAccountLedger, que cobra noches YA transcurridas, en
 * arrears), acá se cobra el bloque completo de N días EN CUANTO empieza
 * el ciclo — el mismo día que entra, no días después. "Cada 3 días" =
 * se cobra el día 0 (cubre días 0-2), se vuelve a cobrar el día 3 (cubre
 * 3-5), etc., sin esperar a que cada bloque termine para recién ahí
 * descontarlo del fondo.
 *
 * Distinto de ChargesGroupAccountLedger (que cobra el CHECKIN completo
 * un día a la vez, con el precio combinado agreed_price): acá cada
 * persona tiene su propio precio (titular_price/checkin_guests.price) y
 * su propia frecuencia -- un checkin nunca cae en los dos libros a la
 * vez (ver ChargeGroupAccountsDailyCommand::handle()).
 *
 * 🚀 A propósito NO compone ResolvesBusinessDate acá (a diferencia de
 * ChargesGroupAccountLedger): chargeGuestCycles() recibe los días de
 * negocio YA resueltos como parámetros (arrivalDay/throughDay) en vez de
 * resolverlos internamente, así el consumidor (comando o controlador)
 * decide con qué ResolvesBusinessDate ya disponible los calcula, sin
 * arriesgar el mismo conflicto de "trait declarado dos veces" que ya se
 * documentó en CheckinController.
 */
trait ChargesCorporatePaymentSchedule
{
    /**
     * Cobra los bloques de N días de UNA persona, desde su ancla de
     * entrada hasta $throughDay (inclusive) -- PREPAGO: cualquier ciclo
     * que ya haya EMPEZADO (cycleStart <= $throughDay) se cobra por
     * completo de una vez, sin esperar a que termine.
     *
     * $isCheckout distingue el único caso donde el monto se ajusta hacia
     * ABAJO en vez de cobrar el bloque completo: si el huésped se va a
     * mitad de un ciclo que todavía no se había cobrado, ya sabemos con
     * certeza que no lo va a completar -- se cobra solo lo que alcanzó a
     * quedarse. Fuera de checkout (comando diario), nunca se sabe el
     * futuro, así que siempre se cobra el bloque completo apenas arranca.
     */
    protected function chargeGuestCycles(
        Checkin $checkin,
        Guest $guest,
        CorporatePaymentSchedule $schedule,
        Carbon $arrivalDay,
        Carbon $throughDay,
        float $guestPrice,
        bool $isCheckout,
    ): int {
        $frequency = max(1, (int) $schedule->payment_frequency_days);

        if ($throughDay->lt($arrivalDay)) {
            return 0;
        }

        $nuevos = 0;
        $cycleStart = $arrivalDay->copy();

        while ($cycleStart->lte($throughDay)) {
            $idealCycleEnd = $cycleStart->copy()->addDays($frequency - 1);
            // Prepago: el ciclo ya empezó -> se cobra completo. Solo en
            // checkout, si el huésped se va antes de que termine, se
            // cobra nada más lo que alcanzó a quedarse.
            $cycleEnd = ($isCheckout && $throughDay->lt($idealCycleEnd))
                ? $throughDay->copy()
                : $idealCycleEnd;

            $yaExiste = CorporatePaymentCharge::where('guest_id', $guest->id)
                ->where('special_agreement_id', $schedule->special_agreement_id)
                ->whereDate('cycle_start_date', $cycleStart->toDateString())
                ->exists();

            if ($yaExiste) {
                $cycleStart = $idealCycleEnd->copy()->addDay();
                continue;
            }

            $diasCargados = $cycleStart->diffInDays($cycleEnd) + 1;
            $monto = round($guestPrice * $diasCargados, 2);

            $agreement = $schedule->specialAgreement;
            $saldoDisponible = $agreement->availableLedgerBalance();
            $status = $saldoDisponible >= $monto ? 'cubierto' : 'pendiente';

            try {
                CorporatePaymentCharge::create([
                    'guest_id' => $guest->id,
                    'special_agreement_id' => $schedule->special_agreement_id,
                    'checkin_id' => $checkin->id,
                    'cycle_start_date' => $cycleStart->toDateString(),
                    'cycle_end_date' => $cycleEnd->toDateString(),
                    'days_charged' => $diasCargados,
                    'amount' => $monto,
                    'status' => $status,
                    'covered_at' => $status === 'cubierto' ? now() : null,
                ]);
            } catch (QueryException $e) {
                // Carrera real (comando diario y checkout pisándose al
                // mismo tiempo): el UNIQUE de la tabla frena el segundo
                // insert -- se ignora, nunca se duplica.
                Log::warning("chargeGuestCycles: cargo duplicado ignorado (guest {$guest->id}, ciclo {$cycleStart->toDateString()}).");
                $cycleStart = $idealCycleEnd->copy()->addDay();
                continue;
            }

            $nuevos++;
            $cycleStart = $idealCycleEnd->copy()->addDay();
        }

        return $nuevos;
    }
}
