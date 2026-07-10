<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Models\Checkin;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\InvoiceDetail;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * "God Mode" / Auditoría de Datos.
 *
 * Panel maestro para corregir errores de operación (cajas abandonadas,
 * fechas mal registradas, montos, operadores) cuando los reportes no
 * cuadran. El acceso ya queda restringido al administrador principal
 * por el middleware 'god_mode' (routes/web.php), así que este controlador
 * no repite el chequeo de nickname.
 *
 * Los métodos de escritura de este controlador usan DB::table()->update()
 * a propósito: se salta mutadores, casts especiales, Observers y el
 * Spatie\Activitylog (que se engancha a eventos de Eloquent), porque el
 * objetivo es escribir el dato crudo exacto que el administrador digitó,
 * sin que ninguna regla de negocio lo reinterprete.
 */
class DataAuditController extends Controller
{
    /**
     * Estados permitidos por el CHECK constraint de la tabla 'checkins'
     * en PostgreSQL (checkins_status_check). Forzar cualquier otro valor
     * haría fallar el UPDATE a nivel de base de datos.
     */
    private const CHECKIN_STATUSES = ['activo', 'finalizado', 'transferido', 'cancelado'];

    public function index()
    {
        return Inertia::render('audit/index', [
            'CashRegisters' => $this->getCashRegistersForAudit(),
            'ClosedCashRegisters' => $this->getClosedCashRegistersForAudit(),
            'Checkins' => $this->getCheckinsForAudit(),
            'Payments' => $this->getPaymentsForAudit(),
            'Expenses' => $this->getExpensesForAudit(),
            'Operators' => User::orderBy('full_name')->get(['id', 'full_name', 'nickname']),
            'AllCashRegisters' => CashRegister::with('user')
                ->orderByDesc('opened_at')
                ->get()
                ->map(fn (CashRegister $cr) => [
                    'id' => $cr->id,
                    'label' => sprintf(
                        '#%d · %s · %s · %s',
                        $cr->id,
                        $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                        $cr->status,
                        optional($cr->opened_at)->format('d/m/Y H:i') ?? '—',
                    ),
                ]),
        ]);
    }

    /**
     * Cajas abiertas o con datos inconsistentes (abandonadas, cerradas antes
     * de abrirse, sin fecha de cierre pese a figurar como CERRADA, etc.).
     */
    private function getCashRegistersForAudit()
    {
        return CashRegister::with('user')
            ->where(function ($query) {
                $query->where('status', 'ABIERTA')
                    ->orWhereNull('closed_at')
                    ->orWhereColumn('closed_at', '<', 'opened_at');
            })
            ->orderByDesc('opened_at')
            ->get()
            ->map(function (CashRegister $cr) {
                return [
                    'id' => $cr->id,
                    'user_id' => $cr->user_id,
                    'user_name' => $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                    'opening_amount' => (float) $cr->opening_amount,
                    'status' => $cr->status,
                    'opened_at' => optional($cr->opened_at)->toIso8601String(),
                    'closed_at' => optional($cr->closed_at)->toIso8601String(),
                ];
            });
    }

    /**
     * Historial de turnos CERRADOS: identificados por ID de turno y
     * operador (no por fecha), con un resumen rápido de ingresos/gastos
     * para que el administrador pueda ver/reimprimir el cierre de
     * cualquier turno pasado desde `cash-registers/show`.
     */
    private function getClosedCashRegistersForAudit()
    {
        return CashRegister::with('user')
            ->withSum('payments as total_income', 'amount')
            ->withSum('expenses as total_expenses', 'amount')
            ->where('status', 'CERRADA')
            ->orderByDesc('closed_at')
            ->get()
            ->map(function (CashRegister $cr) {
                return [
                    'id' => $cr->id,
                    'user_name' => $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                    'opening_amount' => (float) $cr->opening_amount,
                    'total_income' => (float) ($cr->total_income ?? 0),
                    'total_expenses' => (float) ($cr->total_expenses ?? 0),
                    'opened_at' => optional($cr->opened_at)->toIso8601String(),
                    'closed_at' => optional($cr->closed_at)->toIso8601String(),
                ];
            });
    }

