<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentHistoryController extends Controller
{
    public function index(Request $request)
    {
        $payments = Payment::with([
            'operador:id,full_name,nickname',
            'user:id,full_name,nickname',
            'checkin.room:id,number',
            'reservation.details.room:id,number',
        ])
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->through(function (Payment $p) {
                return [
                    'id' => $p->id,
                    // payment_date puede venir NULL en filas viejas; created_at
                    // siempre existe. Nunca debe llegar un '-' al frontend.
                    'date' => optional($p->payment_date ?? $p->created_at)->toIso8601String(),
                    'room_number' => $this->resolveRoomNumber($p),
                    'type' => $p->type ?? 'PAGO',
                    'method' => $p->method
                        ? strtoupper($p->method) . ($p->bank_name ? " ({$p->bank_name})" : '')
                        : 'N/D',
                    'amount' => (float) $p->amount,
                    // Terminal Compartida: quién recibió el pago de verdad es
                    // operator_id (el avatar elegido), no user_id (siempre la
                    // cuenta genérica 'recepcion'). Se cae a user_id para
                    // filas viejas anteriores a este campo.
                    'operator_name' => optional($p->operador)->full_name
                        ?? optional($p->operador)->nickname
                        ?? optional($p->user)->full_name
                        ?? optional($p->user)->nickname
                        ?? 'Sistema',
                ];
            });

        return Inertia::render('payments/history', [
            'payments' => $payments,
        ]);
    }

    /**
     * Habitación asociada al pago: directo si es de un checkin; si es un
     * adelanto de reserva (antes del check-in), se toma de las habitaciones
     * ya asignadas en esa reserva. Los pagos de Cuenta Maestra corporativa
     * (special_agreement_id, sin checkin ni reserva puntual) no tienen una
     * única habitación.
     */
    private function resolveRoomNumber(Payment $p): string
    {
        if ($p->checkin?->room?->number) {
            return $p->checkin->room->number;
        }

        if ($p->reservation) {
            $numbers = $p->reservation->details
                ->pluck('room.number')
                ->filter()
                ->unique();

            if ($numbers->isNotEmpty()) {
                return $numbers->implode(', ');
            }
        }

        return 'N/A';
    }
}
