<?php

namespace App\Services;

use App\Models\SiatCredential;
use Carbon\Carbon;
use SoapClient;
use SoapFault;
use Exception;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PharData;

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
    private function getSoapClient(string $endpoint): \SoapClient
    {
        $url       = $this->baseUrl . $endpoint . '?wsdl';
        $verifySsl = (bool) config('siat.verify_ssl', true);

        // ============================================================
        // 1. Pre-descarga del WSDL a disco con cURL.
        //    Resolvemos AQUÍ los problemas de SSL / apikey / timeout
        //    para que el SoapClient solo lea un archivo local.
        // ============================================================
        $cacheDir  = config('siat.wsdl_cache_dir', storage_path('app/siat/wsdl'));
        $ttl       = (int) config('siat.wsdl_cache_ttl', 3600);

        if (!is_dir($cacheDir) && !mkdir($cacheDir, 0755, true) && !is_dir($cacheDir)) {
            throw new \SoapFault('CLIENT', "No se pudo crear el directorio de caché WSDL: {$cacheDir}");
        }

        $wsdlFile  = $cacheDir . DIRECTORY_SEPARATOR . md5($url) . '.wsdl';
        $needsFetch = !file_exists($wsdlFile) || (time() - filemtime($wsdlFile)) > $ttl;

        if ($needsFetch) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => ['apikey: TokenApi ' . $this->token],
                CURLOPT_CONNECTTIMEOUT => $this->timeout,
                CURLOPT_TIMEOUT        => $this->timeout * 2,
                CURLOPT_SSL_VERIFYPEER => $verifySsl,
                CURLOPT_SSL_VERIFYHOST => $verifySsl ? 2 : 0,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_USERAGENT      => 'sisHotelSanAntonio/1.0',
            ]);

            $body     = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr  = curl_error($ch);
            curl_close($ch);

            if ($body === false || $httpCode !== 200 || empty($body)) {
                // Si tenemos una versión vieja en caché, usarla como fallback.
                if (file_exists($wsdlFile)) {
                    \Illuminate\Support\Facades\Log::warning(
                        "WSDL no descargable ({$httpCode} {$curlErr}); usando caché previa: {$wsdlFile}"
                    );
                } else {
                    throw new \SoapFault(
                        'HTTP',
                        "No se pudo descargar el WSDL de {$url}. "
                            . "HTTP {$httpCode}. cURL: {$curlErr}. "
                            . "Verifique conectividad con SIAT y el token apikey."
                    );
                }
            } else {
                file_put_contents($wsdlFile, $body);
            }
        }

        // ============================================================
        // 2. Contexto para las llamadas SOAP en sí (NO para el WSDL,
        //    que ya está en disco).
        // ============================================================
        $context = stream_context_create([
            'http' => [
                'header'  => "apikey: TokenApi " . $this->token,
                'timeout' => $this->timeout,
            ],
            'https' => [
                'header'  => "apikey: TokenApi " . $this->token,
                'timeout' => $this->timeout,
            ],
            'ssl' => [
                'verify_peer'      => $verifySsl,
                'verify_peer_name' => $verifySsl,
                'allow_self_signed' => !$verifySsl,
            ],
        ]);

        // ============================================================
        // 3. SoapClient apuntando al ARCHIVO LOCAL del WSDL.
        //    cache_wsdl puede quedarse en NONE porque ya tenemos
        //    nuestra propia caché controlada arriba.
        // ============================================================
        return new \SoapClient($wsdlFile, [
            'stream_context'     => $context,
            'cache_wsdl'         => WSDL_CACHE_NONE,
            'compression'        => SOAP_COMPRESSION_ACCEPT | SOAP_COMPRESSION_GZIP | SOAP_COMPRESSION_DEFLATE,
            'trace'              => true,
            'exceptions'         => true,
            'connection_timeout' => $this->timeout,
            'keep_alive'         => false,
            // Ubicación real del endpoint (las llamadas siguen yendo a la URL https).
            'location'           => $this->baseUrl . $endpoint,
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

    public function syncActivities(string $cuis)
    {
        return $this->executeSync('sincronizarActividades', $cuis);
    }
    public function syncProductsServices(string $cuis)
    {
        return $this->executeSync('sincronizarListaProductosServicios', $cuis);
    }
    public function syncUnitTypes(string $cuis)
    {
        return $this->executeSync('sincronizarParametricaUnidadMedida', $cuis);
    }
    public function syncInvoiceLegends(string $cuis)
    {
        return $this->executeSync('sincronizarListaLeyendasFactura', $cuis);
    }
    public function syncCancellationReasons(string $cuis)
    {
        return $this->executeSync('sincronizarParametricaMotivoAnulacion', $cuis);
    }

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
    public function sendOfflinePackage(
        string $cuis,
        string $cufd,
        string $archiveBase64,
        string $hashArchive,
        int    $cantidadFacturas,
        string $codigoRecepcionEvento
    ): array {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');

            $payload = array_merge($this->getBaseParameters(), [
                'codigoDocumentoSector' => 1,
                'codigoEmision'         => 2,                       // Offline
                'tipoFacturaDocumento'  => 1,
                'cuis'                  => $cuis,
                'cufd'                  => $cufd,
                'archivo'               => $archiveBase64,
                'fechaEnvio'            => now()->format('Y-m-d\TH:i:s.v'),
                'hashArchivo'           => $hashArchive,
                'cantidadFacturas'      => $cantidadFacturas,
                'codigoEvento'          => $codigoRecepcionEvento,  // ← código de recepción
            ]);

            // Nota: 'cafc' se OMITE intencionalmente (no aplica para
            // contingencia por corte de internet). Si tu modalidad fuera
            // CAFC, este método NO es el correcto.

            $params   = ['SolicitudServicioRecepcionPaquete' => $payload];
            $response = $client->recepcionPaqueteFactura($params);
            $r        = $response->RespuestaServicioFacturacion ?? null;

            // Validación inicial: SIAT recibió el paquete.
            if ($r && !empty($r->transaccion)) {
                return [
                    'status'          => 'received',
                    'codigoRecepcion' => $r->codigoRecepcion ?? null,
                    'mensaje'         => 'Paquete recibido por SIAT — pendiente de validación',
                    'raw'             => $response,
                ];
            }

            return [
                'status'          => 'rejected',
                'codigoRecepcion' => null,
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
    // 5. GESTIÓN PERSISTENTE DE CÓDIGOS (CUIS / CUFD)
    // ==========================================

    /**
     * Guarda una nueva credencial de forma atómica.
     *
     * El flujo dentro de la transacción es crítico para no violar el índice
     * único parcial de PostgreSQL (que solo permite UNA fila is_active = true
     * por combinación type + environment + branch_code + pos_code):
     *
     *   1. Desactiva todas las credenciales vigentes que coincidan con el
     *      'type' y la tripleta (environment, branch_code, pos_code).
     *   2. Inserta la nueva credencial con is_active = true.
     *
     * @param  string         $type         'cuis' | 'cufd'
     * @param  string         $code         Código devuelto por el SIAT
     * @param  string|null    $controlCode  codigoControl (solo CUFD)
     * @param  \Carbon\Carbon $issuedAt     Fecha/hora de emisión
     * @param  \Carbon\Carbon $expiresAt    Fecha/hora de expiración
     */
    private function storeCredential(
        string $type,
        string $code,
        ?string $controlCode,
        $issuedAt,
        $expiresAt
    ): SiatCredential {
        return DB::transaction(function () use ($type, $code, $controlCode, $issuedAt, $expiresAt) {
            // 1. Desactivar cualquier credencial vigente de la misma tripleta.
            SiatCredential::query()
                ->where('type', $type)
                ->where('environment', $this->environment)
                ->where('branch_code', $this->branchCode)
                ->where('pos_code', $this->posCode)
                ->where('is_active', true)
                ->update(['is_active' => false]);

            // 2. Insertar la nueva credencial activa.
            return SiatCredential::create([
                'type'         => $type,
                'code'         => $code,
                'control_code' => $controlCode,
                'environment'  => $this->environment,
                'branch_code'  => $this->branchCode,
                'pos_code'     => $this->posCode,
                'issued_at'    => $issuedAt,
                'expires_at'   => $expiresAt,
                'is_active'    => true,
            ]);
        });
    }

    /**
     * Obtiene el CUIS activo desde la base de datos.
     *
     * Si no existe una credencial vigente, solicita una nueva al SIAT y la
     * persiste de forma atómica. El CUIS tiene una vigencia legal cercana
     * a un año; se usan 11 meses como margen de seguridad.
     */
    public function getActiveCuis(): ?string
    {
        // 1. Buscar credencial vigente y no expirada en BD.
        $credential = SiatCredential::active()
            ->where('type', 'cuis')
            ->where('environment', $this->environment)
            ->where('branch_code', $this->branchCode)
            ->where('pos_code', $this->posCode)
            ->where('expires_at', '>', now())
            ->latest('issued_at')
            ->first();

        if ($credential) {
            return $credential->code;
        }

        // 2. No hay CUIS vigente: solicitar uno nuevo al SIAT.
        $response = $this->getCuis();

        if (!($response['success'] ?? false)) {
            // Mantener visibilidad del motivo exacto de rechazo del SIAT.
            $motivo    = $response['detalles'] ?? $response['mensaje'] ?? 'Razón desconocida';
            $errorData = is_array($motivo) || is_object($motivo) ? json_encode($motivo) : $motivo;

            Log::error('SIAT Error: Failed to auto-renew CUIS. Detalle SIAT: ' . $errorData);
            return null;
        }

        // 3. Persistir el nuevo CUIS de forma atómica.
        try {
            $credential = $this->storeCredential(
                type: 'cuis',
                code: $response['codigo'],
                controlCode: null,
                issuedAt: now(),
                expiresAt: now()->addMonths(11),
            );

            return $credential->code;
        } catch (Exception $e) {
            Log::error('SIAT Error: Failed to persist CUIS. ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Obtiene el CUFD activo desde la base de datos.
     *
     * El CUFD se renueva cada 24 horas; se usa una ventana de 23 horas como
     * margen. Devuelve un array con 'codigo' y 'codigoControl', o null si
     * no se pudo obtener ni renovar.
     */
    public function getActiveCufd(): ?SiatCredential
    {
        // 1. CUFD local todavía vigente.
        $cufd = SiatCredential::query()
            ->where('type', 'cufd')
            ->where('is_active', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', Carbon::now())
            ->latest('expires_at')
            ->first();

        if ($cufd) {
            return $cufd;
        }

        // 2. No hay CUFD vigente: solicitar uno nuevo al SIAT.
        $cuis = $this->getActiveCuis();
        if (!$cuis) {
            Log::error('SIAT getActiveCufd: no hay CUIS activo para renovar el CUFD.');
            return null;
        }

        $response = $this->getCufd($cuis);

        if (empty($response['success'])) {
            Log::error('SIAT getActiveCufd: fallo al renovar CUFD.', [
                'detalle' => $response['detalles'] ?? $response['mensaje'] ?? 'desconocido',
            ]);
            return null;
        }

        if (empty($response['fechaVigencia'])) {
            Log::error('SIAT getActiveCufd: el SIAT devolvió un CUFD sin fechaVigencia.', [
                'codigo' => $response['codigo'] ?? null,
            ]);
            return null;
        }

        // 3. Desactivar CUFD anteriores y persistir el nuevo usando storeCredential
        try {
            return $this->storeCredential(
                'cufd',
                $response['codigo'],
                $response['codigoControl'],
                Carbon::now(),
                Carbon::parse($response['fechaVigencia'])
            );
        } catch (\Exception $e) {
            Log::error('SIAT Error: Fallo al persistir el nuevo CUFD de forma atómica. ' . $e->getMessage());
            return null;
        }
    }

    public function peekActiveCufd(): ?SiatCredential
    {
        return SiatCredential::active()
            ->where('type', 'cufd')
            ->where('environment', $this->environment)
            ->where('branch_code', $this->branchCode)
            ->where('pos_code', $this->posCode)
            ->where('expires_at', '>', now())
            ->latest('issued_at')
            ->first();
    }

    /**
     * Invalida la credencial CUFD vigente (útil cuando se detecta contingencia).
     * Marca como inactiva la fila actual para forzar una renovación en la
     * siguiente llamada a getActiveCufd().
     */
    public function invalidateCufdCache(): void
    {
        SiatCredential::query()
            ->where('type', 'cufd')
            ->where('environment', $this->environment)
            ->where('branch_code', $this->branchCode)
            ->where('pos_code', $this->posCode)
            ->where('is_active', true)
            ->update(['is_active' => false]);
    }

    // ==========================================
    // 6. UTILITARIOS
    // ==========================================

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
                return collect($msg)->map(fn($m) => $m->descripcion ?? '')->implode(' | ');
            }
            return $msg->descripcion ?? json_encode($msg);
        }

        return $response->codigoDescripcion ?? 'Respuesta sin mensaje';
    }

    /* Apartado de contingencia*/
    public function buildOfflinePackage(array $invoices): array
    {
        if (empty($invoices)) {
            throw new Exception('No hay facturas offline para empaquetar.');
        }

        // Workdir temporal (siempre limpiamos al final).
        $stamp   = now()->format('Ymd_His');
        $tarName = "paquete_offline_{$stamp}.tar";
        $tmpDir  = storage_path("app/siat/tmp_{$stamp}");
        $tarPath = "{$tmpDir}/{$tarName}";
        $gzPath  = "{$tarPath}.gz";

        if (!is_dir($tmpDir) && !mkdir($tmpDir, 0755, true) && !is_dir($tmpDir)) {
            throw new Exception("No se pudo crear el directorio temporal {$tmpDir}.");
        }

        try {
            // 1. Crear el TAR e inyectar cada XML como archivo independiente.
            $tar = new PharData($tarPath, 0, null, \Phar::TAR);
            foreach ($invoices as $row) {
                $cuf  = $row['cuf']  ?? null;
                $xml  = $row['xml']  ?? null;
                if (!$cuf || !$xml) {
                    throw new Exception('Cada factura offline debe traer cuf y xml.');
                }
                // Nombre del archivo dentro del .tar (convención del SIAT: cuf.xml).
                $tar->addFromString("{$cuf}.xml", $xml);
            }

            // 2. Comprimir con gzip → paquete_offline_*.tar.gz
            $tar->compress(\Phar::GZ);

            // PharData::compress no elimina el .tar original.
            unset($tar);
            @unlink($tarPath);

            if (!file_exists($gzPath)) {
                throw new Exception('No se generó el archivo .tar.gz del paquete.');
            }

            // 3. Leer binario, calcular hash y codificar en base64 para SOAP.
            $binary  = file_get_contents($gzPath);
            $hash    = hash('sha256', $binary);
            $archivo = base64_encode($binary);

            return [
                'archivo'  => $archivo,
                'hash'     => $hash,
                'cantidad' => count($invoices),
            ];
        } finally {
            // Limpieza
            if (file_exists($gzPath))  @unlink($gzPath);
            if (file_exists($tarPath)) @unlink($tarPath);
            if (is_dir($tmpDir))       @rmdir($tmpDir);
        }
    }

    /**
     * Segunda llamada obligatoria: confirma el procesamiento del paquete.
     * recepcionPaqueteFactura solo RECIBE — validacionRecepcionPaquete
     * verifica si el SIAT lo procesó correctamente.
     *
     * Debe ejecutarse después de sendOfflinePackage usando el codigoRecepcion
     * devuelto por aquella. Si SIAT responde "EN_PROCESO" debe reintentarse
     * con back-off (recomendado: 5s, 15s, 30s) hasta obtener un veredicto.
     */
    public function validateOfflinePackage(
        string $cuis,
        string $cufd,
        string $codigoRecepcionPaquete
    ): array {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');

            $params = ['SolicitudServicioValidacionRecepcionPaquete' => array_merge(
                $this->getBaseParameters(),
                [
                    'codigoDocumentoSector' => 1,
                    'codigoEmision'         => 2,
                    'tipoFacturaDocumento'  => 1,
                    'cuis'                  => $cuis,
                    'cufd'                  => $cufd,
                    'codigoRecepcion'       => $codigoRecepcionPaquete,
                ]
            )];

            $response = $client->validacionRecepcionPaquete($params);
            $r        = $response->RespuestaServicioFacturacion ?? null;

            $codigoDescripcion = strtoupper($r->codigoDescripcion ?? '');

            return [
                'status'  => match (true) {
                    $codigoDescripcion === 'VALIDADA'     => 'accepted',
                    $codigoDescripcion === 'OBSERVADA'    => 'observed',
                    $codigoDescripcion === 'RECHAZADA'    => 'rejected',
                    $codigoDescripcion === 'EN PROCESO'   => 'processing',
                    default                               => 'rejected',
                },
                'mensaje' => $this->extractSiatMessage($r),
                'raw'     => $response,
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT validateOfflinePackage Error: ' . $fault->getMessage());
            return [
                'status'  => $this->isNetworkFailure($fault) ? 'offline' : 'rejected',
                'mensaje' => $fault->getMessage(),
                'raw'     => null,
            ];
        }
    }
}