    /**
     * Sobrescribe una caja: fechas, monto de apertura y estado (permite
     * forzar el cierre de una caja abandonada).
     */
    public function updateCashRegister(Request $request, CashRegister $cashRegister)
    {
        $validated = $request->validate([
            'opening_amount' => 'required|numeric|min:0',
            'status' => 'required|string|in:ABIERTA,CERRADA',
            'opened_at' => 'required|date',
            'closed_at' => 'nullable|date',
        ]);

        $cashRegister->update([
            'opening_amount' => $validated['opening_amount'],
            'status' => $validated['status'],
            'opened_at' => $validated['opened_at'],
            'closed_at' => $validated['status'] === 'CERRADA'
                ? ($validated['closed_at'] ?? now())
                : null,
        ]);

        return redirect()->back()->with('success', 'Caja actualizada correctamente (God Mode).');
    }

    /**
     * Todos los check-ins (activos, finalizados, transferidos o
     * cancelados), con sus pagos y detalles de consumo, para que el
     * administrador pueda ver y corregir cualquier estadía sin las
     * restricciones normales de estado.
     */
    private function getCheckinsForAudit()
    {
        return Checkin::with([
            'guest:id,full_name,identification_number',
            'room:id,number',
            'checkinOperator:id,full_name,nickname',
            'checkoutOperator:id,full_name,nickname',
            'user:id,full_name,nickname',
            'payments' => fn ($q) => $q->orderBy('payment_date', 'asc'),
            'checkinDetails.service:id,name',
        ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Checkin $c) {
                return [
                    'id' => $c->id,
                    'guest_name' => $c->guest->full_name ?? 'N/D',
                    'room_number' => $c->room->number ?? 'N/D',
                    'status' => $c->status,
                    'check_in_date' => optional($c->check_in_date)->toIso8601String(),
                    'actual_arrival_date' => optional($c->actual_arrival_date)->toIso8601String(),
                    'check_out_date' => optional($c->check_out_date)->toIso8601String(),
                    'duration_days' => $c->duration_days,
                    'agreed_price' => (float) $c->agreed_price,
                    'checkin_operator_id' => $c->checkin_operator_id,
                    'checkin_operator_name' => $c->checkinOperator->full_name ?? $c->checkinOperator->nickname ?? null,
                    'checkout_operator_id' => $c->checkout_operator_id,
                    'checkout_operator_name' => $c->checkoutOperator->full_name ?? $c->checkoutOperator->nickname ?? null,
                    'user_id' => $c->user_id,
                    'user_name' => $c->user->full_name ?? $c->user->nickname ?? 'N/D',
                    'payments' => $c->payments->map(fn (Payment $p) => [
                        'id' => $p->id,
                        'amount' => (float) $p->amount,
                        'method' => $p->method,
                        'type' => $p->type,
                        'cash_register_id' => $p->cash_register_id,
                        'payment_date' => optional($p->payment_date)->toIso8601String(),
                    ])->values(),
                    'checkin_details' => $c->checkinDetails->map(fn ($d) => [
                        'id' => $d->id,
                        'service_name' => $d->service->name ?? 'N/D',
                        'quantity' => $d->quantity,
                        'selling_price' => (float) $d->selling_price,
                    ])->values(),
                ];
            });
    }

    /**
     * Todos los pagos del sistema (ligados o no a un check-in), para
     * corregir monto, método, tipo, caja y operador sin tener que entrar
     * a cada estadía una por una.
     */
    private function getPaymentsForAudit()
    {
        return Payment::with([
            'checkin.guest:id,full_name',
            'checkin.room:id,number',
            'operador:id,full_name,nickname',
        ])
            ->orderByDesc('payment_date')
            ->get()
            ->map(function (Payment $p) {
                return [
                    'id' => $p->id,
                    'checkin_id' => $p->checkin_id,
                    'guest_name' => $p->checkin->guest->full_name ?? 'N/D',
                    'room_number' => $p->checkin->room->number ?? 'N/D',
                    'amount' => (float) $p->amount,
                    'method' => $p->method,
                    'type' => $p->type,
                    'cash_register_id' => $p->cash_register_id,
                    'operator_id' => $p->operator_id,
                    'operator_name' => $p->operador->full_name ?? $p->operador->nickname ?? null,
                    'payment_date' => optional($p->payment_date)->toIso8601String(),
                ];
            });
    }

