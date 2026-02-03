<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase; 

class Schedule extends Model
{
    use HasFactory, AutoUpperCase;

    protected $fillable = [
        'name',
        'check_in_time',
        'check_out_time',
        'entry_tolerance_minutes',
        'exit_tolerance_minutes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'entry_tolerance_minutes' => 'integer',
        'exit_tolerance_minutes' => 'integer',
    ];

    // Relación: Un horario puede tener muchos checkins asociados
    public function checkins(): HasMany
    {
        return $this->hasMany(Checkin::class);
    }
}