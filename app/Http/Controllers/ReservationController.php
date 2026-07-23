<?php

namespace App\Http\Controllers;

use App\Models\Reservation;
use App\Models\ReservationDetail;
use App\Models\Guest;
use App\Models\Room;
use App\Models\Payment;
use App\Models\Checkin;
use App\Models\User;
use App\Traits\RequiresOpenShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class ReservationController extends Controller
{
    use RequiresOpenShift;


    public function index()
    {
        // 1. Obtenemos TODAS las reservas con toda su información relacionada
        $allReservations = Reservation::with([
            'guest',
            'details.room.roomType',
            'payments',
            'specialAgreement'
        ])->latest()->get();

        return Inertia::render('reservations/index', [

            // MANTENEMOS TUS NOMBRES ORIGINALES INTACTOS:

            // 1. Con "R" mayúscula (recibe todas las reservas)
            'Reservations' => $allReservations,

            // 2. Con "G" mayúscula
            'Guests' => Guest::all(),

            // 3. Con "R" mayúscula y tu filtro original de estado intacto
            'Rooms' => Room::with(['roomType', 'price'])
                ->whereIn('status', ['LIBRE', 'RESERVADO'])
                ->get(),

            // 4. Con "r" minúscula (antes solo recibía las pendientes, AHORA recibe todas)
            'reservations' => $allReservations,

            // Operadores reales (excluye 'recepcion'/'sistema_web') para el
            // OperatorSelector del adelanto en el modal de reservas.
            'Operators' => User::operadores()->get(['id', 'full_name', 'nickname']),
        ]);
    }

    public function store(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('=== INICIANDO CREACIÓN DE RESERVA ===');

        try {
            $validatedData = $request->validate([
                'is_new_guest' => 'boolean',
                'guest_id' => 'required_if:is_new_guest,false',
                'new_guest_name' => 'required_if:is_new_guest,true',
                'guest_count' => 'required|integer|min:1',
                'arrival_date' => 'required|date|after_or_equal:today',
                'duration_days' => 'required|integer|min:1',

                // 🚀 REDISEÑO: payment_type ya NO se guarda en la reserva
                // (la reserva es solo intención, sin precio ni método
                // fijado) — sigue existiendo en el request porque
                // determina el 'method' del Payment del adelanto, si lo
                // hay. Por eso pasa a ser condicional, igual que
                // operator_id: solo obligatorio si REALMENTE hay dinero
                // entrando.
                'payment_type' => 'nullable|string|in:EFECTIVO,QR',
                'qr_bank' => 'nullable|string',
                'advance_payment' => 'nullable|numeric|min:0', // Aseguramos la validación del adelanto
                // Terminal Compartida: quién recibe el adelanto. Se exige
                // manualmente más abajo, SOLO si REALMENTE hay dinero
                // entrando (mismo criterio que checkin/checkout/gastos) —
                // required_if no soporta comparaciones ">" contra otro campo.
                'operator_id' => 'nullable|exists:users,id',

                // 🚀 REDISEÑO (decisión A): la reserva NO crea ni referencia
                // ninguna Cuenta Grupal real — eso se decide después, en el
                // checkin. "type" es solo una etiqueta de intención
                // ('normal' por defecto).
                'type' => 'nullable|string|in:normal,estandar,corporativo,delegacion',
                // Nombre de la empresa/delegación (special_agreements.company_name).
                // Solo tiene sentido si type es corporativo o delegacion; se
                // ignora en el resto de los casos.
                'company_name' => 'nullable|string|max:255',

                // 🚀 REDISEÑO: un detalle es solo "quiero una habitación" —
                // ni precio ni tipo/baño solicitado se guardan ya en la
                // reserva. room_id se llena recién al confirmar.
                'details' => 'required|array|min:1',
                'details.*.room_id' => 'nullable',
            ], [
                'arrival_date.after_or_equal' => 'No se aceptan fechas anteriores a la fecha de hoy.',
                'arrival_date.required' => 'Debe indicar la fecha de llegada.',
                'arrival_date.date' => 'La fecha de llegada no es válida.',
                'duration_days.required' => 'Debe indicar la cantidad de noches.',
                'duration_days.min' => 'La estadía debe ser de al menos 1 noche.',
                'details.required' => 'Debe asignar al menos una habitación a la reserva.',
                'details.min' => 'Debe asignar al menos una habitación a la reserva.',
                'guest_id.required_if' => 'Debe seleccionar un huésped.',
                'new_guest_name.required_if' => 'Debe ingresar el nombre del nuevo huésped.',
                'guest_count.min' => 'Debe haber al menos 1 huésped.',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('❌ Falló validación:', $e->errors());
            return redirect()->back()->withErrors($e->errors());
        }

        // Terminal Compartida: si hay adelanto, es obligatorio saber quién
        // lo recibe (el avatar elegido en el OperatorSelector), NO Auth::id()
        // (siempre la cuenta genérica 'recepcion'), y con qué método.
        if (($validatedData['advance_payment'] ?? 0) > 0) {
            if (empty($validatedData['operator_id'])) {
                return redirect()->back()->withErrors([
                    'operator_id' => 'Seleccione quién está recibiendo el adelanto.',
                ]);
            }
            if (empty($validatedData['payment_type'])) {
                return redirect()->back()->withErrors([
                    'payment_type' => 'Debe seleccionar un método de pago.',
                ]);
            }
        }

        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($request) {
                $guestId = $request->guest_id;

                if ($request->is_new_guest) {
                    $newGuest = \App\Models\Guest::create([
                        'full_name' => strtoupper($request->new_guest_name),
                        // 🐛 guests.identification_number tiene UNIQUE: '' no
                        // es lo mismo que NULL para Postgres, así que dos
                        // huéspedes nuevos sin CI (huésped/grupo nuevo, solo
                        // con nombre) chocaban contra el índice. filled()
                        // trata '' igual que ausente -> NULL real.
                        'identification_number' => $request->filled('new_guest_ci')
                            ? $request->new_guest_ci
                            : null,
                        'nationality' => 'BOLIVIA', // Adaptado a mayúsculas como en el resto de tu sistema
                        'profile_status' => 'INCOMPLETE',
                    ]);
                    $guestId = $newGuest->id;
                }

                // =========================================================
                // 🆕 LÓGICA DE ACUERDO ESPECIAL (SPECIAL AGREEMENT)
                // =========================================================
                // 🚀 REDISEÑO (decisión A, aclarada): la reserva NO ofrece
                // ningún selector de convenio ni recibe special_agreement_id
                // del frontend — el usuario solo marca "type" y, si
                // corresponde, el nombre de la empresa/delegación. Como el
                // campo special_agreement_id YA existe (FK nullable), no
                // hace falta columna nueva: si el type es corporativo o
                // delegación, se crea automáticamente un SpecialAgreement
                // (una sola consulta) que anota ese type + company_name —
                // sin selector, sin reutilizar ninguno existente. La Cuenta
                // Grupal "real" (saldo, etc.) se arma después, en el checkin.
                $typeRequest = $request->input('type');
                $specialAgreementId = null;

                if (in_array($typeRequest, ['corporativo', 'delegacion'])) {
                    $agreement = \App\Models\SpecialAgreement::create([
                        'type' => $typeRequest,
                        'company_name' => $request->filled('company_name')
                            ? $request->input('company_name')
                            : null,
                        'agreed_price' => 0,
                        'payment_frequency_days' => 0,
                    ]);

                    $specialAgreementId = $agreement->id;
                }

                // 🚀 REDISEÑO: mismo operator_id se persiste en la reserva Y
                // en el Payment del adelanto más abajo — un solo valor,
                // nunca dos capturas independientes que puedan
                // desincronizarse.
                $operatorId = $request->filled('operator_id') ? (int) $request->operator_id : null;

                // =========================================================
                // CREACIÓN DE RESERVA
                // =========================================================
                $reservation = \App\Models\Reservation::create([
                    'user_id' => \Illuminate\Support\Facades\Auth::id(),
                    'operator_id' => $operatorId,
                    'guest_id' => $guestId,
                    'guest_count' => $request->guest_count,
                    'arrival_date' => $request->arrival_date,
                    'duration_days' => $request->duration_days,

                    // Conectamos el acuerdo en lugar de usar los booleanos
                    'special_agreement_id' => $specialAgreementId,

                    'status' => 'pendiente',
                ]);

                if (!empty($request->details)) {
                    // 🔒 PREVENCIÓN DE OVERBOOKING POR CONCURRENCIA (RNF-04 / Escenario 3, Tabla 4.23)
                    //
                    // Cuando se asigna una habitación específica al crear la reserva,
                    // existe una carrera potencial entre dos recepcionistas (o entre
                    // recepción y el portal web) reservando la misma habitación para
                    // fechas que se solapen. La validación de disponibilidad previa
                    // (checkAvailability) NO toma lock; entre esa consulta y este INSERT
                    // otra petición puede haberse colado.
                    //
                    // Solución: por cada detalle con habitación específica,
                    //   (1) tomamos lock pesimista sobre la fila de rooms,
                    //   (2) revalidamos cruces de reservas DENTRO del lock,
                    //   (3) recién entonces creamos el detalle.
                    //
                    // Esto cierra el Escenario 3 de la Tabla 4.23: "El sistema impide
                    // el overbooking mediante el control transaccional de PostgreSQL".
                    $arrivalDate   = $request->arrival_date;
                    $durationDays  = (int) $request->duration_days;
                    $departureDate = date('Y-m-d', strtotime("{$arrivalDate} +{$durationDays} days"));

                    foreach ($request->details as $detail) {
                        $roomId = $detail['room_id'] ?? null;

                        if ($roomId) {
                            // (1) Lock pesimista sobre la habitación
                            $room = \App\Models\Room::where('id', $roomId)->lockForUpdate()->first();

                            if (!$room) {
                                throw new \RuntimeException("La habitación #{$roomId} ya no existe.");
                            }

                            // (2) Revalidar cruces de fecha DENTRO del lock
                            $conflicto = \App\Models\ReservationDetail::where('room_id', $roomId)
                                ->whereHas('reservation', function ($q) use ($arrivalDate, $departureDate) {
                                    $q->where('arrival_date', '<', $departureDate)
                                        ->whereRaw("arrival_date + (duration_days * INTERVAL '1 day') > ?", [$arrivalDate])
                                        ->whereIn('status', ['pendiente', 'confirmada']);
                                })
                                ->exists();

                            if ($conflicto) {
                                throw new \RuntimeException(
                                    "La habitación #{$room->number} ya fue reservada para las fechas seleccionadas."
                                );
                            }
                        }

                        // (3) Insertar el detalle (con o sin habitación específica)
                        \App\Models\ReservationDetail::create([
                            'reservation_id' => $reservation->id,
                            'room_id' => $roomId,
                        ]);

                        if ($roomId) {
                            \App\Models\Room::where('id', $roomId)->update(['status' => 'RESERVADO']);
                        }
                    }
                }

                // =========================================================
                // --- PAGOS (MODIFICADO PARA MÓDULO 1) ---
                // =========================================================
                if ($request->advance_payment > 0) {
                    // Apertura silenciosa: si el operador elegido (avatar
                    // del OperatorSelector) no tiene turno abierto, se le
                    // crea uno automáticamente aquí mismo. NO Auth::id()
                    // (siempre la cuenta genérica 'recepcion' bajo Terminal
                    // Compartida). $operatorId ya se capturó arriba, junto
                    // con la creación de la reserva.
                    $cajaAbierta = $this->findOpenShift($operatorId);

                    // 2. Guardar el pago relacionándolo con la caja y la reserva
                    \App\Models\Payment::create([
                        'reservation_id' => $reservation->id,
                        'user_id' => \Illuminate\Support\Facades\Auth::id(),
                        'operator_id' => $operatorId,
                        'cash_register_id' => $cajaAbierta->id, // Conexión a la caja para auditoría
                        'amount' => $request->advance_payment,
                        'method' => $request->payment_type,
                        'bank_name' => ($request->payment_type === 'EFECTIVO') ? null : $request->qr_bank,
                        'type' => 'ADELANTO', // Estandarizado a 'ADELANTO' según Módulo 1
                        'payment_date' => now(), // Fecha real exigida
                        // 'description' => 'ADELANTO RESERVA #' . $reservation->id // (Opcional si lo añadiste al modelo Payment)
                    ]);
                }
            });

            return redirect()->back()->with('success', 'Reserva registrada correctamente');
        } catch (\Illuminate\Database\QueryException $e) {
            // Error de base de datos: NO mostramos el SQL al usuario, solo un mensaje interno.
            \Illuminate\Support\Facades\Log::error("❌ Error SQL en reserva: " . $e->getMessage());
            return redirect()->back()->withErrors([
                'error' => 'Ocurrió un error interno al guardar la reserva. Intente nuevamente o contacte al administrador.'
            ]);
        } catch (\Exception $e) {
            // Errores de negocio (ej. habitación ya reservada): estos SÍ son útiles para el usuario.
            \Illuminate\Support\Facades\Log::error("❌ Error en reserva: " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function update(Request $request, Reservation $reservation)
    {
        $newStatus = $request->status;
        Log::info("=== ACTUALIZANDO RESERVA {$reservation->id} ===");

        try {
            $checkinIds = [];

            DB::transaction(function () use ($request, $reservation, $newStatus, &$checkinIds) {
                $statusUpper = $newStatus ? strtoupper($newStatus) : strtoupper($reservation->status);

                // --- 1. SI CANCELAN LA RESERVA ---
                if ($statusUpper === 'CANCELADO' || $statusUpper === 'CANCELADA') {
                    // 🔒 CANDADO DE IDEMPOTENCIA: $statusUpper viene del status
                    // DESEADO en el request, no del estado ANTERIOR real de la
                    // reserva — hay que leer $reservation->status ANTES de
                    // tocarlo con el ->update() de abajo. Sin este candado,
                    // volver a pegarle a este endpoint sobre una reserva que
                    // YA está 'cancelado' (doble click, reintento de red)
                    // generaría una SEGUNDA tanda de DEVOLUCION y devolvería
                    // el adelanto dos veces.
                    $yaEstabaCancelada = $reservation->status === 'cancelado';

                    if (!$yaEstabaCancelada) {
                        // Devolución de adelantos: por cada Payment 'ADELANTO'
                        // de esta reserva se crea un Payment 'DEVOLUCION'
                        // equivalente, atribuido al operador/método que ELIGE
                        // quien cancela (no tiene que coincidir con el
                        // adelanto original). Mismo signo que
                        // CheckinController::refund() (-abs()).
                        $adelantos = Payment::where('reservation_id', $reservation->id)
                            ->where('type', 'ADELANTO')
                            ->get();

                        // Defensa adicional: si por algún motivo ya existe una
                        // DEVOLUCION para esta reserva, no duplicar.
                        $yaTieneDevolucion = Payment::where('reservation_id', $reservation->id)
                            ->where('type', 'DEVOLUCION')
                            ->exists();

                        if ($adelantos->isNotEmpty() && !$yaTieneDevolucion) {
                            $operatorId = $request->input('operator_id');
                            $metodoDevolucion = strtoupper((string) $request->input('refund_method', ''));
                            $bancoDevolucion = $request->input('refund_bank_name');

                            if (empty($operatorId) || !in_array($metodoDevolucion, ['EFECTIVO', 'QR'], true)) {
                                throw new \RuntimeException('Debe seleccionar un operador y el método de devolución del adelanto para cancelar esta reserva.');
                            }

                            // Apertura silenciosa (mismo patrón que el
                            // adelanto original y que refund()): NO
                            // Auth::id() (Terminal Compartida).
                            $cajaAbierta = $this->findOpenShift((int) $operatorId);

                            foreach ($adelantos as $adelanto) {
                                Payment::create([
                                    'reservation_id'   => $reservation->id,
                                    'user_id'          => Auth::id(),
                                    'operator_id'      => $operatorId,
                                    'cash_register_id' => $cajaAbierta->id,
                                    'amount'           => -abs((float) $adelanto->amount),
                                    'method'           => $metodoDevolucion,
                                    'bank_name'        => $metodoDevolucion === 'EFECTIVO' ? null : $bancoDevolucion,
                                    'description'      => 'DEVOLUCIÓN ADELANTO RESERVA #' . $reservation->id,
                                    'type'             => 'DEVOLUCION',
                                    'payment_date'     => now(),
                                ]);
                            }
                        }
                    }

                    $reservation->update([
                        'status' => 'cancelado',
                        'cancellation_date' => now() // ✅ MÓDULO 2: Registra la fecha y hora exacta
                    ]);
                    foreach ($reservation->details as $detail) {
                        if ($detail->room_id) {
                            Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                        }
                    }

                    // Cierre del convenio (SpecialAgreement) asociado, si lo
                    // hay: evita que quede una cuenta "activa" sin ningún
                    // uso real detrás de una reserva cancelada. NO se cierra
                    // si (a) el convenio ya tiene Checkins asociados —
                    // significa que la reserva llegó a confirmarse y hay
                    // consumo real detrás, cerrar sería destructivo — o (b)
                    // está ligado a otra reserva todavía viva (defensivo:
                    // hoy store()/update() siempre crean un convenio propio
                    // por reserva, nunca comparten uno, pero no cuesta nada
                    // cubrir el caso).
                    if ($reservation->special_agreement_id) {
                        $agreement = $reservation->specialAgreement;

                        if ($agreement && $agreement->status !== 'cerrado') {
                            $tieneCheckins = $agreement->checkins()->exists();
                            $tieneOtraReservaViva = $agreement->reservations()
                                ->where('id', '!=', $reservation->id)
                                ->whereIn('status', ['pendiente', 'confirmada'])
                                ->exists();

                            if (!$tieneCheckins && !$tieneOtraReservaViva) {
                                $agreement->update([
                                    'status' => 'cerrado',
                                    'closed_at' => now(),
                                ]);
                            }
                        }
                    }
                }

                // --- 2. SI CONFIRMAN LLEGADA (CHECK-IN) ---
                elseif ($statusUpper === 'CONFIRMADO' || $statusUpper === 'CONFIRMADA') {

                    // 🚀 REDISEÑO: "asignar habitación" y "confirmar" se
                    // fusionan en un solo paso (antes eran dos acciones
                    // separadas: ReservationController::assignRooms(),
                    // ahora eliminado, y esta rama). El frontend manda,
                    // junto con el cambio de estado, un array
                    // `assignments` con la habitación física de cada
                    // detalle -- SIN precio: la reserva ya no designa
                    // precio en ningún momento, el Checkin nace con
                    // agreed_price=0 y se completa después al editar la
                    // estadía (CheckinController::update()), que es donde
                    // se ve si el adelanto cubre o no. room_id se guarda en
                    // el detalle solo como puente/historial.
                    $assignments = $request->input('assignments', []);

                    if (empty($assignments)) {
                        throw new \Exception('Debe asignar habitación a cada detalle antes de confirmar.');
                    }

                    foreach ($assignments as $assignment) {
                        $detailId = $assignment['detail_id'] ?? null;
                        $roomId = $assignment['room_id'] ?? null;

                        if (!$detailId || !$roomId) {
                            throw new \Exception('Cada asignación debe incluir detalle y habitación.');
                        }

                        $detail = $reservation->details->firstWhere('id', (int) $detailId);
                        if (!$detail) {
                            throw new \Exception("El detalle #{$detailId} no pertenece a esta reserva.");
                        }

                        $detail->update(['room_id' => $roomId]);
                    }

                    $reservation->unsetRelation('details');

                    // 🛑 VALIDACIÓN PREVIA: ninguna habitación de la reserva puede tener
                    // ya un check-in activo de otro huésped. Si alguna lo tiene, abortamos
                    // TODA la confirmación (no se crea ningún check-in) y avisamos cuál falta reasignar.
                    $habitacionesOcupadas = [];
                    foreach ($reservation->details as $detail) {
                        if (!$detail->room_id) continue;

                        $yaOcupada = Checkin::where('room_id', $detail->room_id)
                            ->where('status', 'activo')
                            ->exists();

                        if ($yaOcupada) {
                            $room = Room::find($detail->room_id);
                            $habitacionesOcupadas[] = $room->number ?? "ID {$detail->room_id}";
                        }
                    }

                    if (!empty($habitacionesOcupadas)) {
                        Log::warning("⛔ Confirmación bloqueada para Reserva #{$reservation->id}. Habitaciones ya ocupadas: " . implode(', ', $habitacionesOcupadas));

                        throw new \Exception(
                            'No se puede confirmar la reserva: la(s) habitación(es) ' .
                                implode(', ', $habitacionesOcupadas) .
                                ' ya están ocupadas por otro huésped. Asigne otra habitación disponible antes de confirmar.'
                        );
                    }

                    $reservation->update(['status' => 'confirmada']);
                    $primerCheckinId = null;
                    $checkinIdPorDetailId = [];
                    Log::info("✅ Reserva confirmada. Creando check-ins para cada habitación asignada... #{$reservation->id}");

                    foreach ($reservation->details as $index => $detail) {
                        if (!$detail->room_id) continue;

                        $notaAsignacion = 'RESERVA #' . $reservation->id . ' - RESERVADO POR: ' . $reservation->guest->full_name;

                        if ($index > 0) {
                            $notaAsignacion .= ' (HABITACIÓN ADICIONAL)';
                        }

                        // ⚠️ CAMBIO CRUCIAL: El checkin hereda el special_agreement_id de la reserva
                        $checkin = Checkin::create([
                            'guest_id' => $reservation->guest_id,
                            'room_id'  => $detail->room_id,
                            'user_id'  => Auth::id() ?? 1,
                            'check_in_date' => $reservation->arrival_date ?? now(),
                            'actual_arrival_date' => now(),
                            'duration_days' => $reservation->duration_days ?? 1,

                            'origin' => null,
                            'status' => 'activo',
                            'is_temporary' => true,
                            'notes' => $notaAsignacion,
                            // 🚀 REDISEÑO: la reserva ya no designa precio en
                            // ningún momento -- nace en 0 y se completa
                            // después al editar la estadía
                            // (CheckinController::update()), que es donde se
                            // ve si el adelanto ya recibido cubre o no.
                            'agreed_price' => 0,
                            // Enlazar el acuerdo financiero y omitir la columna vieja 'agreed_price'
                            'special_agreement_id' => $reservation->special_agreement_id,
                        ]);

                        Log::info("Check-in Temporal creado (ID: {$checkin->id}) para la Habitación ID: {$detail->room_id}.");
                        $checkinIds[] = $checkin->id;
                        $checkinIdPorDetailId[$detail->id] = $checkin->id;
                        if ($index === 0) {
                            $primerCheckinId = $checkin->id;
                        }

                        Room::where('id', $detail->room_id)->update(['status' => 'OCUPADO']);
                    }

                    $pagos = Payment::where('reservation_id', $reservation->id)->get();

                    // A qué Checkin se le atribuye el adelanto ya cobrado:
                    // el que eligió el recepcionista (advance_detail_id,
                    // solo tiene sentido con 2+ habitaciones en una reserva
                    // normal -- en corporativo/delegación esto no aplica,
                    // ese dinero se sigue viendo a nivel de special_agreement)
                    // o el primero si no vino nada (caso de 1 sola habitación).
                    $advanceDetailId = $request->input('advance_detail_id');
                    $checkinIdParaAdelanto = ($advanceDetailId && isset($checkinIdPorDetailId[(int) $advanceDetailId]))
                        ? $checkinIdPorDetailId[(int) $advanceDetailId]
                        : $primerCheckinId;

                    if ($checkinIdParaAdelanto && $pagos->isNotEmpty()) {
                        foreach ($pagos as $pago) {
                            $pago->update([
                                'checkin_id'     => $checkinIdParaAdelanto,
                                'reservation_id' => null,
                            ]);
                        }

                        $totalPagos = $pagos->sum('amount');

                        Log::info("Adelanto de Bs {$totalPagos} transferido al Check-in ID: {$checkinIdParaAdelanto}.");
                    }
                }

                // --- 3. SI SOLO ESTÁN EDITANDO DATOS DE LA RESERVA (FASE 1) ---
                else {
                    // Evaluamos los cambios en el trato especial
                    $typeRequest = $request->input('type');
                    $isSpecialGroupNow = $request->boolean('is_corporate') || $request->boolean('is_delegation') || in_array($typeRequest, ['corporativo', 'delegacion']);
                    $tipoTratoNuevo = $typeRequest ?? ($request->boolean('is_delegation') ? 'delegacion' : 'corporativo');
                    $frecuenciaDias = (int) $request->input('corporate_days', 0);
                    $agreedPrice = $request->input('agreed_price', 0);
                    $companyName = $request->filled('company_name')
                        ? $request->input('company_name')
                        : null;

                    $hadSpecialAgreement = !is_null($reservation->special_agreement_id);

                    if (!$hadSpecialAgreement && $isSpecialGroupNow) {
                        // De Estandar a Especial
                        $agreement = \App\Models\SpecialAgreement::create([
                            'type' => $tipoTratoNuevo,
                            'company_name' => $companyName,
                            'agreed_price' => $agreedPrice,
                            'payment_frequency_days' => $frecuenciaDias,
                        ]);
                        $reservation->special_agreement_id = $agreement->id;
                    } elseif ($hadSpecialAgreement && !$isSpecialGroupNow) {
                        // De Especial a Estandar (Pierde el privilegio)
                        $oldAgreementId = $reservation->special_agreement_id;
                        $reservation->special_agreement_id = null;
                        \App\Models\SpecialAgreement::where('id', $oldAgreementId)->delete();
                    } elseif ($hadSpecialAgreement && $isSpecialGroupNow) {
                        // Sigue siendo Especial, actualizamos datos por si cambiaron el precio en la edicion
                        $reservation->specialAgreement->update([
                            'type' => $tipoTratoNuevo,
                            'company_name' => $companyName,
                            'agreed_price' => $agreedPrice,
                            'payment_frequency_days' => $frecuenciaDias,
                        ]);
                    }

                    // Actualizamos los datos base de la reserva omitiendo is_corporate/is_delegation
                    $reservation->update([
                        'arrival_date' => $request->arrival_date ?? $reservation->arrival_date,
                        'duration_days' => $request->duration_days ?? $reservation->duration_days,
                        'guest_count' => $request->guest_count ?? $reservation->guest_count,
                        'advance_payment' => $request->advance_payment ?? $reservation->advance_payment,
                        'special_agreement_id' => $reservation->special_agreement_id,
                        'status' => 'pendiente' // Forzamos pendiente porque se acaba de editar
                    ]);

                    // Sincronizamos las Habitaciones (Detalles)
                    if ($request->has('details')) {
                        $detailIdsToKeep = [];

                        foreach ($request->details as $detailData) {
                            if (isset($detailData['id'])) {
                                // A. Actualizar cuarto existente
                                $detail = ReservationDetail::find($detailData['id']);
                                if ($detail) {
                                    $detail->update([
                                        'room_id' => $detailData['room_id'] ?? null,
                                    ]);
                                    $detailIdsToKeep[] = $detail->id;
                                }
                            } else {
                                // B. Insertar nuevo cuarto a la reserva
                                $newDetail = ReservationDetail::create([
                                    'reservation_id' => $reservation->id,
                                    'room_id' => $detailData['room_id'] ?? null,
                                ]);
                                $detailIdsToKeep[] = $newDetail->id;

                                if (isset($detailData['room_id'])) {
                                    Room::where('id', $detailData['room_id'])->update(['status' => 'RESERVADO']);
                                }
                            }
                        }

                        // C. Borrar los cuartos que el usuario eliminó en la interfaz (Trash2)
                        $detailsToDelete = ReservationDetail::where('reservation_id', $reservation->id)
                            ->whereNotIn('id', $detailIdsToKeep)
                            ->get();

                        foreach ($detailsToDelete as $det) {
                            if ($det->room_id) {
                                Room::where('id', $det->room_id)->update(['status' => 'LIBRE']);
                            }
                            $det->delete();
                        }
                    }
                }
            });

            // Si fue confirmada, redirigir a status de habitaciones
            if ($newStatus && (strtoupper($newStatus) === 'CONFIRMADO' || strtoupper($newStatus) === 'CONFIRMADA')) {
                return redirect()->route('rooms.status')
                    ->with('success', 'Llegada confirmada. Por favor, complete los datos de las habitaciones.')
                    ->with('auto_open_checkins', $checkinIds);
            }

            return redirect()->back()->with('success', 'Reserva actualizada y sincronizada correctamente.');
        } catch (\Exception $e) {
            Log::error("❌ ERROR ACTUALIZANDO RESERVA: " . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }

    public function destroy(Reservation $reservation)
    {
        try {
            DB::transaction(function () use ($reservation) {
                foreach ($reservation->details as $detail) {
                    if ($detail->room_id) {
                        Room::where('id', $detail->room_id)->update(['status' => 'LIBRE']);
                    }
                }
                $reservation->delete();
            });
            return redirect()->back()->with('success', 'Reserva eliminada.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error: ' . $e->getMessage()]);
        }
    }

    /**
     * "Asignar Habitación" (Tabla 1 -> Tabla 2 del matchmaking) — SOLO
     * bloquea habitaciones físicas para esta reserva, sin pedir precio
     * ni crear ningún Checkin (eso es "Confirmar Reserva/Check-in",
     * ver update() rama CONFIRMADO). status se queda en 'pendiente'.
     *
     * Recibe una lista plana de room_id (un id por cada grupo de
     * personas que el recepcionista armó en el matchmaking — cuántas
     * personas hay en cada grupo es una decisión de la pantalla, no se
     * persiste: la cantidad total ya vive en reservations.guest_count,
     * y "cuántas habitaciones" es simplemente cuántas filas de
     * reservation_details terminan existiendo).
     *
     * Reemplaza TODOS los reservation_details existentes por uno nuevo
     * por cada room_id recibido — libera las habitaciones que ya no se
     * usan y bloquea ('RESERVADO') las nuevas.
     */
    public function assignRooms(Request $request, Reservation $reservation)
    {
        $validated = $request->validate([
            'room_ids' => 'required|array|min:1',
            'room_ids.*' => 'required|distinct|exists:rooms,id',
        ], [
            'room_ids.required' => 'Debe asignar al menos una habitación.',
            'room_ids.*.distinct' => 'No puede asignar la misma habitación dos veces.',
        ]);

        try {
            DB::transaction(function () use ($validated, $reservation) {
                $roomIds = $validated['room_ids'];

                // (1) Lock pesimista + validar que ninguna esté ocupada por
                // un check-in activo de otro huésped ahora mismo.
                foreach ($roomIds as $roomId) {
                    $room = Room::where('id', $roomId)->lockForUpdate()->first();
                    if (!$room) {
                        throw new \RuntimeException("La habitación #{$roomId} ya no existe.");
                    }

                    $ocupada = Checkin::where('room_id', $roomId)
                        ->where('status', 'activo')
                        ->exists();
                    if ($ocupada) {
                        throw new \RuntimeException("La habitación {$room->number} ya está ocupada. Elija otra.");
                    }
                }

                // (2) Liberar las habitaciones previamente asignadas a esta
                // reserva que ya NO forman parte de la nueva asignación.
                $previousRoomIds = $reservation->details()->pluck('room_id')->filter()->all();
                $roomIdsToFree = array_diff($previousRoomIds, $roomIds);
                if (!empty($roomIdsToFree)) {
                    Room::whereIn('id', $roomIdsToFree)->update(['status' => 'LIBRE']);
                }

                // (3) Reemplazar los detalles: uno por cada habitación asignada.
                $reservation->details()->delete();
                foreach ($roomIds as $roomId) {
                    ReservationDetail::create([
                        'reservation_id' => $reservation->id,
                        'room_id' => $roomId,
                    ]);
                }

                Room::whereIn('id', $roomIds)->update(['status' => 'RESERVADO']);
            });

            return redirect()->back()->with('success', 'Habitaciones asignadas correctamente.');
        } catch (\Throwable $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function reception()
    {
        // 1. Obtenemos la fecha actual exacta en la zona horaria de Bolivia
        $today = Carbon::now('America/La_Paz')->format('Y-m-d');

        $reservations = Reservation::with([
            'guest',
            'details.room.roomType',
            'payments',
            'specialAgreement'
        ])
            ->whereIn('status', ['pendiente'])
            // 👇 2. NUEVO FILTRO: Solo trae reservas cuya fecha de llegada sea HOY o en el futuro
            ->where('arrival_date', '>=', $today)
            ->orderBy('arrival_date', 'asc')
            ->get();


        $guests = Guest::all();

        // 👇 AQUÍ ESTÁ EL CAMBIO: Agregamos 'price' a la lista 👇
        $rooms = Room::with(['roomType', 'floor', 'price'])->get();

        // 🛠️ FIX: esta es la página real de "Reservas Internas" (/reservas,
        // la que usa el personal día a día — reservations/index.tsx +
        // ReservationController::index() es un panel alterno solo para
        // admin). Le faltaba pasar los operadores, así que el
        // OperatorSelector dentro de ReservationModal (para registrar el
        // adelanto) siempre caía en el arreglo vacío por defecto y mostraba
        // "No hay operadores activos disponibles". Mismo scope que ya usa
        // ReservationController::index() para el otro panel.
        $operators = User::operadores()->get(['id', 'full_name', 'nickname']);

        return Inertia::render('reservations/viewReservationModal', [
            'reservations' => $reservations,
            'guests' => $guests,
            'rooms' => $rooms,
            'operators' => $operators,
        ]);
    }

    public function checkAvailability(Request $request)
    {
        $request->validate(['arrival_date' => 'required|date']);
        $targetDate = Carbon::parse($request->arrival_date)->startOfDay();

        $rooms = Room::with('roomType')->whereNotIn('status', ['MANTENIMIENTO', 'INHABILITADO'])->get();
        $availableRooms = [];
        $freeingUpRooms = [];

        foreach ($rooms as $room) {
            if ($room->status === 'LIBRE') {
                $availableRooms[] = $room;
            } elseif ($room->status === 'OCUPADO' || $room->status === 'RESERVADO') {
                $activeCheckin = Checkin::where('room_id', $room->id)
                    ->where('status', 'activo')
                    ->latest()
                    ->first();

                if ($activeCheckin) {
                    $startDate = $activeCheckin->actual_arrival_date ?? $activeCheckin->check_in_date;
                    $expectedCheckout = Carbon::parse($startDate)
                        ->addDays($activeCheckin->duration_days)
                        ->startOfDay();

                    if ($expectedCheckout->lte($targetDate)) {
                        $freeingUpRooms[] = $room;
                        $availableRooms[] = $room;
                    }
                }
            }
        }

        return response()->json([
            'target_date' => $targetDate->format('Y-m-d'),
            'total_available' => count($availableRooms),
            'currently_free' => count($availableRooms) - count($freeingUpRooms),
            'will_be_freed' => count($freeingUpRooms),
        ]);
    }
}
