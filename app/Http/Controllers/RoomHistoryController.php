<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Trazabilidad de activo: historial de estadías de una habitación
 * específica a lo largo del tiempo (quién se quedó, cuánto tiempo y
 * cuánto se cobró), independientemente del turno/caja en que ocurrió
 * cada movimiento.
 */
class RoomHistoryController extends Controller
{
    public function index(Request $request)
{
    // 1. Obtenemos, ordenamos naturalmente y mapeamos las habitaciones
    $rooms = Room::with('roomType')
        ->get() // Obtenemos los registros primero
        ->sortBy('number', SORT_NATURAL | SORT_FLAG_CASE) // Ordenamiento Natural PHP
        ->values() // Re-indexamos para limpiar el array
        ->map(fn (Room $room) => [
            'id' => $room->id,
            'number' => $room->number,
            'room_type_name' => $room->roomType->name ?? null,
        ]);

    $roomId = $request->query('room_id');

    $checkins = collect();
    $selectedRoom = null;

    if ($roomId) {
        $selectedRoom = Room::with('roomType')->find($roomId);

        $checkins = Checkin::with([
                'guest',
                // Terminal Compartida: quién cobró de verdad es
                // operador_id (el avatar elegido), no user_id (siempre la
                // cuenta genérica 'recepcion'). Se carga 'user' como
                // fallback para filas viejas anteriores a ese campo.
                'payments.operador:id,full_name,nickname',
                'payments.user:id,full_name,nickname',
                'checkinDetails.service',
                'checkinOperator',
                'checkoutOperator',
            ])
            ->where('room_id', $roomId)
            ->orderByDesc('check_in_date')
            ->get()
            ->map(function (Checkin $checkin) use ($selectedRoom) {
                // Total realmente cobrado: las devoluciones ya se guardan
                // en negativo, así que un sum() simple refleja el neto.
                $totalCobrado = (float) $checkin->payments->sum('amount');

                $totalServicios = (float) $checkin->checkinDetails->sum(
                    fn ($detail) => $detail->quantity * ($detail->selling_price ?? $detail->service->price ?? 0)
                );

                // Historial de pagos de ESTA estadía puntual, para el
                // modal de "Historial Financiero de la Estadía".
                $payments = $checkin->payments
                    ->sortByDesc(fn ($p) => $p->payment_date ?? $p->created_at)
                    ->values()
                    ->map(fn ($p) => [
                        'id' => $p->id,
                        'payment_date' => optional($p->payment_date ?? $p->created_at)->toIso8601String(),
                        'method' => $p->method,
                        'bank_name' => $p->bank_name,
                        'amount' => (float) $p->amount,
                        'operator_name' => optional($p->operador)->full_name
                            ?? optional($p->operador)->nickname
                            ?? optional($p->user)->full_name
                            ?? optional($p->user)->nickname
                            ?? 'Sistema',
                    ]);

                return [
                    'id' => $checkin->id,
                    'guest_name' => $checkin->guest->full_name ?? 'Sin huésped',
                    'room_number' => $selectedRoom->number,
                    'check_in_date' => optional($checkin->check_in_date)->toIso8601String(),
                    'check_out_date' => optional($checkin->check_out_date)->toIso8601String(),
                    'duration_days' => (int) $checkin->duration_days,
                    'agreed_price' => (float) ($checkin->agreed_price ?? 0),
                    'total_services' => $totalServicios,
                    'total_charged' => $totalCobrado,
                    'status' => $checkin->status,
                    'checkin_operator_name' => optional($checkin->checkinOperator)->full_name,
                    'checkout_operator_name' => optional($checkin->checkoutOperator)->full_name,
                    'payments' => $payments,
                ];
            });
    }

    return Inertia::render('rooms/history', [
        'Rooms' => $rooms,
        'SelectedRoom' => $selectedRoom ? [
            'id' => $selectedRoom->id,
            'number' => $selectedRoom->number,
            'room_type_name' => $selectedRoom->roomType->name ?? null,
        ] : null,
        'Checkins' => $checkins->values(),
    ]);
}
}
