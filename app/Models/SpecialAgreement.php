<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SpecialAgreement extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'company_name',
        'origin',
        'agreed_price',
        'payment_frequency_days',
        'starts_at',
        'total_advance',
        'total_consumed',
        'status',
        'closed_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'total_advance' => 'decimal:2',
        'total_consumed' => 'decimal:2',
        'closed_at' => 'datetime',
    ];

    /**
     * MOTOR DE FACTURACIÓN GRUPAL — estado financiero REAL, calculado en
     * vivo desde las tablas fuente (payments/checkins) en vez de confiar en
     * los contadores total_advance/total_consumed (que se incrementan a
     * mano en distintos puntos del código y pueden desincronizarse). Esos
     * dos campos de la tabla se dejan intactos por compatibilidad — nada
     * más los sigue incrementando — pero balance/getBalanceAttribute() ya
     * NO los usa: ahora delega en este cálculo real.
     */

    /**
     * Suma real de TODO el dinero depositado en la cuenta: adelanto
     * inicial + cualquier abono posterior (tabla payments,
     * special_agreement_id). Fuente de verdad en vivo.
     */
    public function getTotalDepositedAttribute(): float
    {
        return round((float) $this->payments()->sum('amount'), 2);
    }

    /**
     * Suma real del costo de TODAS las habitaciones (checkins) vinculadas a
     * este grupo, activas o finalizadas: agreed_price * duration_days de
     * cada una. Fuente de verdad en vivo — no depende de ningún contador.
     */
    public function getTotalConsumedRealAttribute(): float
    {
        return round(
            (float) $this->checkins()
                ->get(['agreed_price', 'duration_days'])
                ->sum(fn ($c) => (float) ($c->agreed_price ?? 0) * max(1, (int) $c->duration_days)),
            2,
        );
    }

    /**
     * Saldo de "bolsa" de la Cuenta Grupal: total depositado menos lo
     * realmente consumido. Positivo = fondo grupal disponible; negativo =
     * deuda morosa del grupo.
     */
    public function getBalanceAttribute(): float
    {
        return round($this->total_deposited - $this->total_consumed_real, 2);
    }

    /**
     * Resumen financiero listo para serializar al frontend (banner del
     * OccupiedRoomModal, listado de /group-accounts, resumen de checkout
     * múltiple) con los nombres de campo que espera la UI.
     */
    public function financialSummary(): array
    {
        return [
            'total_deposited' => $this->total_deposited,
            'total_consumed' => $this->total_consumed_real,
            'balance' => $this->balance,
        ];
    }

    /**
     * Cuenta Grupal "real" (con nombre propio): las que se crean desde el
     * módulo de Cuentas Grupales, a diferencia de un convenio individual
     * ad-hoc (una sola habitación, sin company_name) que sigue existiendo
     * desde el checkbox "ASIG. CORP" del check-in normal.
     */
    public function scopeGroupAccounts($query)
    {
        return $query->whereNotNull('company_name')
            ->whereIn('type', ['corporativo', 'delegacion']);
    }

    /**
     * Habitaciones (Checkins) agrupadas bajo este convenio. Para una
     * "Cuenta Maestra" corporativa multi-habitación, VARIOS Checkins
     * comparten el mismo SpecialAgreement — cada uno con su propio
     * agreed_price (tarifa por noche de SU habitación), mientras que el
     * convenio en sí solo guarda lo compartido por el grupo: tipo, empresa,
     * frecuencia de pago y desde cuándo arranca el ciclo (starts_at).
     */
    public function checkins(): HasMany
    {
        return $this->hasMany(Checkin::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * Pagos hechos contra la CUENTA MAESTRA (el grupo), no contra una
     * habitación en particular. Ver CorporateBillingService.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Convenios corporativos a los que ya les toca cobrar el siguiente
     * ciclo: pasaron >= payment_frequency_days desde el último pago
     * registrado contra el grupo (o desde starts_at si nunca se pagó).
     * Solo considera convenios con al menos una habitación todavía activa.
     *
     * NOTA: usa funciones específicas de PostgreSQL (make_interval), igual
     * que el resto de la app (ver migraciones de cash_registers/siat).
     */
    public function scopeDueForCorporateBilling($query)
    {
        return $query->where('type', 'corporativo')
            ->where('payment_frequency_days', '>', 0)
            ->whereHas('checkins', fn ($q) => $q->where('status', 'activo'))
            ->whereRaw(
                "COALESCE(
                    (SELECT MAX(p.payment_date) FROM payments p WHERE p.special_agreement_id = special_agreements.id),
                    special_agreements.starts_at
                ) <= (NOW() - make_interval(days => special_agreements.payment_frequency_days))"
            );
    }
}