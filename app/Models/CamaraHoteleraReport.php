<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Parte diario presentado ante la Cámara Hotelera Departamental de Potosí
 * (ver migración create_camara_hotelera_reports_table para el porqué de
 * cada campo). `guest_ids` es la misma lista de IDs que consume
 * ReportController::generateGuestsReportPdf() vía ?ids=... -- el PDF de
 * un parte ya persistido se sigue generando con ese mismo endpoint,
 * reconstruyendo Entrantes/Quedantes/Salientes en vivo a partir de estos
 * IDs, sin duplicar esa lógica acá.
 *
 * Solo dos estados reales: `pendiente` (editable, se puede anular =
 * borrar) y `confirmado` (definitivo, ver CamaraHoteleraController).
 */
class CamaraHoteleraReport extends Model
{
    protected $fillable = [
        'numero_parte',
        'report_date',
        'guest_ids',
        'status',
        'created_by',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'guest_ids' => 'array',
        'report_date' => 'date',
        'confirmed_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
