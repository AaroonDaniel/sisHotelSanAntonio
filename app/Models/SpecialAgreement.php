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
     *
     * 🚀 CONVENIO AD-HOC INDIVIDUAL (sin company_name): a diferencia de
     * una Cuenta Grupal real, sus pagos NUNCA se mueven a
     * special_agreement_id -- el huésped paga como cualquier checkin
     * normal, atado a su propio checkin_id (ver
     * ReservationController/CheckinController: eso solo se reasigna para
     * Cuentas Grupales reales, pago 'grupal'). Sin esto, cualquier abono
     * en efectivo de un convenio individual sería invisible acá, y cada
     * ciclo de corporate_payment_charges saldría 'pendiente' sin
     * importar cuánto se hubiera pagado.
     */
    public function getTotalDepositedAttribute(): float
    {
        $total = (float) $this->payments()->sum('amount');

        if (empty($this->company_name)) {
            $total += (float) \App\Models\Payment::whereIn(
                'checkin_id',
                $this->checkins()->pluck('checkins.id'),
            )->sum('amount');
        }

        return round($total, 2);
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
            // 🚀 Saldo REAL del libro mayor (lo que availableLedgerBalance()
            // ya dejó 'cubierto' en group_account_charges/
            // corporate_payment_charges) — distinto de 'balance' de arriba
            // (que compara contra total_consumed_real, un costo TEÓRICO
            // recalculado en vivo que puede ir adelantado o atrasado
            // respecto de lo que el libro mayor ya procesó). Cualquier
            // pantalla que decida cuánto cobrarle al huésped en caja
            // (ej. multiCheckoutModal) debe usar ESTE campo, no 'balance'.
            'available_ledger_balance' => $this->availableLedgerBalance(),
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
     * Frecuencia de cobro POR PERSONA bajo este convenio -- ver
     * App\Models\CorporatePaymentSchedule.
     */
    public function paymentSchedules(): HasMany
    {
        return $this->hasMany(CorporatePaymentSchedule::class);
    }

    /**
     * Libro mayor de cobros POR PERSONA en bloques de N días -- ver
     * App\Models\CorporatePaymentCharge.
     */
    public function paymentCharges(): HasMany
    {
        return $this->hasMany(CorporatePaymentCharge::class);
    }

    /**
     * Saldo disponible para el LIBRO MAYOR de cargos: total depositado
     * menos lo ya cubierto en AMBOS libros -- group_account_charges (por
     * checkin/día, ChargeGroupAccountsDailyCommand) y
     * corporate_payment_charges (por persona/bloque de N días,
     * ChargeCorporatePaymentSchedulesCommand). Un checkin nunca cae en
     * los dos libros a la vez (ver exclusión en
     * ChargeGroupAccountsDailyCommand::handle()), pero el FONDO es
     * compartido por toda la Cuenta Grupal, así que el saldo disponible
     * tiene que descontar lo que sea que haya cobrado cualquiera de los
     * dos.
     *
     * ⚠️ Distinto de $this->balance (arriba): ese compara contra
     * total_consumed_real (costo total de las habitaciones por
     * agreed_price*duration_days) y no sabe nada de ningún libro mayor.
     * Este método es la ÚNICA fuente de verdad que deben usar
     * ChargeGroupAccountsDailyCommand, ChargeCorporatePaymentSchedulesCommand
     * y GroupAccountController::addAdvance() para decidir si un cargo se
     * cubre o queda pendiente — si cada uno calculara el saldo por su
     * cuenta, se desincronizarían entre sí.
     */
    public function availableLedgerBalance(): float
    {
        $cubiertoDiario = $this->groupAccountCharges()->where('status', 'cubierto')->sum('amount');
        $cubiertoPorPersona = $this->paymentCharges()->where('status', 'cubierto')->sum('amount');

        return round((float) $this->total_deposited - (float) $cubiertoDiario - (float) $cubiertoPorPersona, 2);
    }

    /**
     * Cubre los cargos 'pendiente' más antiguos primero, mezclando los
     * DOS libros (group_account_charges por charge_date,
     * corporate_payment_charges por cycle_start_date) en un solo orden
     * cronológico — mientras el saldo disponible alcance. Llamado al
     * recargar la cuenta (GroupAccountController::addAdvance(), Fase 2).
     * Si el primero en orden cronológico no alcanza a cubrirse, se corta
     * ahí (no se "salta" a uno más nuevo y más barato): el orden es por
     * fecha, no por monto. Devuelve cuántos cargos quedaron cubiertos.
     */
    public function coverPendingCharges(): int
    {
        $pendientesDiarios = $this->groupAccountCharges()
            ->where('status', 'pendiente')
            ->get()
            ->map(fn ($c) => ['model' => $c, 'date' => $c->charge_date]);

        $pendientesPorPersona = $this->paymentCharges()
            ->where('status', 'pendiente')
            ->get()
            ->map(fn ($c) => ['model' => $c, 'date' => $c->cycle_start_date]);

        $pendientes = $pendientesDiarios->concat($pendientesPorPersona)->sortBy('date');

        $cubiertos = 0;

        foreach ($pendientes as $item) {
            if ($this->availableLedgerBalance() < (float) $item['model']->amount) {
                break;
            }

            $item['model']->update(['status' => 'cubierto', 'covered_at' => now()]);
            $cubiertos++;
        }

        return $cubiertos;
    }
}