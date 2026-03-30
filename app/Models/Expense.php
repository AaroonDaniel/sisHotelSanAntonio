<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_register_id',
        'user_id',
        'amount',
        'description',
    ];

    // Relación: A qué turno (caja) pertenece este gasto
    public function cashRegister()
    {
        return $this->belongsTo(CashRegister::class);
    }

    // Relación: Quién hizo el gasto
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}