<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Pivote de acompañantes (checkin_guests) — modelo dedicado (en vez del
 * pivote genérico anónimo que usaba Checkin::companions() antes) para
 * poder engancharle un Observer que recalcule automáticamente
 * Checkin::agreed_price cada vez que se agrega, edita o quita un
 * acompañante con precio propio.
 *
 * El TITULAR no vive acá — es checkins.guest_id directo, con su propio
 * precio en checkins.titular_price (ver Checkin::recalculateAgreedPrice()).
 */
class CheckinGuest extends Pivot
{
    protected $table = 'checkin_guests';

    protected $fillable = [
        'checkin_id',
        'guest_id',
        'origin',
        'price',
    ];

    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }

    public function guest(): BelongsTo
    {
        return $this->belongsTo(Guest::class);
    }

    /**
     * MISMA precisión que Checkin::agreed_price/titular_price: 1
     * decimal, "redondeo oficial" del negocio (ver
     * Checkin::setAgreedPriceAttribute()). Un decimal:2 acá haría que la
     * suma nunca calzara exacto con agreed_price al guardarse.
     */
    public function setPriceAttribute($value)
    {
        $this->attributes['price'] = is_null($value) ? null : round((float) $value, 1);
    }

    public function getPriceAttribute($value)
    {
        return is_null($value) ? null : round((float) $value, 1);
    }
}
