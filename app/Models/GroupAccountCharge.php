<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Libro mayor de cargos diarios de una Cuenta Grupal (Delegación/
 * Corporativo con company_name). Cada fila es UN día operativo de UNA
 * habitación, descontado internamente contra el saldo prepagado — nunca
 * un Payment, nunca un movimiento de caja (ver ChargeGroupAccountsDailyCommand).
 *
 * El UNIQUE de la migración (special_agreement_id, checkin_id, charge_date)
 * es lo que garantiza que nunca exista más de una fila para el mismo día:
 * la idempotencia vive en la base de datos, no solo en el código del comando.
 */
class GroupAccountCharge extends Model
{
    protected $fillable = [
        'special_agreement_id',
        'checkin_id',
        'charge_date',
        'amount',
        'status',
        'covered_at',
    ];

    protected $casts = [
        'charge_date' => 'date',
        'amount' => 'decimal:2',
        'covered_at' => 'datetime',
    ];

    public function specialAgreement(): BelongsTo
    {
        return $this->belongsTo(SpecialAgreement::class);
    }

    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }
}
