<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use App\Traits\AutoUpperCase;

class CheckinDetail extends Model
{
    protected $fillable = [
        'checkin_id',
        'service_id',
        'quantity',
        'selling_price',
    ];

    protected $casts = [
        'selling_price' => 'decimal:2',
    ];

    // --- RELACIONES ---

    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    // --- ACCESSOR (Calculado al vuelo) ---

    // Esto te permite usar $detalle->total para obtener el subtotal
    // sin necesidad de guardarlo en la base de datos.
    protected function total(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->quantity * $this->selling_price,
        );
    }
}