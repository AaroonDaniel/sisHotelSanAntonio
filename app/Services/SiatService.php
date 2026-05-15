<?php

namespace App\Services;

use SoapClient;
use SoapFault;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SiatService
{
    protected string $token;
    protected string $systemCode;
    protected string $nit;
    protected int $branchCode;
    protected int $posCode;
    protected int $environment;
    protected int $modality;

    protected string $baseUrl;

    /** Timeout (en segundos) para considerar al SIAT como "fuera de línea". */
    protected int $timeout;

    /**
     * Constructor: Carga credenciales desde config/siat.php
     */
    public function __construct()
    {
        $this->token       = config('siat.token');
        $this->systemCode  = config('siat.system_code');
        $this->nit         = config('siat.nit');
        $this->branchCode  = config('siat.branch_code', 0);
        $this->posCode     = config('siat.pos_code', 0);
        $this->environment = config('siat.environment', 2);
        $this->modality    = config('siat.modality', 2);
        $this->timeout     = (int) config('siat.timeout', 10);

        $this->baseUrl = $this->environment == 1
            ? 'https://siatrest.impuestos.gob.bo/v2/'           // Producción
            : 'https://pilotosiatservicios.impuestos.gob.bo/v2/'; // Piloto
    }

    /**
     * Centraliza la creación del cliente SOAP.
     */
    private function getSoapClient(string $endpoint): SoapClient
    {
        $options = [
            'http' => [
                'header'  => "apikey: TokenApi " . $this->token,
                'timeout' => $this->timeout,
            ],
        ];

        $context = stream_context_create($options);

        return new SoapClient($this->baseUrl . $endpoint . '?wsdl', [
            'stream_context'    => $context,
            'cache_wsdl'        => WSDL_CACHE_NONE,
            'compression'       => SOAP_COMPRESSION_ACCEPT | SOAP_COMPRESSION_GZIP | SOAP_COMPRESSION_DEFLATE,
            'trace'             => true,
            'connection_timeout' => $this->timeout,
        ]);
    }

    /**
     * Parámetros base requeridos por casi todas las peticiones del SIAT.
     */
    private function getBaseParameters(bool $includeModality = true): array
    {
        $params = [
            'codigoAmbiente'   => $this->environment,
            'codigoPuntoVenta' => $this->posCode,
            'codigoSistema'    => $this->systemCode,
            'codigoSucursal'   => $this->branchCode,
            'nit'              => $this->nit,
        ];

        if ($includeModality) {
            $params['codigoModalidad'] = $this->modality;
        }

        return $params;
    }

    /**
     * Detecta si un SoapFault representa una caída de red (vs. un rechazo lógico del SIAT).
     * Estos son los errores que deben disparar el modo Contingencia.
     */
    private function isNetworkFailure(SoapFault $fault): bool
    {
        $msg = strtolower($fault->getMessage());
        $networkSignals = [
            'could not connect',
            'timed out',
            'timeout',
            'failed to load external entity',
            'connection refused',
            'name or service not known',
            'temporary failure in name resolution',
            'ssl',
            'could not fetch http headers',
        ];

        foreach ($networkSignals as $signal) {
            if (str_contains($msg, $signal)) {
                return true;
            }
        }

        return false;
    }

    // ==========================================
    // 1. COMUNICACIÓN Y CÓDIGOS (CUIS / CUFD)
    // ==========================================

    public function verifyCommunication(): array
    {
        try {
            $client = $this->getSoapClient('FacturacionCodigos');
            $result = $client->verificarComunicacion();

            return [
                'success' => true,
                'message' => 'Comunicación Exitosa',
                'data'    => $result,
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT verifyCommunication Error: ' . $fault->getMessage());
            return [
                'success' => false,
                'message' => $fault->getMessage(),
                'offline' => $this->isNetworkFailure($fault),
            ];
        }
    }

    public function getCuis(): array
    {
        try {
            $client   = $this->getSoapClient('FacturacionCodigos');
            $params   = ['SolicitudCuis' => $this->getBaseParameters()];
            $response = $client->cuis($params);

            if (isset($response->RespuestaCuis->transaccion) && $response->RespuestaCuis->transaccion) {
                return [
                    'success' => true,
                    'codigo'  => $response->RespuestaCuis->codigo,
                ];
            }

            return [
                'success'   => false,
                'error'     => 'Rechazado por SIAT',
                'detalles'  => $response->RespuestaCuis->mensajesList ?? 'Error desconocido',
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT getCuis Error: ' . $fault->getMessage());
            return [
                'success' => false,
                'error'   => 'Fallo de conexión SOAP',
                'mensaje' => $fault->getMessage(),
                'offline' => $this->isNetworkFailure($fault),
            ];
        }
    }

    public function getCufd(string $cuis): array
    {
        try {
            $client   = $this->getSoapClient('FacturacionCodigos');
            $params   = ['SolicitudCufd' => array_merge($this->getBaseParameters(), ['cuis' => $cuis])];
            $response = $client->cufd($params);

            if (isset($response->RespuestaCufd->transaccion) && $response->RespuestaCufd->transaccion) {
                return [
                    'success'        => true,
                    'codigo'         => $response->RespuestaCufd->codigo,
                    'codigoControl'  => $response->RespuestaCufd->codigoControl,
                    'fechaVigencia'  => $response->RespuestaCufd->fechaVigencia,
                ];
            }

            return [
                'success'  => false,
                'error'    => 'Rechazado por SIAT',
                'detalles' => $response->RespuestaCufd->mensajesList ?? 'Error desconocido',
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT getCufd Error: ' . $fault->getMessage());
            return [
                'success' => false,
                'error'   => 'Fallo de conexión SOAP',
                'mensaje' => $fault->getMessage(),
                'offline' => $this->isNetworkFailure($fault),
            ];
        }
    }

    // ==========================================
    // 2. SINCRONIZACIÓN DE CATÁLOGOS
    // ==========================================

    private function executeSync(string $method, string $cuis)
    {
        try {
            $client = $this->getSoapClient('FacturacionSincronizacion');
            $params = ['SolicitudSincronizacion' => array_merge(
                $this->getBaseParameters(false),
                ['cuis' => $cuis]
            )];

            return $client->$method($params);
        } catch (SoapFault $fault) {
            Log::error("SIAT $method Error: " . $fault->getMessage());
            return $fault->faultstring;
        }
    }

    public function syncActivities(string $cuis)          { return $this->executeSync('sincronizarActividades', $cuis); }
    public function syncProductsServices(string $cuis)    { return $this->executeSync('sincronizarListaProductosServicios', $cuis); }
    public function syncUnitTypes(string $cuis)           { return $this->executeSync('sincronizarParametricaUnidadMedida', $cuis); }
    public function syncInvoiceLegends(string $cuis)      { return $this->executeSync('sincronizarListaLeyendasFactura', $cuis); }
    public function syncCancellationReasons(string $cuis) { return $this->executeSync('sincronizarParametricaMotivoAnulacion', $cuis); }

    /**
     * Obtiene los motivos de anulación desde caché local (sincronizados por el comando Artisan).
     */
    public function getCancellationReasons(): array
    {
        return Cache::get('siat_cancellation_reasons', []);
    }

    // ==========================================
    // 3. OPERACIONES DE FACTURACIÓN
    // ==========================================

    /**
     * Envía la factura al SIAT (modo online).
     *
     * Devuelve un array normalizado:
     *  - status:    'accepted' | 'rejected' | 'offline'
     *  - codigoRecepcion: string|null
     *  - mensaje:   string
     *  - raw:       respuesta cruda del SIAT (para auditoría)
     */
    public function receiveInvoice(string $cuis, string $cufd, string $archive, string $issueDate, string $hashArchive): array
    {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');

            $baseParams    = $this->getBaseParameters();
            $invoiceParams = [
                'codigoDocumentoSector' => 1,
                'codigoEmision'         => 1,
                'tipoFacturaDocumento'  => 1,
                'cuis'                  => $cuis,
                'cufd'                  => $cufd,
                'archivo'               => $archive,
                'fechaEnvio'            => $issueDate,
                'hashArchivo'           => $hashArchive,
            ];

            $params   = ['SolicitudServicioRecepcionFactura' => array_merge($baseParams, $invoiceParams)];
            $response = $client->recepcionFactura($params);

            $r = $response->RespuestaServicioFacturacion ?? null;

            if ($r && !empty($r->transaccion)) {
                return [
                    'status'           => 'accepted',
                    'codigoRecepcion'  => $r->codigoRecepcion ?? null,
                    'mensaje'          => 'Factura recibida por el SIAT',
                    'raw'              => $response,
                ];
            }

            return [
                'status'          => 'rejected',
                'codigoRecepcion' => null,
                'mensaje'         => $this->extractSiatMessage($r),
                'raw'             => $response,
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT receiveInvoice Error: ' . $fault->getMessage());

            return [
                'status'          => $this->isNetworkFailure($fault) ? 'offline' : 'rejected',
                'codigoRecepcion' => null,
                'mensaje'         => $fault->getMessage(),
                'raw'             => null,
            ];
        }
    }

    /**
     * Reenvía un paquete de facturas que se emitieron en modo offline (contingencia).
     * Debe ejecutarse dentro de las 48 horas posteriores al cierre del evento significativo.
     */
    public function sendOfflinePackage(string $cuis, string $cufd, string $gzipArchive, string $hashArchive, int $eventCode): array
    {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');

            $params = ['SolicitudServicioRecepcionPaquete' => array_merge(
                $this->getBaseParameters(),
                [
                    'codigoDocumentoSector' => 1,
                    'codigoEmision'         => 2, // 2 = Offline
                    'tipoFacturaDocumento'  => 1,
                    'cuis'                  => $cuis,
                    'cufd'                  => $cufd,
                    'archivo'               => $gzipArchive,
                    'fechaEnvio'            => now()->format('Y-m-d\TH:i:s.v'),
                    'hashArchivo'           => $hashArchive,
                    'cafc'                  => null,
                    'codigoEvento'          => $eventCode,
                ]
            )];

            $response = $client->recepcionPaqueteFactura($params);
            $r = $response->RespuestaServicioFacturacion ?? null;

            return [
                'status'          => ($r && !empty($r->transaccion)) ? 'accepted' : 'rejected',
                'codigoRecepcion' => $r->codigoRecepcion ?? null,
                'mensaje'         => $this->extractSiatMessage($r),
                'raw'             => $response,
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT sendOfflinePackage Error: ' . $fault->getMessage());
            return [
                'status'          => $this->isNetworkFailure($fault) ? 'offline' : 'rejected',
                'codigoRecepcion' => null,
                'mensaje'         => $fault->getMessage(),
                'raw'             => null,
            ];
        }
    }

    /**
     * Anula una factura previamente emitida.
     */
    public function voidInvoice(string $cuis, string $cufd, string $cuf, int $reasonCode): array
    {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');

            $params = ['SolicitudServicioAnulacionFactura' => array_merge(
                $this->getBaseParameters(),
                [
                    'codigoDocumentoSector' => 1,
                    'codigoEmision'         => 1,
                    'tipoFacturaDocumento'  => 1,
                    'cuis'                  => $cuis,
                    'cufd'                  => $cufd,
                    'cuf'                   => $cuf,
                    'codigoMotivo'          => $reasonCode,
                ]
            )];

            $response = $client->anulacionFactura($params);
            $r = $response->RespuestaServicioFacturacion ?? null;

            if ($r && !empty($r->transaccion) && ($r->codigoDescripcion ?? '') === 'ANULADA') {
                return [
                    'status'  => 'voided',
                    'mensaje' => 'Factura anulada correctamente',
                    'raw'     => $response,
                ];
            }

            return [
                'status'  => 'rejected',
                'mensaje' => $this->extractSiatMessage($r),
                'raw'     => $response,
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT voidInvoice Error: ' . $fault->getMessage());
            return [
                'status'  => $this->isNetworkFailure($fault) ? 'offline' : 'rejected',
                'mensaje' => $fault->getMessage(),
                'raw'     => null,
            ];
        }
    }

    /**
     * Revierte la anulación de una factura.
     */
    public function reverseVoidInvoice(string $cuis, string $cufd, string $cuf): array
    {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');

            $params = ['SolicitudServicioReversionAnulacionFactura' => array_merge(
                $this->getBaseParameters(),
                [
                    'codigoDocumentoSector' => 1,
                    'codigoEmision'         => 1,
                    'tipoFacturaDocumento'  => 1,
                    'cuis'                  => $cuis,
                    'cufd'                  => $cufd,
                    'cuf'                   => $cuf,
                ]
            )];

            $response = $client->reversionAnulacionFactura($params);
            $r = $response->RespuestaServicioFacturacion ?? null;

            return [
                'status'  => ($r && !empty($r->transaccion)) ? 'valid' : 'rejected',
                'mensaje' => $this->extractSiatMessage($r) ?: 'Anulación revertida',
                'raw'     => $response,
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT reverseVoidInvoice Error: ' . $fault->getMessage());
            return [
                'status'  => $this->isNetworkFailure($fault) ? 'offline' : 'rejected',
                'mensaje' => $fault->getMessage(),
                'raw'     => null,
            ];
        }
    }

    // ==========================================
    // 4. EVENTOS SIGNIFICATIVOS (CONTINGENCIA)
    // ==========================================

    /**
     * Registra un Evento Significativo ante el SIAT.
     *
     * Catálogo de códigos (RND-102100000011):
     *  1 = Corte del servicio de internet
     *  2 = Inaccesibilidad al servicio web del SIN
     *  3 = Corte de suministro de energía eléctrica
     *  4 = Virus informático o falla de software
     *  5 = Cambio de infraestructura del servicio o sistema
     *  6 = Falla en los medios de comunicación
     *  7 = Otros casos de fuerza mayor
     *
     * @param int    $eventCode      Código de evento (1-7)
     * @param string $description    Descripción libre del evento
     * @param string $startDateTime  Fecha/hora de inicio (Y-m-d\TH:i:s.v)
     * @param string $endDateTime    Fecha/hora de fin    (Y-m-d\TH:i:s.v)
     * @param string $cufdEvento     CUFD vigente AL MOMENTO del evento (el que se usó offline)
     * @param string $cufdActual     CUFD vigente AL MOMENTO del registro (cuando vuelve internet)
     */
    public function registerSignificantEvent(
        int $eventCode,
        string $description,
        string $startDateTime,
        string $endDateTime,
        string $cufdEvento,
        string $cufdActual
    ): array {
        try {
            $client = $this->getSoapClient('ServicioFacturacionOperaciones');
            $cuis   = $this->getActiveCuis();

            if (!$cuis) {
                return ['status' => 'offline', 'mensaje' => 'No se pudo obtener CUIS activo'];
            }

            $params = ['SolicitudEventoSignificativo' => array_merge(
                $this->getBaseParameters(),
                [
                    'cuis'             => $cuis,
                    'cufd'             => $cufdActual,
                    'cufdEvento'       => $cufdEvento,
                    'codigoMotivoEvento' => $eventCode,
                    'descripcion'      => $description,
                    'fechaHoraInicioEvento' => $startDateTime,
                    'fechaHoraFinEvento'    => $endDateTime,
                ]
            )];

            $response = $client->registroEventoSignificativo($params);
            $r = $response->RespuestaListaEventos ?? null;

            if ($r && !empty($r->transaccion)) {
                return [
                    'status'         => 'registered',
                    'codigoRecepcion' => $r->codigoRecepcionEventoSignificativo ?? null,
                    'mensaje'        => 'Evento Significativo registrado',
                    'raw'            => $response,
                ];
            }

            return [
                'status'  => 'rejected',
                'mensaje' => $this->extractSiatMessage($r),
                'raw'     => $response,
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT registerSignificantEvent Error: ' . $fault->getMessage());
            return [
                'status'  => $this->isNetworkFailure($fault) ? 'offline' : 'rejected',
                'mensaje' => $fault->getMessage(),
                'raw'     => null,
            ];
        }
    }

    // ==========================================
    // 5. UTILITARIOS / CACHE
    // ==========================================

    /**
     * Obtiene el CUIS activo desde la caché.
     */
    public function getActiveCuis(): ?string
    {
        return Cache::remember('siat_cuis_active', now()->addMonths(11), function () {
            $response = $this->getCuis();
            if ($response['success']) {
                return $response['codigo'];
            }
            Log::error('SIAT Error: Failed to auto-renew CUIS');
            return null;
        });
    }

    /**
     * Obtiene el CUFD activo desde la caché (renovación automática cada 23 horas).
     */
    public function getActiveCufd(): ?array
    {
        return Cache::remember('siat_cufd_active', now()->addHours(23), function () {
            $cuis = $this->getActiveCuis();
            if (!$cuis) {
                return null;
            }

            $response = $this->getCufd($cuis);
            if ($response['success']) {
                return [
                    'codigo'        => $response['codigo'],
                    'codigoControl' => $response['codigoControl'],
                ];
            }

            Log::error('SIAT Error: Failed to auto-renew CUFD');
            return null;
        });
    }

    /**
     * Invalida la caché de CUFD (útil cuando se detecta contingencia).
     */
    public function invalidateCufdCache(): void
    {
        Cache::forget('siat_cufd_active');
    }

    /**
     * Extrae un mensaje legible desde la respuesta del SIAT.
     */
    private function extractSiatMessage($response): string
    {
        if (!$response) {
            return 'Sin respuesta del SIAT';
        }

        if (isset($response->mensajesList)) {
            $msg = $response->mensajesList;
            if (is_array($msg)) {
                return collect($msg)->map(fn ($m) => $m->descripcion ?? '')->implode(' | ');
            }
            return $msg->descripcion ?? json_encode($msg);
        }

        return $response->codigoDescripcion ?? 'Respuesta sin mensaje';
    }
}