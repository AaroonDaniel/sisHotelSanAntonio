<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CashRegister;
use App\Models\Payment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use RuntimeException;

class CashRegisterController extends Controller
{
    public function open(Request $request)
    {
        $request->validate([
            'opening_amount' => 'required|numeric|min:0',
        ]);

        $userId = Auth::id();

        try {
            DB::transaction(function () use ($request, $userId) {
                // Bloqueo de fila del usuario
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();

                // Usamos la clase explícita
                $yaTieneCaja = CashRegister::query()
                    ->where('user_id', $userId)
                    ->where('status', 'ABIERTA')
                    ->exists();

                if ($yaTieneCaja) {
                    throw new RuntimeException('Ya tienes un turno abierto.');
                }

                CashRegister::create([
                    'user_id'        => $userId,
                    'opening_amount' => $request->opening_amount,
                    'status'         => 'ABIERTA',
                ]);
            });
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Turno iniciado.');
    }

    public function close(Request $request)
    {
        $userId = Auth::id();

        try {
            DB::transaction(function () use ($userId) {
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();

                $activeRegister = CashRegister::query()
                    ->where('user_id', $userId)
                    ->where('status', 'ABIERTA')
                    ->first();

                if (!$activeRegister) {
                    throw new RuntimeException('No tienes ninguna caja abierta para cerrar.');
                }

                $activeRegister->update([
                    'status'    => 'CERRADA',
                    'closed_at' => now(),
                ]);
            });
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login')->with('success', 'Turno cerrado correctamente.');
    }

    public function show(CashRegister $cashRegister)
    {
        $payments = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
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
