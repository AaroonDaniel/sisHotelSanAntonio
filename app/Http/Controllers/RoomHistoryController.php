<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\Room;
use App\Traits\ResolvesBusinessDate;
use Carbon\Carbon;
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
    use ResolvesBusinessDate;

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

    /**
     * Mismo historial COMPLETO de RoomHistoryController::index() (todas las
     * estadías que pasaron por esta habitación, no solo la activa), pero
     * como JSON puro para el modal "Historial Financiero" de
     * rooms/status.tsx -- se pide bajo demanda al abrir el modal, sin
     * navegar a otra pantalla.
     *
     * Agrega, respecto al índice: 'is_active' (¿sigue en curso esta
     * estadía?) y 'balance_due' (cuánto falta cobrar) -- para que se pueda
     * distinguir "está bien, sigue activa, todavía le faltan días" de "ya
     * finalizó y quedó debiendo".
     */
    public function historyData(Room $room)
    {
        $checkins = Checkin::with([
                'guest',
                'payments.operador:id,full_name,nickname',
                'payments.user:id,full_name,nickname',
                'checkinDetails.service',
                'checkinOperator',
                'checkoutOperator',
            ])
            ->where('room_id', $room->id)
            ->orderByDesc('check_in_date')
            ->get()
            ->map(function (Checkin $checkin) use ($room) {
                $totalCobrado = (float) $checkin->payments->sum('amount');

                $totalServicios = (float) $checkin->checkinDetails->sum(
                    fn ($detail) => $detail->quantity * ($detail->selling_price ?? $detail->service->price ?? 0)
                );

                $dias = max(1, (int) $checkin->duration_days);
                $totalEsperado = round(((float) ($checkin->agreed_price ?? 0) * $dias) + $totalServicios + (float) ($checkin->carried_balance ?? 0), 2);
                $saldoPendiente = round($totalEsperado - $totalCobrado, 2);

                $payments = $checkin->payments
                    ->sortByDesc(fn ($p) => $p->payment_date ?? $p->created_at)
                    ->values()
                    ->map(fn ($p) => [
                        'id' => $p->id,
                        'payment_date' => optional($p->payment_date ?? $p->created_at)->toIso8601String(),
                        'method' => $p->method,
                        'bank_name' => $p->bank_name,
                        'type' => $p->type,
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
                    'room_number' => $room->number,
                    'check_in_date' => optional($checkin->check_in_date)->toIso8601String(),
                    'check_out_date' => optional($checkin->check_out_date)->toIso8601String(),
                    'duration_days' => $dias,
                    'agreed_price' => (float) ($checkin->agreed_price ?? 0),
                    'total_services' => $totalServicios,
                    'total_expected' => $totalEsperado,
                    'total_charged' => $totalCobrado,
                    // 🚀 "está bien" = sigue activa: todavía le pueden
                    // faltar días por cobrar y eso es normal, no una deuda.
                    'is_active' => $checkin->status === 'activo',
                    'balance_due' => $saldoPendiente,
                    'status' => $checkin->status,
                    'checkin_operator_name' => optional($checkin->checkinOperator)->full_name,
                    'checkout_operator_name' => optional($checkin->checkoutOperator)->full_name,
                    'payments' => $payments,
                ];
            });

        return response()->json([
            'room' => ['id' => $room->id, 'number' => $room->number],
            'checkins' => $checkins->values(),
        ]);
    }

    /**
     * "Control de Hospedaje" de la habitación: una fila por NOCHE (no por
     * checkin), como la planilla de papel del hotel — de la más reciente a
     * la más antigua. Cada noche muestra a quién correspondía la
     * habitación (titular + acompañantes de ese checkin, en una sola
     * fila) y si hubo un pago registrado justo ese día (monto, método,
     * operador) o si "sigue" sin haber pagado todavía.
     *
     * Las noches se despliegan con la MISMA lógica que ya cobra un
     * checkout real (calculateBillableDays(), de
     * App\Traits\ResolvesBusinessDate — ver esa clase) para que este
     * historial nunca se desincronice de lo que el sistema realmente
     * factura: un checkin activo que ya pasó la hora de salida oficial de
     * hoy (schedule->check_out_time) ya cuenta una noche más, igual que en
     * el checkout de verdad.
     */
    public function dailyLedger(Room $room)
    {
        $checkins = Checkin::with(['guest', 'companions', 'payments.operador', 'payments.user', 'schedule'])
            ->where('room_id', $room->id)
            ->orderBy('check_in_date')
            ->get();

        $porDia = []; // ['2026-07-28' => [ fila, fila, ... ] ]

        foreach ($checkins as $checkin) {
            $schedule = $checkin->schedule;

            // Mismo ancla que usa calculateBillableDays() internamente
            // (price_effective_since si hubo transfer/merge, si no
            // check_in_date) -- así la primera noche mostrada acá coincide
            // con la que de verdad se le cobra.
            $ingreso = Carbon::parse($checkin->price_effective_since ?? $checkin->check_in_date);
            $ingresoDia = $this->resolveBusinessDate($ingreso, $schedule);

            $momentoSalida = $checkin->check_out_date
                ? Carbon::parse($checkin->check_out_date)
                : now();

            $noches = $this->calculateBillableDays($checkin, $momentoSalida, false);

            // Pagos de este checkin, agrupados por SU propio día operativo.
            $pagosPorDia = [];
            foreach ($checkin->payments as $pago) {
                $fechaPago = $this->resolveBusinessDate(
                    Carbon::parse($pago->payment_date ?? $pago->created_at),
                    $schedule,
                )->toDateString();
                $pagosPorDia[$fechaPago][] = $pago;
            }

            $nombreAcompanantes = $checkin->companions->pluck('full_name')->filter()->values();
            $nombreFila = $checkin->guest->full_name ?? 'Sin huésped';
            if ($nombreAcompanantes->isNotEmpty()) {
                $nombreFila .= ' + ' . $nombreAcompanantes->implode(', ');
            }

            for ($i = 0; $i < $noches; $i++) {
                $fecha = $ingresoDia->copy()->addDays($i)->toDateString();
                $pagosHoy = $pagosPorDia[$fecha] ?? [];

                $pagoResumen = null;
                if (!empty($pagosHoy)) {
                    $primero = $pagosHoy[0];
                    $pagoResumen = [
                        'amount' => (float) collect($pagosHoy)->sum('amount'),
                        'method' => $primero->method,
                        'bank_name' => $primero->bank_name,
                        'operator_name' => optional($primero->operador)->full_name
                            ?? optional($primero->operador)->nickname
                            ?? optional($primero->user)->full_name
                            ?? optional($primero->user)->nickname
                            ?? 'Sistema',
                    ];
                }

                $porDia[$fecha][] = [
                    'checkin_id' => $checkin->id,
                    'name' => $nombreFila,
                    'is_active' => $checkin->status === 'activo',
                    'payment' => $pagoResumen,
                ];
            }
        }

        $days = collect($porDia)
            ->map(fn ($people, $date) => ['date' => $date, 'people' => $people])
            ->sortByDesc('date')
            ->values();

        return response()->json([
            'room' => ['id' => $room->id, 'number' => $room->number],
            'days' => $days,
        ]);
    }
}
