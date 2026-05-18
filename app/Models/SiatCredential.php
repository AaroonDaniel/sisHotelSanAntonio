<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class SiatCredential extends Model
{
    protected $table = 'siat_credentials';

    protected $fillable = [
        'type',            // 'cuis' | 'cufd'
        'code',            // El código devuelto por el SIAT
        'control_code',    // codigoControl (solo aplica a CUFD, null en CUIS)
        'environment',     // codigoAmbiente (1 = Producción, 2 = Piloto)
        'branch_code',     // codigoSucursal
        'pos_code',        // codigoPuntoVenta
        'issued_at',       // Fecha/hora de emisión
        'expires_at',      // Fecha/hora de expiración
        'is_active',       // Bandera de vigencia
    ];

    protected $casts = [
        'issued_at'  => 'datetime',
        'expires_at' => 'datetime',
        'is_active'  => 'boolean',
        'environment' => 'integer',
        'branch_code' => 'integer',
        'pos_code'    => 'integer',
    ];

    /**
     * Scope de conveniencia para filtrar únicamente credenciales vigentes.
     *
     * Uso: SiatCredential::active()->where('type', 'cufd')->first();
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}