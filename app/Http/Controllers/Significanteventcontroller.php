<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\SignificantEvent;
use App\Services\SiatService;
use App\Services\SiatXmlBuilder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Exception;

/**
 * Gestiona Eventos Significativos (contingencias) según RND-102100000011.
 *
 * Flujo:
 *  1. Gerente abre el evento (start) → sistema empieza a emitir offline.
 *  2. Cuando se restablece la conexión, Gerente cierra el evento (end).
 *  3. Sistema registra el evento en SIAT.
 *  4. Sistema reenvía las facturas offline (dentro de las 48 horas).
 */
class SignificantEventController extends Controller
{
    protected SiatService $siatService;

    public function __construct(SiatService $siatService)
    {
        $this->siatService = $siatService;
    }

    /**
     * Listado de eventos significativos.
     */
    public function index()
    {
        $events = SignificantEvent::with('user')
            ->withCount('invoices')
            ->orderBy('start_at', 'desc')
            ->get()
            ->map(fn ($e) => [
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

    /**
     * Abre un Evento Significativo (inicia contingencia).
     *
     * IMPORTANTE: en este punto el CUFD vigente queda "congelado" en el evento.
     * Toda factura emitida durante el evento usará ese CUFD.
     */
    public function start(Request $request)
    {
        $this->authorize('manage', SignificantEvent::class); // policy: solo Gerente

        $request->validate([
            'event_code'  => 'required|integer|min:1|max:7',
            'description' => 'required|string|max:500',
            'start_at'    => 'nullable|date',
        ]);

        // Solo puede haber UN evento activo a la vez
        if (SignificantEvent::where('status', SignificantEvent::STATUS_ACTIVE)->exists()) {
            return back()->withErrors([
                'error' => 'Ya existe un Evento Significativo activo. Debe cerrarse antes de abrir otro.',
            ]);
        }

        // Obtener el CUFD vigente ANTES de la caída (debe estar en caché aún)
        $cufdData = $this->siatService->getActiveCufd();

        if (!$cufdData) {
            return back()->withErrors([
                'error' => 'No hay un CUFD vigente en caché. Sin CUFD no se puede operar offline.',
            ]);
        }

        $event = SignificantEvent::create([
            'event_code'              => $request->event_code,
            'description'             => $request->description,
            'start_at'                => $request->start_at ?? now(),
            'cufd_event'              => $cufdData['codigo'],
            'cufd_event_control_code' => $cufdData['codigoControl'],
            'status'                  => SignificantEvent::STATUS_ACTIVE,
            'user_id'                 => $request->user()->id,
        ]);

        Log::info("Evento Significativo #{$event->id} iniciado: {$event->code_label}");

        return redirect()
            ->route('significant-events.index')
            ->with('warning', "Modo contingencia ACTIVO. Las facturas se guardarán offline.");
    }

    /**
     * Cierra un Evento Significativo y lo registra en SIAT.
     */
    public function end(Request $request, SignificantEvent $event)
    {
        $this->authorize('manage', SignificantEvent::class);

        if ($event->status !== SignificantEvent::STATUS_ACTIVE) {
            return back()->withErrors(['error' => 'Este evento no está activo.']);
        }

        $request->validate([
            'end_at' => 'nullable|date|after:start_at',
        ]);

        $endAt = $request->end_at ? \Carbon\Carbon::parse($request->end_at) : now();

        try {
            DB::transaction(function () use ($event, $endAt) {
                $event->update([
                    'end_at' => $endAt,
                    'status' => SignificantEvent::STATUS_CLOSED,
                ]);

                // Renovar CUFD (porque al cerrar, asumimos que volvió internet)
                $this->siatService->invalidateCufdCache();
                $cufdActual = $this->siatService->getActiveCufd();

                if (!$cufdActual) {
                    throw new Exception('No se pudo obtener un CUFD nuevo para registrar el evento.');
                }

                // Registrar el evento en SIAT
                $response = $this->siatService->registerSignificantEvent(
                    $event->event_code,
                    $event->description,
                    $event->start_at->format('Y-m-d\TH:i:s.v'),
                    $event->end_at->format('Y-m-d\TH:i:s.v'),
                    $event->cufd_event,
                    $cufdActual['codigo']
                );

                if ($response['status'] === 'registered') {
                    $event->update([
                        'status'              => SignificantEvent::STATUS_REGISTERED,
                        'siat_reception_code' => $response['codigoRecepcion'],
                        'registered_at'       => now(),
                    ]);
                } else {
                    $event->update(['status' => SignificantEvent::STATUS_FAILED]);
                    Log::warning("Registro de evento SIAT falló: " . $response['mensaje']);
                    throw new Exception('SIAT rechazó el registro del evento: ' . $response['mensaje']);
                }
            });
        } catch (Exception $e) {
            Log::error("Error al cerrar evento: " . $e->getMessage());
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        return redirect()
            ->route('significant-events.show', $event)
            ->with('success', 'Evento registrado en SIAT. Ahora puede reenviar las facturas offline.');
    }

    /**
     * Detalle de un evento y sus facturas offline asociadas.
     */
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
            'invoices' => $event->invoices->map(fn ($i) => [
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
     * Reenvía las facturas offline asociadas a un evento ya registrado.
     */
    public function resendOfflineInvoices(SignificantEvent $event)
    {
        $this->authorize('manage', SignificantEvent::class);

        if ($event->status !== SignificantEvent::STATUS_REGISTERED) {
            return back()->withErrors([
                'error' => 'El evento debe estar registrado en SIAT antes de reenviar facturas.',
            ]);
        }

        // Ventana legal: 48 horas desde el fin del evento
        if ($event->end_at && $event->end_at->diffInHours(now()) > 48) {
            return back()->withErrors([
                'error' => 'Ha expirado la ventana de 48 horas para reenviar facturas offline.',
            ]);
        }

        $cuis     = $this->siatService->getActiveCuis();
        $cufdData = $this->siatService->getActiveCufd();

        if (!$cuis || !$cufdData) {
            return back()->withErrors(['error' => 'No se pudo conectar al SIAT.']);
        }

        $pending = $event->invoices()
            ->where('siat_status', 'offline')
            ->whereNotNull('offline_xml_path')
            ->get();

        $ok = 0;
        $fail = 0;

        foreach ($pending as $invoice) {
            try {
                if (!Storage::disk('local')->exists($invoice->offline_xml_path)) {
                    Log::warning("XML offline no encontrado para factura #{$invoice->invoice_number}");
                    $fail++;
                    continue;
                }

                $gzip = Storage::disk('local')->get($invoice->offline_xml_path);
                $hash = hash('sha256', gzdecode($gzip));

                $response = $this->siatService->sendOfflinePackage(
                    $cuis,
                    $cufdData['codigo'],
                    $gzip,
                    $hash,
                    $event->event_code
                );

                if ($response['status'] === 'accepted') {
                    $invoice->update([
                        'siat_status'         => 'accepted',
                        'siat_reception_code' => $response['codigoRecepcion'],
                    ]);
                    $ok++;
                } else {
                    $invoice->update(['siat_status' => 'rejected']);
                    Log::warning("Reenvío rechazado factura #{$invoice->invoice_number}: " . $response['mensaje']);
                    $fail++;
                }
            } catch (Exception $e) {
                Log::error("Error reenviando factura #{$invoice->invoice_number}: " . $e->getMessage());
                $fail++;
            }
        }

        return redirect()
            ->route('significant-events.show', $event)
            ->with('success', "Reenvío completado: {$ok} aceptadas, {$fail} fallidas.");
    }

    /**
     * Opciones del catálogo de eventos significativos para el frontend.
     */
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
}