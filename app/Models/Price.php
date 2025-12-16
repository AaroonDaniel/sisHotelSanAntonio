<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Price extends Model
{
    protected $fillable = [
        //'room_type_id',
        'bathroom_type',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    /*public function RoomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class);
    }*/

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }
}
