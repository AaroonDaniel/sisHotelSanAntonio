<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

/**
 * SignificantEvent
 *
 * Representa un Evento Significativo (contingencia) según RND-102100000011.
 * Permite operar offline temporalmente y luego notificar al SIAT.
 */
class SignificantEvent extends Model
{
    use HasFactory, LogsActivity;

    // Códigos del catálogo SIAT
    public const CODE_INTERNET_OUTAGE   = 1;
    public const CODE_SIN_UNREACHABLE   = 2;
    public const CODE_POWER_OUTAGE      = 3;
    public const CODE_SOFTWARE_FAILURE  = 4;
    public const CODE_INFRA_CHANGE      = 5;
    public const CODE_COMMS_FAILURE     = 6;
    public const CODE_FORCE_MAJEURE     = 7;

    public const STATUS_ACTIVE     = 'active';     // En curso (emitiendo offline)
    public const STATUS_CLOSED     = 'closed';     // Cerrado localmente, pendiente de registrar en SIAT
    public const STATUS_REGISTERED = 'registered'; // Registrado en SIAT
    public const STATUS_FAILED     = 'failed';     // Fallo al registrar

    protected $fillable = [
        'event_code',
        'description',
        'start_at',
        'end_at',
        'cufd_event',
        'cufd_event_control_code',
        'siat_reception_code',
        'status',
        'user_id',
        'registered_at',
    ];

    protected $casts = [
        'start_at'      => 'datetime',
        'end_at'        => 'datetime',
        'registered_at' => 'datetime',
        'event_code'    => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Etiqueta legible del código de evento.
     */
    public function getCodeLabelAttribute(): string
    {
        return [
            self::CODE_INTERNET_OUTAGE  => 'Corte de Internet',
            self::CODE_SIN_UNREACHABLE  => 'SIN Inaccesible',
            self::CODE_POWER_OUTAGE     => 'Corte de Energía Eléctrica',
            self::CODE_SOFTWARE_FAILURE => 'Falla de Software',
            self::CODE_INFRA_CHANGE     => 'Cambio de Infraestructura',
            self::CODE_COMMS_FAILURE    => 'Falla de Comunicaciones',
            self::CODE_FORCE_MAJEURE    => 'Fuerza Mayor',
        ][$this->event_code] ?? 'Desconocido';
    }

    /**
     * Scope: eventos que aún admiten acoplar facturas
     * (activos o cerrados pero sin registrar en SIAT todavía).
     */
    public function scopeAvailableForAttach($query)
    {
        return $query->whereIn('status', [
            self::STATUS_ACTIVE,
            self::STATUS_CLOSED,
        ])
            ->whereNull('siat_reception_code');
    }

    /**
     * Indica si este evento todavía admite nuevas facturas.
     */
    public function getAcceptsAttachmentsAttribute(): bool
    {
        return in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_CLOSED], true)
            && is_null($this->siat_reception_code);
    }

    public function getActivitylogOptions(): LogOptions 
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('significant_event');
    }
}
