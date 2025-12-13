<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class InvoiceDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'service_id',
        'quantity',
        'unit_price',
        'cost',
    ];

    // --- RELACIONES ---

    // 1. Pertenece a una Factura
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    // 2. Pertenece a un Servicio (Puede ser nulo)
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}