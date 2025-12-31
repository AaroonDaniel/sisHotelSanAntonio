<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase;

class Price extends Model
{
    use AutoUpperCase;
    protected $fillable = [
        'room_type_id',
        'bathroom_type',
        'amount',
        'is_active',
    ];
    
    protected $uppercaseFields = [
        'bathroom_type',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function roomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class);
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

