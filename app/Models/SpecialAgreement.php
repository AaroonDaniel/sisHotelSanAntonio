<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SpecialAgreement extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'agreed_price',
        'payment_frequency_days',
    ];

    public function checkins(): HasMany
    {
        return $this->hasMany(Checkin::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }
}