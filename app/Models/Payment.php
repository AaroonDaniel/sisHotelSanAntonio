<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity;

class Payment extends Model
{
    use LogsActivity;

    protected $fillable = [
        'checkin_id',
        'special_agreement_id',
        'reservation_id',
        'user_id',
        'operator_id',
        'cash_register_id',
        'amount',
        'method',
        'bank_name',
        'type',
        'payment_date',
        'voucher_path',
        'status',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'payment_date' => 'datetime',
    ];

    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }

    /**
     * Adelanto cobrado directamente sobre una reserva (antes del check-in).
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * Si este pago fue hecho contra una Cuenta Maestra corporativa (grupo
     * de habitaciones), no contra una habitación puntual.
     */
    public function specialAgreement(): BelongsTo
    {
        return $this->belongsTo(SpecialAgreement::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function operador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('pagos');
    }

    /**
     * Redirige el causer del log automático al OPERADOR real (operator_id,
     * el avatar elegido), no a Auth::user() (bajo Terminal Compartida,
     * siempre la cuenta genérica 'recepcion'). Sin esto, toda la bitácora
     * de auditoría de pagos le atribuiría el dinero a 'recepcion' en vez
     * de a quien realmente lo cobró.
     */
    public function tapActivity(Activity $activity, string $eventName): void
    {
        $operatorId = $this->operator_id ?? $this->user_id;
        if ($operatorId && ($operator = User::find($operatorId))) {
            $activity->causer()->associate($operator);
        }
    }
}