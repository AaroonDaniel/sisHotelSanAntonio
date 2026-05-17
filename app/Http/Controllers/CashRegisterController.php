<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CashRegister;
use App\Models\Payment;
use Illuminate\Support\Facades\Auth; // Agregamos esto para complacer a Intelephense
use Inertia\Inertia;

class CashRegisterController extends Controller
{
    // Función para abrir la caja al iniciar turno
    public function open(Request $request)
    {
        $request->validate([
            'opening_amount' => 'required|numeric|min:0',
        ]);

        // Usamos Auth::id() (método limpio que Intelephense reconoce al 100%)
        $hasOpenRegister = CashRegister::where('user_id', Auth::id())
                                       ->where('status', 'ABIERTA')
                                       ->exists();

        if ($hasOpenRegister) {
            return back()->with('error', 'Ya tienes un turno abierto.');
        }

        // Creamos la nueva caja
        CashRegister::create([
            'user_id' => Auth::id(),
            'opening_amount' => $request->opening_amount,
            'status' => 'ABIERTA',
        ]);

        return back()->with('success', 'Turno iniciado. ¡Que tengas un excelente día!');
    }
    // Función para cerrar la caja al finalizar turno
    public function close(Request $request)
    {
        // 1. Buscamos si el usuario tiene una caja abierta
        $activeRegister = CashRegister::where('user_id', Auth::id())
                                      ->where('status', 'ABIERTA')
                                      ->first();

        // 2. Si por alguna razón no tiene caja, lo devolvemos
        if (!$activeRegister) {
            return back()->with('error', 'No tienes ninguna caja abierta para cerrar.');
        }

        // 3. Cerramos la caja guardando la hora actual
        $activeRegister->update([
            'status' => 'CERRADA',
            'closed_at' => now(),
        ]);
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login')->with('success', 'Turno cerrado correctamente. ¡Buen trabajo!');
    }

    /**
     * Hoja de caja (arqueo) de un turno.
     *
     * Regla contable: se suman TODOS los pagos del turno, positivos y
     * negativos. Las devoluciones están guardadas con monto negativo, por
     * lo que reducen tanto el total general como el total del método de
     * pago correspondiente (si se devuelven 50 Bs en efectivo, el efectivo
     * del turno baja 50 Bs). No se filtra por 'type' en ningún momento.
     */
    public function show(CashRegister $cashRegister)
    {
        // 1. Todos los movimientos del turno (entradas y salidas).
        $payments = Payment::where('cash_register_id', $cashRegister->id)
            ->with('checkin.room')
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // 2. Total de ingresos NETO: sum() resta los negativos solo.
        $totalIncome = (float) $payments->sum('amount');

        // 3. Desglose por método de pago. Los montos negativos (devoluciones)
        //    reducen el total del método al que pertenecen.
        $byMethod = $payments
            ->groupBy(fn ($p) => strtoupper($p->method ?? 'SIN_METODO'))
            ->map(fn ($group, $method) => [
                'method'      => $method,
                'total'       => (float) $group->sum('amount'),
                'count'       => $group->count(),
                'refunds'     => (float) $group->where('amount', '<', 0)->sum('amount'),
                'collections' => (float) $group->where('amount', '>=', 0)->sum('amount'),
            ])
            ->values();

        // 4. Efectivo esperado en caja = apertura + ingresos netos en efectivo.
        $cashMovements = (float) $payments
            ->filter(fn ($p) => strtoupper($p->method ?? '') === 'EFECTIVO')
            ->sum('amount');
        $expectedCash = (float) $cashRegister->opening_amount + $cashMovements;

        return Inertia::render('cash-registers/show', [
            'CashRegister'  => $cashRegister,
            'Payments'      => $payments,
            'TotalIncome'   => $totalIncome,
            'ByMethod'      => $byMethod,
            'ExpectedCash'  => $expectedCash,
        ]);
    }}