<?php

namespace App\Http\Controllers;

use App\Models\Block;
use App\Models\Room;
use App\Models\RoomType;
use App\Models\Price;
use App\Models\Floor;
use App\Models\Guest;
use App\Models\Service;
use App\Models\Schedule;
use App\Models\Reservation;
use App\Models\Maintenance;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class RoomController
{
    public function index()
    {
        // Usamos 'with' para cargar las relaciones y evitar consultas N+1
        $rooms = Room::with([
            'roomType',
            'price',
            'floor',
            'block',
            'checkins.services',
            'checkins.payments',
            'checkins.guest',
            'checkins.companions',
            'checkins.specialAgreement'
        ])
            // 1. Obtenemos los registros primero (quitamos el orderBy de SQL)
            ->get()
            // 2. Aplicamos el ordenamiento Natural usando PHP
            ->sortBy('number', SORT_NATURAL | SORT_FLAG_CASE)
            // 3. Re-indexamos los valores para que el Frontend lo reciba como un Array limpio
            ->values();

        $pendingReservations = \App\Models\Reservation::with(['guest', 'details.room.roomType', 'payments'])
            ->whereRaw('LOWER(status) = ?', ['pendiente'])
            ->get()
            ->map(function ($reservation) {
                // Sumamos los pagos reales (ignoramos los rechazados por si acaso)
                $pagosValidos = $reservation->payments->where('status', '!=', 'RECHAZADO');

                // Inyectamos el adelanto real que verá el panel "Asignación de Reservas"
                $reservation->advance_payment = $pagosValidos->sum('amount');

                // 🚀 REDISEÑO: la reserva ya no fija payment_type propio —
                // el método real sale del primer pago registrado; si
                // todavía no hay ninguno, EFECTIVO como default visual.
                $reservation->payment_type = optional($pagosValidos->first())->method
                    ?? 'EFECTIVO';

                return $reservation;
            });

        return Inertia::render('rooms/index', [
            'Rooms' => $rooms,
            'RoomTypes' => RoomType::where('is_active', true)->get(),
            'Prices' => Price::where('is_active', true)->get(),
            'Floors' => Floor::where('is_active', true)->get(),
            'Blocks' => Block::where('is_active', true)->get(),
            'reservations' => $pendingReservations,
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validación
        $validated = $request->validate([
            'number' => 'required|unique:rooms,number',
            'room_type_id' => 'required|exists:room_types,id',
            'price_id' => 'required|exists:prices,id',
            'floor_id' => 'required|exists:floors,id',
            'block_id' => 'required|exists:blocks,id',
            'status' => 'required|in:libre,ocupado,reservado,limpieza,mantenimiento,inhabilitado,available,occupied,reserved,cleaning,maintenance,disabled',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        // 2. Mapeo de Español a Inglés para la Base de Datos
        $mapStatus = [
            'available' => 'libre',
            'occupied' => 'ocupado',
            'reserved' => 'reservado',
            'cleaning' => 'limpieza',
            'maintenance' => 'mantenimiento',
            'disabled' => 'inhabilitado',
        ];

        if (isset($mapStatus[$validated['status']])) {
            $validated['status'] = $mapStatus[$validated['status']];
        }

        // 3. Valores por defecto
        $validated['is_active'] = true;

        // 4. Imagen: se guarda en disco público o se persiste como null
        $validated['image_path'] = $request->hasFile('image')
            ? $request->file('image')->store('rooms', 'public')
            : null;

        Room::create($validated);

        return redirect()->back();
    }

    public function update(Request $request, Room $room)
    {
        // 1. Validación
        $validated = $request->validate([
            'number' => 'required|unique:rooms,number,' . $room->id,
            'block_id' => 'required|exists:blocks,id',
            'floor_id' => 'required|exists:floors,id',
            'price_id' => 'required|exists:prices,id',
            'room_type_id' => 'required|exists:room_types,id',
            'status' => 'required|in:libre,ocupado,reservado,limpieza,mantenimiento,inhabilitado,available,occupied,reserved,cleaning,maintenance,disabled',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        // 2. Mapeo de Español a Inglés
        $mapStatus = [
            'available' => 'libre',
            'occupied' => 'ocupado',
            'reserved' => 'reservado',
            'cleaning' => 'limpieza',
            'maintenance' => 'mantenimiento',
            'disabled' => 'inhabilitado',
        ];

        if (isset($mapStatus[$validated['status']])) {
            $validated['status'] = $mapStatus[$validated['status']];
        }

        // 3. Manejo del checkbox 'is_active'
        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        if ($request->hasFile('image')) {
            // 1. El usuario subió una imagen NUEVA
            if ($room->image_path) {
                Storage::disk('public')->delete($room->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('rooms', 'public');
        } elseif (array_key_exists('image', $validated) && is_null($validated['image'])) {
            // 2. El usuario QUITÓ la imagen a propósito (envió image = null)
            if ($room->image_path) {
                Storage::disk('public')->delete($room->image_path);
            }
            $validated['image_path'] = null;
        } else {
            // 3. No se tocó el campo de imagen en absoluto
            unset($validated['image']);
        }

        $room->update($validated);

        return redirect()->back();
    }
    public function destroy(Room $room)
    {
        $room->delete();
        return redirect()->back();
    }

    public function toggleStatus(Room $room)
    {
        $room->update(['is_active' => !$room->is_active]);
        return back();
    }
    public function status()
    {
        // 1. Cargamos las habitaciones y les agregamos las próximas reservas si existen
        //
        // 🚀 select() SOLO en relaciones "de catálogo" chicas y de forma
        // bien conocida (roomType, price, operadores) — id + las columnas
        // que el frontend realmente pinta. guest/checkins/companions/
        // specialAgreement/payments/services NO se recortan a propósito:
        // se editan/muestran con casi todos sus campos en distintos
        // modales (checkinModal, occupiedRoomModal, multiCheckoutModal) y
        // adivinar mal una columna "no usada" rompería esos formularios en
        // silencio — el ahorro de payload no vale ese riesgo aquí.
        $rooms = Room::with([
            'roomType:id,name,capacity',
            'price:id,amount,bathroom_type',
            'checkins' => function ($q) {
                $q->where('status', 'activo')
                    ->with([
                        'guest',
                        'companions',
                        'checkinDetails.service',
                        'services',
                        'payments' => function ($query) {
                            $query->orderBy('created_at', 'asc');
                        },
                        // Terminal Compartida: quién cobró de verdad es
                        // operador_id (el avatar elegido), no user_id
                        // (siempre la cuenta genérica 'recepcion'). 'user'
                        // queda como fallback para pagos viejos anteriores
                        // a ese campo. Alimenta la columna "Operador" del
                        // Historial Financiero (FinancialHistoryModal).
                        'payments.operador:id,full_name,nickname',
                        'payments.user:id,full_name,nickname',
                        'room.price:id,amount,bathroom_type',
                        'room.roomType:id,name,capacity',
                        'specialAgreement', // 🚀 LUGAR 1: Agregar esto (Alimenta las tarjetas visuales)
                        'checkinOperator:id,full_name,nickname', // Quién hizo la asignación (para "asignado por:")
                    ]);
            }
        ])->orderBy('number')->get()->map(function ($room) {

            // 💜 MAGIA MORADA: Buscamos TODAS las reservas futuras para esta habitación
            $futureReservations = \App\Models\ReservationDetail::where('room_id', $room->id)
                ->whereHas('reservation', function ($query) {
                    $query->whereIn('status', ['pendiente']) // Solo pendientes o confirmadas
                        ->whereDate('arrival_date', '>=', now()->toDateString());
                })
                ->with(['reservation.guest'])
                ->get()
                ->map(function ($detail) {
                    return [
                        'id' => $detail->reservation->id,
                        'date' => $detail->reservation->arrival_date,
                        'guest' => $detail->reservation->guest->full_name ?? 'Huésped',
                        'raw_reservation' => $detail->reservation
                    ];
                })
                ->sortBy('date')
                ->values()
                ->toArray();

            // Asignamos el arreglo de reservas futuras a la habitación
            $room->future_reservations = $futureReservations;

            // 🚀 "RESERVADO HOY": a diferencia de future_reservations (solo
            // 'pendiente', desde hoy en adelante), este SOLO considera
            // reservas cuya llegada es EXACTAMENTE hoy (zona horaria del
            // hotel, config/app.php → America/La_Paz) y que todavía no
            // pasaron a check-in real (status 'pendiente' o 'confirmada').
            // Alimenta el banner "RESERVADO HOY" del grid principal.
            $todayReservationDetail = \App\Models\ReservationDetail::where('room_id', $room->id)
                ->whereHas('reservation', function ($query) {
                    $query->whereIn('status', ['pendiente', 'confirmada'])
                        ->whereDate('arrival_date', now()->toDateString());
                })
                ->with(['reservation.guest'])
                ->first();

            $room->today_reservation = $todayReservationDetail
                ? [
                    'id' => $todayReservationDetail->reservation->id,
                    'guest' => $todayReservationDetail->reservation->guest->full_name ?? 'Huésped',
                ]
                : null;

            // 🚀 MOTOR DE FACTURACIÓN GRUPAL: si el check-in activo de esta
            // habitación pertenece a una Cuenta Grupal real (tiene
            // company_name), le inyectamos el saldo REAL calculado en vivo
            // (total_deposited/total_consumed/balance) para que el banner
            // del OccupiedRoomModal no dependa de los contadores manuales,
            // y forzamos individual_debt a 0 (REGLA DE ORO: el huésped de
            // un grupo nunca debe nada a nivel personal).
            foreach ($room->checkins as $checkin) {
                $isRealGroupAccount = $checkin->specialAgreement && !empty($checkin->specialAgreement->company_name);
                if ($isRealGroupAccount) {
                    $checkin->specialAgreement->financial_summary = $checkin->specialAgreement->financialSummary();
                }
                $checkin->individual_debt = $isRealGroupAccount ? 0.0 : null;
            }

            return $room;
        });

        // 2. Active Checkins
        $activeCheckins = \App\Models\Checkin::with([
            'guest',
            'companions',
            'checkinDetails.service',
            'room.price:id,amount,bathroom_type',
            'room.roomType:id,name,capacity',
            'services',
            'specialAgreement', // 🚀 LUGAR 2: Agregar esto (Alimenta los modales de salida/detalles)
            'checkinOperator:id,full_name,nickname', // Quién hizo la asignación (para "asignado por:")
            'payments' => function ($query) {
                $query->orderBy('created_at', 'asc');
            },
            'payments.operador:id,full_name,nickname',
            'payments.user:id,full_name,nickname',
        ])
            ->where('status', 'activo')
            ->get();

        // 🚀 MOTOR DE FACTURACIÓN GRUPAL: mismo saldo real inyectado que
        // arriba, para los checkins que alimentan directamente los modales
        // de salida/detalles (OccupiedRoomModal, multiCheckoutModal).
        foreach ($activeCheckins as $checkin) {
            $isRealGroupAccount = $checkin->specialAgreement && !empty($checkin->specialAgreement->company_name);
            if ($isRealGroupAccount) {
                $checkin->specialAgreement->financial_summary = $checkin->specialAgreement->financialSummary();
            }
            $checkin->individual_debt = $isRealGroupAccount ? 0.0 : null;
        }

        // 3. Reservas pendientes
        $pendingReservations = \App\Models\Reservation::with(['guest', 'details.room.roomType', 'payments', 'specialAgreement'])
            ->whereRaw('LOWER(status) = ?', ['pendiente'])
            ->get()
            ->map(function ($reservation) {
                // Sumamos los pagos reales (ignoramos los rechazados por si acaso)
                $pagosValidos = $reservation->payments->where('status', '!=', 'RECHAZADO');

                // Inyectamos el adelanto real que verá el panel "Asignación de Reservas"
                $reservation->advance_payment = $pagosValidos->sum('amount');

                // 🚀 REDISEÑO: la reserva ya no fija payment_type propio —
                // el método real sale del primer pago registrado; si
                // todavía no hay ninguno, EFECTIVO como default visual.
                $reservation->payment_type = optional($pagosValidos->first())->method
                    ?? 'EFECTIVO';

                return $reservation;
            });

        // 4. Separamos las habitaciones para el Modal de Transferencia
        $availableRooms = $rooms->filter(function ($room) {
            return in_array(strtoupper($room->status), ['LIBRE', 'LIMPIEZA']);
        })->values();

        $occupiedRooms = $rooms->filter(function ($room) {
            return in_array(strtoupper($room->status), ['OCUPADO', 'INCOMPLETO']);
        })->values();


        // Servicios con capacidad limitada (ej. Garaje).
        //
        // Para cada servicio anotamos cuántas unidades están "ocupadas"
        // por check-ins activos (status='activo'). Así el frontend puede:
        //  - mostrar al recepcionista cuántos espacios quedan libres,
        //  - deshabilitar el botón cuando se agoten,
        //  - aplicar la regla del campo `quantity` (capacidad total).
        //
        // Caso típico: Garaje con quantity=12. Si hay 5 check-ins activos
        // con el servicio Garaje, quedan 7 disponibles.
        //
        // Nota: la tabla pivote es checkin_details (no checkin_service) y
        // tiene su propia columna quantity, por eso sumamos en vez de contar.
        $services = \App\Models\Service::all()->map(function ($service) {
            $service->quantity_used = (int) \DB::table('checkin_details')
                ->where('service_id', $service->id)
                ->whereIn('checkin_id', function ($q) {
                    $q->select('id')->from('checkins')->where('status', 'activo');
                })
                ->sum('quantity');
            return $service;
        });

        // 🚀 Cuentas Grupales activas (Delegación/Corporativo unificados):
        // alimenta el selector de "Check-in Rápido" en CheckinModal para
        // asignar una habitación directamente a una de estas cuentas.
        $groupAccounts = \App\Models\SpecialAgreement::groupAccounts()
            ->orderBy('company_name')
            ->get(['id', 'type', 'company_name', 'origin', 'total_advance', 'total_consumed'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'type' => $a->type,
                'company_name' => $a->company_name,
                'origin' => $a->origin,
                'balance' => $a->balance,
            ]);

        return \Inertia\Inertia::render('rooms/status', [
            'Rooms'        => $rooms,
            'Checkins'     => $activeCheckins,
            'availableRooms' => $availableRooms,
            'occupiedRooms' => $occupiedRooms,
            'Guests'       => \App\Models\Guest::all(),
            'services'     => $services,
            'Blocks'       => \App\Models\Block::all(),
            'RoomTypes'    => \App\Models\RoomType::all(),
            'Schedules'    => \App\Models\Schedule::where('is_active', true)->get(),
            'reservations' => $pendingReservations,
            'Operators'    => \App\Models\User::operadores()->get(),
            'GroupAccounts' => $groupAccounts,
        ]);
    }

    public function markAsMaintenance(Request $request, Room $room)
    {
        // 1. Validar los datos que vienen del formulario de React
        $request->validate([
            'issue' => 'required|string|max:255',
            'description' => 'nullable|string',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg|max:5120', // Máximo 5MB
        ]);

        // 2. Manejar la subida de la foto (Si es que enviaron una)
        $photoPath = null;
        if ($request->hasFile('photo')) {
            // Guarda la imagen en la carpeta "storage/app/public/maintenances"
            $photoPath = $request->file('photo')->store('maintenances', 'public');
        }

        // 3. Buscar si hay un Check-in activo en esa habitación (para saber a quién culpar/cobrar)
        $activeCheckin = $room->checkins()->where('status', 'activo')->first();

        // 4. Crear el registro oficial de Mantenimiento
        Maintenance::create([
            'room_id' => $room->id,
            'user_id' => $request->user()->id,
            'issue' => strtoupper($request->issue),
            'description' => strtoupper($request->description),
            'photo_path' => $photoPath,
            'checkin_id' => $activeCheckin ? $activeCheckin->id : null,
        ]);

        // 5. Cambiar el estado de la habitación para que ya no se pueda vender
        $room->update(['status' => 'MANTENIMIENTO']);

        // 6. Recargar la página
        return redirect()->back()->with('success', 'Habitación bloqueada y daño reportado exitosamente.');
    }

    public function finishMaintenance(Room $room)
    {
        // 1. Buscamos el reporte de daño que sigue pendiente en esta habitación
        $maintenance = \App\Models\Maintenance::where('room_id', $room->id)
            ->whereNull('resolved_at')
            ->first();

        // 2. Si lo encontramos, le ponemos la fecha y hora actual de resolución
        if ($maintenance) {
            $maintenance->update([
                'resolved_at' => now()
            ]);
        }

        // 3. Cambiamos la habitación a estado Limpieza (porque el técnico ensució)
        $room->update(['status' => 'LIMPIEZA']);

        return redirect()->back()->with('success', 'Mantenimiento terminado. La habitación ha pasado a Limpieza.');
    }
    // Funcion de limpieza de habitacion (PROVICIONAL)
    public function markAsClean(Room $room)
    {
        $room->update(['status' => 'LIBRE']);
        return back()->with('success', 'Habitación marcada como limpia y disponible.');
    }

    // Vista previa de asignacnion (antes de finalizar la estadia)
    public function getGuestsList()
    {
        // 1. Recuperar los checkins activos
        $checkins = \App\Models\Checkin::with(['guest', 'room.price'])
            ->where('status', 'activo')
            ->get();

        $data = $checkins->map(function ($c) {

            // --- Crear objetos Carbon para manipular fechas ---
            $ingresoObj = \Carbon\Carbon::parse($c->check_in_date);

            $salidaObj = $c->check_out_date
                ? \Carbon\Carbon::parse($c->check_out_date)
                : \Carbon\Carbon::parse($c->check_in_date)->addDays($c->duration_days);

            // --- Cálculos Económicos ---
            $precioDiario = $c->room->price->amount ?? 0;
            $dias = $c->duration_days > 0 ? $c->duration_days : 1;
            $totalEstadia = $precioDiario * $dias;
            $adelanto = $c->advance_payment ?? 0;
            $totalCancelar = $totalEstadia - $adelanto;

            // --- Estructura con Fecha y Hora SEPARADAS ---
            return [
                'plaza'          => $c->room->number,
                'huesped'        => $c->guest->full_name,
                'procedencia'    => $c->guest->origin ?? 'SIN PROCEDENCIA',

                // Campos separados para facilitar el diseño
                'fecha_ingreso'  => $ingresoObj->format('d/m/Y'), // Ej: 06/01/2026
                'hora_ingreso'   => $ingresoObj->format('H:i'),   // Ej: 14:30

                'fecha_salida'   => $salidaObj->format('d/m/Y'),
                'hora_salida'    => $salidaObj->format('H:i'),

                'adelanto'       => number_format($adelanto, 2),
                'total_cancelar' => number_format($totalCancelar, 2),
                'observaciones'  => $c->notes ?? 'Ninguna',
            ];
        });

        return response()->json($data);
    }
}
