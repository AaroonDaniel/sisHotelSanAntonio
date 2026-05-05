<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
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
}
