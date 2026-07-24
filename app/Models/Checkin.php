<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity;

class Checkin extends Model
{
    use AutoUpperCase, LogsActivity;
    protected $appends = ['advance_payment', 'initial_advance_payment'];

    protected $fillable = [
        'room_id',
        'guest_id',
        'user_id',
        'checkin_operator_id',
        'checkout_operator_id',
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
        'titular_price',
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

    /**
     * 🚀 PRECIO POR HUÉSPED (base, sin conectar a ningún flujo de edición
     * todavía — eso es Fase 1+): agreed_price deja de escribirse a mano en
     * cada controlador y pasa a ser SIEMPRE titular_price + Σ
     * checkin_guests.price, recalculado acá. Se dispara desde
     * CheckinGuestObserver (al guardar/borrar un acompañante) y desde
     * CheckinObserver::saving() (al editar titular_price directo).
     *
     * ⚠️ 1 DECIMAL, no 2: setAgreedPriceAttribute() (más abajo, YA
     * existía antes de esta fase) redondea agreed_price a 1 decimal —
     * "REDONDEO OFICIAL" del negocio (mismo criterio que
     * calculateAgreedPrice()). titular_price/checkin_guests.price
     * respetan la MISMA precisión (ver sus propios mutadores) para que
     * la suma nunca produzca un redondeo sorpresa al guardarse acá.
     *
     * saveQuietly() evita que este propio guardado dispare de nuevo los
     * observers (recursión infinita).
     */
    public function recalculateAgreedPrice(): void
    {
        $sumaAcompanantes = (float) $this->companions()->sum('checkin_guests.price');
        $nuevoTotal = round((float) ($this->titular_price ?? 0) + $sumaAcompanantes, 1);

        if ((float) $this->agreed_price !== $nuevoTotal) {
            $this->agreed_price = $nuevoTotal;
            $this->saveQuietly();
        }
    }

    /**
     * Precio individual del titular — MISMA precisión que agreed_price
     * (1 decimal, "redondeo oficial" del negocio).
     */
    public function setTitularPriceAttribute($value)
    {
        $this->attributes['titular_price'] = is_null($value) ? null : round((float) $value, 1);
    }

    public function getTitularPriceAttribute($value)
    {
        return is_null($value) ? null : round((float) $value, 1);
    }

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
            ->using(CheckinGuest::class)
            ->withPivot('origin', 'price')
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

    public function parentCheckin()
    {
        return $this->belongsTo(Checkin::class, 'parent_checkin_id');
    }

    public function specialAgreement(): BelongsTo
    {
        return $this->belongsTo(SpecialAgreement::class);
    }

    /**
     * 🚀 MOTOR DE FACTURACIÓN GRUPAL — REGLA DE ORO: si esta habitación
     * pertenece a una Cuenta Grupal REAL (special_agreement_id con
     * company_name — a diferencia de un convenio individual ad-hoc, que no
     * tiene nombre de grupo), la deuda INDIVIDUAL de este check-in siempre
     * es 0. El huésped no debe nada a nivel personal: su costo
     * (agreed_price * noches) ya se contabiliza en el
     * SpecialAgreement::total_consumed_real del grupo, no aquí.
     *
     * Para check-ins normales (o convenios ad-hoc sin grupo) retorna null
     * — la deuda individual la sigue calculando el frontend como hasta
     * ahora (no se duplica esa lógica en el backend).
     *
     * Deliberadamente NO está en $appends: muchos listados (reportes,
     * auditoría, historial) cargan checkins SIN eager-load de
     * specialAgreement, y auto-serializar esto dispararía una consulta
     * extra por cada fila (N+1). RoomController::status() —la única vista
     * que necesita este dato y ya carga specialAgreement— lo asigna
     * explícitamente como atributo plano antes de renderizar.
     */
    public function getIndividualDebtAttribute(): ?float
    {
        $this->loadMissing('specialAgreement');
        $agreement = $this->specialAgreement;

        if ($agreement && !empty($agreement->company_name)) {
            return 0.0;
        }

        return null;
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

    /**
     * El adelanto ORIGINAL dado al iniciar la estadía (el primer Payment
     * registrado), sin sumar pagos posteriores ni devoluciones. A
     * diferencia de advance_payment (el NETO de todos los movimientos),
     * este es el valor que corresponde mostrar/editar en el formulario de
     * "Editar Asignación" — mismo criterio que usa
     * CheckinController::update() para localizar "el pago inicial" a
     * modificar (Payment::orderBy('id')->first()). Consulta propia (no
     * depende del orden de una relación ya cargada) para ser siempre
     * correcta sin importar cómo se haya hecho eager load de 'payments'.
     */
    public function getInitialAdvancePaymentAttribute()
    {
        return (float) ($this->payments()->orderBy('id')->value('amount') ?? 0);
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

    /**
     * Redirige el causer del log automático al OPERADOR real, no a
     * Auth::user() (siempre 'recepcion' bajo Terminal Compartida).
     * Prioridad: checkout_operator_id (si ya se hizo checkout) >
     * checkin_operator_id (quién hizo la asignación) — el más reciente en
     * el ciclo de vida de la estadía es el más relevante para el evento
     * que se está logueando.
     */
    public function tapActivity(Activity $activity, string $eventName): void
    {
        $operatorId = $this->checkout_operator_id ?? $this->checkin_operator_id;
        if ($operatorId && ($operator = User::find($operatorId))) {
            $activity->causer()->associate($operator);
        }
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
