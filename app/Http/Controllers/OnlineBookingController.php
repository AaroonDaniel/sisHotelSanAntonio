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
    public function index()
    {
        // Solo renderizamos la vista de Inertia.
        // Asumimos que crearás la carpeta Booking y el archivo Index.tsx
        return Inertia::render('booking/index');
    }

    /**
     * Busca habitaciones disponibles según fechas y capacidad.
     */
    public function searchRooms(Request $request)
    {
        // 1. Validación de los datos de entrada
        $request->validate([
            'checkin_date'  => 'required|date|after_or_equal:today',
            'checkout_date' => 'required|date|after:checkin_date',
            'guests_count'  => 'required|integer|min:1',
        ]);

        $checkinDate = Carbon::parse($request->checkin_date)->startOfDay();
        $checkoutDate = Carbon::parse($request->checkout_date)->endOfDay();
        $guestsCount = (int) $request->guests_count;

        // 2. Consulta de Habitaciones
        // Buscamos habitaciones (y traemos su tipo y precios)
        $rooms = Room::with(['roomType', 'prices' => function($query) {
                // Opcional: Si quieres traer un precio específico activo
                $query->where('is_active', true);
            }])
            // Filtrar por capacidad (basado en el tipo de habitación)
            ->whereHas('roomType', function ($query) use ($guestsCount) {
                $query->where('capacity', '>=', $guestsCount);
            })
            // 3. LA MAGIA: Excluir las habitaciones ocupadas en esas fechas
            ->whereDoesntHave('reservations', function ($query) use ($checkinDate, $checkoutDate) {
                $query->where(function ($q) use ($checkinDate, $checkoutDate) {
                    // Condición de cruce de fechas para reservas
                    $q->where('check_in_date', '<', $checkoutDate)
                      ->where('check_out_date', '>', $checkinDate)
                      ->whereIn('status', ['Pendiente', 'Confirmada']); // Asegúrate de usar los estados correctos de tu sistema
                });
            })
            ->whereDoesntHave('checkins', function ($query) use ($checkinDate, $checkoutDate) {
                $query->where(function ($q) use ($checkinDate, $checkoutDate) {
                    // Condición de cruce de fechas para checkins activos
                    $q->where('checkin_date', '<', $checkoutDate)
                      ->where('checkout_date', '>', $checkinDate)
                      ->where('status', 'Activo'); // Asegúrate de usar el estado correcto
                });
            })
            ->get();

        // 4. Formatear la respuesta (Opcional, pero recomendado para APIs de React)
        // Podrías mapear los datos para enviar solo lo necesario al frontend
        $availableRooms = $rooms->map(function ($room) {
            
            // Asumiendo que el modelo Price tiene un campo 'price'
            // Si tienes lógica corporativa aquí, deberás manejarla. Por ahora, precio base.
            $basePrice = $room->prices->first() ? $room->prices->first()->price : 0;

            return [
                'id' => $room->id,
                'number' => $room->number,
                'type' => $room->roomType->name,
                'capacity' => $room->roomType->capacity,
                'description' => $room->roomType->description ?? 'Sin descripción',
                'price_per_night' => $basePrice,
                // Puedes agregar imágenes si las tienes en tu modelo
            ];
        });

        // 5. Devolver la respuesta en formato JSON
        return response()->json([
            'success' => true,
            'rooms' => $availableRooms
        ]);
    }
}