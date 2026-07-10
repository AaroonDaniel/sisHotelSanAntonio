<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class CashRegister extends Model
{
    use HasFactory, LogsActivity;

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

    // Relación: Esta caja tiene muchos Pagos/Adelantos registrados
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    // Relación: Esta caja tiene muchas Asignaciones (check-ins) creadas durante su turno
    public function checkins()
    {
        return $this->hasMany(Checkin::class);
    }


    public function getActivitylogOptions(): LogOptions 
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('cash_register');
    }
}