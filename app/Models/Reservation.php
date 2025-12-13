<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory; // Importante para los Seeders

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'guest_id',
        'guest_count',
        'bathroom_preference',
        'arrival_date',
        'arrival_time',
        'duration_days',
        'advance_payment',
        'payment_type',
        
    ];

    // Relaciones Eloquent
    //Relacion con User
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    //Relacion con Guest
    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    //Relacion con ReservationDetail
    public function details(): HasMany
    {
        return $this->hasMany(ReservationDetail::class);
    }
}