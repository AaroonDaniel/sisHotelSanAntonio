<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un bloque de N días cobrado a UNA persona bajo su
 * CorporatePaymentSchedule (frecuencia propia) -- descontado del fondo
 * de la Cuenta Grupal, nunca un Payment ni un movimiento de caja (mismo
 * criterio que GroupAccountCharge, pero por persona/bloque en vez de por
 * checkin/día).
 */
class CorporatePaymentCharge extends Model
{
    protected $fillable = [
        'guest_id',
        'special_agreement_id',
        'checkin_id',
        'cycle_start_date',
        'cycle_end_date',
        'days_charged',
        'amount',
        'status',
        'covered_at',
    ];

    protected $casts = [
        'cycle_start_date' => 'date',
        'cycle_end_date' => 'date',
        'days_charged' => 'integer',
        'amount' => 'decimal:2',
        'covered_at' => 'datetime',
    ];

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    public function specialAgreement(): BelongsTo
    {
        return $this->belongsTo(SpecialAgreement::class);
    }

    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }
}
