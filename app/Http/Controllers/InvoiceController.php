<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Checkin;
use App\Models\SignificantEvent;
use App\Services\SiatService;
use App\Services\SiatXmlBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

use Illuminate\Support\Str;

use Inertia\Inertia;
use Exception;
use FPDF;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Storage;

class InvoiceController extends Controller
{
    protected SiatService $siatService;

    public function __construct(SiatService $siatService)
    {
        $this->siatService = $siatService;
    }

    /**
     * Listado de facturas.
     */
    public function index()
    {
        $invoices = Invoice::with(['checkin.guest', 'checkin.room', 'user'])
            ->whereHas('checkin', fn($q) => $q->where('status', '!=', 'activo'))
            ->orderBy('issue_date', 'desc')
            ->orderBy('issue_time', 'desc')
            ->get()
            ->map(function ($invoice) {
                return [
                    'id'              => $invoice->id,
                    'checkin_id'      => $invoice->checkin_id,
                    'invoice_number'  => $invoice->invoice_number ?? 'S/N',
                    'issue_date'      => $invoice->issue_date ? $invoice->issue_date->format('d/m/Y') : '-',
                    'issue_time'      => $invoice->issue_time ? $invoice->issue_time->format('H:i') : '-',
                    'control_code'    => $invoice->cuf ?? $invoice->control_code ?? '-',
                    'payment_method'  => $invoice->payment_method ?? 'No especificado',
                    'status'          => $invoice->status ?? 'Emitida',
                    'siat_status'     => $invoice->siat_status ?? 'N/A',
                    'guest_name'      => $invoice->customer_name
                        ?? optional($invoice->checkin->guest)->full_name
                        ?? 'Sin Huésped',
                    'room_number'     => $invoice->checkin->room->number ?? '-',
                    'user_name'       => $invoice->user->name ?? 'Desconocido',
                    'can_void'        => $this->canBeVoided($invoice),
                    'is_factura'      => !empty($invoice->cuf),
                ];
            });

        return Inertia::render('invoices/index', [
            'Invoices' => $invoices,
        ]);
    }

    /**
     * Previa de totales (sin cambios respecto a la versión original).
     */
    public function preview(Checkin $checkin)
    {
        $fechaEntrada = \Carbon\Carbon::parse($checkin->check_in_date);
        $dias = max(1, $fechaEntrada->diffInDays(now()));
        $precioHab = $checkin->room->price->amount ?? 0;
        $totalAlojamiento = $dias * $precioHab;

        $totalServicios = 0;
        foreach ($checkin->services as $service) {
            $totalServicios += ($service->pivot->quantity * $service->pivot->selling_price);
        }

        $saldoAnterior = $checkin->carried_balance ?? 0;
        $totalPagado   = $checkin->payments()->sum('amount');
        $subtotal      = $totalAlojamiento + $totalServicios + $saldoAnterior;
        $montoPagar    = $subtotal - $totalPagado;

        return response()->json([
            'alojamiento'       => $totalAlojamiento,
            'dias'              => $dias,
            'servicios'         => $totalServicios,
            'saldo_anterior'    => $saldoAnterior,
            'pagado_anticipado' => $totalPagado,
            'total_a_pagar'     => $montoPagar,
        ]);
    }

