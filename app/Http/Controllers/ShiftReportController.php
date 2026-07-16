<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCashAdjustmentRequest;
use App\Models\CashRegister;
use App\Models\Expense;
use App\Models\Payment;
use App\Traits\BuildsShiftClosingData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

    /**
     * Pantalla de corrección administrativa de un turno puntual: permite
     * agregar gastos o ingresos que el recepcionista olvidó registrar.
     * Siempre recalcula EN VIVO (nunca sirve el snapshot congelado) para
     * que el administrador vea el efecto real de lo que está por agregar.
     */
    public function edit(CashRegister $cashRegister)
    {
        return Inertia::render('admin/shift-reports/edit', array_merge(
            $this->buildClosingData($cashRegister),
            ['CashRegister' => $cashRegister->load('user')],
        ));
    }

    /**
     * Agrega un gasto o ingreso faltante a un turno específico (cerrado o
     * no) y, si ya estaba CERRADA con un snapshot congelado, lo vuelve a
     * generar para que el cierre histórico refleje la corrección — nunca
     * queda un cierre "inmutable" con un total que ya sabemos que está mal.
     */
    public function storeAdjustment(StoreCashAdjustmentRequest $request, CashRegister $cashRegister)
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $cashRegister) {
            $adminId = Auth::id();

            if ($validated['type'] === 'expense') {
                Expense::create([
                    'cash_register_id' => $cashRegister->id,
                    'user_id' => $adminId,
                    // El operador dueño del turno, no el administrador que
                    // hace la corrección — así el gasto sigue atribuyéndose
                    // a quien realmente operó la caja para efectos de
                    // auditoría (mismo criterio que tapActivity()).
                    'operator_id' => $cashRegister->user_id,
                    'amount' => $validated['amount'],
                    'description' => $validated['description'] . ' (ajuste agregado por administración)',
                ]);
            } else {
                Payment::create([
                    'cash_register_id' => $cashRegister->id,
                    'user_id' => $adminId,
                    'operator_id' => $cashRegister->user_id,
                    'amount' => $validated['amount'],
                    'method' => strtoupper($validated['method']),
                    'type' => 'PAGO',
                ]);
            }

            // 🔒 Recalcula de forma segura: si el turno ya estaba CERRADA
            // con snapshot congelado, lo regenera para que el histórico
            // deje de mostrar el total viejo (incorrecto).
            if ($cashRegister->status === 'CERRADA' && $cashRegister->snapshot_data) {
                $cashRegister->update([
                    'snapshot_data' => $this->buildClosingData($cashRegister),
                ]);
            }
        });

        return back()->with('success', 'Ajuste registrado correctamente.');
    }

    /**
     * PDF de vista previa de un turno puntual (para el iframe del Modal
     * "Ver" del panel gerencial). Reutiliza buildClosingData() — el mismo
     * cálculo que ya alimenta index()/edit() — así el PDF nunca puede
     * desincronizarse de lo que el administrador ve en pantalla.
     */
    public function previewPdf(CashRegister $cashRegister)
    {
        $cashRegister->load('user');
        $data = $this->buildClosingData($cashRegister);

        $operatorName = $cashRegister->user->full_name
            ?? $cashRegister->user->nickname
            ?? 'N/D';

        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 20);
        $pdf->AddPage();

        $pdf->SetFont('Arial', 'B', 15);
        $pdf->Cell(0, 8, utf8_decode('HOTEL "SAN ANTONIO"'), 0, 1, 'C');
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 6, utf8_decode('REPORTE DE CAJA — TURNO #' . $cashRegister->id), 0, 1, 'C');

        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(0, 5, utf8_decode('Operador: ' . strtoupper($operatorName)), 0, 1, 'C');
        $pdf->Cell(0, 5, utf8_decode('Estado: ' . $cashRegister->status), 0, 1, 'C');
        $rango = 'Apertura: ' . optional($cashRegister->opened_at)->format('d/m/Y H:i')
            . '   Cierre: ' . ($cashRegister->closed_at ? $cashRegister->closed_at->format('d/m/Y H:i') : 'EN CURSO');
        $pdf->Cell(0, 5, utf8_decode($rango), 0, 1, 'C');
        $pdf->Ln(6);

        // --- Resumen financiero ---
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetFillColor(230, 230, 230);
        $pdf->Cell(0, 7, utf8_decode(' RESUMEN FINANCIERO'), 1, 1, 'L', true);
        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(95, 6, utf8_decode('Monto de Apertura'), 1, 0);
        $pdf->Cell(0, 6, 'Bs ' . number_format((float) $cashRegister->opening_amount, 2), 1, 1, 'R');
        $pdf->Cell(95, 6, utf8_decode('Total Ingresos / Cobros'), 1, 0);
        $pdf->Cell(0, 6, 'Bs ' . number_format($data['TotalIncome'], 2), 1, 1, 'R');
        $pdf->Cell(95, 6, utf8_decode('Total Gastos'), 1, 0);
        $pdf->Cell(0, 6, 'Bs ' . number_format($data['TotalExpenses'], 2), 1, 1, 'R');
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(95, 7, utf8_decode('Efectivo Esperado en Caja'), 1, 0);
        $pdf->Cell(0, 7, 'Bs ' . number_format($data['ExpectedCash'], 2), 1, 1, 'R');
        if ($data['LeftAmount'] !== null) {
            $pdf->SetFont('Arial', '', 9);
            $pdf->Cell(95, 6, utf8_decode('Efectivo Declarado al Cierre'), 1, 0);
            $pdf->Cell(0, 6, 'Bs ' . number_format($data['LeftAmount'], 2), 1, 1, 'R');
        }
        $pdf->Ln(6);

        // --- Desglose por método de pago ---
        if (count($data['ByMethod']) > 0) {
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->SetFillColor(230, 230, 230);
            $pdf->Cell(0, 6, utf8_decode(' DESGLOSE POR METODO DE PAGO'), 1, 1, 'L', true);
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(60, 5, utf8_decode('Metodo'), 1, 0, 'C', true);
            $pdf->Cell(30, 5, utf8_decode('Movimientos'), 1, 0, 'C', true);
            $pdf->Cell(0, 5, utf8_decode('Total'), 1, 1, 'C', true);
            $pdf->SetFont('Arial', '', 8);
            foreach ($data['ByMethod'] as $m) {
                $pdf->Cell(60, 5, utf8_decode($m['method']), 1, 0);
                $pdf->Cell(30, 5, (string) $m['count'], 1, 0, 'C');
                $pdf->Cell(0, 5, 'Bs ' . number_format($m['total'], 2), 1, 1, 'R');
            }
            $pdf->Ln(4);
        }

        // --- Gastos del turno ---
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetFillColor(230, 230, 230);
        $pdf->Cell(0, 6, utf8_decode(' GASTOS DEL TURNO'), 1, 1, 'L', true);
        if (count($data['Expenses']) === 0) {
            $pdf->SetFont('Arial', 'I', 8);
            $pdf->Cell(0, 6, utf8_decode('Sin gastos registrados.'), 1, 1, 'C');
        } else {
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(30, 5, utf8_decode('Fecha'), 1, 0, 'C', true);
            $pdf->Cell(85, 5, utf8_decode('Descripcion'), 1, 0, 'C', true);
            $pdf->Cell(35, 5, utf8_decode('Operador'), 1, 0, 'C', true);
            $pdf->Cell(0, 5, utf8_decode('Monto'), 1, 1, 'C', true);
            $pdf->SetFont('Arial', '', 8);
            foreach ($data['Expenses'] as $e) {
                $pdf->Cell(30, 5, utf8_decode($e['created_at'] ?? '-'), 1, 0);
                $pdf->Cell(85, 5, utf8_decode(mb_strimwidth($e['description'], 0, 48, '...')), 1, 0);
                $pdf->Cell(35, 5, utf8_decode(mb_strimwidth($e['operator_name'], 0, 22, '...')), 1, 0);
                $pdf->Cell(0, 5, 'Bs ' . number_format($e['amount'], 2), 1, 1, 'R');
            }
        }

        $filename = 'reporte-caja-' . $cashRegister->id . '.pdf';

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="' . $filename . '"');
    }
}
