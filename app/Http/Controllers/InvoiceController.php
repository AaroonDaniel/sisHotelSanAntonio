<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Checkin;
use App\Services\SiatService;
use App\Services\SiatXmlBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Exception;

class InvoiceController extends Controller
{
    protected SiatService $siatService;

    // Inyectamos el servicio del SIAT en el constructor
    public function __construct(SiatService $siatService)
    {
        $this->siatService = $siatService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // 1. Obtenemos las facturas con sus relaciones
        $invoices = Invoice::with([
            'checkin.guest', 
            'checkin.room',  
            'user'           
        ])
        // FILTRO: Solo traemos facturas de estadías que YA finalizaron (no activos)
        ->whereHas('checkin', function ($query) {
            $query->where('status', '!=', 'activo'); 
        })
        ->orderBy('issue_date', 'desc')
        ->orderBy('issue_time', 'desc')
        ->get()
        ->map(function ($invoice) {
            return [
                'id' => $invoice->id,
                'checkin_id' => $invoice->checkin_id, // <-- IMPORTANTE: Lo necesitamos para el PDF
                'invoice_number' => $invoice->invoice_number ?? 'S/N',
                'issue_date' => $invoice->issue_date ? $invoice->issue_date->format('d/m/Y') : '-',
                'issue_time' => $invoice->issue_time ? $invoice->issue_time->format('H:i') : '-',
                'control_code' => $invoice->cuf ?? $invoice->control_code ?? '-', // Mostramos CUF si existe
                'payment_method' => $invoice->payment_method ?? 'No especificado',
                'status' => $invoice->status ?? 'Emitida',
                'siat_status' => $invoice->siat_status ?? 'N/A', // Estado del SIAT
                'guest_name' => $invoice->customer_name ?? ($invoice->checkin->guest->full_name ?? ($invoice->checkin->guest->name ?? 'Sin Huésped')), // Prioridad a Razón Social
                'room_number' => $invoice->checkin->room->number ?? '-',
                'user_name' => $invoice->user->name ?? 'Desconocido',
            ];
        });

        return Inertia::render('invoices/index', [
            'Invoices' => $invoices
        ]);
    }

    /**
     * Muestra los totales antes de confirmar el pago (Tu preview original mantenido)
     */
    public function preview(Checkin $checkin)
    {
        // 1. Calcular Noches (Alojamiento Actual)
        $fechaEntrada = \Carbon\Carbon::parse($checkin->check_in_date);
        $fechaSalida = now();
        $dias = $fechaEntrada->diffInDays($fechaSalida);
        if ($dias < 1) $dias = 1; // Mínimo 1 día si ya ocupó
        
        $precioHab = $checkin->room->price->amount ?? 0;
        $totalAlojamiento = $dias * $precioHab;

        // 2. Calcular Servicios Actuales
        $totalServicios = 0;
        foreach ($checkin->services as $service) {
            $totalServicios += ($service->pivot->quantity * $service->pivot->selling_price);
        }

        // 3. Saldo Arrastrado (Deuda de habitaciones anteriores)
        $saldoAnterior = $checkin->carried_balance ?? 0; 

        // 4. Adelantos (Pagos ya hechos en ESTA habitación)
        $totalPagado = $checkin->payments()->sum('amount');

        // 5. Gran Total
        $subtotal = $totalAlojamiento + $totalServicios + $saldoAnterior;
        $montoPagar = $subtotal - $totalPagado;

        return response()->json([
            'alojamiento' => $totalAlojamiento,
            'dias' => $dias,
            'servicios' => $totalServicios,
            'saldo_anterior' => $saldoAnterior, 
            'pagado_anticipado' => $totalPagado,
            'total_a_pagar' => $montoPagar
        ]);
    }

