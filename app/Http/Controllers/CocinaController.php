<?php

namespace App\Http\Controllers;

use App\Models\CashRegister;
use App\Models\Checkin;
use App\Models\Guest;
use App\Models\Payment;
use App\Models\Room;
use App\Models\Schedule;
use App\Models\Service;
use App\Models\SpecialAgreement;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Panel "Cocina": centro de mando visual único, exclusivo del rol
 * 'administrador_sistema' (Spatie) — protegido por
 * ->middleware('role:administrador_sistema') en routes/web.php, NO por el
 * 'god_mode' de nickname que sigue usando el panel viejo
 * (DataAuditController). Ver RoleAndPermissionSeeder para la jerarquía
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
     */
    private function getRooms()
    {
        return Room::with([
            'roomType:id,name,capacity',
            'price:id,amount,bathroom_type',
            'checkins' => fn ($q) => $q->where('status', 'activo')
                ->with([
                    'guest:id,full_name,profile_status',
                    'companions:id,profile_status',
                    'specialAgreement:id,type',
                ]),
        ])->orderBy('number')->get();
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
}
