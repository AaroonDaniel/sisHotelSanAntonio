<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Checkin extends Model
{
    use AutoUpperCase, LogsActivity;
    protected $appends = ['advance_payment'];

    protected $fillable = [
        'room_id',
        'guest_id',
        'user_id',
        'checkin_operator_id',
        'checkout_operator_id',
        'reservation_id',
        'check_in_date',
        'duration_days',
        'check_out_date',
        'notes',
        'status',
        'schedule_id',
        'origin',
        'actual_arrival_date',
        'carried_balance',
        'is_temporary',
        'parent_checkin_id',
        'special_agreement_id',
        'agreed_price',
        'price_effective_since',
        'cash_register_id',
    ];

    protected $uppercaseFields = [
        'notes',
    ];

    // Para que Laravel maneje las fechas automáticamente como objetos Carbon
    protected $casts = [
        'check_in_date' => 'datetime',
        'check_out_date' => 'datetime',
        'advance_payment' => 'decimal:2',
        'actual_arrival_date' => 'datetime',
        'price_effective_since' => 'datetime',
        'is_temporary' => 'boolean',
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

    // El operador que físicamente realizó la ASIGNACIÓN durante la sesión global
    public function checkinOperator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checkin_operator_id');
    }

    // El operador que físicamente realizó el CHECKOUT (puede ser distinto de quién asignó)
    public function checkoutOperator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checkout_operator_id');
    }

    // La caja/turno que estaba abierta cuando se creó esta asignación
    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
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
    public function services()
    {
        // Es vital el 'withPivot' para que React pueda leer s.pivot.quantity y s.pivot.selling_price
        return $this->belongsToMany(Service::class, 'checkin_details')
            ->withPivot('id', 'quantity', 'selling_price')
            ->withTimestamps();
    }
    //Relacion con los acompañantes de la estadia
    public function companions(): BelongsToMany
    {
        return $this->belongsToMany(Guest::class, 'checkin_guests')
            ->withPivot('origin')
            ->withTimestamps();
    }



    public function schedule(): BelongsTo
    {
        return $this->belongsTo(Schedule::class);
    }

    // Tipo de pago
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Total realmente pagado por el Huésped.
     *
     * sum('amount') de SQL ya resta automáticamente los montos negativos
     * (devoluciones), por lo que NO se debe filtrar por 'type' ni invertir
     * signos manualmente. La contabilidad cuadra sola.
     */
    public function getRealPaidAttribute()
    {
        return (float) $this->payments()->sum('amount');
    }

    public function parentCheckin()
    {
        return $this->belongsTo(Checkin::class, 'parent_checkin_id');
    }

    public function specialAgreement(): BelongsTo
    {
        return $this->belongsTo(SpecialAgreement::class);
    }

    /**
     * Adelanto NETO de la estadía.
     *
     * Incluye TODOS los movimientos de dinero del checkin: los pagos
     * positivos suman y las devoluciones (guardadas como monto negativo)
     * restan de forma natural. No se filtra por 'type' para que una
     * devolución reduzca el adelanto real inmediatamente.
     */
    public function getAdvancePaymentAttribute()
    {
        return (float) ($this->payments()->sum('amount') ?? 0);
    }

    public function transfers()
    {
        return $this->hasMany(RoomTransfer::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('checkins');
    }


    public function guests()
    {
        // Si usas una tabla intermedia llamada checkin_guests
        return $this->belongsToMany(Guest::class, 'checkin_guests', 'checkin_id', 'guest_id');
    }

    //Mutador al guarda el monto  por convenios
    public function setAgreedPriceAttribute($value)
    {
        $this->attributes['agreed_price'] = is_null($value) ? null : round((float) $value, 1);
    }

    public function getAgreedPriceAttribute($value)
    {
        return is_null($value) ? null : round((float) $value, 1);
    }
}
