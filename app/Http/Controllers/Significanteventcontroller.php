<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\SignificantEvent;
use App\Services\SiatService;
use App\Services\SiatXmlBuilder;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Exception;

/**
 * Gestiona Eventos Significativos (contingencias) según RND-102100000011.
 *
 * Flujo corregido:
 *  1. Gerente abre el evento (start) → sistema empieza a emitir offline.
 *  2. Gerente cierra el evento (end) → se registra en SIAT y obtenemos
 *     un codigoRecepcionEvento.
 *  3. Sistema EMPAQUETA todas las facturas offline en un solo .tar.gz
 *     y lo envía con recepcionPaqueteFactura.
 *  4. Sistema valida el procesamiento con validacionRecepcionPaquete.
 */
class SignificantEventController extends Controller
{
    protected SiatService $siatService;

    public function __construct(SiatService $siatService)
    {
        $this->siatService = $siatService;
    }

    public function index()
    {
        $events = SignificantEvent::with('user')
            ->withCount('invoices')
            ->orderBy('start_at', 'desc')
            ->get()
            ->map(fn($e) => [
                'id'                  => $e->id,
                'event_code'          => $e->event_code,
                'code_label'          => $e->code_label,
                'description'         => $e->description,
                'start_at'            => $e->start_at->format('d/m/Y H:i'),
                'end_at'              => $e->end_at?->format('d/m/Y H:i'),
                'status'              => $e->status,
                'siat_reception_code' => $e->siat_reception_code,
                'invoices_count'      => $e->invoices_count,
                'user_name'           => $e->user->name ?? 'Desconocido',
            ]);

        $hasActiveEvent = SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)->exists();

