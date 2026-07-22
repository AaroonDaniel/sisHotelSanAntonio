<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReservationDetail extends Model
{
    // 🚀 REDISEÑO: la reserva ya no fija precio ni tipo/baño solicitado —
    // room_id se llena recién al confirmar (puente/historial, el precio
    // real vive en el Checkin que se crea en ese mismo momento, ver
    // ReservationController::update() rama CONFIRMADO).
    protected $fillable = [
        'reservation_id',
        'room_id',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function reservation()
    {
        return $this->belongsTo(Reservation::class);
    }
    
}
