<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Models\Checkin;
use App\Models\Expense;
use App\Models\Guest;
use App\Models\Invoice;
use App\Models\InvoiceDetail;
use App\Models\Payment;
use App\Models\Room;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\SpecialAgreement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Panel "Cocina": centro de mando visual único, exclusivo del rol
 * 'administrador_sistema' (Spatie) — protegido por
 * ->middleware('role:administrador_sistema') en routes/web.php. El antiguo
 * candado 'god_mode' por nickname (EnsureGodModeAccess) y su controlador
 * (DataAuditController) fueron retirados: su lógica de edición cruda de
 * check-ins/pagos/cajas/gastos vive ahora en la sección AUDITORÍA más abajo
 * en este mismo archivo. Ver RoleAndPermissionSeeder para la jerarquía
 * administrador / administrador_sistema.
 *
 * Etapa 2: tablero de habitaciones.
 * Etapa 3: modal de asignación — reutiliza el MISMO componente
 * CheckinModal (resources/js/pages/checkins/checkinModal.tsx) que ya usa
 * rooms/status.tsx, así que este controlador tiene que darle exactamente
 * las mismas props que RoomController::status() (Guests/Schedules/
 * Operators/GroupAccounts/services) además de la habitación. Se duplican
 * esas consultas (son simples SELECTs, no lógica de negocio) en vez de
 * tocar RoomController -- ese controlador alimenta la pantalla principal
 * de habitaciones y no hay que arriesgar romperla por esto.
 */
class CocinaController extends Controller
{
    /**
     * Estados permitidos por el CHECK constraint de la tabla 'checkins' en
     * PostgreSQL (checkins_status_check). Usado por la auditoría (antes
     * "God Mode") para no violar el UPDATE crudo.
     */
    private const CHECKIN_STATUSES = ['activo', 'finalizado', 'transferido', 'cancelado'];

    /**
     * Habilita/deshabilita una habitación desde el tablero, con un solo
     * click (etapa 4 — extensión pedida después: la tarjeta se pinta por
     * `status`, no por `is_active`, y ningún código del sistema limpia
     * `status = 'INHABILITADO'` una vez puesto -- RoomController::
     * toggleStatus() (la ruta que ya existe para rooms/index.tsx) solo
     * toca `is_active`, así que habilitar ahí dejaba la tarjeta
     * "atascada" en gris para siempre. Este método SÍ resetea el status
     * a LIBRE cuando corresponde, sin tocar toggleStatus() (que otras
     * pantallas siguen usando tal cual, sin este efecto adicional).
     */
    public function toggleRoomActive(Room $room)
    {
        $enabling = !$room->is_active;

        $data = ['is_active' => $enabling];

        if ($enabling && $room->status === 'INHABILITADO') {
            $data['status'] = 'LIBRE';
        }

        $room->update($data);

        return back()->with(
            'success',
            $enabling
                ? "Habitación {$room->number} habilitada."
                : "Habitación {$room->number} deshabilitada.",
        );
    }

