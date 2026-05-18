<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Checkin;
use App\Models\SignificantEvent;
use App\Services\SiatService;
use App\Services\SiatXmlBuilder;
use App\Models\SiatCredential;
use App\Exceptions\SiatOfflineException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Exception;
use FPDF;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class InvoiceController extends Controller
{
    protected SiatService $siatService;

    public function __construct(SiatService $siatService)
    {
        $this->siatService = $siatService;
    }

    // =========================================================
    // LISTADO
    // =========================================================

    /**
     * Listado de facturas.
     * Mapea cada factura al formato que consume el front (props del index.tsx).
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

                    // En la UI, control_code se usa para distinguir factura vs recibo.
                    // Para facturas SIAT, devolvemos el CUF (que sí distingue).
                    // Para recibos legacy, devolvemos "-".
                    'control_code'    => !empty($invoice->cuf) ? $invoice->cuf : ($invoice->control_code ?? '-'),

                    'payment_method'  => $invoice->payment_method ?? 'EF',
                    'status'          => $invoice->status ?? 'valid',
                    'siat_status'     => $invoice->siat_status ?? 'N/A',

                    'guest_name'      => $invoice->customer_name
                        ?? optional($invoice->checkin?->guest)->full_name
                        ?? 'Sin Huésped',
                    'room_number'     => optional($invoice->checkin?->room)->number ?? '-',
                    'user_name'       => optional($invoice->user)->name ?? 'Desconocido',

                    // Flags para la UI
                    'is_factura'      => !empty($invoice->cuf),
                    'is_offline'      => $invoice->siat_status === 'offline',
                    'is_voided'       => $invoice->status === 'voided',
                    'can_void'        => $this->canBeVoided($invoice),
                    'can_resend'      => $this->canBeResent($invoice),
                ];
            });

        return Inertia::render('invoices/index', [
            'Invoices' => $invoices,
        ]);
    }

    // =========================================================
    // PREVIA (sin cambios)
    // =========================================================

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

    // =========================================================
    // EMISIÓN MANUAL (también aplica doble fase)
    // =========================================================

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

        // -----------------------------------------------------
        // FASE 1 — persistir la factura
        // -----------------------------------------------------
        try {
            $invoice = DB::transaction(function () use ($request) {
                $checkin = Checkin::with(['room.price', 'services', 'guest'])
                    ->findOrFail($request->checkin_id);

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

                $activeEvent = SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)
                    ->latest('start_at')
                    ->first();

                $invoice = Invoice::create([
                    'checkin_id'           => $checkin->id,
                    'invoice_number'       => (Invoice::max('invoice_number') ?? 0) + 1,
                    'control_code'         => '-',
                    'payment_method'       => $this->paymentCodeToAcronym((int) $request->payment_method_code),
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
                    'description' => "Servicio de Hospedaje Habitación {$checkin->room->number}",
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

                return $invoice;
            });
        } catch (Exception $e) {
            Log::error("Error Facturación FASE 1 (persistencia): " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al generar la factura: ' . $e->getMessage()]);
        }

        // -----------------------------------------------------
        // FASE 2 — intentar emitir al SIAT
        // -----------------------------------------------------
        try {
            $this->emitToSiat($invoice);
        } catch (SiatOfflineException $e) {
            // Contingencia LEGÍTIMA: el SIAT no responde por red/SOAP.
            // La factura es válida y se reenviará luego.
            Log::warning("Factura #{$invoice->invoice_number} en modo offline (SIAT inaccesible): " . $e->getMessage());
            $invoice->update(['siat_status' => 'offline']);
        } catch (\Throwable $e) {
            // Error de NUESTRO código (SiatXmlBuilder, variable inexistente,
            // datos faltantes, CUFD inválido, etc.). NO es contingencia.
            // No se marca offline: se deja en estado 'error' para revisión.
            Log::error("Error Facturación FASE 2 (código interno) factura #{$invoice->id}: " . $e->getMessage(), [
                'exception' => get_class($e),
                'trace'     => $e->getTraceAsString(),
            ]);

            $invoice->update(['siat_status' => 'error']);

            return redirect()
                ->route('invoices.index')
                ->with('error', 'La factura se registró pero falló la generación fiscal (error interno). '
                    . 'Revise los datos del Huésped o las credenciales SIAT antes de reintentar.');
        }

        $invoice->refresh();

        $msg = match ($invoice->siat_status) {
            'accepted' => 'Factura electrónica generada y aceptada por SIAT.',
            'offline'  => 'Factura guardada en modo Offline (contingencia). Podrá reenviarse luego.',
            'rejected' => 'La factura fue rechazada por SIAT. Revise los datos.',
            'error'    => 'La factura se registró pero hubo un error interno al generarla.',
            default    => 'Factura emitida.',
        };

        return redirect()->route('invoices.index')->with(
            $invoice->siat_status === 'accepted' ? 'success' : 'warning',
            $msg
        );
    }

    // =========================================================
    // ANULACIÓN
    // =========================================================

    /**
     * Anula una factura previamente emitida.
     * Solo el Gerente (rol con permiso 'void') puede ejecutarla.
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

            // SIAT aceptó la anulación
            if (($resp['status'] ?? null) === 'voided') {
                $invoice->update([
                    'status'            => 'voided',
                    'void_reason_code'  => (int) $request->input('void_reason_code'),
                    'voided_at'         => now(),
                    'voided_by_user_id' => Auth::id(),
                ]);
                return back()->with('success', 'Factura anulada correctamente en el SIAT.');
            }

            // Caso: el SIAT responde "ya anulada" -> sincronizamos local
            $mensaje = strtolower($resp['mensaje'] ?? '');
            if (str_contains($mensaje, 'ya anulada') || str_contains($mensaje, 'previamente anulada')) {
                $invoice->update([
                    'status'            => 'voided',
                    'void_reason_code'  => (int) $request->input('void_reason_code'),
                    'voided_at'         => now(),
                    'voided_by_user_id' => Auth::id(),
                ]);
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
     * Revierte la anulación (dentro de la ventana permitida).
     */
    public function reverseVoid(Request $request, Invoice $invoice)
    {
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

            if (($response['status'] ?? null) !== 'valid') {
                return back()->withErrors([
                    'error' => 'SIAT rechazó la reversión: ' . ($response['mensaje'] ?? 'sin mensaje'),
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
    // RE-ENVÍO OFFLINE (paquete de contingencia)
    // =========================================================

    /**
     * Re-envía al SIAT una factura que quedó en estado 'offline'.
     *
     * Usa el XML/GZIP previamente guardado si está disponible, o lo
     * reconstruye con el CUFD vigente. El checkout NO se ve afectado:
     * solo cambia `siat_status` y, si aplica, `cuf` / `siat_reception_code`.
     */
    public function resendOffline(Invoice $invoice)
    {
        return redirect()->route('invoices.index')
            ->with('warning', 'Las facturas offline deben enviarse empaquetadas (Etapa VI). Esto se implementará en la siguiente fase de pruebas.');
    }

    // =========================================================
    // VISTA / PDF
    // =========================================================

    public function show(Invoice $invoice)
    {
        $invoice->load(['details.service', 'checkin.guest', 'checkin.room', 'user']);

        return view('invoices.ticket', [
            'invoice'     => $invoice,
            'status'      => $invoice->status,
            'siat_status' => $invoice->siat_status,
            'is_offline'  => $invoice->siat_status === 'offline',
            'is_voided'   => $invoice->status === 'voided',
        ]);
    }

    public function downloadTicket(Invoice $invoice)
    {
        $invoice->load(['details', 'checkin.guest', 'user']);

        // 1. QR del SIAT
        $qrContent = "https://pilotosiat.impuestos.gob.bo/consulta/QR?nit=" . config('siat.nit') .
            "&cuf=" . $invoice->cuf . "&numero=" . $invoice->invoice_number . "&t=" . $invoice->total_amount;

        $qrFilename = "qr_temp_{$invoice->id}.png";
        $qrPath = storage_path("app/public/{$qrFilename}");
        // QrCode::format('png')->size(150)->margin(0)->generate($qrContent, $qrPath);

        // 2. FPDF
        $pdf = new Fpdf('P', 'mm', [80, 250]);
        $pdf->AddPage();
        $pdf->SetMargins(4, 5, 4);
        $pdf->SetAutoPageBreak(true, 5);

        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('HOTEL SAN ANTONIO'), 0, 1, 'C');
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, utf8_decode('NIT: ' . config('siat.nit', '000000000')), 0, 1, 'C');
        $pdf->Cell(0, 4, utf8_decode('FACTURA N°: ' . $invoice->invoice_number), 0, 1, 'C');
        $pdf->Cell(0, 4, utf8_decode('Cód. Autorización (CUF):'), 0, 1, 'C');
        $pdf->SetFont('Arial', '', 7);
        $pdf->MultiCell(0, 3, $invoice->cuf, 0, 'C');
        $pdf->Ln(3);

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
        $pdf->Cell(0, 0, '', 'T', 1);
        $pdf->Ln(2);

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
            $pdf->MultiCell(45, 4, utf8_decode($item->description), 0, 'L');
            $newY = $pdf->GetY();
            $pdf->SetXY($x + 45, $y);
            $pdf->Cell(10, 4, number_format($item->quantity, 0), 0, 0, 'C');
            $pdf->Cell(17, 4, number_format($item->cost, 2), 0, 1, 'R');
            $pdf->SetY($newY + 1);
        }

        $pdf->Cell(0, 0, '', 'T', 1);
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(45, 5, 'TOTAL Bs.', 0, 0, 'R');
        $pdf->Cell(27, 5, number_format($invoice->total_amount, 2), 0, 1, 'R');
        $pdf->Ln(3);

        $pdf->SetFont('Arial', '', 7);
        if ($invoice->siat_status === 'offline') {
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->MultiCell(0, 3, utf8_decode('Este documento es la Representación Gráfica de un Documento Fiscal Digital emitido fuera de línea.'), 0, 'C');
            $pdf->Ln(2);
            $pdf->SetFont('Arial', '', 7);
        }

        $pdf->MultiCell(0, 3, utf8_decode(config('siat.leyenda', 'Ley N° 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados.')), 0, 'C');
        $pdf->Ln(3);

        if (file_exists($qrPath)) {
            $x_qr = ($pdf->GetPageWidth() - 30) / 2;
            $pdf->Image($qrPath, $x_qr, $pdf->GetY(), 30, 30, 'PNG');
            $pdf->Ln(32);
            unlink($qrPath);
        }

        $pdf->Cell(0, 4, utf8_decode('¡Gracias por su preferencia!'), 0, 1, 'C');

        $pdf->Output('I', "factura_{$invoice->invoice_number}.pdf");
        exit;
    }

    // =========================================================
    // HELPERS PRIVADOS
    // =========================================================

    /**
     * Construye y envía el XML al SIAT. Se llama SIEMPRE fuera de
     * cualquier DB::transaction (doble fase).
     */
    private function emitToSiat(Invoice $invoice): void
    {
        $invoice->load(['details', 'checkin.guest', 'user']);

        // --- Resolver el CUFD vigente ---
        // Si hay un Evento Significativo activo, se usa su CUFD de contingencia.
        // En caso contrario, se obtiene el CUFD vigente de siat_credentials.
        $activeEvent = SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)
            ->latest('start_at')
            ->first();

        if ($activeEvent) {
            // CUFD del evento: lo envolvemos en un SiatCredential transitorio
            // para que SiatXmlBuilder reciba siempre el mismo tipo.
            $cufd = new SiatCredential([
                'type'           => 'CUFD',
                'code'           => $activeEvent->cufd_event,
                'control_code'   => $activeEvent->cufd_event_control_code,
                'fecha_vigencia' => $activeEvent->cufd_event_vigencia
                    ?? now()->addDay(), // el CUFD del evento se considera vigente durante la contingencia
            ]);
        } else {
            // CUFD vigente desde la nueva arquitectura de credenciales.
            $cufd = $this->siatService->getActiveCufd();

            if (!$cufd instanceof SiatCredential) {
                // No es contingencia de red: es un problema de configuración/credenciales.
                throw new Exception(
                    'No se pudo obtener un CUFD vigente desde siat_credentials '
                        . 'y no hay Evento Significativo activo.'
                );
            }
        }

        // --- Construir CUF + XML con el CUFD resuelto ---
        // Si el SiatXmlBuilder o el cálculo del CUF fallan, la excepción se
        // propaga como error de código (NO offline).
        $builder     = new SiatXmlBuilder($invoice, $cufd);
        $xmlString   = $builder->buildXml();
        $gzipArchive = $builder->getGzipArchive();
        $cuf         = $builder->generateCuf();
        $hash        = hash('sha256', $xmlString);

        $invoice->update([
            'cuf'       => $cuf,
            'cufd_code' => $cufd->code,
        ]);

        // --- CASO A: contingencia activa -> guardar offline directamente ---
        if ($activeEvent) {
            $path = $this->storeOfflineXml($gzipArchive, $invoice);
            $invoice->update([
                'siat_status'      => 'offline',
                'offline_xml_path' => $path,
            ]);
            return;
        }

        // --- CASO B: online -> enviar al SIAT ---
        $cuis = $this->siatService->getActiveCuis();
        if (!$cuis) {
            // Sin CUIS no es un fallo de red puntual: es un problema de credenciales.
            throw new Exception('No se pudo obtener un CUIS activo para emitir la factura.');
        }

        $response = $this->siatService->receiveInvoice(
            $cuis,
            $cufd->code,
            $gzipArchive,
            now()->format('Y-m-d\TH:i:s.v'),
            $hash
        );

        // --- CASO C: SIAT inalcanzable (fallo de red/SOAP comprobado) ---
        // SiatService ya distinguió red vs rechazo lógico vía isNetworkFailure().
        // Solo aquí se autoriza el modo offline: lanzamos la excepción tipada.
        if (($response['status'] ?? null) === 'offline') {
            $path = $this->storeOfflineXml($gzipArchive, $invoice);
            $invoice->update([
                'siat_status'      => 'offline',
                'offline_xml_path' => $path,
            ]);

            throw new SiatOfflineException(
                'SIAT inaccesible al emitir la factura #' . $invoice->invoice_number
                    . ': ' . ($response['mensaje'] ?? 'sin detalle')
            );
        }

        // --- Aceptada ---
        if (($response['status'] ?? null) === 'accepted') {
            $invoice->update([
                'siat_status'         => 'accepted',
                'siat_reception_code' => $response['codigoRecepcion'] ?? null,
            ]);
            return;
        }

        // --- Rechazo lógico del SIAT (datos inválidos): NO es offline ---
        $invoice->update(['siat_status' => 'rejected']);
        Log::warning("Factura #{$invoice->invoice_number} rechazada por SIAT: " . ($response['mensaje'] ?? ''));
    }

    /**
     * Guarda el GZIP del XML en disco para reenvío posterior.
     */
    private function storeOfflineXml(string $gzipArchive, Invoice $invoice): string
    {
        $fileName = "factura_offline_{$invoice->invoice_number}_" . time() . ".xml.gz";
        $path = "siat/offline/{$fileName}";
        \Illuminate\Support\Facades\Storage::disk('local')->put($path, $gzipArchive);
        return $path;
    }

    /**
     * ¿Esta factura puede ser anulada por el Gerente?
     * Reglas: válida + aceptada por SIAT + dentro de la ventana legal.
     */
    private function canBeVoided(Invoice $invoice): bool
    {
        if ($invoice->status !== 'valid') {
            return false;
        }
        if ($invoice->siat_status !== 'accepted') {
            return false;
        }
        if (empty($invoice->cuf)) {
            return false;
        }

        $windowHours = config('siat.void_window_hours', 1080);
        return $invoice->issue_time && $invoice->issue_time->diffInHours(now()) <= $windowHours;
    }

    /**
     * ¿Esta factura puede ser re-enviada al SIAT?
     */
    private function canBeResent(Invoice $invoice): bool
    {
        return $invoice->siat_status === 'offline';
    }

    /**
     * Mapeo: catálogo SIAT (entero) -> acrónimo de caja (varchar(2)).
     */
    private function paymentCodeToAcronym(int $code): string
    {
        return match ($code) {
            1       => 'EF', // Efectivo
            2       => 'TC', // Tarjeta de crédito
            6       => 'TR', // Transferencia
            7       => 'QR', // QR / pago digital
            default => 'EF',
        };
    }
}