        return Inertia::render('significant-events/index', [
            'events'         => $events,
            'hasActiveEvent' => $hasActiveEvent,
            'eventCodes'     => $this->getEventCodeOptions(),
        ]);
    }

    public function start(Request $request)
    {
        //$this->authorize('manage', SignificantEvent::class);

        $request->validate([
            'event_code'  => 'required|integer|min:1|max:7',
            'description' => 'required|string|max:500',
            'start_at'    => 'nullable|date',
        ]);

        if (SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)->exists()) {
            return back()->withErrors([
                'error' => 'Ya existe un Evento Significativo activo. Debe cerrarse antes de abrir otro.',
            ]);
        }

        // peekActiveCufd() lee en BD sin intentar renovar (estamos offline).
        $cufd = $this->siatService->peekActiveCufd();

        if (!$cufd) {
            return back()->withErrors([
                'error' => 'No hay un CUFD vigente almacenado. Sin CUFD no se puede operar offline.',
            ]);
        }

        $event = SignificantEvent::create([
            'event_code'              => $request->event_code,
            'description'             => $request->description,
            'start_at'                => $request->start_at ?? now(),
            'cufd_event'              => $cufd->code,
            'cufd_event_control_code' => $cufd->control_code,
            'cufd_event_expires_at'   => $cufd->expires_at,
            'status'                  => SignificantEvent::STATUS_ACTIVE,
            'user_id'                 => $request->user()->id,
        ]);

        Log::info("Evento Significativo #{$event->id} iniciado: {$event->code_label}");

        return redirect()
            ->route('significant-events.index')
            ->with('warning', 'Modo contingencia ACTIVO. Las facturas se guardarán offline.');
    }

    /**
     * Cierra el evento y lo registra en SIAT (paso previo al reenvío).
     */
    public function end(\Illuminate\Http\Request $request, \App\Models\SignificantEvent $event)
    {
        //$this->authorize('manage', \App\Models\SignificantEvent::class);

        if ($event->status !== \App\Models\SignificantEvent::STATUS_ACTIVE) {
            return back()->withErrors(['error' => 'Este evento no está activo.']);
        }

        $request->validate(['end_at' => 'nullable|date|after:start_at']);
        $endAt = $request->end_at ? \Carbon\Carbon::parse($request->end_at) : now();

        // PASO 1 — Cierre LOCAL (fuera de transacción, no se revierte).
        // Esto libera la contingencia inmediatamente: el CheckinController
        // dejará de buscar este evento como activo.
        $event->update([
            'end_at' => $endAt,
            'status' => \App\Models\SignificantEvent::STATUS_CLOSED,
        ]);

        // PASO 2 — Intentar registrar en SIAT.
        try {
            $this->siatService->invalidateCufdCache();
            $cufdActual = $this->siatService->getActiveCufd();

            if (!$cufdActual) {
                // No tenemos CUFD vigente (SIAT no responde a getCufd tampoco).
                // El evento queda CLOSED, se puede reintentar luego.
                return redirect()
                    ->route('significant-events.show', $event)
                    ->with(
                        'warning',
                        'Evento cerrado localmente. No se pudo obtener un CUFD vigente '
                            . 'para registrarlo en SIAT — reintente desde el detalle del evento '
                            . 'cuando SIAT responda.'
                    );
            }

            $response = $this->siatService->registerSignificantEvent(
                $event->event_code,
                $event->description,
                $event->start_at->format('Y-m-d\TH:i:s.v'),
                $event->end_at->format('Y-m-d\TH:i:s.v'),
                $event->cufd_event,
                $cufdActual->code
            );

            // 3 ramas posibles:
            switch ($response['status']) {
                case 'registered':
                    $event->update([
                        'status'              => \App\Models\SignificantEvent::STATUS_REGISTERED,
                        'siat_reception_code' => $response['codigoRecepcion'],
                        'registered_at'       => now(),
                    ]);
                    return redirect()
                        ->route('significant-events.show', $event)
                        ->with(
                            'success',
                            'Evento registrado en SIAT. Ahora puede reenviar el paquete '
                                . 'de facturas offline.'
                        );

                case 'rejected':
                    // Rechazo legítimo del SIAT: el evento queda FAILED para
                    // revisión manual (mal CUFD del evento, fechas inconsistentes, etc.).
                    $event->update([
                        'status' => \App\Models\SignificantEvent::STATUS_FAILED,
                    ]);
                    return back()->withErrors([
                        'error' => 'SIAT rechazó el registro del evento: ' . $response['mensaje'],
                    ]);

                case 'offline':
                default:
                    // SoapFault / red caída. NO marcar como failed: el evento queda
                    // CLOSED y puede reintentarse el registro más tarde.
                    \Illuminate\Support\Facades\Log::warning(
                        "Evento #{$event->id} cerrado localmente; SIAT no respondió: "
                            . $response['mensaje']
                    );
                    return redirect()
                        ->route('significant-events.show', $event)
                        ->with(
                            'warning',
                            'Evento cerrado localmente. SIAT no respondió en este momento '
                                . '— el sistema dejó de emitir offline. Reintente el registro '
                                . 'en SIAT cuando vuelva la conexión.'
                        );
            }
        } catch (\Throwable $e) {
            // Cualquier otra excepción no prevista. NO revertimos el cierre local.
            \Illuminate\Support\Facades\Log::error(
                "Error inesperado al cerrar evento #{$event->id}: " . $e->getMessage()
            );
            return redirect()
                ->route('significant-events.show', $event)
                ->with(
                    'warning',
                    'Evento cerrado localmente. Hubo un problema comunicándose con SIAT: '
                        . $e->getMessage()
                );
        }
    }

    public function retryRegister(\App\Models\SignificantEvent $event)
    {
        $this->authorize('manage', \App\Models\SignificantEvent::class);

        if ($event->status !== \App\Models\SignificantEvent::STATUS_CLOSED) {
            return back()->withErrors([
                'error' => 'Solo se puede reintentar el registro de eventos en estado CLOSED.',
            ]);
        }

        try {
            $this->siatService->invalidateCufdCache();
            $cufdActual = $this->siatService->getActiveCufd();

            if (!$cufdActual) {
                return back()->withErrors([
                    'error' => 'SIAT sigue sin responder (no se obtuvo CUFD). Intente más tarde.',
                ]);
            }

            $response = $this->siatService->registerSignificantEvent(
                $event->event_code,
                $event->description,
                $event->start_at->format('Y-m-d\TH:i:s.v'),
                $event->end_at->format('Y-m-d\TH:i:s.v'),
                $event->cufd_event,
                $cufdActual->code
            );

            if ($response['status'] === 'registered') {
                $event->update([
                    'status'              => \App\Models\SignificantEvent::STATUS_REGISTERED,
                    'siat_reception_code' => $response['codigoRecepcion'],
                    'registered_at'       => now(),
                ]);
                return back()->with('success', 'Evento registrado en SIAT correctamente.');
            }

            if ($response['status'] === 'rejected') {
                $event->update(['status' => \App\Models\SignificantEvent::STATUS_FAILED]);
                return back()->withErrors([
                    'error' => 'SIAT rechazó el registro: ' . $response['mensaje'],
                ]);
            }

            // offline
            return back()->withErrors([
                'error' => 'SIAT aún no responde. Intente más tarde: ' . $response['mensaje'],
            ]);
        } catch (\Throwable $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function show(SignificantEvent $event)
    {
        $event->load(['user', 'invoices.checkin.guest']);

        return Inertia::render('significant-events/show', [
            'event'    => [
                'id'                  => $event->id,
                'code_label'          => $event->code_label,
                'description'         => $event->description,
                'start_at'            => $event->start_at->format('d/m/Y H:i'),
                'end_at'              => $event->end_at?->format('d/m/Y H:i'),
                'status'              => $event->status,
                'siat_reception_code' => $event->siat_reception_code,
                'user_name'           => $event->user->name,
            ],
            'invoices' => $event->invoices->map(fn($i) => [
                'id'              => $i->id,
                'invoice_number'  => $i->invoice_number,
                'cuf'             => $i->cuf,
                'siat_status'     => $i->siat_status,
                'total_amount'    => $i->total_amount,
                'guest_name'      => optional($i->checkin->guest)->full_name,
                'has_offline_xml' => !empty($i->offline_xml_path),
            ]),
        ]);
    }

    /**
     * REENVÍO CORREGIDO: empaqueta todas las facturas offline pendientes
     * en un único .tar.gz y lo envía con recepcionPaqueteFactura, vinculado
     * al código de recepción del Evento Significativo.
     */
    public function resendOfflineInvoices(SignificantEvent $event)
    {
        //$this->authorize('manage', SignificantEvent::class);

        // ============================================================
        // 1. Pre-condiciones legales
        // ============================================================
        if ($event->status !== SignificantEvent::STATUS_REGISTERED) {
            return back()->withErrors([
                'error' => 'El evento debe estar registrado en SIAT antes de reenviar el paquete.',
            ]);
        }

        if (empty($event->siat_reception_code)) {
            return back()->withErrors([
                'error' => 'El evento no tiene código de recepción SIAT. No se puede empaquetar.',
            ]);
        }

        // Ventana legal de 48 horas desde el cierre.
        if ($event->end_at && $event->end_at->diffInHours(now()) > 48) {
            return back()->withErrors([
                'error' => 'Ha expirado la ventana de 48 horas para reenviar facturas offline.',
            ]);
        }

        // ============================================================
        // 2. Credenciales vigentes (online)
        // ============================================================
        $cuis = $this->siatService->getActiveCuis();
        $cufd = $this->siatService->getActiveCufd();

        if (!$cuis || !$cufd) {
            return back()->withErrors(['error' => 'No se pudo conectar al SIAT para reenviar el paquete.']);
        }

        // ============================================================
        // 3. Recolectar facturas offline pendientes
        //    (siat_status = 'offline' y con offline_xml_path)
        // ============================================================
        $pending = $event->invoices()
            ->where('siat_status', 'offline')
            ->whereNotNull('offline_xml_path')
            ->get();

        if ($pending->isEmpty()) {
            return back()->with('warning', 'No hay facturas offline pendientes de reenviar.');
        }

        // ============================================================
        // 4. Descomprimir cada .xml.gz a XML plano + recolectar (cuf, xml)
        // ============================================================
        $xmls = [];
        foreach ($pending as $invoice) {
            try {
                if (!Storage::disk('local')->exists($invoice->offline_xml_path)) {
                    Log::warning("XML offline no encontrado para factura #{$invoice->invoice_number}");
                    continue;
                }
                $gz  = Storage::disk('local')->get($invoice->offline_xml_path);
                $xml = @gzdecode($gz);

                if ($xml === false || empty($invoice->cuf)) {
                    Log::warning("XML offline corrupto o sin CUF para factura #{$invoice->invoice_number}");
                    continue;
                }

                $xmls[] = [
                    'invoice_id' => $invoice->id,
                    'cuf'        => $invoice->cuf,
                    'xml'        => $xml,
                ];
            } catch (Exception $e) {
                Log::error("Error leyendo XML offline factura #{$invoice->invoice_number}: " . $e->getMessage());
            }
        }

        if (empty($xmls)) {
            return back()->withErrors(['error' => 'No se pudieron leer los XMLs de las facturas offline.']);
        }

        // ============================================================
        // 5. EMPAQUETAR todas las facturas en un solo .tar.gz
        // ============================================================
        try {
            $package = $this->siatService->buildOfflinePackage(
                array_map(fn($r) => ['cuf' => $r['cuf'], 'xml' => $r['xml']], $xmls)
            );
        } catch (Exception $e) {
            Log::error("Error al empaquetar paquete offline evento #{$event->id}: " . $e->getMessage());
            return back()->withErrors(['error' => 'Error al empaquetar facturas: ' . $e->getMessage()]);
        }

        // ============================================================
        // 6. ENVIAR el paquete (recepcionPaqueteFactura)
        //    OJO: codigoEvento = código de RECEPCIÓN del evento (no el motivo 1..7)
        // ============================================================
        $sendResp = $this->siatService->sendOfflinePackage(
            $cuis,
            $cufd->code,
            $package['archivo'],
            $package['hash'],
            $package['cantidad'],
            $event->siat_reception_code   // ← campo correcto
        );

        if ($sendResp['status'] !== 'received') {
            Log::warning("SIAT rechazó el paquete del evento #{$event->id}: " . $sendResp['mensaje']);
            return back()->withErrors([
                'error' => 'SIAT rechazó el paquete: ' . $sendResp['mensaje'],
            ]);
        }

        $codigoRecepcionPaquete = $sendResp['codigoRecepcion'];

        $event->update([
            'package_reception_code' => $codigoRecepcionPaquete,
            'package_sent_at'        => now(),
        ]);

        // ============================================================
        // 7. VALIDAR el procesamiento (validacionRecepcionPaquete)
        //    con back-off corto para casos "EN PROCESO".
        // ============================================================
        $validation = $this->pollPackageValidation($cuis, $cufd->code, $codigoRecepcionPaquete);

        // ============================================================
        // 8. Persistir resultado en cada factura
        // ============================================================
        $invoiceIds = collect($xmls)->pluck('invoice_id')->all();

        if ($validation['status'] === 'accepted') {
            Invoice::whereIn('id', $invoiceIds)->update([
                'siat_status'         => 'accepted',
                'siat_reception_code' => $codigoRecepcionPaquete,
            ]);
            $msg = "Paquete VALIDADO. {$package['cantidad']} factura(s) aceptada(s) por SIAT.";

            return redirect()
                ->route('significant-events.show', $event)
                ->with('success', $msg);
        }

        if ($validation['status'] === 'processing') {
            // Queda pendiente: el sistema deberá reintentar la validación.
            return redirect()
                ->route('significant-events.show', $event)
                ->with('warning', 'Paquete enviado. SIAT informa "EN PROCESO": se reintentará la validación más tarde.');
        }

        // OBSERVADA o RECHAZADA
        Invoice::whereIn('id', $invoiceIds)->update(['siat_status' => 'rejected']);
        Log::warning("Paquete rechazado/observado evento #{$event->id}: " . $validation['mensaje']);

        return back()->withErrors([
            'error' => 'Paquete recibido pero ' . $validation['status'] . ': ' . $validation['mensaje'],
        ]);
    }

    /**
     * Polling con back-off para validacionRecepcionPaquete.
     * Procesar un paquete puede demorar; SIAT devuelve "EN PROCESO" en el ínterin.
     */
    private function pollPackageValidation(
        string $cuis,
        string $cufd,
        string $codigoRecepcionPaquete
    ): array {
        $delays = [5, 15, 30]; // segundos
        $last   = ['status' => 'processing', 'mensaje' => 'sin respuesta'];

        foreach ($delays as $i => $seconds) {
            if ($i > 0) sleep($seconds);

            $last = $this->siatService->validateOfflinePackage($cuis, $cufd, $codigoRecepcionPaquete);

            if (in_array($last['status'], ['accepted', 'observed', 'rejected'], true)) {
                return $last;
            }
        }

        // Sigue "EN PROCESO" tras los reintentos.
        return $last;
    }

    private function getEventCodeOptions(): array
    {
        return [
            ['value' => 1, 'label' => 'Corte de Internet'],
            ['value' => 2, 'label' => 'SIN Inaccesible'],
            ['value' => 3, 'label' => 'Corte de Energía Eléctrica'],
            ['value' => 4, 'label' => 'Falla de Software'],
            ['value' => 5, 'label' => 'Cambio de Infraestructura'],
            ['value' => 6, 'label' => 'Falla de Comunicaciones'],
            ['value' => 7, 'label' => 'Fuerza Mayor'],
        ];
    }


    /**
     * Devuelve (JSON) los eventos disponibles para acoplar una factura.
     */
    public function attachable()
    {
        return response()->json([
            'events' => SignificantEvent::availableForAttach()
                ->orderBy('start_at', 'desc')
                ->get()
                ->map(fn($e) => [
                    'id'          => $e->id,
                    'code_label'  => $e->code_label,
                    'description' => $e->description,
                    'start_at'    => $e->start_at->format('d/m/Y H:i'),
                    'status'      => $e->status,
                ]),
        ]);
    }

    /**
     * Acopla UNA factura huérfana a un evento existente.
     */
    public function attachInvoice(Request $request, SignificantEvent $event)
    {
        $request->validate(['invoice_id' => 'required|exists:invoices,id']);

        $invoice = Invoice::findOrFail($request->invoice_id);

        if (!$invoice->is_orphaned) {
            return back()->withErrors([
                'error' => "La factura #{$invoice->invoice_number} no es huérfana.",
            ]);
        }

        if (!$event->accepts_attachments) {
            return back()->withErrors([
                'error' => 'Este evento ya no admite nuevas facturas.',
            ]);
        }

        $invoice->update(['significant_event_id' => $event->id]);

        Log::info("Factura #{$invoice->id} acoplada al evento #{$event->id}.");

        return back()->with(
            'success',
            "Factura #{$invoice->invoice_number} acoplada a: {$event->code_label}."
        );
    }
}
