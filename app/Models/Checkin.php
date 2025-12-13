<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Checkin extends Model
{
    protected $fillable = [
        'room_id',
        'guest_id',
        'user_id',
        'reservation_id',
        'check_in_date',
        'duration_days',
        'check_out_date',
        'notes',
        'advance_payment',
    ];

    // Para que Laravel maneje las fechas automáticamente como objetos Carbon
    protected $casts = [
        'check_in_date' => 'datetime',
        'check_out_date' => 'datetime',
        'advance_payment' => 'decimal:2',
    ];

    // --- RELACIONES (BelongsTo) ---

    // La habitación asignada
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    // El cliente hospedado
    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    // El recepcionista que hizo el registro
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // --- RELACIONES (HasMany) ---
    
    // Detalles de consumo (Servicios a la habitación: Coca Cola, Lavandería...)
    // Equivalente a tu tabla 'AsiDet'
    public function checkinDetails(): HasMany
    {
        return $this->hasMany(CheckinDetail::class);
    }
    
    // Facturas generadas de esta estadía
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

}