<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceDetail;
use App\Models\Checkin;
use App\Models\Payment;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class InvoiceController extends Controller
{
    // ... (El método previewCheckout se mantiene igual que antes) ...
    // En InvoiceController.php

    public function previewCheckout(Checkin $checkin)
    {
        // 1. Calcular Alojamiento Actual
        $entrada = Carbon::parse($checkin->check_in_date);
        $dias = $entrada->diffInDays(now());
        if ($dias < 1) $dias = 1;

        $precioHab = $checkin->room->price->amount ?? 0;
        $totalAlojamiento = $dias * $precioHab; // 80 Bs

        // 2. Calcular Servicios (Los que se movieron)
        $costoServicios = 0;
        foreach ($checkin->services as $service) {
            $cant = $service->pivot->quantity ?? 1;
            $precio = $service->pivot->selling_price ?? $service->price;
            $costoServicios += ($cant * $precio); // 53 Bs
        }

        // 3. Deuda Anterior (Ya tiene descontado el adelanto viejo)
        // Debería ser 130 Bs (260 deuda - 130 pagado)
        $saldoAnterior = $checkin->carried_balance;

        // 4. Adelantos NUEVOS (Si pagó algo más al llegar a la Hab 14)
        // OJO: No sumar los adelantos del checkin viejo, esos ya murieron.
        $totalPagadoNuevo = $checkin->payments()->sum('amount');

        // 5. Total Final
        $granTotal = $totalAlojamiento + $costoServicios + $saldoAnterior;
        $saldoPendiente = $granTotal - $totalPagadoNuevo;

        return response()->json([
            'details' => [
                'days' => $dias,
                'room_total' => $totalAlojamiento,      // 80
                'services_total' => $costoServicios,    // 53
                'carried_balance' => $saldoAnterior,    // 130
            ],
            'financials' => [
                'total_amount' => $granTotal,           // 263
                'paid_amount' => $totalPagadoNuevo,     // 0 (Si no dio más adelantos)
                'pending_amount' => $saldoPendiente     // 263
            ]
        ]);
    }

    /**
     * Guarda la factura y sus detalles estrictos
     */
    public function store(Request $request)
    {
        $request->validate([
            'checkin_id' => 'required|exists:checkins,id',
            'payment_method' => 'required|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
            'final_payment' => 'required|numeric|min:0',
            'nit' => 'nullable|string',
            'razon_social' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request) {
            $checkin = Checkin::lockForUpdate()->find($request->checkin_id);
            $userId = Auth::id();

            // --- 1. CÁLCULOS ---
            $entrada = Carbon::parse($checkin->check_in_date);
            $dias = $entrada->diffInDays(now());
            if ($dias < 1) $dias = 1;

            $precioHab = $checkin->room->price->amount ?? 0;
            $totalAlojamiento = $dias * $precioHab;
            $saldoAnterior = $checkin->carried_balance;

            // --- 2. CREAR CABECERA ---
            $invoice = Invoice::create([
                'checkin_id' => $checkin->id,
                'user_id' => $userId,
                'guest_id' => $checkin->guest_id,
                'nit' => $request->nit ?? '0',
                'razon_social' => strtoupper($request->razon_social ?? 'SIN NOMBRE'),
                'invoice_date' => now(),
                'status' => 'emitida',
                'total_amount' => 0, // Se calcula abajo
            ]);

            $acumuladoTotal = 0;

            // --- 3. GUARDAR DETALLES (Usando tus campos exactos) ---

            // A. Detalle: ALOJAMIENTO
            // Como no hay 'description', 'service_id' va NULL para indicar que es la habitación
            if ($totalAlojamiento > 0) {
                InvoiceDetail::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => null, // NULL indica "Concepto de Sistema" (Alojamiento)
                    'quantity' => $dias,
                    'unit_price' => $precioHab,
                    'cost' => $totalAlojamiento, // 'cost' es el subtotal
                ]);
                $acumuladoTotal += $totalAlojamiento;
            }

            // B. Detalle: DEUDA ANTERIOR (Transferencia)
            // También 'service_id' NULL. 
            // NOTA: Para diferenciarlo del alojamiento en la impresión, verifica si 'quantity' es 1 y el precio coincide
            if ($saldoAnterior != 0) {
                InvoiceDetail::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => null,
                    'quantity' => 1,
                    'unit_price' => $saldoAnterior,
                    'cost' => $saldoAnterior,
                ]);
                $acumuladoTotal += $saldoAnterior;
            }

            // C. Detalle: SERVICIOS
            foreach ($checkin->services as $service) {
                $cant = $service->pivot->quantity ?? 1;
                $precio = $service->pivot->selling_price ?? $service->price;
                $subtotal = $cant * $precio;

                InvoiceDetail::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $service->id, // Aquí SI guardamos el ID
                    'quantity' => $cant,
                    'unit_price' => $precio,
                    'cost' => $subtotal,
                ]);
                $acumuladoTotal += $subtotal;
            }

            // Actualizar total Cabecera
            $invoice->update(['total_amount' => $acumuladoTotal]);

            // --- 4. PAGO Y CIERRE ---
            if ($request->final_payment > 0) {
                Payment::create([
                    'checkin_id' => $checkin->id,
                    'user_id' => $userId,
                    'amount' => $request->final_payment,
                    'method' => $request->payment_method,
                    'description' => 'PAGO FINAL (CHECKOUT)',
                    'type' => 'PAGO'
                ]);
            }

            $checkin->update([
                'status' => 'finalizado',
                'check_out_date' => now(),
                'duration_days' => $dias,
            ]);

            Room::where('id', $checkin->room_id)->update(['status' => 'LIMPIEZA']);

            return redirect()->route('dashboard')->with('success', 'Checkout realizado correctamente.');
        });
    }
}
