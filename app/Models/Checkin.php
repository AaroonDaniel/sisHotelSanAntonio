<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Checkin extends Model
{
    use AutoUpperCase;

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
        'status',
        'schedule_id',
    ];

    protected $uppercaseFields = [
        'notes',
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

    // Relacion con los servicios consumidos durante la estadía
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'checkin_details')
                    ->withPivot('quantity', 'selling_price') // Campos extra de la tabla intermedia
                    ->withTimestamps();
    }
    //Relacion con los acompañantes de la estadia
    public function companions(): BelongsToMany
    {
        return $this->belongsToMany(Guest::class, 'checkin_guests')
                    
                    ->withTimestamps();
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }
}