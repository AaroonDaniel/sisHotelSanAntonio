<?php

namespace App\Traits;

use App\Exceptions\ShiftNotOpenException;
use App\Models\CashRegister;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;

/**
 * Terminal Compartida (Kiosk Mode): helper para exigir que el operador
 * elegido en el OperatorSelector (no la sesión de Laravel, que es
 * compartida por la cuenta 'recepcion') tenga un turno abierto antes de
 * registrar cualquier movimiento de dinero.
 */
trait RequiresOpenShift
{
    /**
     * Busca el turno abierto del operador o lanza ShiftNotOpenException.
     */
    protected function findOpenShift(int $operatorId): CashRegister
    {
        $register = CashRegister::where('user_id', $operatorId)
            ->where('status', 'ABIERTA')
            ->first();

        if (!$register) {
            $operator = User::find($operatorId);
            throw new ShiftNotOpenException(
                $operatorId,
                $operator->full_name ?? $operator->nickname ?? 'El operador',
            );
        }

        return $register;
    }

    /**
     * Respuesta Inertia estándar (redirect + withErrors) para formularios
     * que usan useForm(). El frontend reconoce 'shift_required' en
     * errors y dispara el modal de apertura, dejando el resto de los
     * datos del formulario intactos (mismo patrón que cualquier otro
     * error de validación).
     */
    protected function shiftRequiredRedirect(ShiftNotOpenException $e): RedirectResponse
    {
        return back()->withErrors([
            'shift_required' => json_encode([
                'operator_id' => $e->operatorId,
                'operator_name' => $e->operatorName,
            ]),
        ]);
    }

    /**
     * Respuesta JSON (para endpoints llamados con axios en vez de
     * useForm, ej. checkout/multiCheckout). 409 = Conflict: la acción no
     * puede completarse en el estado actual (sin turno abierto).
     */
    protected function shiftRequiredJson(ShiftNotOpenException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'needs_shift_opening' => true,
            'operator_id' => $e->operatorId,
            'operator_name' => $e->operatorName,
            'message' => $e->getMessage(),
        ], 409);
    }
}
