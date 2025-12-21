<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Floor extends Model
{
    protected $fillable = [
        'name',
        'is_active',
    ];
    protected $casts = [
        'is_active' => 'boolean', // <--- IMPORTANTE para que React lo entienda
    ];
}
