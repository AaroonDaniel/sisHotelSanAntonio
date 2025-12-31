<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\AutoUpperCase;
use Carbon\Carbon;

class Guest extends Model
{
    use HasFactory;
    use AutoUpperCase;

    protected $fillable = [
        //'first_name',
        'full_name',
        'nationality',
        'identification_number',
        'issued_in',
        'civil_status',
        'birth_date', 
        'profession',
        'origin',
    ];

    protected $uppercaseFields = [
        'first_name',
        'full_name',
        'nationality',
        'profession',
        'origin',
        'civil_status',
        'issued_in',
    ];

    // Esto hace que "age" se envíe automáticamente en el JSON de respuesta
    protected $appends = ['age'];
    
    // Calcula la edad basándose en la fecha de nacimiento guardada
    public function getAgeAttribute()
    {
        return $this->birth_date ? Carbon::parse($this->birth_date)->age : null;
    }

    public function checkins(): HasMany
    {
        return $this->hasMany(Checkin::class);
    }

    
}