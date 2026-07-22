<?php

namespace App\Traits;

use App\Models\Checkin;
use App\Models\GroupAccountCharge;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Núcleo COMPARTIDO del libro mayor de cargos diarios de Cuentas
 * Grupales — usado tanto por ChargeGroupAccountsDailyCommand (calcula
 * las noches YA transcurridas hasta ayer) como por CheckinController al
 * hacer checkout/multiCheckout/splitFromGroup (usa el propio $finalDays
 * que cada uno ya calculó con calculateBillableDays() para cobrar la
 * estadía real).
 *
 * 🛡️ $nightsOwed es un CONTEO de noches, no una fecha: se cargan
 * exactamente esa cantidad de noches desde el ancla (anchorDay,
 * anchorDay+1, ..., anchorDay+nightsOwed-1). Pasarle una fecha límite
 * "inclusive del día del checkout" (como se intentó en un primer intento
 * de esta fase) es INCORRECTO — calculateBillableDays() ya excluye el
 * día de salida del conteo de noches cuando el checkout es a tiempo (el
 * huésped no debe una noche extra solo por salir hoy), así que el libro
 * mayor debe cargar EXACTAMENTE ese mismo número, ni uno más. Esto se
 * detectó con la Prueba A de Fase 3 (el libro mayor cobraba 3 noches
 * cuando calculateBillableDays() decía 2).
 *
 * Idempotencia: el UNIQUE de (special_agreement_id, checkin_id,
 * charge_date) es la defensa dura; además se verifica con exists() antes
 * de intentar crear cada fila.
 */
trait ChargesGroupAccountLedger
{
    use ResolvesBusinessDate;

    protected function chargeUpToBusinessDay(Checkin $checkin, int $nightsOwed): int
    {
        $checkin->loadMissing('specialAgreement');
        $agreement = $checkin->specialAgreement;

        if (!$agreement || empty($agreement->company_name) || $nightsOwed <= 0) {
            return 0;
        }

        $anchor = Carbon::parse($checkin->price_effective_since ?? $agreement->starts_at);
        $anchorDay = $this->resolveBusinessDate($anchor, $checkin->schedule);

        $nuevos = 0;

        for ($i = 0; $i < $nightsOwed; $i++) {
            $chargeDate = $anchorDay->copy()->addDays($i);

            $yaExiste = GroupAccountCharge::where('special_agreement_id', $agreement->id)
                ->where('checkin_id', $checkin->id)
                ->whereDate('charge_date', $chargeDate->toDateString())
                ->exists();

            if ($yaExiste) {
                continue;
            }

            $saldoDisponible = $agreement->availableLedgerBalance();
            $montoDia = (float) $checkin->agreed_price;
            $status = $saldoDisponible >= $montoDia ? 'cubierto' : 'pendiente';

            try {
                GroupAccountCharge::create([
                    'special_agreement_id' => $agreement->id,
                    'checkin_id' => $checkin->id,
                    'charge_date' => $chargeDate->toDateString(),
                    'amount' => $montoDia,
                    'status' => $status,
                    'covered_at' => $status === 'cubierto' ? now() : null,
                ]);
            } catch (QueryException $e) {
                // Carrera real (comando diario y checkout pisándose al
                // mismo tiempo): el UNIQUE de la tabla frena el segundo
                // insert — se ignora, nunca se duplica.
                Log::warning("chargeUpToBusinessDay: cargo duplicado ignorado (checkin {$checkin->id}, {$chargeDate->toDateString()}).");
                continue;
            }

            $nuevos++;
        }

        return $nuevos;
    }
}
