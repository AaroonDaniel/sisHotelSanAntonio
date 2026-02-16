<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'checkin_id', 'user_id', 'amount', 'method', 'bank_name', 'reference', 'type'
    ];

    public function checkin(): BelongsTo {
        return $this->belongsTo(Checkin::class);
    }

    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }
}