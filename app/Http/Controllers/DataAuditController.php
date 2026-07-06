<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Models\Checkin;
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
            'Checkins' => $this->getCheckinsForAudit(),
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
            'operador:id,full_name,nickname',
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
                    'operator_id' => $c->operator_id,
                    'operator_name' => $c->operador->full_name ?? $c->operador->nickname ?? null,
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
            'actual_arrival_date' => 'nullable|date',
            'check_out_date' => 'nullable|date',
            'status' => 'required|string|in:' . implode(',', self::CHECKIN_STATUSES),
            'agreed_price' => 'required|numeric|min:0',
            'duration_days' => 'required|integer|min:1',
            'operator_id' => 'nullable|exists:users,id',
        ]);

        // Capturamos el estado ANTES de sobrescribir: lo necesitamos para
        // saber si esta edición es la que recién finaliza la estadía (y por
        // lo tanto corresponde generar el recibo), o si ya estaba finalizada
        // y solo se está corrigiendo otro dato.
        $wasFinalizado = $checkin->status === 'finalizado';

        DB::table('checkins')->where('id', $checkin->id)->update([
            'actual_arrival_date' => $validated['actual_arrival_date'],
            'check_out_date' => $validated['check_out_date'],
            'status' => $validated['status'],
            'agreed_price' => $validated['agreed_price'],
            'duration_days' => $validated['duration_days'],
            'operator_id' => $validated['operator_id'],
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
     * Sobrescribe un pago a nivel de fila: monto y a qué caja pertenece.
     * Igual que updateCheckin(), sin pasar por el modelo Eloquent.
     */
    public function updatePayment(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'cash_register_id' => 'nullable|exists:cash_registers,id',
        ]);

        DB::table('payments')->where('id', $payment->id)->update([
            'amount' => $validated['amount'],
            'cash_register_id' => $validated['cash_register_id'],
            'updated_at' => now(),
        ]);

        Log::warning('[GOD MODE] Pago sobrescrito manualmente', [
            'admin' => Auth::user()->nickname,
            'payment_id' => $payment->id,
            'checkin_id' => $payment->checkin_id,
            'payload' => $validated,
        ]);

        return redirect()->back()->with('success', "Pago #{$payment->id} sobrescrito correctamente (God Mode).");
    }
}
