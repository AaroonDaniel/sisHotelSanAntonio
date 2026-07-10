<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Traits\BuildsShiftClosingData;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Módulo de Administración "Aperturas y Cierres": historial completo de
 * turnos (TAB 1) e informe consolidado por día, sumando todos los
 * operadores que tuvieron actividad (TAB 2).
 */
class ShiftReportController extends Controller
{
    use BuildsShiftClosingData;

    /**
     * Sirve tanto la carga inicial como el cambio de fecha del TAB 2 (vía
     * Inertia partial reload con only: ['DayReport']).
     */
    public function index(Request $request)
    {
        $date = $request->query('date', now()->toDateString());

        return Inertia::render('admin/shift-reports/index', [
            'Shifts' => $this->mapShiftsList(),
            'InitialDate' => $date,
            'DayReport' => $this->buildDayReport($date),
        ]);
    }

    private function mapShiftsList()
    {
        return CashRegister::with('user')
            ->orderByDesc('opened_at')
            ->get()
            ->map(function (CashRegister $cr) {
                $finalBalance = $cr->status === 'CERRADA' && $cr->snapshot_data
                    ? ($cr->snapshot_data['ExpectedCash'] ?? null)
                    : null;

                return [
                    'id' => $cr->id,
                    'operator_name' => $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                    'opening_amount' => (float) $cr->opening_amount,
                    'opened_at' => optional($cr->opened_at)->toIso8601String(),
                    'closed_at' => optional($cr->closed_at)->toIso8601String(),
                    'status' => $cr->status,
                    'final_balance' => $finalBalance !== null ? (float) $finalBalance : null,
                    'left_amount' => $cr->left_amount !== null ? (float) $cr->left_amount : null,
                ];
            });
    }

    /**
     * Todos los turnos (de TODOS los operadores) cuya ventana activa
     * [opened_at, closed_at ?? ahora] se solapa con el día pedido — no por
     * `created_at`, para no perder turnos nocturnos que cruzan la
     * medianoche (mismo criterio que ReportController::findShiftOverlapping).
     */
    private function buildDayReport(string $date): array
    {
        $dayStart = $date . ' 00:00:00';
        $dayEnd = $date . ' 23:59:59';

        $shifts = CashRegister::with('user')
            ->where('opened_at', '<=', $dayEnd)
            ->where(function ($q) use ($dayStart) {
                $q->whereNull('closed_at')->orWhere('closed_at', '>=', $dayStart);
            })
            ->orderBy('opened_at')
            ->get();

        $rows = [];
        $totalApertura = 0.0;
        $totalIngresos = 0.0;
        $totalGastos = 0.0;
        $totalEsperado = 0.0;

        foreach ($shifts as $cr) {
            $data = $this->shiftClosingData($cr);

            $totalApertura += (float) $cr->opening_amount;
            $totalIngresos += (float) ($data['TotalIncome'] ?? 0);
            $totalGastos += (float) ($data['TotalExpenses'] ?? 0);
            $totalEsperado += (float) ($data['ExpectedCash'] ?? 0);

            $rows[] = [
                'id' => $cr->id,
                'operator_name' => $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                'status' => $cr->status,
                'opening_amount' => (float) $cr->opening_amount,
                'total_income' => (float) ($data['TotalIncome'] ?? 0),
                'total_expenses' => (float) ($data['TotalExpenses'] ?? 0),
                'expected_cash' => (float) ($data['ExpectedCash'] ?? 0),
            ];
        }

        return [
            'date' => $date,
            'shifts' => $rows,
            'totals' => [
                'opening_amount' => round($totalApertura, 2),
                'total_income' => round($totalIngresos, 2),
                'total_expenses' => round($totalGastos, 2),
                'expected_cash' => round($totalEsperado, 2),
            ],
        ];
    }
}
