<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Invoice extends Model
{
    use HasFactory;

    /**
     * Campos asignables en masa.
     * Incluye todos los campos SIAT (CUF, CUFD, anulación, contingencia offline).
     */
    protected $fillable = [
        // Identificación y relaciones
        'checkin_id',
        'invoice_number',
        'user_id',

        // Datos fiscales "congelados"
        'customer_name',
        'customer_nit',
        'issue_date',
        'issue_time',

        // Montos
        'total_amount',
        'additional_discount',
        'total_subject_to_vat',

        // Códigos del documento (legacy + SIAT)
        'control_code',          // siempre "-" en facturación electrónica
        'payment_method',        // EF / QR / TC / TR (acrónimo para caja)
        'payment_method_code',   // Catálogo SIAT: 1=EF, 7=QR, 2=TC, 6=TR
        'cuf',                   // Código Único de Facturación
        'cufd_code',             // CUFD usado al emitir
        'siat_reception_code',   // Código de recepción devuelto por SIAT

        // Estados
        'status',                // valid | voided
        'siat_status',           // pending | accepted | rejected | offline

        // Contingencia offline
        'significant_event_id',
        'offline_xml_path',

        // Anulación
        'void_reason_code',
        'voided_at',
        'voided_by_user_id',
    ];

    /**
     * Conversiones de tipos.
     */
    protected $casts = [
        'issue_date'           => 'date',
        'issue_time'           => 'datetime',
        'voided_at'            => 'datetime',
        'total_amount'         => 'decimal:2',
        'additional_discount'  => 'decimal:2',
        'total_subject_to_vat' => 'decimal:2',
    ];

    // =========================================================
    // RELACIONES
    // =========================================================

    /**
     * Una factura pertenece a un Check-in (Hospedaje).
     */
    public function checkin(): BelongsTo
    {
        return $this->belongsTo(Checkin::class);
    }

    /**
     * Una factura es emitida por un Usuario (Recepcionista).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Una factura tiene muchos detalles (Items cobrados).
     */
    public function details(): HasMany
    {
        return $this->hasMany(InvoiceDetail::class);
    }

    /**
     * Evento significativo bajo el que se emitió (si aplica).
     */
    public function significantEvent(): BelongsTo
    {
        return $this->belongsTo(SignificantEvent::class, 'significant_event_id');
    }

    /**
     * Usuario (Gerente) que anuló la factura.
     */
    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by_user_id');
    }
}