<?php

namespace App\Traits;

use App\Models\CashRegister;
use App\Models\Expense;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

/**
 * Calcula el cuadre completo de un turno (pagos, servicios, gastos,
 * totales por método, efectivo esperado). Compartido por el módulo de
 * cierre de caja (vista en vivo / snapshot al cerrar) y por los reportes
 * de Administración ("Aperturas y Cierres").
 */
trait BuildsShiftClosingData
{
    protected function buildClosingData(CashRegister $cashRegister): array
    {
        $payments = Payment::query()
            ->where('payments.cash_register_id', $cashRegister->id)
            ->with(['checkin.room', 'operador'])
            ->join('checkins', 'checkins.id', '=', 'payments.checkin_id')
            ->orderBy('payments.payment_date', 'desc')
            ->select('payments.*')
            ->get()
            ->map(function ($p) {
                return [
                    'id'             => $p->id,
                    'amount'         => (float) $p->amount,
                    'method'         => $p->method,
                    'bank_name'      => $p->bank_name,
                    'type'           => $p->type,
                    'payment_date'   => optional($p->payment_date)->format('d/m/Y H:i'),
                    'room_number'    => optional(optional($p->checkin)->room)->number ?? '-',
                    'guest_name'     => optional(optional($p->checkin)->guest)->full_name ?? '-',
                    'operator_name'  => optional($p->operador)->full_name ?? optional($p->operador)->nickname ?? '-',
                ];
            });

        $checkinIdsDelTurno = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->pluck('checkin_id')
            ->unique();

        $services = DB::table('checkin_details')
            ->join('services', 'services.id', '=', 'checkin_details.service_id')
            ->join('checkins', 'checkins.id', '=', 'checkin_details.checkin_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'checkins.room_id')
            ->whereIn('checkin_details.checkin_id', $checkinIdsDelTurno)
            ->whereBetween('checkin_details.consumed_at', [
                $cashRegister->opened_at ?? $cashRegister->created_at,
                $cashRegister->closed_at ?? now()
            ])
            ->select(
                'services.name as service_name',
                'checkin_details.quantity',
                'checkin_details.selling_price',
                'checkin_details.consumed_at',
                'rooms.number as room_number',
            )
            ->orderBy('checkin_details.consumed_at', 'desc')
            ->get()
            ->map(function ($s) {
                return [
                    'service_name'  => $s->service_name,
                    'quantity'      => (int) $s->quantity,
                    'selling_price' => (float) $s->selling_price,
                    'total'         => (float) $s->selling_price * (int) $s->quantity,
                    'consumed_at'   => \Carbon\Carbon::parse($s->consumed_at)->format('d/m/Y H:i'),
                    'room_number'   => $s->room_number ?? '-',
                ];
            });

        $totalIncome = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->sum('amount');

        $byMethodDB = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->selectRaw("
            UPPER(COALESCE(method, 'SIN_METODO')) as method,
            SUM(amount) as total,
            COUNT(*) as count,
            SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as refunds,
            SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END) as collections
        ")
            ->groupByRaw("UPPER(COALESCE(method, 'SIN_METODO'))")
            ->get();

        $byMethod = $byMethodDB->map(function ($group) {
            return [
                'method'      => $group->method,
                'total'       => (float) $group->total,
                'count'       => (int) $group->count,
                'refunds'     => (float) $group->refunds,
                'collections' => (float) $group->collections,
            ];
        })->values();

        $cashMovements = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->whereRaw("UPPER(method) = ?", ['EFECTIVO'])
            ->sum('amount');

        $expenses = Expense::query()
            ->where('cash_register_id', $cashRegister->id)
            ->with('operador')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($e) {
                return [
                    'id'            => $e->id,
                    'description'   => $e->description,
                    'amount'        => (float) $e->amount,
                    'created_at'    => optional($e->created_at)->format('d/m/Y H:i'),
                    'operator_name' => optional($e->operador)->full_name ?? optional($e->operador)->nickname ?? '-',
                ];
            });

        $totalExpenses = (float) $expenses->sum('amount');
        $expectedCash = (float) $cashRegister->opening_amount + (float) $cashMovements - $totalExpenses;

        return [
            'Payments'      => $payments->values(),
            'Services'      => $services->values(),
            'Expenses'      => $expenses->values(),
            'TotalIncome'   => (float) $totalIncome,
            'TotalExpenses' => $totalExpenses,
            'ByMethod'      => $byMethod,
            'ExpectedCash'  => $expectedCash,
            // Monto físico que el operador declaró dejar en caja para el
            // siguiente turno (NULL = no se le preguntó todavía / turno
            // antiguo; 0 = contestó que no deja nada).
            'LeftAmount'    => $cashRegister->left_amount !== null ? (float) $cashRegister->left_amount : null,
        ];
    }

    /**
     * Datos de cierre de un turno: si ya está CERRADA y tiene snapshot
     * congelado, se sirve tal cual (inmutable); si sigue ABIERTA (o es un
     * registro antiguo sin snapshot), se calcula en vivo.
     */
    protected function shiftClosingData(CashRegister $cashRegister): array
    {
        if ($cashRegister->status === 'CERRADA' && $cashRegister->snapshot_data) {
            return $cashRegister->snapshot_data;
        }

        return $this->buildClosingData($cashRegister);
    }
}
