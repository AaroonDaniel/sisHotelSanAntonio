<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Payment extends Model
{
    use LogsActivity;

    protected $fillable = [
        'checkin_id',
        'reservation_id',
        'user_id',
        'cash_register_id',
        'amount',
        'method',
        'bank_name',
        'type',
        'payment_date',
        'voucher_path',
        'status',
    ];

    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('pagos');
    }
}
