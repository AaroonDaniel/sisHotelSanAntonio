<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Frecuencia de cobro POR PERSONA bajo un convenio corporativo/
 * delegación (ver migración create_corporate_payment_schedules_table
 * para el porqué: special_agreements.payment_frequency_days es
 * compartido por todo el convenio, y distintas personas del mismo grupo
 * pueden cobrarse cada quien a su propio ritmo).
 *
 * Clavada por (guest_id, special_agreement_id) -- SIN checkin_id a
 * propósito, así sobrevive cualquier transferencia de habitación sola,
 * sin código de arrastre (ver la migración). Solo merge() (que puede
 * cambiar a la persona de convenio) necesita crear una fila nueva.
 *
 * El precio sigue viviendo en checkins.titular_price /
 * checkin_guests.price -- no se duplica acá.
 */
class CorporatePaymentSchedule extends Model
{
    protected $fillable = [
        'guest_id',
        'special_agreement_id',
        'payment_frequency_days',
    ];

    protected $casts = [
        'payment_frequency_days' => 'integer',
    ];

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function specialAgreement(): BelongsTo
    {
        return $this->belongsTo(SpecialAgreement::class);
    }
}
