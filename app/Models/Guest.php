<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase;

class Guest extends Model
{
    use HasFactory;
    use AutoUpperCase;

    protected $fillable = [
        'first_name',
        'last_name',
        'nationality',
        'identification_number',
        'issued_in',
        'civil_status',
        'age',
        'profession',
        'origin',
    ];

    protected $uppercaseFields = [
        'first_name',
        'last_name',
        'nationality',
        'profession',
        'origin',
        'civil_status',
        'issued_in',

    ];

    public function checkins(): HasMany
    {
        return $this->hasMany(Checkin::class);
    }

    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn () => "{$this->first_name} {$this->last_name}",
        );
    }
}
