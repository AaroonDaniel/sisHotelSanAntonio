<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CashRegister;
use App\Models\Payment;
use Illuminate\Support\Facades\Auth; // Agregamos esto para complacer a Intelephense
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class CashRegisterController extends Controller
{
    // Función para abrir la caja al iniciar turno
    public function open(Request $request)
    {
        $request->validate([
            'opening_amount' => 'required|numeric|min:0',
        ]);

        $userId = Auth::id();

        try {
            DB::transaction(function () use ($request, $userId) {
                // Lock de fila estable: bloqueamos la fila del propio usuario.
                // Esto serializa SOLO las aperturas/cierres concurrentes de ESTE
                // usuario, sin afectar a los demás. Es un lock de grano fino.
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();

                // Dentro del lock, la comprobación es segura: ninguna otra
                // transacción del mismo usuario puede intercalarse aquí.
                $yaTieneCaja = CashRegister::where('user_id', $userId)
                    ->where('status', 'ABIERTA')
                    ->exists();

                if ($yaTieneCaja) {
                    // Abortamos la transacción con una excepción de dominio.
                    throw new \RuntimeException('Ya tienes un turno abierto.');
                }

                CashRegister::create([
                    'user_id'        => $userId,
                    'opening_amount' => $request->opening_amount,
                    'status'         => 'ABIERTA',
                ]);
            });
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Turno iniciado. ¡Que tengas un excelente día!');
    }
    // Función para cerrar la caja al finalizar turno
    public function close(Request $request)
    {
        $userId = Auth::id();

        try {
            DB::transaction(function () use ($userId) {
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();

                $activeRegister = CashRegister::where('user_id', $userId)
                    ->where('status', 'ABIERTA')
                    ->first();

                if (!$activeRegister) {
                    throw new \RuntimeException('No tienes ninguna caja abierta para cerrar.');
                }

                $activeRegister->update([
                    'status'    => 'CERRADA',
                    'closed_at' => now(),
                ]);
            });
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        // El logout y la invalidación de sesión van FUERA de la transacción:
        // no son operaciones de BD contable y no deben mantener el lock abierto.
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
        $payments = Payment::where('cash_register_id', $cashRegister->id)
            ->with('checkin.room')
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalIncome = (float) $payments->sum('amount');

        $byMethod = $payments
            ->groupBy(fn($p) => strtoupper($p->method ?? 'SIN_METODO'))
            ->map(fn($group, $method) => [
                'method'      => $method,
                'total'       => (float) $group->sum('amount'),
                'count'       => $group->count(),
                'refunds'     => (float) $group->where('amount', '<', 0)->sum('amount'),
                'collections' => (float) $group->where('amount', '>=', 0)->sum('amount'),
            ])
            ->values();

        $cashMovements = (float) $payments
            ->filter(fn($p) => strtoupper($p->method ?? '') === 'EFECTIVO')
            ->sum('amount');
        $expectedCash = (float) $cashRegister->opening_amount + $cashMovements;

        return Inertia::render('cash-registers/show', [
            'CashRegister' => $cashRegister,
            'Payments'     => $payments,
            'TotalIncome'  => $totalIncome,
            'ByMethod'     => $byMethod,
            'ExpectedCash' => $expectedCash,
        ]);
    }
}
