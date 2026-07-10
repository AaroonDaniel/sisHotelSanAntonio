<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\SpecialAgreement;
use App\Models\User;
use App\Services\CorporateBillingService;
use App\Traits\RequiresOpenShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * "Cuenta Maestra" corporativa: agrupa VARIOS Checkins (habitaciones
 * distintas) bajo un mismo convenio, para que la empresa pague en un solo
 * movimiento y ese pago se reparta entre las habitaciones del grupo.
 *
 * Solo backend por ahora — no hay vista React todavía. Los checkins
 * individuales se crean con el flujo normal de asignación
 * (CheckinController::store()); este controlador solo agrupa checkins ya
 * existentes bajo una Cuenta Maestra y gestiona sus pagos/saldos.
 */
class CorporateAccountController extends Controller
{
    use RequiresOpenShift;

    public function __construct(private CorporateBillingService $billing)
    {
    }

    /**
     * Vista: listado de Cuentas Maestras + habitaciones activas todavía
     * libres (sin convenio) para poder armar una cuenta nueva.
     */
    public function index()
    {
        $dueIds = SpecialAgreement::dueForCorporateBilling()->pluck('id');

        // Solo Cuentas Maestras "reales" (con nombre de empresa, creadas
        // desde esta pantalla). Los convenios corporativos de UNA sola
        // habitación (sin company_name, creados desde la asignación normal)
        // ya se gestionan en /status — no se listan aquí para no saturar.
        $accounts = SpecialAgreement::where('type', 'corporativo')
            ->whereNotNull('company_name')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (SpecialAgreement $agreement) use ($dueIds) {
                $rooms = $this->billing->getRoomBalances($agreement);

                return [
                    'id' => $agreement->id,
                    'company_name' => $agreement->company_name,
                    'payment_frequency_days' => $agreement->payment_frequency_days,
                    'starts_at' => optional($agreement->starts_at)->toIso8601String(),
                    'total_daily_rate' => (float) $rooms->sum('daily_rate'),
                    'total_balance' => (float) $rooms->sum('balance'),
                    'is_in_mora' => $rooms->contains(fn ($r) => $r['is_in_mora']),
                    'is_due' => $dueIds->contains($agreement->id),
                    'rooms' => $rooms->values(),
                ];
            });

        $availableCheckins = Checkin::where('status', 'activo')
            ->whereNull('special_agreement_id')
            ->with(['guest:id,full_name', 'room:id,number'])
            ->orderBy('room_id')
            ->get()
            ->map(fn (Checkin $c) => [
                'id' => $c->id,
                'room_number' => $c->room->number ?? 'N/D',
                'guest_name' => $c->guest->full_name ?? 'N/D',
                'agreed_price' => (float) $c->agreed_price,
                'duration_days' => $c->duration_days,
            ]);

