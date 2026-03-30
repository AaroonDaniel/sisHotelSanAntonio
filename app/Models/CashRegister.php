<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'opening_amount',
        'status',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    // Relación: Esta caja le pertenece a un Usuario (Recepcionista)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relación: Esta caja tiene muchos Gastos registrados
    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }
}