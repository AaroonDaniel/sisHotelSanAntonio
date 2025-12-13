<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'checkin_id',
        'issue_date',
        'control_code',
        'payment_method',
        'user_id',
        'issue_time',
        'status',
    ];

    // Convertimos las fechas automáticamente a objetos Carbon para poder formatearlas fácil
    protected $casts = [
        'issue_date' => 'date',
        'issue_time' => 'datetime',
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
    // (Esta relación la usarás cuando crees el modelo InvoiceDetail)
    public function details(): HasMany
    {
        return $this->hasMany(InvoiceDetail::class);
    }
}