    /**
     * Store: Generar Factura Electrónica y Enviar al SIAT
     */
    public function store(Request $request)
    {
        $request->validate([
            'checkin_id' => 'required|exists:checkins,id',
            'customer_name' => 'required|string',
            'customer_nit' => 'required|string',
            'payment_method_code' => 'required|integer', 
            'additional_discount' => 'nullable|numeric|min:0',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                // 1. Calculamos totales reutilizando tu propia lógica de preview
                $checkin = Checkin::with(['room.price', 'services'])->findOrFail($request->checkin_id);
                
                $fechaEntrada = \Carbon\Carbon::parse($checkin->check_in_date);
                $dias = max(1, $fechaEntrada->diffInDays(now()));
                $precioHab = $checkin->room->price->amount ?? 0;
                
                $stayAmount = $dias * $precioHab;
                $servicesAmount = 0;

                foreach ($checkin->services as $service) {
                    $servicesAmount += ($service->pivot->quantity * $service->pivot->selling_price);
                }

                $totalAmount = $stayAmount + $servicesAmount + ($checkin->carried_balance ?? 0);
                $discount = $request->additional_discount ?? 0;
                $totalSubjectToIva = $totalAmount - $discount;

                // 2. Crear cabecera de Factura en la Base de Datos
                $invoice = Invoice::create([
                    'checkin_id' => $checkin->id,
                    'invoice_number' => (Invoice::max('invoice_number') ?? 0) + 1,
                    'customer_name' => strtoupper($request->customer_name),
                    'customer_nit' => $request->customer_nit,
                    'issue_date' => now()->format('Y-m-d'),
                    'issue_time' => now(),
                    'user_id' => auth()->$request->user()->id(),
                    'payment_method_code' => $request->payment_method_code,
                    'total_amount' => $totalAmount,
                    'additional_discount' => $discount,
                    'total_subject_to_vat' => $totalSubjectToIva,
                    'status' => 'valid',
                    'siat_status' => 'pending',
                ]);

                // 3. Crear detalles de Factura
                // Alojamiento
                $invoice->details()->create([
                    'description' => "Servicio de Hospedaje Habitación {$checkin->room->room_number}",
                    'quantity' => $dias,
                    'unit_price' => $precioHab,
                    'cost' => $stayAmount,
                ]);

                // Servicios Adicionales
                foreach ($checkin->services as $service) {
                    $invoice->details()->create([
                        'service_id' => $service->id,
                        'description' => $service->name,
                        'quantity' => $service->pivot->quantity,
                        'unit_price' => $service->pivot->selling_price,
                        'cost' => $service->pivot->quantity * $service->pivot->selling_price,
                    ]);
                }

                // 4. Integración SIAT: Construir XML
                $cufdData = $this->siatService->getActiveCufd();
                if (!$cufdData) throw new Exception("No se pudo obtener CUFD del SIAT.");

                $builder = new SiatXmlBuilder($invoice, $cufdData);
                $gzipArchive = $builder->getGzipArchive();
                $cuf = $builder->generateCuf();
                $hash = hash('sha256', $builder->buildXml());

                $invoice->update(['cuf' => $cuf]);

                // 5. Enviar XML a Impuestos
                $cuis = $this->siatService->getActiveCuis();
                $responseSiat = $this->siatService->receiveInvoice(
                    $cuis,
                    $cufdData['codigo'],
                    $gzipArchive,
                    now()->format('Y-m-d\TH:i:s.v'),
                    $hash
                );

                // 6. Validar la respuesta
                if (isset($responseSiat->RespuestaServicioFacturacion->transaccion) && $responseSiat->RespuestaServicioFacturacion->transaccion) {
                    $invoice->update([
                        'siat_status' => 'accepted',
                        'siat_reception_code' => $responseSiat->RespuestaServicioFacturacion->codigoRecepcion
                    ]);
                } else {
                    $invoice->update(['siat_status' => 'rejected']);
                    Log::warning("Factura SIAT Rechazada: " . json_encode($responseSiat));
                }

                return redirect()->route('invoices.index')->with('success', 'Factura electrónica generada.');
            });

        } catch (Exception $e) {
            Log::error("Error Facturación: " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al generar la factura: ' . $e->getMessage()]);
        }
    }
}