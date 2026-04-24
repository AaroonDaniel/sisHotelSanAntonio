<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    protected $appends = ['advance_payment'];
    protected $fillable = [
        'user_id',
        'guest_id',
        'guest_count',
        'arrival_date',
        'arrival_time',
        'duration_days',
        'payment_type',
        'status',
        'special_agreement_id',

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
    public function specialAgreement(): BelongsTo
    {
        return $this->belongsTo(SpecialAgreement::class);
    }
    public function getAdvancePaymentAttribute()
    {
        return $this->payments()->where('type', 'ADELANTO')->sum('amount') ?? 0;
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
