<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\AutoUpperCase;

class Floor extends Model
{
    use AutoUpperCase;
    protected $fillable = [
        'name',
        'is_active',
    ];
    protected $uppercaseFields = [
        'name',
    ];
    protected $casts = [
        'is_active' => 'boolean', // <--- IMPORTANTE para que React lo entienda
    ];
}
