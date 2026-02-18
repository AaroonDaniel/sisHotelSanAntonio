<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase;

class Room extends Model
{
    use AutoUpperCase;
    protected $fillable = [
        'number',
        'block_id',
        'floor_id',
        'price_id',
        'room_type_id',
        'status',
        'notes',
        'image_path',
        'is_active',
    ];

    protected $uppercaseFields = [
        'status',
        'notes',
    ];
    // --- RELACIONES CON PADRES (BelongsTo) ---

    public function roomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class);
    }

    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class);
    }

    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    public function price(): BelongsTo
    {
        return $this->belongsTo(Price::class);
    }

    // --- RELACIONES CON HIJOS (HasMany) ---
    // (Estas te servirán para ver el historial de uso de la habitación)

    public function checkins(): HasMany
    {
        return $this->hasMany(Checkin::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }
    public function prices(): HasMany
    {
        return $this->hasMany(Price::class, 'room_type_id', 'room_type_id');
    }
}
