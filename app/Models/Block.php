<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\AutoUpperCase;

class Block extends Model
{
    use AutoUpperCase;
    protected $fillable = [
        'code',
        'description',  
        'is_active',
    ];
    protected $uppercaseFields = [
        'code',
        'description',
    ];
    protected $casts = [
        'is_active' => 'boolean',
    ];
}
