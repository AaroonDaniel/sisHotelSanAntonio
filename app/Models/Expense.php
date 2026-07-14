<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity;

class Expense extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'cash_register_id',
        'user_id',
        'operator_id',
        'amount',
        'description',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function operador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('expense');
    }

    /**
     * Redirige el causer del log automático al OPERADOR real (operator_id),
     * no a Auth::user() (siempre 'recepcion' bajo Terminal Compartida).
     */
    public function tapActivity(Activity $activity, string $eventName): void
    {
        $operatorId = $this->operator_id ?? $this->user_id;
        if ($operatorId && ($operator = User::find($operatorId))) {
            $activity->causer()->associate($operator);
        }
    }
}