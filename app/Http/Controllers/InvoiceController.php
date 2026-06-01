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
                    'is_orphaned' => $invoice->siat_status === 'offline' && is_null($invoice->significant_event_id),
                ];
            });

        $orphanedOfflineCount = Invoice::where('siat_status', 'offline')
            ->whereNull('significant_event_id')
            ->count();

        return Inertia::render('invoices/index', [
            'Invoices'             => $invoices,
            'hasOrphanedOffline'   => $orphanedOfflineCount > 0,
            'orphanedOfflineCount' => $orphanedOfflineCount,
        ]);
    }
    private function mapInvoiceForFrontend(Invoice $invoice): array
    {
        return [
            'id'             => $invoice->id,
            'invoice_number' => $invoice->invoice_number ?? 'S/N',
            // ... el resto de campos que ya tenías ...
            'is_orphaned'    => $invoice->is_orphaned,  // <- usa el accesor
        ];
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
            // Datos del cliente editables (opcionales). Si vienen, sobrescriben los del huésped.
            // Útil cuando el cliente factura a nombre de otra persona/empresa.
            'customer_name'       => 'nullable|string|max:255',
            'customer_nit'        => 'nullable|string|max:30',
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

                // ============== DATOS DEL CLIENTE (normativa SIN) ==============
                //
                // Prioridad:
                //   1. Si el frontend mandó customer_name / customer_nit, usarlos.
                //   2. Si no, tomarlos del huésped del checkin.
                //   3. Si después de eso quedan vacíos:
                //      - total ≤ Bs 1.000  → S/N + NIT 0 (válido por norma)
                //      - total >  Bs 1.000 → BLOQUEAR (la norma exige nominatividad real)
                //
                // Esto evita que la factura termine con NIT vacío o null, y que el PDF
                // muestre "0" sin que el sistema haya aplicado la regla del Bs 1.000.

                $rawName = trim((string) ($request->input('customer_name') ?? $checkin->guest->full_name ?? ''));
                $rawNit  = trim((string) ($request->input('customer_nit') ?? $checkin->guest->identification_number ?? ''));

                $customerName = strtoupper($rawName);
                $customerNit  = $rawNit;

                // Regla del Bs 1.000: si no hay datos reales y el monto lo supera, bloqueamos.
                $isAnonymous = ($customerNit === '' || $customerNit === '0'
                    || $customerName === '' || $customerName === 'S/N' || $customerName === 'SIN NOMBRE');

                if ($isAnonymous && $totalAmount > 1000) {
                    throw new Exception(
                        "El monto total (Bs " . number_format($totalAmount, 2) . ") supera Bs 1.000. " .
                        "La normativa SIN exige nombre y NIT/CI reales del comprador. " .
                        "Complete los datos del huésped antes de emitir la factura."
                    );
                }

                // Si está vacío y el monto es ≤ 1.000, aplicamos la regla S/N + NIT 0.
                if ($isAnonymous) {
                    $customerName = $customerName ?: 'S/N';
                    $customerNit  = $customerNit ?: '0';
                }

                $invoice = Invoice::create([
                    'checkin_id'           => $checkin->id,
                    'invoice_number'       => (Invoice::max('invoice_number') ?? 0) + 1,
                    'control_code'         => '-',
                    'payment_method'       => $this->paymentCodeToAcronym((int) $request->payment_method_code),
                    'customer_name'        => $customerName,
                    'customer_nit'         => $customerNit,
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

            // getActiveCufd() retorna un modelo SiatCredential (no un array).
            // El campo es ->code, no ['codigo'].
            $resp = $this->siatService->voidInvoice(
                $cuis,
                $cufdData->code,
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

            // Detectar respuestas de timeout/503/conectividad y dar mensaje amigable
            $mensaje = $resp['mensaje'] ?? '';
            if ($this->isSiatUnavailableMessage($mensaje)) {
                return back()->withErrors([
                    'error' => 'El SIAT no respondió a tiempo (servicio temporalmente no disponible). '
                             . 'Espere unos minutos e intente anular nuevamente. La factura sigue VÁLIDA.',
                ]);
            }

            return back()->withErrors(['error' => 'El SIAT rechazó la anulación: ' . ($mensaje ?: 'sin mensaje')]);
        } catch (\Throwable $e) {
            Log::error("Error en anulación de factura {$invoice->id}: " . $e->getMessage());

            // Mensajes amigables para fallos de conectividad
            if ($this->isSiatUnavailableMessage($e->getMessage())) {
                return back()->withErrors([
                    'error' => 'El SIAT no respondió a tiempo (servicio temporalmente no disponible). '
                             . 'Espere unos minutos e intente anular nuevamente. La factura sigue VÁLIDA.',
                ]);
            }

            return back()->withErrors(['error' => 'Error al anular: ' . $e->getMessage()]);
        }
    }

    /**
     * Determina si un mensaje de error indica caída/lentitud del SIAT.
     * Se usa para devolver mensajes amigables al usuario en vez de stack traces técnicos.
     */
    protected function isSiatUnavailableMessage(string $message): bool
    {
        if ($message === '') return false;
        $patterns = [
            '503',
            'Service Temporarily Unavailable',
            'Service Unavailable',
            'TimeoutException',
            'Request timeout',
            'connection timed out',
            'cURL error 28',     // libcurl: operación expiró
            'cURL error 7',      // libcurl: no se pudo conectar
            'Could not connect',
            'no se pudo descargar el WSDL',
        ];
        foreach ($patterns as $needle) {
            if (stripos($message, $needle) !== false) {
                return true;
            }
        }
        return false;
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
                $cufdData->code,
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
    public function rescueOrphanedOffline(Request $request)
    {
        // 1) Buscar facturas huérfanas
        $orphans = Invoice::where('siat_status', 'offline')
            ->whereNull('significant_event_id')
            ->get();

        if ($orphans->isEmpty()) {
            return back()->with('info', 'No se encontraron facturas offline huérfanas para rescatar.');
        }

        // 2) Verificar conexión SIAT (informativo)
        $siatCheck     = $this->siatService->verifyCommunication();
        $siatOffline   = !($siatCheck['success'] ?? false);
        $warningFlash  = null;

        if ($siatOffline) {
            $warningFlash = 'No hay conexión con SIAT. Se creará el evento localmente de todos modos para rescatar las facturas. Se registrará en SIAT al cerrar el evento.';
            Log::warning('Rescate de huérfanas iniciado SIN conexión SIAT. Motivo: ' . ($siatCheck['message'] ?? 'desconocido'));
        }

        // 3) Validar que existe un CUFD almacenado (sin él no se puede crear el evento)
        $cufd = $this->siatService->peekActiveCufd();

        if (!$cufd) {
            return back()->withErrors([
                'error' => 'No hay un CUFD almacenado localmente. No es posible crear el Evento de Rescate.',
            ]);
        }

        try {
            DB::transaction(function () use ($orphans, $cufd, $request) {
                // 4) Crear evento de rescate. Tomamos como inicio la fecha de la
                //    factura huérfana MÁS ANTIGUA para que el rango cubra todas.
                $earliest = $orphans->min('issue_date') ?: now();

                $event = SignificantEvent::create([
                    'event_code'              => 7, // 7 = Otros casos de fuerza mayor (RND-102100000011)
                    'description'             => 'Evento de RESCATE creado automáticamente para vincular '
                        . $orphans->count()
                        . ' factura(s) offline huérfana(s).',
                    'start_at'                => $earliest,
                    'cufd_event'              => $cufd->code,
                    'cufd_event_control_code' => $cufd->control_code,
                    'cufd_event_expires_at'   => $cufd->expires_at,
                    'status'                  => SignificantEvent::STATUS_ACTIVE,
                    'user_id'                 => $request->user()->id,
                ]);

                // 5) Asignar en bloque el evento a las facturas huérfanas
                Invoice::whereIn('id', $orphans->pluck('id'))
                    ->update(['significant_event_id' => $event->id]);

                Log::info(
                    "Evento Significativo #{$event->id} (RESCATE) creado por usuario #{$request->user()->id}. "
                        . "Vinculó {$orphans->count()} factura(s) huérfana(s)."
                );
            });
        } catch (Exception $e) {
            Log::error('Error en rescate de facturas huérfanas: ' . $e->getMessage());
            return back()->withErrors([
                'error' => 'No se pudo crear el evento de rescate: ' . $e->getMessage(),
            ]);
        }

        $successMsg = "Se rescataron {$orphans->count()} factura(s) huérfana(s) "
            . "vinculándolas a un nuevo Evento Significativo. "
            . "Recuerde cerrar el evento desde Contingencias cuando vuelva la conexión.";

        $redirect = redirect()->route('invoices.index')->with('success', $successMsg);

        if ($warningFlash) {
            $redirect->with('warning', $warningFlash);
        }

        return $redirect;
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
        $invoice->load(['details.service', 'checkin.guest', 'checkin.payments', 'user']);
        $checkin = $invoice->checkin;

        $isOffline = $invoice->siat_status === 'offline';

        $controlCodeForPdf = $isOffline
            ? 'CONTINGENCIA'
            : (!empty($invoice->cuf)
                ? substr($invoice->cuf, 0, 8)
                : ($invoice->control_code ?? '-'));

        // --- RASTREO HISTÓRICO PARA FECHA DE INGRESO ---
        $originalCheckInDate = $checkin->check_in_date ?? now();
        if ($checkin) {
            $currentParentId = $checkin->parent_checkin_id;
            while ($currentParentId) {
                $parent = \App\Models\Checkin::find($currentParentId);
                if ($parent) {
                    $originalCheckInDate = $parent->check_in_date;
                    $currentParentId     = $parent->parent_checkin_id;
                } else {
                    break;
                }
            }
        }

        // --- CÁLCULO DE TOTALES ---
        $granTotal = (float) $invoice->total_amount;
        $adelantosPrevios = 0;

        if ($checkin && $checkin->payments->count() > 0) {
            $ultimoPagoId = $checkin->payments->last()->id;
            foreach ($checkin->payments as $pago) {
                $monto = ($pago->type === 'DEVOLUCION') ? -$pago->amount : $pago->amount;
                if ($pago->id !== $ultimoPagoId) {
                    $adelantosPrevios += $monto;
                }
            }
        }
        $saldoCobrar = $granTotal - $adelantosPrevios;

        // ============================================================
        // INICIO DEL PDF (Diseño igual al del Checkout)
        // ============================================================
        $pdf = new Fpdf('P', 'mm', array(80, 260));
        $pdf->SetMargins(4, 4, 4);
        $pdf->SetAutoPageBreak(true, 2);
        $pdf->AddPage();

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 4, 'HOTEL SAN ANTONIO', 0, 1, 'C');
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(0, 3, 'CASA MATRIZ', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 6);
        $pdf->Cell(0, 3, 'No. Punto de Venta 0', 0, 1, 'C');
        $pdf->Cell(0, 3, 'Calle 9 - Potosi', 0, 1, 'C');
        $pdf->Cell(0, 3, utf8_decode('Teléfono: 70461010'), 0, 1, 'C');
        $pdf->Cell(0, 3, 'BOLIVIA', 0, 1, 'C');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(0, 4, 'FACTURA', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 6);
        $pdf->Cell(0, 3, '(Con Derecho a Credito Fiscal)', 0, 1, 'C');

        if ($isOffline) {
            $pdf->Ln(1);
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(0, 3, utf8_decode('*** EMITIDA EN CONTINGENCIA ***'), 0, 1, 'C');
        }
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(30, 3, 'NIT:', 0, 0, 'R');
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(35, 3, config('siat.nit', '3327479013'), 0, 1, 'L');
        
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(30, 3, utf8_decode('FACTURA N°:'), 0, 0, 'R');
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(35, 3, str_pad($invoice->invoice_number, 5, '0', STR_PAD_LEFT), 0, 1, 'L');
        
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(30, 3, utf8_decode('CÓD. AUTORIZACIÓN:'), 0, 0, 'R');
        $pdf->SetFont('Arial', '', 7);
        // Si no tiene código de recepción aún (ej. offline), muestra pendiente.
        $codAuth = $isOffline ? 'PENDIENTE SIAT' : ($invoice->siat_reception_code ?? $invoice->cuf ?? '456123ABC');
        
        // Acortamos el texto si es muy largo para que no desborde (el CUF es inmenso)
        if (strlen($codAuth) > 25 && !$isOffline) {
             $pdf->MultiCell(42, 3, $codAuth, 0, 'L');
        } else {
             $pdf->Cell(35, 3, $codAuth, 0, 1, 'L');
        }

        $pdf->Ln(2);
        $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
        $pdf->Ln(1);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Fecha Emision:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, \Carbon\Carbon::parse($invoice->issue_time ?? now())->format('d/m/Y H:i:s'), 0, 1);
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(25, 4, 'Nom/Razon:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->MultiCell(0, 4, utf8_decode($invoice->customer_name ?? optional($checkin->guest)->full_name), 0, 'L');
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'NIT/CI:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, $invoice->customer_nit ?? optional($checkin->guest)->identification_number ?? '0', 0, 1);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Ingreso:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, \Carbon\Carbon::parse($originalCheckInDate)->format('d/m/Y H:i'), 0, 1);

        $pdf->Ln(1);
        $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
        $pdf->Ln(2);

        // --- TABLA DE DETALLE ---
        $pdf->SetFont('Arial', 'B', 6);
        $pdf->Cell(35, 3, 'DETALLE', 0, 0, 'L');
        $pdf->Cell(8, 3, 'CNT', 0, 0, 'C');
        $pdf->Cell(12, 3, 'P.UNIT', 0, 0, 'R');
        $pdf->Cell(17, 3, 'SUBTOT', 0, 1, 'R');
        $pdf->Ln(3);

        $pdf->SetFont('Arial', '', 6);

        foreach ($invoice->details as $detail) {
            $pdf->Cell(35, 3, utf8_decode(substr($detail->description, 0, 22)), 0, 0, 'L');
            $pdf->Cell(8, 3, (int) $detail->quantity, 0, 0, 'C');
            $pdf->Cell(12, 3, number_format($detail->unit_price, 2), 0, 0, 'R');
            $pdf->Cell(17, 3, number_format($detail->cost, 2), 0, 1, 'R');
        }

        $pdf->Ln(2);
        $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
        $pdf->Ln(2);

        // --- TOTALES ---
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(50, 4, 'TOTAL GENERAL Bs:', 0, 0, 'R');
        $pdf->Cell(22, 4, number_format($granTotal, 2), 0, 1, 'R');

        $pdf->SetFont('Arial', '', 7);
        if ($adelantosPrevios > 0) {
            $pdf->Cell(50, 4, '(-) Pagos Anticipados:', 0, 0, 'R');
            $pdf->Cell(22, 4, number_format($adelantosPrevios, 2), 0, 1, 'R');
        }

        $pdf->Ln(1);
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(50, 5, 'TOTAL A PAGAR Bs:', 0, 0, 'R');
        $pdf->Cell(22, 5, number_format($saldoCobrar, 2), 0, 1, 'R');

        $pdf->Ln(2);
        $pdf->SetFont('Arial', '', 7);
        
        // Instanciamos el controller viejo solo para usar su funcion conversora
        $checkinCtrl = app(\App\Http\Controllers\CheckinController::class);
        $montoLetras = $this->invokeConvertirNumeroALetras($granTotal); // Usamos un helper interno
        $pdf->MultiCell(0, 4, 'Son: ' . utf8_decode($montoLetras), 0, 'L');

        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'B', 6);
        $pdf->Cell(35, 3, utf8_decode('IMPORTE BASE CRÉDITO FISCAL:'), 0, 0, 'L');
        $pdf->Cell(0, 3, number_format($granTotal, 2), 0, 1, 'R');

        $pdf->Ln(2);
        $pdf->Cell(0, 3, utf8_decode('CÓDIGO DE CONTROL: ' . $controlCodeForPdf), 0, 1, 'C');
        $pdf->Ln(2);

        // QR Dinámico del SIAT
        $qrContent = "https://pilotosiat.impuestos.gob.bo/consulta/QR?nit=" . config('siat.nit') .
            "&cuf=" . $invoice->cuf . "&numero=" . $invoice->invoice_number . "&t=" . $invoice->total_amount;

        $qrFilename = "qr_temp_{$invoice->id}.png";
        $qrPath = storage_path("app/public/{$qrFilename}");
        
        // QrCode::format('png')->size(150)->margin(0)->generate($qrContent, $qrPath);
        // Si no tienes activado el generador en este controller, carga el logo base:
        $logoPath = public_path('images/qrCop.png');

        if (file_exists($logoPath) && !$isOffline) {
            $x = (80 - 22) / 2;
            $pdf->Image($logoPath, $x, $pdf->GetY(), 22, 22);
            $pdf->Ln(24);
        } else {
            $pdf->Ln(24);
        }

        $pdf->SetFont('Arial', 'B', 5);
        $pdf->MultiCell(0, 2.5, utf8_decode('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"'), 0, 'C');
        $pdf->Ln(1);
        $pdf->SetFont('Arial', '', 5);
        $pdf->MultiCell(0, 2.5, utf8_decode('Ley N° 453: Tienes derecho a recibir información correcta, veraz, oportuna y completa sobre las características y contenidos de los productos que compras.'), 0, 'C');

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="factura-' . $invoice->invoice_number . '.pdf"');
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

    /**
     * Crea un Evento Significativo (descrito por el Gerente) y vincula
     * en bloque TODAS las facturas offline huérfanas existentes.
     */
    public function rescueOrphans(Request $request)
    {
        $request->validate([
            'event_code'  => 'required|integer|min:1|max:7',
            'description' => 'required|string|min:10|max:500',
        ]);

        $orphans = Invoice::orphanedOffline()->get();

        if ($orphans->isEmpty()) {
            return back()->with('info', 'No hay facturas huérfanas para rescatar.');
        }

        if (SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)->exists()) {
            return back()->withErrors([
                'error' => 'Ya hay una contingencia activa. Use "Acoplar" en cada factura para vincularlas a ella.',
            ]);
        }

        $cufd = $this->siatService->peekActiveCufd();
        if (!$cufd) {
            return back()->withErrors([
                'error' => 'No hay CUFD almacenado. No es posible crear la contingencia.',
            ]);
        }

        try {
            $event = DB::transaction(function () use ($request, $orphans, $cufd) {
                $event = SignificantEvent::create([
                    'event_code'              => $request->event_code,
                    'description'             => $request->description,
                    'start_at'                => $orphans->min('issue_date') ?? now(),
                    'cufd_event'              => $cufd->code,
                    'cufd_event_control_code' => $cufd->control_code,
                    'cufd_event_expires_at'   => $cufd->expires_at,
                    'status'                  => SignificantEvent::STATUS_ACTIVE,
                    'user_id'                 => $request->user()->id,
                ]);

                Invoice::whereIn('id', $orphans->pluck('id'))
                    ->update(['significant_event_id' => $event->id]);

                Log::info("Evento #{$event->id} creado para rescate. Vinculó {$orphans->count()} facturas.");
                return $event;
            });
        } catch (Exception $e) {
            Log::error('Error rescate: ' . $e->getMessage());
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        return redirect()->route('invoices.index')->with(
            'success',
            "Contingencia #{$event->id} creada con {$orphans->count()} factura(s) vinculadas."
        );
    }
    // --- FUNCIÓN MANUAL PARA NÚMERO A LETRAS ---
    private function invokeConvertirNumeroALetras($monto)
    {
        $monto = floatval($monto);
        $entero = floor($monto);
        $centavos = round(($monto - $entero) * 100);
        $letras = $this->enteroALetras($entero);
        return ucfirst($letras) . ' ' . str_pad($centavos, 2, '0', STR_PAD_LEFT) . '/100 Bolivianos';
    }

    private function enteroALetras($num)
    {
        if ($num == 0) return 'cero';
        $unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        $decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        $diez_y = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];
        $veinti = ['veinte', 'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'];
        $centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
        if ($num < 10) return $unidades[$num];
        if ($num < 20) return $diez_y[$num - 10];
        if ($num < 30) return $veinti[$num - 20];
        if ($num < 100) {
            $d = (int) floor($num / 10);
            $u = $num % 10;
            return $decenas[$d] . ($u > 0 ? ' y ' . $unidades[$u] : '');
        }
        if ($num == 100) return 'cien';
        if ($num < 1000) {
            $c = (int) floor($num / 100);
            $resto = $num % 100;
            return $centenas[$c] . ($resto > 0 ? ' ' . $this->enteroALetras($resto) : '');
        }
        if ($num == 1000) return 'mil';
        if ($num < 2000) {
            return 'mil ' . $this->enteroALetras($num % 1000);
        }
        if ($num < 1000000) {
            $m = (int) floor($num / 1000);
            $resto = $num % 1000;
            $miles = ($m == 1) ? 'mil' : $this->enteroALetras($m) . ' mil';
            return $miles . ($resto > 0 ? ' ' . $this->enteroALetras($resto) : '');
        }
        return 'numero grande';
    }

    // =========================================================
    //  REVALIDACIÓN Y CORRECCIÓN DE FACTURAS (post-SIAT)
    // =========================================================

    /**
     * Revalida una factura RECHAZADA u OFFLINE reenviándola al SIAT.
     * - Mismo invoice_number
     * - CUF recalculado con timestamp actual
     * - Datos del cliente intactos
     */
    public function revalidate(Invoice $invoice)
    {
        if (!in_array($invoice->siat_status, ['rejected', 'offline'])) {
            return back()->withErrors([
                'error' => "Solo se pueden revalidar facturas rechazadas u offline. Estado actual: {$invoice->siat_status}.",
            ]);
        }

        if ($invoice->status === 'voided') {
            return back()->withErrors([
                'error' => 'Una factura anulada no se revalida. Use "Corregir y Emitir Nueva".',
            ]);
        }

        try {
            $invoice->update([
                'siat_status'           => 'pending',
                'siat_rejection_reason' => null,
            ]);

            $this->emitToSiat($invoice);
            $invoice->refresh();

            $msg = match ($invoice->siat_status) {
                'accepted' => "Factura #{$invoice->invoice_number} revalidada y aceptada por SIAT.",
                'offline'  => "Factura #{$invoice->invoice_number} guardada en modo offline (SIAT inaccesible).",
                'rejected' => "El SIAT volvió a rechazar la factura: {$invoice->siat_rejection_reason}",
                default    => "Factura #{$invoice->invoice_number} reenviada.",
            };

            return back()->with('success', $msg);
        } catch (SiatOfflineException $e) {
            Log::warning("Revalidación factura #{$invoice->invoice_number} cayó offline: " . $e->getMessage());
            $invoice->update(['siat_status' => 'offline']);
            return back()->with('warning', 'Revalidación en modo offline (SIAT inaccesible).');
        } catch (\Throwable $e) {
            Log::error("Error revalidando factura #{$invoice->id}: " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al revalidar: ' . $e->getMessage()]);
        }
    }

    /**
     * Corrige factura ANULADA: crea una nueva con nombre/NIT editados.
     * La original queda anulada (normativa SIN: no se reutiliza).
     */
    public function correctAndReissue(Request $request, Invoice $invoice)
    {
        if ($invoice->status !== 'voided' && $invoice->siat_status !== 'rejected') {
            return back()->withErrors([
                'error' => 'Solo facturas anuladas o rechazadas pueden corregirse.',
            ]);
        }

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_nit'  => 'required|string|max:30',
        ]);

        $newName = strtoupper(trim($validated['customer_name']));
        $newNit  = trim($validated['customer_nit']);

        // Regla SIN del Bs 1.000
        $total = (float) $invoice->total_amount;
        $isAnonymous = ($newNit === '0' || $newName === 'S/N' || $newName === 'SIN NOMBRE' || $newName === '');

        if ($total > 1000 && $isAnonymous) {
            return back()->withErrors([
                'error' => "El monto total (Bs {$total}) supera Bs 1.000. La normativa exige nombre y NIT/CI reales.",
            ]);
        }

        try {
            $newInvoice = DB::transaction(function () use ($invoice, $newName, $newNit) {
                $activeEvent = SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)
                    ->latest('start_at')
                    ->first();

                $newInvoice = Invoice::create([
                    'checkin_id'           => $invoice->checkin_id,
                    'invoice_number'       => (Invoice::max('invoice_number') ?? 0) + 1,
                    'control_code'         => '-',
                    'payment_method'       => $invoice->payment_method,
                    'payment_method_code'  => $invoice->payment_method_code,
                    'customer_name'        => $newName,
                    'customer_nit'         => $newNit,
                    'issue_date'           => now()->format('Y-m-d'),
                    'issue_time'           => now(),
                    'user_id'              => request()->user()->id,
                    'total_amount'         => $invoice->total_amount,
                    'additional_discount'  => $invoice->additional_discount,
                    'total_subject_to_vat' => $invoice->total_subject_to_vat,
                    'status'               => 'valid',
                    'siat_status'          => 'pending',
                    'significant_event_id' => $activeEvent?->id,
                ]);

                foreach ($invoice->details as $detail) {
                    $newInvoice->details()->create([
                        'description' => $detail->description,
                        'quantity'    => $detail->quantity,
                        'unit_price'  => $detail->unit_price,
                        'cost'        => $detail->cost,
                    ]);
                }

                return $newInvoice;
            });
        } catch (\Throwable $e) {
            Log::error("Error clonando factura para corrección (origen #{$invoice->id}): " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al crear la factura corregida: ' . $e->getMessage()]);
        }

        try {
            $this->emitToSiat($newInvoice);
        } catch (SiatOfflineException $e) {
            Log::warning("Factura corregida #{$newInvoice->invoice_number} cayó offline: " . $e->getMessage());
            $newInvoice->update(['siat_status' => 'offline']);
        } catch (\Throwable $e) {
            Log::error("Error emitiendo factura corregida #{$newInvoice->id}: " . $e->getMessage());
        }

        $newInvoice->refresh();

        // Si la factura de origen estaba RECHAZADA (no anulada), la dejamos
        // marcada como anulada para que quede "muerta" y no se reutilice.
        if ($invoice->status !== 'voided') {
            $invoice->update([
                'status'     => 'voided',
                'voided_at'  => now(),
            ]);
        }

        $msg = match ($newInvoice->siat_status) {
            'accepted' => "Nueva factura #{$newInvoice->invoice_number} generada y aceptada por SIAT (reemplaza a #{$invoice->invoice_number} anulada).",
            'offline'  => "Nueva factura #{$newInvoice->invoice_number} guardada en modo offline.",
            'rejected' => "Nueva factura #{$newInvoice->invoice_number} fue rechazada por SIAT: {$newInvoice->siat_rejection_reason}",
            default    => "Nueva factura #{$newInvoice->invoice_number} emitida.",
        };

        return redirect()->route('invoices.index')->with('success', $msg);
    }
}