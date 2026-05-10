<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Invoice extends Model
{
    use HasFactory;

    // Campos asignables en masa, incluyendo los nuevos requerimientos del SIAT
    protected $fillable = [
        'invoice_number',
        'checkin_id',
        'issue_date',
        'issue_time',
        'user_id',
        'status',
        
        // --- Nuevos campos de Facturación Electrónica (SIAT) ---
        'customer_name',
        'customer_nit',
        'total_amount',
        'additional_discount',
        'total_subject_to_vat',
        'cuf',
        'payment_method_code',
        'siat_reception_code',
        'siat_status',
        
        // --- Campos antiguos (Mantenidos por compatibilidad) ---
        'control_code',
        'payment_method',
    ];

    // Convertimos las fechas a Carbon y los montos a decimales con 2 ceros
    protected $casts = [
        'issue_date' => 'date',
        'issue_time' => 'datetime',
        'total_amount' => 'decimal:2',
        'additional_discount' => 'decimal:2',
        'total_subject_to_vat' => 'decimal:2',
    ];

    // --- RELACIONES ---

    // 1. Una factura pertenece a un Check-in (Hospedaje)
    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }

    // 2. Una factura es emitida por un Usuario (Recepcionista)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // 3. Una factura tiene muchos detalles (Items cobrados)
    public function details(): HasMany
    {
        return $this->hasMany(InvoiceDetail::class);
    }
}