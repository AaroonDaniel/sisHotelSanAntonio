<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\AutoUpperCase;

class RoomType extends Model
{
    use AutoUpperCase;
    protected $fillable = [
        'name',
        'capacity',
        'description',
        'is_active',
    ];

    protected $uppercaseFields = [
        'name',
        'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function prices(): HasMany
    {
        return $this->hasMany(Price::class);
    }
}
