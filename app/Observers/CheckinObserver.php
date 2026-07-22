<?php

namespace App\Observers;

use App\Models\Checkin;

/**
 * Recalcula agreed_price ANTES de persistir (mismo guardado, sin una
 * vuelta extra a la BD) — a diferencia de CheckinGuestObserver (que sí
 * necesita un ->save() aparte porque reacciona a un modelo DISTINTO, el
 * pivote).
 *
 * Se dispara siempre que titular_price NO sea null (no solo cuando
 * cambia en este guardado puntual): un checkin con titular_price ya
 * seteado "vive" en el modelo de precio por huésped, así que CUALQUIER
 * guardado suyo debe mantener agreed_price = titular_price + Σ
 * companions.price, aunque este save en particular solo esté tocando
 * otro campo (notas, fechas, etc.) — de lo contrario un $updateData que
 * siga fijando 'agreed_price' a mano (cálculo viejo, por habitación)
 * podría desincronizarlo silenciosamente (Fase 1, decisión confirmada:
 * opción "a").
 *
 * saving() en vez de saved() evita cualquier recursión: esto modifica
 * el propio modelo que se está por guardar, no dispara un segundo ciclo
 * de eventos.
 */
class CheckinObserver
{
    public function saving(Checkin $checkin): void
    {
        if (is_null($checkin->titular_price)) {
            return;
        }

        $sumaAcompanantes = $checkin->exists
            ? (float) $checkin->companions()->sum('checkin_guests.price')
            : 0.0;

        $checkin->agreed_price = round((float) $checkin->titular_price + $sumaAcompanantes, 1);
    }
}
