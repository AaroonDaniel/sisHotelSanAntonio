<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Reservation extends Model
{
    use LogsActivity;
    protected $appends = ['advance_payment', 'payment_method'];
    protected $fillable = [
        'user_id',
        // 🚀 REDISEÑO: mismo valor que payments.operator_id del adelanto
        // (ver ReservationController::store()) — la reserva ya no fija
        // precio ni método de pago, pero sí recuerda quién la atendió.
        'operator_id',
        'guest_id',
        'guest_count',
        'arrival_date',
        'duration_days',
        'status',
        'special_agreement_id',
        'cancellation_date'
    ];

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

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

    // 🚀 REDISEÑO: la reserva ya no fija payment_type propio (columna
    // eliminada) — el método real vive en payments.method. Igual que
    // advance_payment, se deriva del pago ADELANTO; sin fallback: si
    // no hay adelanto, null (no inventamos un método de pago que no
    // existe).
    public function getPaymentMethodAttribute()
    {
        return $this->payments()
            ->where('type', 'ADELANTO')
            ->latest()
            ->first()
            ?->method;
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
    public function reservationGuests()
    {
        return $this->hasMany(ReservationGuest::class, 'reservation_id', 'id');
    }
    public function getIsExpiredAttribute()
    {
        $today = \Carbon\Carbon::now('America/La_Paz')->startOfDay();
        $arrival = \Carbon\Carbon::parse($this->arrival_date)->startOfDay();
        
        return $arrival->isBefore($today) && in_array($this->status, ['pendiente', 'confirmada']);
    }
    public function getActivitylogOptions(): LogOptions 
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('reservation');
    }

}
