<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    protected $fillable = [
        'number',
        'room_type_id',
        'block_id',
        'floor_id',
        'price_id',
        'status',
        'notes',
        'image_path',
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
}
