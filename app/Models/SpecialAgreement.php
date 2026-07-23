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
     * habitación en particular.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Libro mayor de cargos diarios (Fase 1 — ver
     * ChargeGroupAccountsDailyCommand y GroupAccountCharge).
     */
    public function groupAccountCharges(): HasMany
    {
        return $this->hasMany(GroupAccountCharge::class);
    }

    /**
     * Saldo disponible para el LIBRO MAYOR de cargos diarios: total
     * depositado menos SOLO lo ya cubierto en group_account_charges.
     *
     * ⚠️ Distinto de $this->balance (arriba): ese compara contra
     * total_consumed_real (costo total de las habitaciones por
     * agreed_price*duration_days) y no sabe nada del libro mayor. Este
     * método es la ÚNICA fuente de verdad que deben usar tanto
     * ChargeGroupAccountsDailyCommand (Fase 1) como
     * GroupAccountController::addAdvance() (Fase 2) para decidir si un
     * cargo se cubre o queda pendiente — si cada uno calculara el saldo
     * por su cuenta, se desincronizarían entre sí.
     */
    public function availableLedgerBalance(): float
    {
        $cubierto = $this->groupAccountCharges()->where('status', 'cubierto')->sum('amount');

        return round((float) $this->total_deposited - (float) $cubierto, 2);
    }

    /**
     * Cubre los cargos 'pendiente' más antiguos primero (charge_date ASC)
     * mientras el saldo disponible alcance — llamado al recargar la
     * cuenta (GroupAccountController::addAdvance(), Fase 2). Si el primer
     * pendiente en orden cronológico no alcanza a cubrirse, se corta ahí
     * (no se "salta" a uno más nuevo y más barato): el orden es por
     * fecha, no por monto. Devuelve cuántos cargos quedaron cubiertos.
     */
    public function coverPendingCharges(): int
    {
        $pendientes = $this->groupAccountCharges()
            ->where('status', 'pendiente')
            ->orderBy('charge_date')
            ->get();

        $cubiertos = 0;

        foreach ($pendientes as $cargo) {
            if ($this->availableLedgerBalance() < (float) $cargo->amount) {
                break;
            }

            $cargo->update(['status' => 'cubierto', 'covered_at' => now()]);
            $cubiertos++;
        }

        return $cubiertos;
    }
}