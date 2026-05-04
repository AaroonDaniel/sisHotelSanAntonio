<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReservationGuest extends Model
{
    use HasFactory;

    // Permitir asignación masiva para estos campos
    protected $fillable = [
        'reservation_id',
        'guest_id',
        'email',
    ];

    /**
     * Relación: Este registro pertenece a una Reserva
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * Relación: Este registro pertenece a un Huésped (Titular)
     */
    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }
}