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
        if (!Auth::user()->hasRole('recepcionista')) {
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
                    'opened_at' => now(),
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
        if (
            $cashRegister->user_id !== Auth::id() &&
            !Auth::user()->can('reportes.financiero')
        ) {
            abort(403, 'No tienes permiso para ver esta caja.');
        }

        $payments = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->with('checkin.room')
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
                ];
            });
        $checkinIdsDelTurno = Payment::query()
            ->where('cash_register_id', $cashRegister->id)
            ->pluck('checkin_id')
            ->unique();

        $services = \Illuminate\Support\Facades\DB::table('checkin_details')
            ->join('services', 'services.id', '=', 'checkin_details.service_id')
            ->join('checkins', 'checkins.id', '=', 'checkin_details.checkin_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'checkins.room_id')
            ->whereIn('checkin_details.checkin_id', $checkinIdsDelTurno)
            ->whereBetween('checkin_details.consumed_at', [
                $cashRegister->opened_at ?? $cashRegister->created_at, // <-- USA CREATED_AT COMO RESPALDO
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

        // 3. Totales por método (sin cambios)
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

        $expectedCash = (float) $cashRegister->opening_amount + (float) $cashMovements;

        return Inertia::render('cash-registers/show', [
            'CashRegister' => $cashRegister->load('user'), // 👈 FALTA: trae name, email, shift del recepcionista
            'Payments'     => $payments,
            'Services'     => $services->values(),
            'TotalIncome'  => (float) $totalIncome,
            'ByMethod'     => $byMethod,
            'ExpectedCash' => $expectedCash,
        ]);
    }
}