    /**
     * Cambio de estado MANUAL y directo, sin las validaciones normales de
     * negocio (mismo espíritu "God Mode" que DataAuditController): el
     * admin puede forzar cualquier habitación a cualquiera de los 6
     * estados reales de la tabla (mismo CHECK constraint de la BD). Se
     * mantiene `is_active` en sincronía para no reabrir el bug de arriba:
     * INHABILITADO siempre implica is_active=false, cualquier otro estado
     * implica is_active=true.
     */
    public function changeStatus(Request $request, Room $room)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:LIBRE,OCUPADO,RESERVADO,LIMPIEZA,MANTENIMIENTO,INHABILITADO',
        ]);

        $room->update([
            'status'    => $validated['status'],
            'is_active' => $validated['status'] !== 'INHABILITADO',
        ]);

        return back()->with(
            'success',
            "Habitación {$room->number} cambiada a {$validated['status']}.",
        );
    }

    // =========================================================
    // ETAPA 6 — GESTIÓN DE PAGOS POR HABITACIÓN
    // =========================================================
    //
    // La tabla es por ESTADÍA, no por pago suelto: cada check-in de esta
    // habitación es una fila-grupo con sus pagos (o un placeholder "—" si
    // no tiene ninguno). Así "Agregar pago" siempre sabe a qué estadía
    // pertenece el pago nuevo, y el paginado (10 estadías) tiene sentido
    // para "todas sus estancias" tal como lo pediste.
    //
    // A diferencia de DataAuditController::updatePayment() (que usa
    // DB::table()->update() a propósito, saltándose Eloquent para no
    // reinterpretar el dato crudo), acá SÍ pasamos por el modelo Payment:
    // queremos que dispare su LogsActivity automático (diff de qué
    // cambió) y además lo acompañamos con un log manual que guarda el
    // motivo -- las dos cosas quedan en el mismo activitylog.

    /**
     * Historial paginado de TODAS las estadías de esta habitación (pasadas
     * y presente) con sus pagos. JSON puro (no Inertia::render): el modal
     * lo pide por fetch al abrirse y al cambiar de página, sin navegar.
     */
    public function getRoomPayments(Room $room)
    {
        $checkins = Checkin::where('room_id', $room->id)
            ->with([
                'guest:id,full_name',
                'payments' => fn ($q) => $q->orderBy('payment_date')
                    ->with('operador:id,full_name,nickname'),
            ])
            ->orderByDesc('check_in_date')
            ->paginate(10);

        return response()->json($checkins);
    }

    /**
     * Agrega un pago nuevo a una estadía puntual de esta habitación (botón
     * "Agregar pago", disponible tanto en filas "—" como en estadías que
     * ya tienen pagos). No exige motivo: agregar no es una corrección de
     * algo ya registrado, es un movimiento nuevo -- el 'created' de
     * LogsActivity ya deja rastro de quién y cuándo.
     */
    public function storeRoomPayment(Request $request, Checkin $checkin)
    {
        $validated = $request->validate([
            'amount'       => 'required|numeric',
            'method'       => 'required|string|in:EFECTIVO,QR',
            'bank_name'    => 'nullable|string|max:50',
            'type'         => 'required|string|in:PAGO,ADELANTO,DEVOLUCION',
            'payment_date' => 'required|date',
            'operator_id'  => 'required|exists:users,id',
        ]);

        Payment::create([
            'checkin_id'  => $checkin->id,
            'operator_id' => $validated['operator_id'],
            'user_id'     => Auth::id(),
            'amount'      => $validated['amount'],
            'method'      => $validated['method'],
            'bank_name'   => $validated['bank_name'] ?? null,
            'type'        => $validated['type'],
            'payment_date' => $validated['payment_date'],
        ]);

        return response()->json(['success' => true, 'message' => 'Pago agregado correctamente.']);
    }

    /**
     * Corrige un pago existente. Sin motivo -- el diff automático de
     * Payment::getActivitylogOptions() (logOnlyDirty) ya deja registrado
     * qué cambió, quién y cuándo.
     */
    public function updateRoomPayment(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount'       => 'required|numeric',
            'method'       => 'required|string|in:EFECTIVO,QR',
            'bank_name'    => 'nullable|string|max:50',
            'type'         => 'required|string|in:PAGO,ADELANTO,DEVOLUCION',
            'payment_date' => 'required|date',
            'operator_id'  => 'required|exists:users,id',
        ]);

        $payment->update([
            'amount'       => $validated['amount'],
            'method'       => $validated['method'],
            'bank_name'    => $validated['bank_name'] ?? null,
            'type'         => $validated['type'],
            'payment_date' => $validated['payment_date'],
            'operator_id'  => $validated['operator_id'],
        ]);

        return response()->json(['success' => true, 'message' => "Pago #{$payment->id} corregido."]);
    }

    /**
     * Elimina un pago mal registrado. Sin motivo -- el evento 'deleted'
     * automático de LogsActivity ya guarda una copia completa del pago
     * (sus atributos "old") en el activitylog.
     */
    public function destroyRoomPayment(Payment $payment)
    {
        $payment->delete();

        return response()->json(['success' => true, 'message' => 'Pago eliminado.']);
    }

    // =========================================================
    // ETAPA 7 — TURNOS POR OPERADOR
    // =========================================================
    //
    // CashRegister YA ES el turno/sesión de caja (confirmado en la
    // exploración) -- no se crea ningún modelo nuevo. Reutiliza también
    // updateRoomPayment()/destroyRoomPayment() de la etapa 6 para
    // editar/borrar (son genéricos por Payment, no atados a una
    // habitación) -- por eso este apartado no define sus propios
    // endpoints de edición/borrado.

    /**
     * Página (no modal): listado de turnos con sus totales por método de
     * pago, para servir de arqueo por persona. Filtro opcional por rango
     * de fechas de apertura.
     */
    public function turnos(Request $request)
    {
        $query = CashRegister::with('user:id,full_name,nickname')
            ->withCount('payments')
            ->orderByDesc('opened_at');

        if ($request->filled('desde')) {
            $query->whereDate('opened_at', '>=', $request->input('desde'));
        }
        if ($request->filled('hasta')) {
            $query->whereDate('opened_at', '<=', $request->input('hasta'));
        }

        $turnos = $query->paginate(15)->through(function (CashRegister $cr) {
            $totalesPorMetodo = Payment::where('cash_register_id', $cr->id)
                ->selectRaw('method, SUM(amount) as total')
                ->groupBy('method')
                ->pluck('total', 'method');

            return [
                'id'               => $cr->id,
                'operator'         => $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                'status'           => $cr->status,
                'opened_at'        => $cr->opened_at,
                'closed_at'        => $cr->closed_at,
                'payments_count'   => $cr->payments_count,
                'totals_by_method' => $totalesPorMetodo,
                'total'            => (float) $totalesPorMetodo->sum(),
            ];
        });

        return Inertia::render('cocina/turnos', [
            'Turnos'    => $turnos,
            'filters'   => $request->only(['desde', 'hasta']),
            // Necesario para el selector "Pagado a" al editar un pago
            // (TurnoPaymentsModal reutiliza el mismo endpoint de la etapa 6).
            'Operators' => User::operadores()->get(['id', 'full_name', 'nickname']),
        ]);
    }

    /**
     * Pagos de UN turno puntual, paginado -- misma idea que
     * getRoomPayments() pero sin agrupar por estadía (acá interesa el
     * orden cronológico dentro de la sesión de caja, no por huésped).
     */
    public function getCashRegisterPayments(CashRegister $cashRegister)
    {
        $payments = Payment::where('cash_register_id', $cashRegister->id)
            ->with([
                'checkin.guest:id,full_name',
                'checkin.room:id,number',
                'operador:id,full_name,nickname',
            ])
            ->orderBy('payment_date')
            ->paginate(15);

        return response()->json($payments);
    }

    public function index()
    {
        return Inertia::render('cocina/index', [
            'Rooms'         => $this->getRooms(),
            'Guests'        => Guest::all(),
            'Schedules'     => Schedule::where('is_active', true)->get(),
            'Operators'     => User::operadores()->get(),
            'GroupAccounts' => $this->getGroupAccounts(),
            'services'      => $this->getServicesWithUsage(),
            // Necesaria para el selector de caja del editor de "Finalizar
            // estadía" (CheckinAuditModal), etapa de fusión con Auditoría.
            'AllCashRegisters' => $this->getAllCashRegistersOptions(),
        ]);
    }

    /**
     * Habitaciones con precio + tipo (necesarios para que CheckinModal
     * calcule tarifa/capacidad al asignar) y su check-in activo si tiene
     * (para pintar el huésped en la tarjeta del tablero). No incluye las
     * relaciones "pesadas" de RoomController::status() (reservas futuras,
     * pagos, acuerdos especiales) porque etapa 3 solo cubre asignar una
     * habitación LIBRE -- no las necesita todavía.
     */
    /**
     * guest.profile_status, companions y specialAgreement se agregan acá
     * (etapa 4 solo traía guest:id,full_name) para que el tablero pueda
     * replicar el mismo criterio de "faltan datos" que ya usa
     * rooms/status.tsx::getDisplayStatus() -- ver esa función en el
     * frontend, se porta tal cual, sin reinventarla.
     *
     * guest/companions van con TODAS sus columnas (sin restricción, igual
     * que RoomController::status()): este mismo checkin activo se reusa
     * como checkinToEdit del CheckinModal (botón "Editar" del tablero de
     * cocina), y ese formulario necesita carnet, nacionalidad, estado
     * civil, edad (birth_date), profesión y teléfono -- si se restringen
     * columnas acá, esos campos aparecen vacíos/con su valor por defecto
     * al editar aunque el huésped sí los tenga guardados.
     */
    private function getRooms()
    {
        // 'number' es VARCHAR (hay habitaciones "A".."M" además de la 1-50),
        // así que orderBy('number') de SQL las ordena alfabéticamente
        // (1, 10, 11, 12, ..., 2, 20, ...). sortBy(..., SORT_NATURAL) las
        // deja en el orden que el usuario espera ver en el tablero: 1, 2,
        // 3, ..., 50, A, B, C...
        return Room::with([
            'roomType:id,name,capacity',
            'price:id,amount,bathroom_type',
            'checkins' => fn ($q) => $q->where('status', 'activo')
                ->with([
                    'guest',
                    'companions',
                    'specialAgreement:id,type',
                ]),
        ])->get()
            ->sortBy('number', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();
    }

    /**
     * Mismo criterio que RoomController::status(): cuentas grupales
     * activas (no cerradas) para el selector de "Check-in Rápido".
     */
    private function getGroupAccounts()
    {
        return SpecialAgreement::groupAccounts()
            ->where('status', '!=', 'cerrado')
            ->orderBy('company_name')
            ->get(['id', 'type', 'company_name', 'origin'])
            ->map(fn ($a) => [
                'id'           => $a->id,
                'type'         => $a->type,
                'company_name' => $a->company_name,
                'origin'       => $a->origin,
                'balance'      => $a->balance,
            ]);
    }

    /**
     * Mismo cálculo de disponibilidad que RoomController::status(): cuánto
     * de cada servicio (ej. Garaje) ya está consumido por check-ins
     * activos, para que CheckinModal no ofrezca más cupo del que queda.
     */
    private function getServicesWithUsage()
    {
        return Service::all()->map(function (Service $service) {
            $service->quantity_used = (int) \DB::table('checkin_details')
                ->where('service_id', $service->id)
                ->whereIn('checkin_id', function ($q) {
                    $q->select('id')->from('checkins')->where('status', 'activo');
                })
                ->sum('quantity');

            return $service;
        });
    }

    // =========================================================
    // AUDITORÍA (ex "God Mode") — fusionada dentro de Cocina, mismo
    // gate por rol 'administrador_sistema'. Toda la lógica de abajo es
    // un traslado directo de DataAuditController (ya retirado): edición
    // cruda de check-ins, pagos, cajas y gastos sin las validaciones de
    // negocio normales, para corregir datos cuando los reportes no
    // cuadran. Los métodos de escritura usan DB::table()->update() a
    // propósito (saltan mutadores/Observers/LogsActivity) para escribir
    // el dato crudo exacto que el administrador digitó.
    // =========================================================

    private function getAllCashRegistersOptions()
    {
        return CashRegister::with('user')
            ->orderByDesc('opened_at')
            ->get()
            ->map(fn (CashRegister $cr) => [
                'id' => $cr->id,
                'label' => sprintf(
                    '#%d · %s · %s · %s',
                    $cr->id,
                    $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                    $cr->status,
                    optional($cr->opened_at)->format('d/m/Y H:i') ?? '—',
                ),
            ]);
    }

    public function auditoria()
    {
        return Inertia::render('cocina/auditoria', [
            'CashRegisters' => $this->getCashRegistersForAudit(),
            'ClosedCashRegisters' => $this->getClosedCashRegistersForAudit(),
            'Checkins' => $this->getCheckinsForAudit(),
            'Payments' => $this->getPaymentsForAudit(),
            'Expenses' => $this->getExpensesForAudit(),
            'Operators' => User::orderBy('full_name')->get(['id', 'full_name', 'nickname']),
            'AllCashRegisters' => $this->getAllCashRegistersOptions(),
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
     * Historial de turnos CERRADOS: identificados por ID de turno y
     * operador (no por fecha), con un resumen rápido de ingresos/gastos
     * para que el administrador pueda ver/reimprimir el cierre de
     * cualquier turno pasado desde `cash-registers/show`.
     */
    private function getClosedCashRegistersForAudit()
    {
        return CashRegister::with('user')
            ->withSum('payments as total_income', 'amount')
            ->withSum('expenses as total_expenses', 'amount')
            ->where('status', 'CERRADA')
            ->orderByDesc('closed_at')
            ->get()
            ->map(function (CashRegister $cr) {
                return [
                    'id' => $cr->id,
                    'user_name' => $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                    'opening_amount' => (float) $cr->opening_amount,
                    'total_income' => (float) ($cr->total_income ?? 0),
                    'total_expenses' => (float) ($cr->total_expenses ?? 0),
                    'opened_at' => optional($cr->opened_at)->toIso8601String(),
                    'closed_at' => optional($cr->closed_at)->toIso8601String(),
                ];
            });
    }

    /**
     * Sobrescribe una caja: fechas, monto de apertura y estado (permite
     * forzar el cierre de una caja abandonada).
     */
    public function updateCashRegisterAudit(Request $request, CashRegister $cashRegister)
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

        return redirect()->back()->with('success', 'Caja actualizada correctamente (Auditoría).');
    }

    /**
     * Todos los check-ins (activos, finalizados, transferidos o
     * cancelados), con sus pagos y detalles de consumo, para que el
     * administrador pueda ver y corregir cualquier estadía sin las
     * restricciones normales de estado.
     */
    private function getCheckinsForAudit()
    {
        return Checkin::with([
            'guest:id,full_name,identification_number',
            'room:id,number',
            'checkinOperator:id,full_name,nickname',
            'checkoutOperator:id,full_name,nickname',
            'user:id,full_name,nickname',
            'payments' => fn ($q) => $q->orderBy('payment_date', 'asc'),
            'checkinDetails.service:id,name',
        ])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Checkin $c) => $this->mapCheckinForAudit($c));
    }

    /**
     * Igual que un mapeo de getCheckinsForAudit(), pero para UN solo
     * checkin — usado por el botón "Finalizar estadía" del tablero de
     * Cocina (no carga todos los check-ins del sistema, solo el que se
     * va a editar).
     */
    public function getCheckinAuditData(Checkin $checkin)
    {
        $checkin->load([
            'guest:id,full_name,identification_number',
            'room:id,number',
            'checkinOperator:id,full_name,nickname',
            'checkoutOperator:id,full_name,nickname',
            'user:id,full_name,nickname',
            'payments' => fn ($q) => $q->orderBy('payment_date', 'asc'),
            'checkinDetails.service:id,name',
        ]);

        return response()->json($this->mapCheckinForAudit($checkin));
    }

    private function mapCheckinForAudit(Checkin $c): array
    {
        return [
            'id' => $c->id,
            'guest_name' => $c->guest->full_name ?? 'N/D',
            'room_number' => $c->room->number ?? 'N/D',
            'status' => $c->status,
            'check_in_date' => optional($c->check_in_date)->toIso8601String(),
            'actual_arrival_date' => optional($c->actual_arrival_date)->toIso8601String(),
            'check_out_date' => optional($c->check_out_date)->toIso8601String(),
            'duration_days' => $c->duration_days,
            'agreed_price' => (float) $c->agreed_price,
            'checkin_operator_id' => $c->checkin_operator_id,
            'checkin_operator_name' => $c->checkinOperator->full_name ?? $c->checkinOperator->nickname ?? null,
            'checkout_operator_id' => $c->checkout_operator_id,
            'checkout_operator_name' => $c->checkoutOperator->full_name ?? $c->checkoutOperator->nickname ?? null,
            'user_id' => $c->user_id,
            'user_name' => $c->user->full_name ?? $c->user->nickname ?? 'N/D',
            'payments' => $c->payments->map(fn (Payment $p) => [
                'id' => $p->id,
                'amount' => (float) $p->amount,
                'method' => $p->method,
                'type' => $p->type,
                'cash_register_id' => $p->cash_register_id,
                'payment_date' => optional($p->payment_date)->toIso8601String(),
            ])->values(),
            'checkin_details' => $c->checkinDetails->map(fn ($d) => [
                'id' => $d->id,
                'service_name' => $d->service->name ?? 'N/D',
                'quantity' => $d->quantity,
                'selling_price' => (float) $d->selling_price,
            ])->values(),
        ];
    }

    /**
     * Todos los pagos del sistema (ligados o no a un check-in), para
     * corregir monto, método, tipo, caja y operador sin tener que entrar
     * a cada estadía una por una.
     */
    private function getPaymentsForAudit()
    {
        return Payment::with([
            'checkin.guest:id,full_name',
            'checkin.room:id,number',
            // 🚀 AUDITORÍA DE PAGOS DE RESERVAS: un adelanto cobrado sobre
            // una reserva (antes del check-in) solo tiene reservation_id,
            // checkin_id queda NULL hasta que se confirma. Sin esto, el
            // huésped/habitación de esas filas se perdía silenciosamente.
            'reservation.guest:id,full_name',
            'reservation.details.room:id,number',
            'operador:id,full_name,nickname',
        ])
            ->orderByDesc('payment_date')
            ->get()
            ->map(function (Payment $p) {
                // Prioridad: check-in real > reserva pendiente > 'N/D'.
                $guestName = $p->checkin?->guest?->full_name
                    ?? ($p->reservation?->guest?->full_name
                        ? 'Reserva: ' . $p->reservation->guest->full_name
                        : null)
                    ?? 'N/D';

                $roomNumber = $p->checkin?->room?->number;
                if (!$roomNumber && $p->reservation) {
                    $roomNumbers = $p->reservation->details
                        ->pluck('room.number')
                        ->filter()
                        ->unique();
                    $roomNumber = $roomNumbers->isNotEmpty() ? $roomNumbers->implode(', ') : null;
                }
                $roomNumber = $roomNumber ?? 'N/D';

                return [
                    'id' => $p->id,
                    'checkin_id' => $p->checkin_id,
                    'reservation_id' => $p->reservation_id,
                    'guest_name' => $guestName,
                    'room_number' => $roomNumber,
                    'amount' => (float) $p->amount,
                    'method' => $p->method,
                    'type' => $p->type,
                    'cash_register_id' => $p->cash_register_id,
                    'operator_id' => $p->operator_id,
                    'operator_name' => $p->operador->full_name ?? $p->operador->nickname ?? null,
                    'payment_date' => optional($p->payment_date)->toIso8601String(),
                ];
            });
    }

    /**
     * Todos los gastos del sistema, para corregir descripción, monto,
     * caja, operador y fecha.
     */
    private function getExpensesForAudit()
    {
        return Expense::with([
            'user:id,full_name,nickname',
            'operador:id,full_name,nickname',
        ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Expense $e) {
                return [
                    'id' => $e->id,
                    'description' => $e->description,
                    'amount' => (float) $e->amount,
                    'cash_register_id' => $e->cash_register_id,
                    'operator_id' => $e->operator_id,
                    'operator_name' => $e->operador->full_name ?? $e->operador->nickname ?? null,
                    'user_name' => $e->user->full_name ?? $e->user->nickname ?? 'N/D',
                    'created_at' => optional($e->created_at)->toIso8601String(),
                ];
            });
    }

    /**
     * Sobrescribe un Check-in a nivel de fila (bypass total): fechas,
     * estado, precio por noche (ya calculado en el frontend a partir del
     * "Total a pagar" / noches de la Vista Previa), noches totales y el
     * operador responsable. No usa el modelo Eloquent para evitar el trait
     * AutoUpperCase, LogsActivity y cualquier mutador/observer que
     * reinterprete el dato.
     */
    public function updateCheckinAudit(Request $request, Checkin $checkin)
    {
        $validated = $request->validate([
            'check_in_date' => 'required|date',
            'check_out_date' => 'nullable|date',
            'status' => 'required|string|in:' . implode(',', self::CHECKIN_STATUSES),
            'agreed_price' => 'required|numeric|min:0',
            'duration_days' => 'required|integer|min:1',
            'checkin_operator_id' => 'nullable|exists:users,id',
            'checkout_operator_id' => 'nullable|exists:users,id',
        ]);

        // Capturamos el estado ANTES de sobrescribir: lo necesitamos para
        // saber si esta edición es la que recién finaliza la estadía (y por
        // lo tanto corresponde generar el recibo), o si ya estaba finalizada
        // y solo se está corrigiendo otro dato.
        $wasFinalizado = $checkin->status === 'finalizado';

        DB::table('checkins')->where('id', $checkin->id)->update([
            'check_in_date' => $validated['check_in_date'],
            'check_out_date' => $validated['check_out_date'],
            'status' => $validated['status'],
            'agreed_price' => $validated['agreed_price'],
            'duration_days' => $validated['duration_days'],
            'checkin_operator_id' => $validated['checkin_operator_id'],
            'checkout_operator_id' => $validated['checkout_operator_id'],
            'updated_at' => now(),
        ]);

        Log::warning('[COCINA · AUDITORÍA] Check-in sobrescrito manualmente', [
            'admin' => Auth::user()->nickname,
            'checkin_id' => $checkin->id,
            'payload' => $validated,
        ]);

        $reciboMensaje = '';
        if ($validated['status'] === 'finalizado' && !$wasFinalizado) {
            // Mismo destino que el checkout real de operador
            // (CheckinController::checkout()): la habitación pasa a
            // LIMPIEZA, no directo a LIBRE, para que quede reflejada en el
            // tablero de Cocina que la estadía ya terminó.
            Room::where('id', $checkin->room_id)->update(['status' => 'LIMPIEZA']);

            $recibo = $this->generateLocalReceiptIfMissing($checkin);
            if ($recibo) {
                $reciboMensaje = " Se generó el Recibo #{$recibo->invoice_number}.";
            }
        }

        return redirect()->back()->with(
            'success',
            "Check-in #{$checkin->id} sobrescrito correctamente (Auditoría).{$reciboMensaje}",
        );
    }

    /**
     * Genera el recibo interno (Invoice + InvoiceDetail) de un check-in que
     * la Auditoría acaba de marcar como 'finalizado', replicando el mismo
     * criterio de CheckinController::generateCheckoutReceipt() (mismo
     * control_code 'RECIBO-INTERNO', sin tocar el SIAT). Si el check-in ya
     * tenía un recibo/factura, no genera uno duplicado.
     */
    private function generateLocalReceiptIfMissing(Checkin $checkin): ?Invoice
    {
        if (Invoice::where('checkin_id', $checkin->id)->exists()) {
            return null;
        }

        $checkin->refresh()->load(['guest', 'room.price', 'checkinDetails.service', 'payments']);

        $diasACobrar = max(1, (int) $checkin->duration_days);
        $precioUnitario = (float) ($checkin->agreed_price ?? ($checkin->room->price->amount ?? 0));
        $totalHospedaje = $precioUnitario * $diasACobrar;
        $carriedBalance = (float) ($checkin->carried_balance ?? 0);

        $totalServicios = 0;
        foreach ($checkin->checkinDetails as $detalle) {
            $precioReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);
            $totalServicios += $detalle->quantity * $precioReal;
        }

        $lastInvoice = Invoice::orderBy('invoice_number', 'desc')->first();
        $nextInvoiceNumber = $lastInvoice ? $lastInvoice->invoice_number + 1 : 1;

        $lastPayment = $checkin->payments->last();
        $metodoFinal = $lastPayment ? substr($lastPayment->method, 0, 2) : 'EF';

        $recibo = Invoice::create([
            'invoice_number' => $nextInvoiceNumber,
            'checkin_id' => $checkin->id,
            'issue_date' => now()->toDateString(),
            'control_code' => 'RECIBO-INTERNO',
            'payment_method' => $metodoFinal,
            'user_id' => Auth::id() ?? 1,
            'issue_time' => now(),
            'status' => 'valid',
        ]);

        InvoiceDetail::create([
            'invoice_id' => $recibo->id,
            'service_id' => null,
            'description' => "Hospedaje Hab {$checkin->room->number}",
            'quantity' => $diasACobrar,
            'unit_price' => $precioUnitario,
            'cost' => $totalHospedaje + $carriedBalance,
        ]);

        foreach ($checkin->checkinDetails as $detalle) {
            $precioReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);
            InvoiceDetail::create([
                'invoice_id' => $recibo->id,
                'service_id' => $detalle->service_id,
                'description' => $detalle->service->name ?? 'Servicio adicional',
                'quantity' => $detalle->quantity,
                'unit_price' => $precioReal,
                'cost' => $detalle->quantity * $precioReal,
            ]);
        }

        Log::warning('[COCINA · AUDITORÍA] Recibo generado automáticamente al finalizar', [
            'admin' => Auth::user()->nickname,
            'checkin_id' => $checkin->id,
            'invoice_id' => $recibo->id,
        ]);

        return $recibo;
    }

    /**
     * Sobrescribe un pago a nivel de fila: monto, caja y (opcionalmente,
     * cuando viene del tab de Finanzas) método, tipo, fecha y operador.
     * Los campos opcionales solo se tocan si vienen en el request, para
     * no romper al editor de pagos embebido en el modal de Check-ins (que
     * solo envía amount + cash_register_id). Igual que updateCheckinAudit(),
     * sin pasar por el modelo Eloquent.
     */
    public function updatePaymentAudit(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'cash_register_id' => 'nullable|exists:cash_registers,id',
            'method' => 'nullable|string|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
            'type' => 'nullable|string|in:PAGO,ADELANTO,DEVOLUCION',
            'payment_date' => 'nullable|date',
            'operator_id' => 'nullable|exists:users,id',
        ]);

        $updateData = [
            'amount' => $validated['amount'],
            'cash_register_id' => $validated['cash_register_id'],
            'updated_at' => now(),
        ];

        if ($request->filled('method')) {
            $updateData['method'] = $validated['method'];
        }
        if ($request->filled('type')) {
            $updateData['type'] = $validated['type'];
        }
        if ($request->has('payment_date')) {
            $updateData['payment_date'] = $validated['payment_date'];
        }
        if ($request->has('operator_id')) {
            $updateData['operator_id'] = $validated['operator_id'];
        }

        DB::table('payments')->where('id', $payment->id)->update($updateData);

        Log::warning('[COCINA · AUDITORÍA] Pago sobrescrito manualmente', [
            'admin' => Auth::user()->nickname,
            'payment_id' => $payment->id,
            'checkin_id' => $payment->checkin_id,
            'payload' => $updateData,
        ]);

        return redirect()->back()->with('success', "Pago #{$payment->id} sobrescrito correctamente (Auditoría).");
    }

    /**
     * Sobrescribe un gasto a nivel de fila: descripción, monto, caja,
     * operador y fecha. cash_register_id NO es nullable a nivel de BD
     * (constraint NOT NULL en la tabla expenses), así que aquí sí es
     * obligatorio a diferencia de Payment.
     */
    public function updateExpenseAudit(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'cash_register_id' => 'required|exists:cash_registers,id',
            'operator_id' => 'nullable|exists:users,id',
            'created_at' => 'required|date',
        ]);

        DB::table('expenses')->where('id', $expense->id)->update([
            'description' => $validated['description'],
            'amount' => $validated['amount'],
            'cash_register_id' => $validated['cash_register_id'],
            'operator_id' => $validated['operator_id'],
            'created_at' => $validated['created_at'],
            'updated_at' => now(),
        ]);

        Log::warning('[COCINA · AUDITORÍA] Gasto sobrescrito manualmente', [
            'admin' => Auth::user()->nickname,
            'expense_id' => $expense->id,
            'payload' => $validated,
        ]);

        return redirect()->back()->with('success', "Gasto #{$expense->id} sobrescrito correctamente (Auditoría).");
    }
}
