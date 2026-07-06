<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * "God Mode" / Auditoría de Datos.
 *
 * Panel maestro para corregir errores de operación (cajas abandonadas,
 * fechas mal registradas, montos, operadores) cuando los reportes no
 * cuadran. El acceso ya queda restringido al administrador principal
 * por el middleware 'god_mode' (routes/web.php), así que este controlador
 * no repite el chequeo de nickname.
 */
class DataAuditController extends Controller
{
    public function index()
    {
        return Inertia::render('audit/index', [
            'CashRegisters' => $this->getCashRegistersForAudit(),
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
}
