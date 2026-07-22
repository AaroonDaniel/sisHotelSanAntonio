<?php

namespace App\Observers;

use App\Models\CheckinGuest;

/**
 * Dispara el recálculo de Checkin::agreed_price cada vez que se
 * agrega, edita o quita un acompañante con precio propio —
 * confirmado empíricamente que sync()/attach()/detach() SÍ disparan
 * estos eventos porque CheckinGuest es un pivote con clase dedicada
 * (Checkin::companions()->using(CheckinGuest::class)), a diferencia
 * del pivote anónimo genérico que hacía INSERT/DELETE crudo.
 */
class CheckinGuestObserver
{
    public function saved(CheckinGuest $checkinGuest): void
    {
        $checkinGuest->checkin?->recalculateAgreedPrice();
    }

    public function deleted(CheckinGuest $checkinGuest): void
    {
        $checkinGuest->checkin?->recalculateAgreedPrice();
    }
}
