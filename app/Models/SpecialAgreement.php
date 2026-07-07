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
        'agreed_price',
        'payment_frequency_days',
        'starts_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
    ];

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