<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReservationDetail extends Model
{
    protected $fillable = [
        'reservation_id',
        'room_id',
        'requested_room_type_id',
        'requested_bathroom',
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
    public function requestedRoomType()
    {
        return $this->belongsTo(RoomType::class, 'requested_room_type_id');
    }
    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }
    
}
