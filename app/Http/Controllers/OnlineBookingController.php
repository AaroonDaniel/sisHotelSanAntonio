<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomType;
use App\Models\Price;
use App\Models\Reservation;
use App\Models\Checkin;
use App\Models\Guest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class OnlineBookingController extends Controller
{
    /**
     * Muestra la vista principal de la SPA pública de reservas.
     */
    public function index(Request $request)
    {
        // 1. Validar los datos de entrada
        $validated = $request->validate([
            'check_in' => 'nullable|date|after_or_equal:today',
            'check_out' => 'nullable|date|after:check_in',
            'guests' => 'nullable|integer|min:1|max:10',
        ]);

        $checkin = $validated['check_in'] ?? null;
        $checkout = $validated['check_out'] ?? null;
        $guests = $validated['guests'] ?? 1;

        $availableRoomTypes = [];

        // 2. Si hay fechas, el motor busca disponibilidad basada en el cruce de reservas
        if ($checkin && $checkout) {
            $availableRoomTypes = RoomType::where('is_active', true)
                ->whereHas('rooms', function ($query) use ($checkin, $checkout) {
                    // Quitamos el filtro de 'status' actual. Solo verificamos que no haya 
                    // reservas aprobadas que choquen en ese rango de fechas.
                    $query->whereDoesntHave('reservationDetails', function ($q) use ($checkin, $checkout) {
                        $q->whereHas('reservation', function ($resQ) use ($checkin, $checkout) {
                            $resQ->where('arrival_date', '<', $checkout)
                                 ->whereRaw("arrival_date + (duration_days * INTERVAL '1 day') > ?", [$checkin])
                                 ->whereNotIn('status', ['CANCELADA', 'FINALIZADA']); 
                        });
                    });
                })
                ->with(['rooms' => function ($query) use ($checkin, $checkout) {
                    // Hacemos lo mismo al traer las habitaciones para la tarjeta
                    $query->whereDoesntHave('reservationDetails', function ($q) use ($checkin, $checkout) {
                        $q->whereHas('reservation', function ($resQ) use ($checkin, $checkout) {
                            $resQ->where('arrival_date', '<', $checkout)
                                 ->whereRaw("arrival_date + (duration_days * INTERVAL '1 day') > ?", [$checkin])
                                 ->whereNotIn('status', ['CANCELADA', 'FINALIZADA']);
                        });
                    });
                }])
                ->get();
        } 

        // 3. Enviamos a la vista de React
        return Inertia::render('booking/index', [
            'availableRoomTypes' => $availableRoomTypes,
            'filters' => [
                'check_in' => $checkin,
                'check_out' => $checkout,
                'guests' => $guests,
            ]
        ]);
    }

    /**
     * Busca habitaciones disponibles según fechas y capacidad.
     */
    public function searchRooms(Request $request)
{
    // 1. Validación de los datos que envía React
    $request->validate([
        'checkIn'  => 'required|date|after_or_equal:today',
        'checkOut' => 'required|date|after:checkIn',
    ]);

    $checkinDate = Carbon::parse($request->checkIn)->startOfDay();
    $checkoutDate = Carbon::parse($request->checkOut)->endOfDay();

    // 2. Consulta Mágica: Traer habitaciones libres
    $rooms = Room::with(['roomType', 'price'])
        ->where('status', '!=', 'MANTENIMIENTO') // Ignorar mantenimiento
        
        // 3. EXCLUIR RESERVAS CRUZADAS (Usando los detalles de reserva)
        ->whereDoesntHave('reservationDetails', function ($query) use ($checkinDate, $checkoutDate) {
            $query->whereHas('reservation', function ($q) use ($checkinDate, $checkoutDate) {
                // Si la reserva entra ANTES de que yo salga, y sale DESPUÉS de que yo entre = CHOQUE
                $q->where('arrival_date', '<', $checkoutDate) // Asegúrate de que tu columna se llame arrival_date
                  ->where('departure_date', '>', $checkinDate) // Asegúrate de que tu columna se llame departure_date
                  ->whereIn('status', ['Pendiente', 'Confirmada']); 
            });
        })
        
        // 4. EXCLUIR CHECKINS ACTIVOS CRUZADOS (Ocupados físicamente)
        ->whereDoesntHave('checkins', function ($query) use ($checkinDate, $checkoutDate) {
            // Asumiendo que un checkin 'Activo' bloquea la habitación
            $query->where('status', 'Activo'); 
        })
        ->get();

    // 5. Formatear la respuesta EXACTAMENTE como lo espera la tarjeta de React
    $availableRooms = $rooms->map(function ($room) {
        return [
            'id'       => $room->id,
            'name'     => 'Habitación ' . $room->number,
            'type'     => $room->roomType->name ?? 'Estándar',
            'capacity' => $room->roomType->capacity ?? 2,
            
            // Usamos tu relación 'price' real. Si el campo numérico se llama distinto a 'price', cámbialo.
            'price'    => $room->price ? $room->price->price : 0, 
            
            // Dato visual para la tarjeta
            'bath'     => 'Privado', 
            'image'    => 'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=300&auto=format&fit=crop',
        ];
    })->values();

    // 6. Devolver el array directo (Axios en React leerá esto como response.data)
    return response()->json($availableRooms);
}

    public function checkAvailability(Request $request)
{
    $checkIn = $request->checkIn;   // Ej: '2026-05-02'
    $checkOut = $request->checkOut; // Ej: '2026-05-05'

    // Buscamos todas las habitaciones ACTIVAS que NO tengan conflictos
    $availableRooms = Room::where('is_active', true) // Asumiendo que tienes un campo is_active
        ->whereDoesntHave('reservationDetails', function ($query) use ($checkIn, $checkOut) {
            // Filtramos las reservas cruzando la tabla reservation_details con reservations
            $query->whereHas('reservation', function ($resQuery) use ($checkIn, $checkOut) {
                $resQuery->where('arrival_date', '<', $checkOut)
                         ->where('departure_date', '>', $checkIn)
                         ->whereIn('status', ['Confirmada', 'Pendiente']); // Omitir las Canceladas
            });
        })
        // También filtramos las que están OCUPADAS actualmente por un Check-in sin salida definida
        ->whereDoesntHave('checkinDetails', function ($query) {
            $query->whereHas('checkin', function ($chkQuery) {
                $chkQuery->where('status', 'Ocupado'); 
            });
        })
        ->get();

    return response()->json($availableRooms);
}
}