    /**
     * Todos los gastos del sistema, para corregir descripción, monto,
     * caja, operador y fecha.
     */
    private function getExpensesForAudit()
    {
        return Expense::with([
            'user:id,full_name,nickname',
            'operador:id,full_name,nickname',
        ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Expense $e) {
                return [
                    'id' => $e->id,
                    'description' => $e->description,
                    'amount' => (float) $e->amount,
                    'cash_register_id' => $e->cash_register_id,
                    'operator_id' => $e->operator_id,
                    'operator_name' => $e->operador->full_name ?? $e->operador->nickname ?? null,
                    'user_name' => $e->user->full_name ?? $e->user->nickname ?? 'N/D',
                    'created_at' => optional($e->created_at)->toIso8601String(),
                ];
            });
    }

    /**
     * Sobrescribe un Check-in a nivel de fila (bypass total): fechas,
     * estado, precio por noche (ya calculado en el frontend a partir del
     * "Total a pagar" / noches de la Vista Previa), noches totales y el
     * operador responsable. No usa el modelo Eloquent para evitar el trait
     * AutoUpperCase, LogsActivity y cualquier mutador/observer que
     * reinterprete el dato.
     */
    public function updateCheckin(Request $request, Checkin $checkin)
    {
        $validated = $request->validate([
            'check_in_date' => 'required|date',
            'check_out_date' => 'nullable|date',
            'status' => 'required|string|in:' . implode(',', self::CHECKIN_STATUSES),
            'agreed_price' => 'required|numeric|min:0',
            'duration_days' => 'required|integer|min:1',
            'checkin_operator_id' => 'nullable|exists:users,id',
            'checkout_operator_id' => 'nullable|exists:users,id',
        ]);

        // Capturamos el estado ANTES de sobrescribir: lo necesitamos para
        // saber si esta edición es la que recién finaliza la estadía (y por
        // lo tanto corresponde generar el recibo), o si ya estaba finalizada
        // y solo se está corrigiendo otro dato.
        $wasFinalizado = $checkin->status === 'finalizado';

        DB::table('checkins')->where('id', $checkin->id)->update([
            'check_in_date' => $validated['check_in_date'],
            'check_out_date' => $validated['check_out_date'],
            'status' => $validated['status'],
            'agreed_price' => $validated['agreed_price'],
            'duration_days' => $validated['duration_days'],
            'checkin_operator_id' => $validated['checkin_operator_id'],
            'checkout_operator_id' => $validated['checkout_operator_id'],
            'updated_at' => now(),
        ]);

        Log::warning('[GOD MODE] Check-in sobrescrito manualmente', [
            'admin' => Auth::user()->nickname,
            'checkin_id' => $checkin->id,
            'payload' => $validated,
        ]);

        $reciboMensaje = '';
        if ($validated['status'] === 'finalizado' && !$wasFinalizado) {
            $recibo = $this->generateLocalReceiptIfMissing($checkin);
            if ($recibo) {
                $reciboMensaje = " Se generó el Recibo #{$recibo->invoice_number}.";
            }
        }

        return redirect()->back()->with(
            'success',
            "Check-in #{$checkin->id} sobrescrito correctamente (God Mode).{$reciboMensaje}",
        );
    }

    /**
     * Genera el recibo interno (Invoice + InvoiceDetail) de un check-in que
     * God Mode acaba de marcar como 'finalizado', replicando el mismo
     * criterio de CheckinController::generateCheckoutReceipt() (mismo
     * control_code 'RECIBO-INTERNO', sin tocar el SIAT). Si el check-in ya
     * tenía un recibo/factura, no genera uno duplicado.
     */
    private function generateLocalReceiptIfMissing(Checkin $checkin): ?Invoice
    {
        if (Invoice::where('checkin_id', $checkin->id)->exists()) {
            return null;
        }

        $checkin->refresh()->load(['guest', 'room.price', 'checkinDetails.service', 'payments']);

        $diasACobrar = max(1, (int) $checkin->duration_days);
        $precioUnitario = (float) ($checkin->agreed_price ?? ($checkin->room->price->amount ?? 0));
        $totalHospedaje = $precioUnitario * $diasACobrar;
        $carriedBalance = (float) ($checkin->carried_balance ?? 0);

        $totalServicios = 0;
        foreach ($checkin->checkinDetails as $detalle) {
            $precioReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);
            $totalServicios += $detalle->quantity * $precioReal;
        }

        $lastInvoice = Invoice::orderBy('invoice_number', 'desc')->first();
        $nextInvoiceNumber = $lastInvoice ? $lastInvoice->invoice_number + 1 : 1;