        return Inertia::render('corporate-accounts/index', [
            'CorporateAccounts' => $accounts,
            'AvailableCheckins' => $availableCheckins,
            // Operadores reales (excluye 'recepcion'/'sistema_web') para el
            // OperatorSelector del pago: ya no se elige un cash_register_id
            // a mano (eso permitía dejarlo en blanco = pago fantasma).
            'Operators' => User::operadores()->get(['id', 'full_name', 'nickname']),
        ]);
    }

    /**
     * Crea la Cuenta Maestra y liga de una vez los checkins indicados.
     *
     * POST /corporate-accounts
     * {
     *   "company_name": "EMPRESA XYZ SRL",
     *   "payment_frequency_days": 15,
     *   "checkin_ids": [101, 102, 103, 104]
     * }
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'payment_frequency_days' => 'required|integer|min:1',
            'checkin_ids' => 'required|array|min:1',
            'checkin_ids.*' => 'required|integer|distinct|exists:checkins,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $checkins = Checkin::whereIn('id', $validated['checkin_ids'])
                ->where('status', 'activo')
                ->get();

            if ($checkins->count() !== count($validated['checkin_ids'])) {
                return redirect()->back()->withErrors([
                    'checkin_ids' => 'Alguno de los check-ins indicados no existe o ya no está activo.',
                ]);
            }

            // Ancla del grupo: el check-in más antiguo del lote (el
            // convenio corporativo arranca cuando entró el primero).
            $agreement = $this->billing->createMasterAccount(
                $validated['company_name'],
                $validated['payment_frequency_days'],
                $checkins->min('check_in_date'),
            );

            foreach ($checkins as $checkin) {
                $this->billing->attachCheckinToMasterAccount($checkin, $agreement);
            }

            return redirect()->back()->with(
                'success',
                "Cuenta Maestra '{$agreement->company_name}' creada con {$checkins->count()} habitación(es). Convenio #{$agreement->id}.",
            );
        });
    }

    /**
     * Agrega MÁS habitaciones a una Cuenta Maestra ya existente.
     *
     * POST /corporate-accounts/{corporateAccount}/attach
     * { "checkin_ids": [105, 106] }
     */
    public function attach(Request $request, SpecialAgreement $corporateAccount)
    {
        if ($corporateAccount->type !== 'corporativo') {
            return redirect()->back()->withErrors([
                'corporate_account' => 'Este convenio no es una Cuenta Maestra corporativa.',
            ]);
        }

        $validated = $request->validate([
            'checkin_ids' => 'required|array|min:1',
            'checkin_ids.*' => 'required|integer|distinct|exists:checkins,id',
        ]);

        return DB::transaction(function () use ($validated, $corporateAccount) {
            $checkins = Checkin::whereIn('id', $validated['checkin_ids'])
                ->where('status', 'activo')
                ->get();

            foreach ($checkins as $checkin) {
                $this->billing->attachCheckinToMasterAccount($checkin, $corporateAccount);
            }

            return redirect()->back()->with(
                'success',
                "{$checkins->count()} habitación(es) agregadas a la Cuenta Maestra '{$corporateAccount->company_name}'.",
            );
        });
    }

    /**
     * Registra un pago de la empresa contra la Cuenta Maestra (no contra
     * una habitación puntual).
     *
     * POST /corporate-accounts/{corporateAccount}/payments
     * { "amount": 4500, "operator_id": 7, "method": "TRANSFERENCIA" }
     */
    public function registerPayment(Request $request, SpecialAgreement $corporateAccount)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            // Terminal Compartida: quién recibe el pago (avatar del
            // OperatorSelector), NO un cash_register_id elegido a mano —
            // eso permitía dejarlo en blanco ("Sin caja") y crear un pago
            // fantasma. Apertura silenciosa si no tiene turno abierto.
            'operator_id' => 'required|exists:users,id',
            'method' => 'nullable|string|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
            'bank_name' => 'nullable|string|max:50',
        ]);

        $operatorId = (int) $validated['operator_id'];
        $cajaAbierta = $this->findOpenShift($operatorId);

        $payment = $this->billing->registerCorporatePayment(
            $corporateAccount,
            (float) $validated['amount'],
            $cajaAbierta->id,
            $validated['method'] ?? 'EFECTIVO',
            $validated['bank_name'] ?? null,
            $operatorId,
        );

        return redirect()->back()->with(
            'success',
            "Pago de Bs {$validated['amount']} registrado (#{$payment->id}) para '{$corporateAccount->company_name}'.",
        );
    }

    /**
     * Saldo por habitación de la Cuenta Maestra (prorrateo). Endpoint de
     * solo lectura, útil para verificar antes de tener la vista en React.
     *
     * GET /corporate-accounts/{corporateAccount}/balances
     */
    public function balances(SpecialAgreement $corporateAccount)
    {
        return response()->json([
            'company_name' => $corporateAccount->company_name,
            'payment_frequency_days' => $corporateAccount->payment_frequency_days,
            'starts_at' => $corporateAccount->starts_at,
            'rooms' => $this->billing->getRoomBalances($corporateAccount),
        ]);
    }
}
