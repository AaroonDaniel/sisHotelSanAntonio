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
            'checkins.companions'
        ])
        // 1. Obtenemos los registros primero (quitamos el orderBy de SQL)
        ->get() 
        // 2. Aplicamos el ordenamiento Natural usando PHP
        ->sortBy('number', SORT_NATURAL | SORT_FLAG_CASE) 
        // 3. Re-indexamos los valores para que el Frontend lo reciba como un Array limpio
        ->values(); 

        $pendingReservations = \App\Models\Reservation::with(['guest', 'details.room.roomType'])
            ->whereRaw('LOWER(status) = ?', ['pendiente'])
            ->get();

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
        // 1. Validación (Aceptamos español e inglés para el status)
        $validated = $request->validate([
            'number' => 'required|unique:rooms,number',
            'room_type_id' => 'required|exists:room_types,id',
            'price_id' => 'required|exists:prices,id',
            'floor_id' => 'required|exists:floors,id',
            'block_id' => 'required|exists:blocks,id',
            'status' => 'required|in:libre,ocupado,reservado,limpieza,mantenimiento,inhabilitado,available,occupied,reserved,cleaning,maintenance,disabled',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
        ]);

        // 2. Mapeo de Español a Inglés para la Base de Datos
        $mapStatus = [
            'available' => 'libre',
            'occupied' => 'ocupado',
            'reserved' => 'reservado',
            'cleaning' => 'limpieza',
            'maintenance' => 'mantenimiento',
            'disabled' => 'inhabilitado'
        ];

        // Si el status viene en español, lo traducimos
        if (isset($mapStatus[$validated['status']])) {
            $validated['status'] = $mapStatus[$validated['status']];
        }

        // 3. Valores por defecto
        $validated['is_active'] = true;

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request
                ->file('image')
                ->store('rooms', 'public'); // rooms/archivo.jpg
        }

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
            'image' => 'nullable|image|max:2048',
        ]);

        // 2. Mapeo de Español a Inglés
        $mapStatus = [
            'available' => 'libre',
            'occupied' => 'ocupado',
            'reserved' => 'reservado',
            'cleaning' => 'limpieza',
            'maintenance' => 'mantenimiento',
            'disabled' => 'inhabilitado'
        ];


        if (isset($mapStatus[$validated['status']])) {
            $validated['status'] = $mapStatus[$validated['status']];
        }

        // 3. Manejo del checkbox 'is_active' (si se envía)
        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }


        if ($request->hasFile('image')) {
            // opcional: borrar la anterior
            if ($room->image_path) {
                Storage::disk('public')->delete($room->image_path);
            }

            $validated['image_path'] = $request
                ->file('image')
                ->store('rooms', 'public');
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
        $rooms = Room::with([
            'roomType',
            'price',
            'checkins' => function ($q) {
                $q->where('status', 'activo')
                    ->with([
                        'guest',
                        'companions',
                        'checkinDetails.service',
                        'services',
                        'payments' => function($query) {
                            $query->orderBy('created_at', 'asc'); 
                        },
                        'room.price',
                        'room.roomType'
                    ]);
            }
        ])->orderBy('number')->get()->map(function ($room) {
            
            // 💜 MAGIA MORADA: Buscamos TODAS las reservas futuras para esta habitación
            $futureReservations = \App\Models\ReservationDetail::where('room_id', $room->id)
                ->whereHas('reservation', function ($query) {
                    $query->whereIn('status', ['pendiente', 'confirmada'])
                          ->whereDate('arrival_date', '>=', now()->toDateString());
                })
                ->with(['reservation.guest'])
                ->get()
                ->map(function($detail) {
                    return [
                        'date' => $detail->reservation->arrival_date,
                        'guest' => $detail->reservation->guest->full_name ?? 'Huésped'
                    ];
                })
                ->sortBy('date')
                ->values()
                ->toArray(); // Convertimos a array para evitar problemas en React

            // Asignamos el arreglo de reservas futuras a la habitación
            $room->future_reservations = $futureReservations;
            
            return $room;
        });

        // 2. Active Checkins
        $activeCheckins = \App\Models\Checkin::with([
            'guest',
            'companions',
            'checkinDetails.service',
            'room.price',     
            'room.roomType',  
            'services',
            'payments' => function($query) {
                $query->orderBy('created_at', 'asc'); 
            }
        ])
            ->where('status', 'activo')
            ->get();

        // 3. Reservas pendientes
        $pendingReservations = \App\Models\Reservation::with(['guest', 'details.room.roomType'])
            ->whereRaw('LOWER(status) = ?', ['pendiente'])
            ->get();

        // 4. Separamos las habitaciones para el Modal de Transferencia
        $availableRooms = $rooms->filter(function ($room) {
            return in_array(strtoupper($room->status), ['LIBRE', 'LIMPIEZA']); 
        })->values();

        $occupiedRooms = $rooms->filter(function ($room) {
            return in_array(strtoupper($room->status), ['OCUPADO', 'INCOMPLETO']); 
        })->values();


        return \Inertia\Inertia::render('rooms/status', [
            'Rooms'        => $rooms,
            'Checkins'     => $activeCheckins,
            'availableRooms' => $availableRooms,
            'occupiedRooms' => $occupiedRooms,
            'Guests'       => \App\Models\Guest::all(),
            'services'     => \App\Models\Service::all(),
            'Blocks'       => \App\Models\Block::all(),
            'RoomTypes'    => \App\Models\RoomType::all(),
            'Schedules'    => \App\Models\Schedule::where('is_active', true)->get(),
            'reservations' => $pendingReservations,
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
        $room->update(['status' => 'Mantenimiento']);

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
        $room->update(['status' => 'Limpieza']);

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
