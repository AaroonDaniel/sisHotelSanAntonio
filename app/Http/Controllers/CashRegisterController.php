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
        if(!Auth::user()->hasRole('recepcionista')) {
            return back()->with('error', 'Solo el personal de recepcion requiere abrir caja');    
        }
        $request->validate([
            'opening_amount' => 'required|numeric|min:0',
        ]);

        $userId = Auth::id();

        try {
            DB::transaction(function () use ($request, $userId) {
                // Bloqueo pesimista para evitar concurrencia del mismo usuario
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();

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
        // 1. Obtenemos solo los datos necesarios para renderizar la tabla visual
        $payments = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->with('checkin.room')
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // 2. OPTIMIZACIÓN: Dejamos que la Base de Datos haga los cálculos pesados en lugar de PHP
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

        // 3. Formateamos la respuesta para que la vista de React (Inertia) no note la diferencia
        $byMethod = $byMethodDB->map(function ($group) {
            return [
                'method'      => $group->method,
                'total'       => (float) $group->total,
                'count'       => (int) $group->count,
                'refunds'     => (float) $group->refunds,
                'collections' => (float) $group->collections,
            ];
        })->values();

        // CÓDIGO CORREGIDO
        $cashMovements = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->whereRaw("UPPER(method) = ?", ['EFECTIVO']) // <--- Corrección aplicada
            ->sum('amount');

        $expectedCash = (float) $cashRegister->opening_amount + (float) $cashMovements;

        return Inertia::render('cash-registers/show', [
            'CashRegister' => $cashRegister,
            'Payments'     => $payments,
            'TotalIncome'  => (float) $totalIncome,
            'ByMethod'     => $byMethod,
            'ExpectedCash' => $expectedCash,
        ]);
    }
}
