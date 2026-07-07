<?php

namespace App\Services;

use App\Models\Checkin;
use App\Models\Payment;
use App\Models\SpecialAgreement;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

/**
 * "Cuenta Maestra" corporativa.
 *
 * Un SpecialAgreement (type='corporativo') puede agrupar VARIAS
 * habitaciones (Checkins) — la empresa paga UN monto global cada cierto
 * número de días (payment_frequency_days), y ese pago se reparte
 * proporcionalmente entre las habitaciones del grupo para que ninguna
 * aparezca individualmente en mora mientras la cuenta del grupo esté al día.
 *
 * checkin_details NO interviene aquí: esa tabla es de servicios consumidos
 * (garaje, minibar, etc.), un concepto totalmente distinto.
 */
class CorporateBillingService
{
    /**
     * Crea la Cuenta Maestra (el SpecialAgreement "contenedor" del grupo).
     * Todavía no tiene ninguna habitación — se le agregan con
     * attachCheckinToMasterAccount().
     */
    public function createMasterAccount(
        string $companyName,
        int $paymentFrequencyDays,
        ?Carbon $startsAt = null,
    ): SpecialAgreement {
        return SpecialAgreement::create([
            'type' => 'corporativo',
            'company_name' => $companyName,
            'payment_frequency_days' => $paymentFrequencyDays,
            'starts_at' => $startsAt ?? now(),
        ]);
    }

    /**
     * Liga un Checkin (ya creado por el flujo normal de asignación —
     * CheckinController::store()) a una Cuenta Maestra existente.
     *
     * Si ese checkin ya tenía SU PROPIO convenio individual (por ejemplo,
     * se creó marcado como "corporativo" antes de agruparlo) y nadie más lo
     * usa, se elimina para no dejar convenios huérfanos en la tabla.
     */
    public function attachCheckinToMasterAccount(Checkin $checkin, SpecialAgreement $masterAccount): void
    {
        $previousAgreementId = $checkin->special_agreement_id;

        $checkin->update(['special_agreement_id' => $masterAccount->id]);

        if ($previousAgreementId && $previousAgreementId !== $masterAccount->id) {
            $stillUsed = Checkin::where('special_agreement_id', $previousAgreementId)->exists();
            if (!$stillUsed) {
                SpecialAgreement::where('id', $previousAgreementId)->delete();
            }
        }
    }

    /**
     * Registra un pago hecho contra la Cuenta Maestra (el grupo), no contra
     * una habitación específica. checkin_id queda null a propósito.
     */
    public function registerCorporatePayment(
        SpecialAgreement $agreement,
        float $amount,
        ?int $cashRegisterId,
        string $method = 'EFECTIVO',
        ?string $bankName = null,
        ?int $operatorId = null,
        ?int $userId = null,
    ): Payment {
        if ($agreement->type !== 'corporativo') {
            throw new InvalidArgumentException(
                "El convenio #{$agreement->id} no es de tipo 'corporativo'; no se le pueden registrar pagos de Cuenta Maestra."
            );
        }

        return Payment::create([
            'special_agreement_id' => $agreement->id,
            'checkin_id' => null,
            'user_id' => $userId ?? Auth::id() ?? 1,
            'operator_id' => $operatorId,
            'cash_register_id' => $cashRegisterId,
            'amount' => $amount,
            'method' => $method,
            'bank_name' => $method === 'EFECTIVO' ? null : $bankName,
            'type' => 'PAGO',
            'payment_date' => now(),
        ]);
    }

    /**
     * Calcula cómo se distribuye lo pagado a la Cuenta Maestra entre las
     * habitaciones (Checkins activos) del grupo, prorrateado según la
     * tarifa diaria de cada una.
     *
     * Ejemplo (el del negocio): 5 habitaciones a 60 Bs/noche cada una
     * (300 Bs/noche de grupo). Si la empresa paga 4500 Bs (justo el ciclo
     * de 15 días: 300 x 15), cada habitación recibe 1/5 de esos 4500 Bs
     * = 900 Bs a su favor — exactamente los 15 días de ESA habitación
     * (15 x 60 = 900), sin importar que el pago se hizo en un solo
     * movimiento a nivel de grupo.
     *
     * @return Collection<int, array{
     *     checkin_id: int,
     *     room_number: string|null,
     *     daily_rate: float,
     *     share_ratio: float,
     *     allocated_paid: float,
     *     owed_so_far: float,
     *     balance: float,
     *     is_in_mora: bool,
     * }>
     */
    public function getRoomBalances(SpecialAgreement $agreement): Collection
    {
        $agreement->loadMissing([
            'checkins' => fn ($q) => $q->where('status', 'activo')->with('room:id,number'),
            'payments',
        ]);

        $totalPaid = (float) $agreement->payments->sum('amount');
        $totalDailyRate = (float) $agreement->checkins->sum('agreed_price');

        if ($totalDailyRate <= 0 || $agreement->checkins->isEmpty()) {
            return collect();
        }

        return $agreement->checkins->map(function ($checkin) use ($agreement, $totalPaid, $totalDailyRate) {
            $dailyRate = (float) $checkin->agreed_price;
            $shareRatio = $totalDailyRate > 0 ? ($dailyRate / $totalDailyRate) : 0;

            // Parte proporcional de lo pagado por el GRUPO que le
            // corresponde a esta habitación.
            $allocatedPaid = round($totalPaid * $shareRatio, 2);

            // 🚀 ANCLA POR HABITACIÓN: si ESTA habitación tuvo su propia
            // transferencia/cambio de tarifa (ej. pasó de simple a doble,
            // o se dividió/fusionó — ver transfer()/merge() en
            // CheckinController), 'price_effective_since' marca desde
            // cuándo rige SU tarifa actual, y los días previos a eso ya
            // quedaron fijos en 'carried_balance' a la tarifa VIEJA. Si
            // nunca cambió, cae al ancla del convenio (starts_at).
            $roomAnchor = $checkin->price_effective_since ?? $agreement->starts_at;
            $daysElapsedForRoom = max(0, Carbon::parse($roomAnchor)->diffInDays(now()));

            // Lo consumido a la tarifa ACTUAL desde su propio ancla, más lo
            // que ya quedó fijo (a la tarifa vieja) antes de esa ancla.
            $owedSoFar = round(
                ($dailyRate * $daysElapsedForRoom) + (float) $checkin->carried_balance,
                2,
            );

            // Positivo = a favor (crédito); negativo = en mora.
            $balance = round($allocatedPaid - $owedSoFar, 2);

            return [
                'checkin_id' => $checkin->id,
                'room_number' => $checkin->room->number ?? null,
                'daily_rate' => $dailyRate,
                'share_ratio' => round($shareRatio, 4),
                'allocated_paid' => $allocatedPaid,
                'owed_so_far' => $owedSoFar,
                'balance' => $balance,
                'is_in_mora' => $balance < 0,
            ];
        })->values();
    }
}
