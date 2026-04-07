<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Maintenance extends Model
{
    use HasFactory;

    protected $fillable = [
        'room_id',
        'user_id',
        'issue',
        'description',
        'photo_path',
        'resolved_at',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function checkin()
    {
        return $this->belongsTo(Checkin::class);
    }
}