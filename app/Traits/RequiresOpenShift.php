<?php

namespace App\Traits;

use App\Models\CashRegister;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Terminal Compartida (Kiosk Mode): helper para garantizar que el operador
 * elegido en el OperatorSelector (no la sesión de Laravel, que es
 * compartida por la cuenta 'recepcion') tenga un turno abierto antes de
 * registrar cualquier movimiento de dinero.
 *
 * Apertura silenciosa: si el operador no tiene un turno ABIERTO, se le crea
 * uno automáticamente en el momento — sin interrumpir su primera acción con
 * un modal. El monto inicial se hereda del `left_amount` que el ÚLTIMO
 * turno cerrado en todo el sistema (de cualquier operador) declaró dejar
 * en la caja física; si no hay ninguno, arranca en 0.
 */
trait RequiresOpenShift
{
    /**
     * Devuelve el turno abierto del operador, abriéndolo automáticamente
     * si no existe.
     */
    protected function findOpenShift(int $operatorId): CashRegister
    {
        $register = CashRegister::where('user_id', $operatorId)
            ->where('status', 'ABIERTA')
            ->first();

        if ($register) {
            return $register;
        }

        return $this->autoOpenShift($operatorId);
    }

    private function autoOpenShift(int $operatorId): CashRegister
    {
        $operator = User::findOrFail($operatorId);

        if (!$operator->hasRole('recepcionista')) {
            throw new RuntimeException("{$operator->full_name} no tiene el rol de recepcionista; no puede operar caja.");
        }

        return DB::transaction(function () use ($operatorId) {
            // Mismo candado de concurrencia que CashRegisterController::open():
            // evita que dos peticiones simultáneas del mismo operador (ej. dos
            // pestañas) creen dos turnos abiertos a la vez.
            DB::table('users')->where('id', $operatorId)->lockForUpdate()->first();

            $yaAbierta = CashRegister::where('user_id', $operatorId)
                ->where('status', 'ABIERTA')
                ->first();

            if ($yaAbierta) {
                return $yaAbierta;
            }

            // El dinero físico de la caja es único y compartido por
            // terminal: se hereda de quien haya cerrado más recientemente,
            // sin importar qué operador fue. orderByDesc('id') desempata
            // cierres con el mismo `closed_at` (posible si dos turnos se
            // cierran en la misma transacción/segundo).
            $ultimoCerrado = CashRegister::where('status', 'CERRADA')
                ->orderByDesc('closed_at')
                ->orderByDesc('id')
                ->first();

            $montoInicial = $ultimoCerrado->left_amount ?? 0;

            return CashRegister::create([
                'user_id'        => $operatorId,
                'opening_amount' => $montoInicial,
                'status'         => 'ABIERTA',
                'opened_at'      => now(),
            ]);
        });
    }
}
