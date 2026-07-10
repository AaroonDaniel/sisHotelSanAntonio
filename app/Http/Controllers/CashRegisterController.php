<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CashRegister;
use App\Models\User;
use App\Traits\BuildsShiftClosingData;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use RuntimeException;

/**
 * Terminal Compartida (Kiosk Mode): la sesión de Laravel (Auth::id()) ya no
 * identifica al operador. Todo turno se abre/cierra a nombre del
 * `operator_id` elegido en el OperatorSelector (el avatar físico), no de
 * quien está logueado en el navegador — la cuenta 'recepcion' es compartida
 * por todos los recepcionistas de la terminal.
 */
class CashRegisterController extends Controller
{
    use BuildsShiftClosingData;

    public function open(Request $request)
    {
        $request->validate([
            'operator_id' => 'required|exists:users,id',
            'opening_amount' => 'required|numeric|min:0',
        ]);

        $operatorId = (int) $request->operator_id;
        $operator = User::findOrFail($operatorId);

        if (!$operator->hasRole('recepcionista')) {
            return back()->with('error', "{$operator->full_name} no tiene el rol de recepcionista; no puede abrir caja.");
        }

        try {
            DB::transaction(function () use ($request, $operatorId) {
                // Bloqueo pesimista para evitar concurrencia del mismo operador
                DB::table('users')->where('id', $operatorId)->lockForUpdate()->first();

                $yaTieneCaja = CashRegister::query()
                    ->where('user_id', $operatorId)
                    ->where('status', 'ABIERTA')
                    ->exists();

                if ($yaTieneCaja) {
                    throw new RuntimeException('Este operador ya tiene un turno abierto.');
                }

                CashRegister::create([
                    'user_id'        => $operatorId,
                    'opening_amount' => $request->opening_amount,
                    'status'         => 'ABIERTA',
                    'opened_at'      => now(),
                ]);
            });
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Turno iniciado para ' . $operator->full_name . '.');
    }

    public function close(Request $request)
    {
        $request->validate([
            'operator_id' => 'required|exists:users,id',
        ]);

        $operatorId = (int) $request->operator_id;
        $cashRegisterId = null;

        try {
            DB::transaction(function () use ($operatorId, &$cashRegisterId) {
                DB::table('users')->where('id', $operatorId)->lockForUpdate()->first();

                $activeRegister = CashRegister::query()
                    ->where('user_id', $operatorId)
                    ->where('status', 'ABIERTA')
                    ->first();

                if (!$activeRegister) {
                    throw new RuntimeException('Este operador no tiene ningún turno abierto para cerrar.');
                }

                $activeRegister->update([
                    'status'    => 'CERRADA',
                    'closed_at' => now(),
                ]);

                $cashRegisterId = $activeRegister->id;
            });
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        // PASO 3: congelamos el cuadre exacto en snapshot_data para que el
        // reporte histórico sea inmutable a futuras correcciones de datos.
        $cashRegister = CashRegister::findOrFail($cashRegisterId);
        $cashRegister->update([
            'snapshot_data' => $this->buildClosingData($cashRegister),
        ]);

        // 🚫 A propósito NO se cierra sesión ni se invalida el token: la
        // sesión de 'recepcion' es compartida por todos los operadores de
        // la terminal. Cerrar el turno de UNO no debe expulsar a los demás
        // que sigan trabajando en la misma máquina.

        return back()->with('success', 'Turno cerrado correctamente.')
            ->with('closed_register_id', $cashRegister->id);
    }

    public function show(CashRegister $cashRegister)
    {
        // Bajo Terminal Compartida, Auth::id() ya no identifica al operador
        // dueño del turno (siempre es la cuenta 'recepcion'). Cualquiera
        // frente a la terminal (rol recepcionista) puede ver el cierre que
        // acaba de generar; el detalle financiero completo sigue
        // restringido a quien tenga el permiso de reportes.
        if (
            !Auth::user()->hasRole('recepcionista') &&
            !Auth::user()->can('reportes.financiero')
        ) {
            abort(403, 'No tienes permiso para ver esta caja.');
        }

        // Turno ya CERRADO con snapshot congelado: se sirve tal cual quedó
        // al momento del cierre, sin recalcular con el estado actual de la
        // BD (inmutable para auditoría).
        if ($cashRegister->status === 'CERRADA' && $cashRegister->snapshot_data) {
            return Inertia::render('cash-registers/show', array_merge(
                $cashRegister->snapshot_data,
                ['CashRegister' => $cashRegister->load('user')],
            ));
        }

        return Inertia::render('cash-registers/show', array_merge(
            $this->buildClosingData($cashRegister),
            ['CashRegister' => $cashRegister->load('user')],
        ));
    }
}
