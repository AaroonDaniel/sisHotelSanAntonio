<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Reservation;
use App\Models\Payment;
use App\Models\Room;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminBookingController extends Controller
{
    /**
     * Procesa la aprobación del pago (Botón Azul)
     * Cambia la reserva a "pendiente" (lista para asignar cuarto)
     */
    public function approvePayment(Request $request, $id)
    {
        try {
            DB::transaction(function () use ($id) {
                $reservation = Reservation::findOrFail($id);
                
                // 1. La reserva web siempre entra como 'pendiente' (ya no 'confirmada')
                // para que aparezca en la "Tabla 1: Pendientes de Asignar Habitación"
                $reservation->update(['status' => 'pendiente']);

                // 2. Actualizar el estado del pago a completado
                $payment = $reservation->payments()->where('status', 'PENDIENTE_VERIFICACION')->first();
                if ($payment) {
                    $payment->update(['status' => 'COMPLETADO']);
                }

                // 📩 (Opcional) Aquí podrías enviar un correo de "Pago Recibido" al cliente
                
                Log::info("✅ Pago ONLINE aprobado para la reserva ID: {$id}");
            });

            return back()->with('success', 'El comprobante ha sido aprobado. Asigna las habitaciones cuando el huésped llegue.');

        } catch (\Exception $e) {
            Log::error("❌ Error aprobando pago de reserva {$id}: " . $e->getMessage());
            return back()->withErrors(['error' => 'No se pudo aprobar el pago.']);
        }
    }

    /**
     * Procesa el rechazo del pago (Botón Rojo)
     * Cancela la reserva y libera los cuartos
     */
    public function rejectPayment(Request $request, $id)
    {
        try {
            DB::transaction(function () use ($id) {
                $reservation = Reservation::with('details')->findOrFail($id);
                
                // 1. Cancelar la reserva
                $reservation->update(['status' => 'cancelado']); // Importante: usar 'cancelado' en minúscula como en tu DB

                // 2. Marcar el pago como rechazado
                $payment = $reservation->payments()->where('status', 'PENDIENTE_VERIFICACION')->first();
                if ($payment) {
                    $payment->update(['status' => 'RECHAZADO']);
                }

                // 3. Liberar las habitaciones para que vuelvan a estar disponibles
                foreach ($reservation->details as $detail) {
                    if ($detail->room_id) {
                        Room::where('id', $detail->room_id)->update(['status' => 'DISPONIBLE']);
                    }
                }
                
                Log::info("⛔ Pago ONLINE rechazado y reserva cancelada ID: {$id}");
            });

            return back()->with('success', 'El comprobante ha sido rechazado y las habitaciones fueron liberadas.');

        } catch (\Exception $e) {
            Log::error("❌ Error rechazando pago de reserva {$id}: " . $e->getMessage());
            return back()->withErrors(['error' => 'No se pudo rechazar el comprobante.']);
        }
    }
}