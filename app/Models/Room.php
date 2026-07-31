<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use App\Traits\AutoUpperCase;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity;

class Room extends Model
{
    use AutoUpperCase, LogsActivity;

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

    /**
     * Atributos virtuales que se serializan hacia el frontend (Inertia/React).
     */
    protected $appends = ['image_url'];

    // --- ACCESSORS ---

    /**
     * URL pública de la imagen de la habitación.
     * Retorna la URL completa vía Storage o null si no hay imagen.
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->image_path
                ? Storage::url($this->image_path)
                : null,
        );
    }

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

    public function reservationDetails()
    {
        return $this->hasMany(ReservationDetail::class);
    }

    public function checkinDetails(): HasMany
    {
        return $this->hasMany(CheckinDetail::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('room');
    }

    /**
     * A diferencia de Payment/Invoice/Checkin, una habitación no "tiene"
     * un operador propio -- solo el EVENTO que la actualiza (checkin,
     * checkout, etc.) sabe quién lo hizo. `auditOperatorId` es una
     * propiedad dinámica, NO persistida (no está en $fillable ni en la
     * tabla `rooms`): el caller la setea justo antes de `->update(...)`
     * cuando tiene un operador real a mano (ver checkout()/multiCheckout()
     * en CheckinController), y tapActivity() la lee acá. Si no se setea,
     * el causer cae al comportamiento por defecto (Auth::user()).
     */
    public ?int $auditOperatorId = null;

    public function tapActivity(Activity $activity, string $eventName): void
    {
        if ($this->auditOperatorId && ($operator = User::find($this->auditOperatorId))) {
            $activity->causer()->associate($operator);
        }
    }
}