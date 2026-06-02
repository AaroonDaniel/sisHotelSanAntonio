<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ReservationReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $guestName;
    public int $reservationId;
    public string $pdfData;

    /**
     * @param string $guestName    Nombre del huésped titular.
     * @param int    $reservationId ID de la reserva.
     * @param string $pdfData      Contenido binario del PDF del recibo.
     */
    public function __construct(string $guestName, int $reservationId, string $pdfData)
    {
        $this->guestName = $guestName;
        $this->reservationId = $reservationId;
        $this->pdfData = $pdfData;
    }

    public function build()
    {
        return $this->subject('Recibo de su reserva - Hotel San Antonio')
            ->view('emails.reservation_receipt')
            ->attachData(
                $this->pdfData,
                'recibo_reserva_' . $this->reservationId . '.pdf',
                ['mime' => 'application/pdf']
            );
    }
}