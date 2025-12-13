<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ReservationDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'reservation_id',
        'room_id',
        'price_id',
        'price', 
    ];

    // --- RELACIONES ---

    // 1. Pertenece a una Reserva Principal
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    // 2. Pertenece a una Habitación específica
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    // 3. Pertenece a una configuración de Precio (para saber si era con baño privado/compartido)
    public function price(): BelongsTo
    {
        return $this->belongsTo(Price::class);
    }
}