    /**
     * Emisión de factura con soporte de contingencia (offline fallback).
     */
    public function store(Request $request)
    {
        $request->validate([
            'checkin_id'          => 'required|exists:checkins,id',
            'payment_method_code' => 'required|integer',
            'additional_discount' => 'nullable|numeric|min:0',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                $checkin = Checkin::with(['room.price', 'services', 'guest'])
                    ->findOrFail($request->checkin_id);

                // Validación: datos fiscales SIEMPRE provienen del Huésped
                if (!$checkin->guest) {
                    throw new Exception('El check-in no tiene un Huésped asociado. No se puede emitir factura.');
                }

                $fechaEntrada = \Carbon\Carbon::parse($checkin->check_in_date);
                $dias         = max(1, $fechaEntrada->diffInDays(now()));
                $precioHab    = $checkin->room->price->amount ?? 0;
                $stayAmount   = $dias * $precioHab;

                $servicesAmount = 0;
                foreach ($checkin->services as $service) {
                    $servicesAmount += ($service->pivot->quantity * $service->pivot->selling_price);
                }

                $totalAmount       = $stayAmount + $servicesAmount + ($checkin->carried_balance ?? 0);
                $discount          = $request->additional_discount ?? 0;
                $totalSubjectToIva = $totalAmount - $discount;

                // Detectar contingencia activa
                $activeEvent = SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)
                    ->latest('start_at')
                    ->first();

                // CUFD: si hay contingencia, usar el CUFD del evento; si no, el actual
                if ($activeEvent) {
                    $cufdData = [
                        'codigo'        => $activeEvent->cufd_event,
                        'codigoControl' => $activeEvent->cufd_event_control_code,
                    ];
                } else {
                    $cufdData = $this->siatService->getActiveCufd();
                    if (!$cufdData) {
                        throw new Exception('No se pudo obtener CUFD del SIAT y no hay Evento Significativo activo.');
                    }
                }

                $invoice = Invoice::create([
                    'checkin_id'           => $checkin->id,
                    'invoice_number'       => (Invoice::max('invoice_number') ?? 0) + 1,
                    'customer_name'        => strtoupper($checkin->guest->full_name),
                    'customer_nit'         => $checkin->guest->identification_number,
                    'issue_date'           => now()->format('Y-m-d'),
                    'issue_time'           => now(),
                    'user_id'              => $request->user()->id,
                    'payment_method_code'  => $request->payment_method_code,
                    'total_amount'         => $totalAmount,
                    'additional_discount'  => $discount,
                    'total_subject_to_vat' => $totalSubjectToIva,
                    'status'               => 'valid',
                    'siat_status'          => 'pending',
                    'significant_event_id' => $activeEvent?->id,
                ]);

                $invoice->details()->create([
                    'description' => "Servicio de Hospedaje Habitación {$checkin->room->room_number}",
                    'quantity'    => $dias,
                    'unit_price'  => $precioHab,
                    'cost'        => $stayAmount,
                ]);

                foreach ($checkin->services as $service) {
                    $invoice->details()->create([
                        'service_id'  => $service->id,
                        'description' => $service->name,
                        'quantity'    => $service->pivot->quantity,
                        'unit_price'  => $service->pivot->selling_price,
                        'cost'        => $service->pivot->quantity * $service->pivot->selling_price,
                    ]);
                }

                $invoice->load('details', 'checkin.guest', 'user');

                // Construcción del XML
                $builder     = new SiatXmlBuilder($invoice, $cufdData);
                $xmlString   = $builder->buildXml();
                $gzipArchive = $builder->getGzipArchive();
                $cuf         = $builder->generateCuf();
                $hash        = hash('sha256', $xmlString);

                $invoice->update(['cuf' => $cuf]);

                // CASO A: Contingencia activa — guardar offline directamente
                if ($activeEvent) {
                    $path = $this->storeOfflineXml($gzipArchive, $invoice);
                    $invoice->update([
                        'siat_status'      => 'offline',
                        'offline_xml_path' => $path,
                    ]);

                    return redirect()
                        ->route('invoices.index')
                        ->with('warning', "Factura emitida en modo Contingencia (Evento #{$activeEvent->id}).");
                }

                // CASO B: Online — intentar envío al SIAT
                $cuis = $this->siatService->getActiveCuis();
                $response = $this->siatService->receiveInvoice(
                    $cuis,
                    $cufdData['codigo'],
                    $gzipArchive,
                    now()->format('Y-m-d\TH:i:s.v'),
                    $hash
                );

                // CASO C: SIAT no respondió (timeout / red caída) → fallback offline
                if ($response['status'] === 'offline') {
                    $path = $this->storeOfflineXml($gzipArchive, $invoice);
                    $invoice->update([
                        'siat_status'      => 'offline',
                        'offline_xml_path' => $path,
                    ]);

                    Log::warning("Factura #{$invoice->invoice_number} guardada offline por timeout SIAT.");

                    return redirect()
                        ->route('invoices.index')
                        ->with('warning', 'SIAT no respondió. Factura guardada para reenvío posterior.');
                }

                if ($response['status'] === 'accepted') {
                    $invoice->update([
                        'siat_status'         => 'accepted',
                        'siat_reception_code' => $response['codigoRecepcion'],
                    ]);
                } else {
                    $invoice->update(['siat_status' => 'rejected']);
                    Log::warning("Factura SIAT Rechazada: " . $response['mensaje']);
                }

                return redirect()
                    ->route('invoices.index')
                    ->with('success', 'Factura electrónica generada.');
            });
        } catch (Exception $e) {
            Log::error("Error Facturación: " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al generar la factura: ' . $e->getMessage()]);
        }
    }

    /**
     * Anula una factura previamente emitida.
     *
     * Solo el Gerente puede anular.
     */
    public function void(Request $request, Invoice $invoice)
    {
        $request->validate([
            'void_reason_code' => 'required|integer|min:1|max:99',
        ]);

        if ($invoice->status === 'voided') {
            return back()->with('info', 'La factura ya estaba anulada.');
        }

        if (empty($invoice->cuf)) {
            return back()->withErrors(['error' => 'La factura no tiene CUF, no se puede anular en el SIAT.']);
        }

        try {
            $cuis     = $this->siatService->getActiveCuis();
            $cufdData = $this->siatService->getActiveCufd();

            if (!$cuis || !$cufdData) {
                return back()->withErrors(['error' => 'No hay CUIS/CUFD vigente para anular.']);
            }

            $resp = $this->siatService->voidInvoice(
                $cuis,
                $cufdData['codigo'],
                $invoice->cuf,
                (int) $request->input('void_reason_code')
            );

            // El SIAT aprobó la anulación
            if (($resp['status'] ?? null) === 'voided') {
                $invoice->update(['status' => 'voided']);
                return back()->with('success', 'Factura anulada correctamente en el SIAT.');
            }

            // Caso especial: el SIAT puede responder "rechazado" con mensaje de que ya
            // estaba anulada (códigos 985/984 según catálogo). Lo tratamos como éxito.
            $mensaje = strtolower($resp['mensaje'] ?? '');
            if (str_contains($mensaje, 'ya anulada') || str_contains($mensaje, 'previamente anulada')) {
                $invoice->update(['status' => 'voided']);
                return back()->with('success', 'La factura ya estaba anulada en el SIAT; estado sincronizado localmente.');
            }

            Log::warning("Anulación rechazada para factura {$invoice->id}: " . ($resp['mensaje'] ?? ''));
            return back()->withErrors(['error' => 'El SIAT rechazó la anulación: ' . ($resp['mensaje'] ?? 'sin mensaje')]);
        } catch (\Throwable $e) {
            Log::error("Error en anulación de factura {$invoice->id}: " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al anular: ' . $e->getMessage()]);
        }
    }

    /**
     * Revierte la anulación de una factura (dentro de la ventana permitida).
     */
    public function reverseVoid(Request $request, Invoice $invoice)
    {
        $this->authorize('void', $invoice);

        if ($invoice->status !== 'voided') {
            return back()->withErrors(['error' => 'La factura no está anulada.']);
        }

        try {
            $cuis     = $this->siatService->getActiveCuis();
            $cufdData = $this->siatService->getActiveCufd();

            $response = $this->siatService->reverseVoidInvoice(
                $cuis,
                $cufdData['codigo'],
                $invoice->cuf
            );

            if ($response['status'] !== 'valid') {
                return back()->withErrors([
                    'error' => 'SIAT rechazó la reversión: ' . $response['mensaje'],
                ]);
            }

            $invoice->update([
                'status'            => 'valid',
                'siat_status'       => 'accepted',
                'void_reason_code'  => null,
                'voided_at'         => null,
                'voided_by_user_id' => null,
            ]);

            return redirect()
                ->route('invoices.index')
                ->with('success', "Anulación revertida para factura #{$invoice->invoice_number}.");
        } catch (Exception $e) {
            Log::error("Error en reversión: " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al revertir: ' . $e->getMessage()]);
        }
    }

    // =========================================================
    // HELPERS PRIVADOS
    // =========================================================

    /**
     * Guarda el GZIP del XML en disco para reenvío posterior.
     */
    private function storeOfflineXml(string $gzipArchive, Invoice $invoice): string
    {
        $filename = sprintf(
            'siat/offline/%s_%s_%s.gz',
            now()->format('Ymd'),
            $invoice->invoice_number,
            Str::random(8)
        );

        Storage::disk('local')->put($filename, $gzipArchive);

        return $filename;
    }

    /**
     * Determina si una factura puede ser anulada.
     * Reglas: estado válido + aceptada por SIAT + dentro de las 24h hábiles posteriores.
     */
    private function canBeVoided(Invoice $invoice): bool
    {
        if ($invoice->status !== 'valid') {
            return false;
        }

        if (!in_array($invoice->siat_status, ['accepted'])) {
            return false;
        }

        // Ventana de anulación: máximo configurable (por defecto 1080 hrs = 45 días)
        $windowHours = config('siat.void_window_hours', 1080);
        return $invoice->issue_time->diffInHours(now()) <= $windowHours;
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['details.service', 'checkin.guest', 'checkin.room', 'user']);

        return view('invoices.ticket', [
            'invoice'     => $invoice,
            'status'      => $invoice->status,        // 'valid' | 'voided'
            'siat_status' => $invoice->siat_status,   // 'pending' | 'accepted' | 'rejected' | 'offline'
            'is_offline'  => $invoice->siat_status === 'offline',
            'is_voided'   => $invoice->status === 'voided',
        ]);
    }
    public function downloadTicket(Invoice $invoice)
    {
        $invoice->load(['details', 'checkin.guest', 'user']);

        // 1. GENERAR EL QR Y GUARDARLO TEMPORALMENTE COMO IMAGEN
        // Formato SIAT: URL de consulta + Parámetros de la factura
        $qrContent = "https://pilotosiat.impuestos.gob.bo/consulta/QR?nit=" . config('siat.nit') . 
                     "&cuf=" . $invoice->cuf . "&numero=" . $invoice->invoice_number . "&t=" . $invoice->total_amount;
        
        $qrFilename = "qr_temp_{$invoice->id}.png";
        $qrPath = storage_path("app/public/{$qrFilename}");
        
        // Creamos la imagen PNG del QR
        //QrCode::format('png')->size(150)->margin(0)->generate($qrContent, $qrPath);

        // 2. CONFIGURAR FPDF (Tamaño 80mm de ancho x 250mm de alto aproximado)
        $pdf = new Fpdf('P', 'mm', [80, 250]);
        $pdf->AddPage();
        $pdf->SetMargins(4, 5, 4); // Márgenes muy estrechos para aprovechar el rollo
        $pdf->SetAutoPageBreak(true, 5);

        // --- ENCABEZADO ---
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('HOTEL SAN ANTONIO'), 0, 1, 'C');
        
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, utf8_decode('NIT: ' . config('siat.nit', '000000000')), 0, 1, 'C');
        $pdf->Cell(0, 4, utf8_decode('FACTURA N°: ' . $invoice->invoice_number), 0, 1, 'C');
        $pdf->Cell(0, 4, utf8_decode('Cód. Autorización (CUF):'), 0, 1, 'C');
        
        // El CUF suele ser muy largo, lo partimos con MultiCell
        $pdf->SetFont('Arial', '', 7);
        $pdf->MultiCell(0, 3, $invoice->cuf, 0, 'C');
        $pdf->Ln(3);

        // --- DATOS DEL HUÉSPED ---
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, 'Fecha:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, $invoice->issue_date->format('d/m/Y') . ' ' . $invoice->issue_time->format('H:i'), 0, 1);
        
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, utf8_decode('Señor(es):'), 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->MultiCell(0, 4, utf8_decode($invoice->customer_name), 0, 'L');

        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, 'NIT/CI:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, $invoice->customer_nit, 0, 1);
        
        $pdf->Ln(2);
        $pdf->Cell(0, 0, '', 'T', 1); // Línea divisoria
        $pdf->Ln(2);

        // --- DETALLE DE SERVICIOS ---
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(45, 4, 'Detalle', 0, 0, 'L');
        $pdf->Cell(10, 4, 'Cant.', 0, 0, 'C');
        $pdf->Cell(17, 4, 'Subt.', 0, 1, 'R');
        $pdf->Cell(0, 0, '', 'T', 1); 
        $pdf->Ln(1);

        $pdf->SetFont('Arial', '', 8);
        foreach ($invoice->details as $item) {
            $x = $pdf->GetX();
            $y = $pdf->GetY();
            // MultiCell para que la descripción baje de línea si es muy larga
            $pdf->MultiCell(45, 4, utf8_decode($item->description), 0, 'L');
            $newY = $pdf->GetY();
            // Volvemos a subir para colocar cantidad y costo
            $pdf->SetXY($x + 45, $y);
            $pdf->Cell(10, 4, number_format($item->quantity, 0), 0, 0, 'C');
            $pdf->Cell(17, 4, number_format($item->cost, 2), 0, 1, 'R');
            $pdf->SetY($newY + 1); // Empujamos el Y hacia abajo para la siguiente fila
        }
        
        $pdf->Cell(0, 0, '', 'T', 1); 
        $pdf->Ln(2);

        // --- TOTALES ---
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(45, 5, 'TOTAL Bs.', 0, 0, 'R');
        $pdf->Cell(27, 5, number_format($invoice->total_amount, 2), 0, 1, 'R');
        $pdf->Ln(3);

        // --- LEYENDAS SIAT ---
        $pdf->SetFont('Arial', '', 7);
        if ($invoice->siat_status === 'offline') {
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->MultiCell(0, 3, utf8_decode('Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido fuera de línea.'), 0, 'C');
            $pdf->Ln(2);
            $pdf->SetFont('Arial', '', 7);
        }

        $pdf->MultiCell(0, 3, utf8_decode(config('siat.leyenda', 'Ley N° 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados.')), 0, 'C');
        $pdf->Ln(3);

        // --- IMPRESIÓN DEL QR ---
        $x_qr = ($pdf->GetPageWidth() - 30) / 2; // Centrar el QR de 30x30mm
        $pdf->Image($qrPath, $x_qr, $pdf->GetY(), 30, 30, 'PNG');
        $pdf->Ln(32);

        $pdf->Cell(0, 4, utf8_decode('¡Gracias por su preferencia!'), 0, 1, 'C');

        // Borrar el QR temporal para no llenar el disco
        if(file_exists($qrPath)){
            unlink($qrPath);
        }

        // --- SALIDA DEL PDF ---
        // 'I' envía el PDF directamente al navegador sin descargarlo
        $pdf->Output('I', "factura_{$invoice->invoice_number}.pdf");
        exit;
    }
}