        $lastPayment = $checkin->payments->last();
        $metodoFinal = $lastPayment ? substr($lastPayment->method, 0, 2) : 'EF';

        $recibo = Invoice::create([
            'invoice_number' => $nextInvoiceNumber,
            'checkin_id' => $checkin->id,
            'issue_date' => now()->toDateString(),
            'control_code' => 'RECIBO-INTERNO',
            'payment_method' => $metodoFinal,
            'user_id' => Auth::id() ?? 1,
            'issue_time' => now(),
            'status' => 'valid',
        ]);

        InvoiceDetail::create([
            'invoice_id' => $recibo->id,
            'service_id' => null,
            'description' => "Hospedaje Hab {$checkin->room->number}",
            'quantity' => $diasACobrar,
            'unit_price' => $precioUnitario,
            'cost' => $totalHospedaje + $carriedBalance,
        ]);

        foreach ($checkin->checkinDetails as $detalle) {
            $precioReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);
            InvoiceDetail::create([
                'invoice_id' => $recibo->id,
                'service_id' => $detalle->service_id,
                'description' => $detalle->service->name ?? 'Servicio adicional',
                'quantity' => $detalle->quantity,
                'unit_price' => $precioReal,
                'cost' => $detalle->quantity * $precioReal,
            ]);
        }

        Log::warning('[GOD MODE] Recibo generado automáticamente al finalizar', [
            'admin' => Auth::user()->nickname,
            'checkin_id' => $checkin->id,
            'invoice_id' => $recibo->id,
        ]);

        return $recibo;
    }

    /**
     * Sobrescribe un pago a nivel de fila: monto, caja y (opcionalmente,
     * cuando viene del tab de Finanzas) método, tipo, fecha y operador.
     * Los campos opcionales solo se tocan si vienen en el request, para
     * no romper al editor de pagos embebido en el modal de Check-ins (que
     * solo envía amount + cash_register_id). Igual que updateCheckin(),
     * sin pasar por el modelo Eloquent.
     */
    public function updatePayment(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'cash_register_id' => 'nullable|exists:cash_registers,id',
            'method' => 'nullable|string|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
            'type' => 'nullable|string|in:PAGO,ADELANTO,DEVOLUCION',
            'payment_date' => 'nullable|date',
            'operator_id' => 'nullable|exists:users,id',
        ]);

        $updateData = [
            'amount' => $validated['amount'],
            'cash_register_id' => $validated['cash_register_id'],
            'updated_at' => now(),
        ];

        if ($request->filled('method')) {
            $updateData['method'] = $validated['method'];
        }
        if ($request->filled('type')) {
            $updateData['type'] = $validated['type'];
        }
        if ($request->has('payment_date')) {
            $updateData['payment_date'] = $validated['payment_date'];
        }
        if ($request->has('operator_id')) {
            $updateData['operator_id'] = $validated['operator_id'];
        }

        DB::table('payments')->where('id', $payment->id)->update($updateData);

        Log::warning('[GOD MODE] Pago sobrescrito manualmente', [
            'admin' => Auth::user()->nickname,
            'payment_id' => $payment->id,
            'checkin_id' => $payment->checkin_id,
            'payload' => $updateData,
        ]);

        return redirect()->back()->with('success', "Pago #{$payment->id} sobrescrito correctamente (God Mode).");
    }

    /**
     * Sobrescribe un gasto a nivel de fila: descripción, monto, caja,
     * operador y fecha. cash_register_id NO es nullable a nivel de BD
     * (constraint NOT NULL en la tabla expenses), así que aquí sí es
     * obligatorio a diferencia de Payment.
     */
    public function updateExpense(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'cash_register_id' => 'required|exists:cash_registers,id',
            'operator_id' => 'nullable|exists:users,id',
            'created_at' => 'required|date',
        ]);

        DB::table('expenses')->where('id', $expense->id)->update([
            'description' => $validated['description'],
            'amount' => $validated['amount'],
            'cash_register_id' => $validated['cash_register_id'],
            'operator_id' => $validated['operator_id'],
            'created_at' => $validated['created_at'],
            'updated_at' => now(),
        ]);

        Log::warning('[GOD MODE] Gasto sobrescrito manualmente', [
            'admin' => Auth::user()->nickname,
            'expense_id' => $expense->id,
            'payload' => $validated,
        ]);

        return redirect()->back()->with('success', "Gasto #{$expense->id} sobrescrito correctamente (God Mode).");
    }
}
