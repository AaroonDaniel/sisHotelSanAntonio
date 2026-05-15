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
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Exception;

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
            ->whereHas('checkin', fn ($q) => $q->where('status', '!=', 'activo'))
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
     */public function void(\Illuminate\Http\Request $request, Invoice $invoice)
    {
        //$this->authorize('void', $invoice); // policy que valida rol Gerente

        $request->validate([
            'reason_code' => 'required|integer|min:1|max:99',
        ]);

        if (!$this->canBeVoided($invoice)) {
            return back()->withErrors([
                'error' => 'Esta factura no puede ser anulada (estado o ventana de tiempo no válida).',
            ]);
        }

        try {
            $cuis     = $this->siatService->getActiveCuis();
            $cufdData = $this->siatService->getActiveCufd();

            if (!$cuis || !$cufdData) {
                return back()->withErrors(['error' => 'No se pudo conectar con el SIAT.']);
            }

            $response = $this->siatService->voidInvoice(
                $cuis,
                $cufdData['codigo'],
                $invoice->cuf,
                (int) $request->reason_code
            );

            if ($response['status'] !== 'voided') {
                Log::warning("Anulación rechazada por SIAT: " . $response['mensaje']);
                return back()->withErrors([
                    'error' => 'SIAT rechazó la anulación: ' . $response['mensaje'],
                ]);
            }

            $invoice->update([
                'status'            => 'voided',
                'siat_status'       => 'voided',
                'void_reason_code'  => $request->reason_code,
                'voided_at'         => now(),
                'voided_by_user_id' => $request->user()->id,
            ]);

            return redirect()
                ->route('invoices.index')
                ->with('success', "Factura #{$invoice->invoice_number} anulada correctamente.");
        } catch (Exception $e) {
            Log::error("Error en anulación: " . $e->getMessage());
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
}