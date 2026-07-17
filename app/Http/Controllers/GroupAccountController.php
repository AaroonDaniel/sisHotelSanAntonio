<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\SpecialAgreement;
use App\Models\User;
use App\Traits\RequiresOpenShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * "Cuentas Grupales": módulo unificado que fusiona Delegación y
 * Corporativo (antes repartidos entre el checkbox "ASIG. CORP" del
 * check-in y CorporateAccountController). Una Cuenta Grupal agrupa varias
 * habitaciones bajo un mismo nombre de institución/empresa con un
 * adelanto inicial que se va consumiendo a medida que se asignan
 * habitaciones (Check-in Rápido) — saldo simple, sin prorrateo por días:
 * total_advance - total_consumed.
 *
 * Exclusivo para operaciones internas de recepción — no interviene en
 * nada del módulo de reservas online (OnlineBookingController).
 */
class GroupAccountController extends Controller
{
    use RequiresOpenShift;

    /**
     * Listado de Cuentas Grupales + operadores reales para el selector del
     * formulario de creación (adelanto inicial -> caja del operador).
     */
    public function index()
    {
        $accounts = SpecialAgreement::groupAccounts()
            ->withCount(['checkins' => fn ($q) => $q->where('status', 'activo')])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (SpecialAgreement $a) => [
                'id' => $a->id,
                'name' => $a->company_name,
                'type' => $a->type,
                'origin' => $a->origin,
                'total_advance' => (float) $a->total_advance,
                'total_consumed' => (float) $a->total_consumed,
                'balance' => $a->balance,
                'active_rooms_count' => $a->checkins_count,
                'created_at' => optional($a->created_at)->toIso8601String(),
            ]);

        return Inertia::render('group-accounts/index', [
            'GroupAccounts' => $accounts,
            // Operadores reales (excluye 'recepcion'/'sistema_web') para el
            // OperatorSelector del adelanto inicial — igual criterio que el
            // resto del sistema (nunca un cash_register_id elegido a mano).
            'Operators' => User::operadores()->get(['id', 'full_name', 'nickname']),
        ]);
    }

    /**
     * Crea la Cuenta Grupal y, si trae adelanto inicial, lo registra de
     * una vez como un Payment real contra la caja del operador elegido.
     *
     * POST /group-accounts
     * { "name": "COLEGIO SAN JOSÉ", "type": "delegacion",
     *   "initial_advance": 1500, "operator_id": 7, "method": "EFECTIVO" }
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:delegacion,corporativo',
            // Procedencia del grupo (de dónde vienen) — solo tiene sentido
            // para Delegación; se hereda al huésped en el Check-in Rápido.
            'origin' => 'nullable|string|max:255',
            'initial_advance' => 'nullable|numeric|min:0',
            'operator_id' => 'nullable|required_if:initial_advance,>,0|exists:users,id',
            'method' => 'nullable|string|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
        ], [
            'operator_id.required_if' => 'Selecciona qué operador recibe el adelanto, para registrarlo en su caja.',
        ]);

        $initialAdvance = round((float) ($validated['initial_advance'] ?? 0), 2);

        return DB::transaction(function () use ($validated, $initialAdvance) {
            $account = SpecialAgreement::create([
                'type' => $validated['type'],
                'company_name' => $validated['name'],
                'origin' => $validated['origin'] ?? null,
                // agreed_price/payment_frequency_days son del modelo viejo
                // (prorrateo por día); Cuentas Grupales usa el saldo simple
                // de abajo, así que quedan en su valor neutro.
                'agreed_price' => 0,
                'payment_frequency_days' => 0,
                'starts_at' => now(),
                'total_advance' => $initialAdvance,
                'total_consumed' => 0,
            ]);

            if ($initialAdvance > 0) {
                $operatorId = (int) $validated['operator_id'];
                // Apertura silenciosa si el operador elegido no tiene
                // turno abierto — mismo patrón que el resto del sistema
                // (RequiresOpenShift), nunca un pago sin caja.
                $cajaAbierta = $this->findOpenShift($operatorId);

                Payment::create([
                    'special_agreement_id' => $account->id,
                    'checkin_id' => null,
                    'user_id' => Auth::id() ?? 1,
                    'operator_id' => $operatorId,
                    'cash_register_id' => $cajaAbierta->id,
                    'amount' => $initialAdvance,
                    'method' => $validated['method'] ?? 'EFECTIVO',
                    'type' => 'PAGO',
                    'payment_date' => now(),
                ]);
            }

            return redirect()->back()->with(
                'success',
                "Cuenta Grupal '{$account->company_name}' creada con Bs {$initialAdvance} de adelanto.",
            );
        });
    }

    /**
     * Registra un pago/abono ADICIONAL sobre una Cuenta Grupal ya existente
     * (p. ej. el "resto" que paga una delegación el último día). Suma a
     * total_advance, igual que el adelanto inicial de store(), y crea el
     * Payment real contra la caja del operador elegido.
     *
     * POST /group-accounts/{groupAccount}/advance
     * { "amount": 1800, "operator_id": 7, "method": "EFECTIVO" }
     */
    public function addAdvance(Request $request, SpecialAgreement $groupAccount)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'operator_id' => 'required|exists:users,id',
            'method' => 'nullable|string|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
        ]);

        $amount = round((float) $validated['amount'], 2);

        return DB::transaction(function () use ($validated, $amount, $groupAccount) {
            $operatorId = (int) $validated['operator_id'];
            $cajaAbierta = $this->findOpenShift($operatorId);

            Payment::create([
                'special_agreement_id' => $groupAccount->id,
                'checkin_id' => null,
                'user_id' => Auth::id() ?? 1,
                'operator_id' => $operatorId,
                'cash_register_id' => $cajaAbierta->id,
                'amount' => $amount,
                'method' => $validated['method'] ?? 'EFECTIVO',
                'type' => 'PAGO',
                'payment_date' => now(),
            ]);

            $groupAccount->increment('total_advance', $amount);

            return redirect()->back()->with(
                'success',
                "Abono de Bs {$amount} registrado en '{$groupAccount->company_name}'.",
            );
        });
    }
}
