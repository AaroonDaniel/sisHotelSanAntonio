<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'checkin_id',
        'from_room_id',
        'to_room_id',
        'user_id',
        'transfer_date',
        'reason',
    ];

    // Relaciones para poder mostrar los nombres en la vista en lugar de los IDs
    public function checkin()
    {
        return $this->belongsTo(Checkin::class);
    }
    public function fromRoom()
    {
        return $this->belongsTo(Room::class, 'from_room_id');
    }
    public function toRoom()
    {
        return $this->belongsTo(Room::class, 'to_room_id');
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
