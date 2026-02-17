<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReservationDetail extends Model
{
    protected $fillable = [
        'reservation_id',
        'room_id',
        'price_id',
        'price', // El precio que se pactó en ese momento
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
    
    public function price()
    {
        return $this->belongsTo(Price::class); // Si tienes modelo Price
    }
}