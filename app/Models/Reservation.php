<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    protected $fillable = [
        'user_id',
        'guest_id',
        'guest_count',
        'arrival_date',
        'arrival_time',
        'duration_days',
        'advance_payment',
        'payment_type',
        'status',

    ];

    // Relación: Una reserva pertenece a un Huésped
    public function guest()
    {
        return $this->belongsTo(Guest::class);
    }

    // Relación: Una reserva tiene muchos Detalles (Habitaciones)
    public function details()
    {
        return $this->hasMany(ReservationDetail::class);
    }
}