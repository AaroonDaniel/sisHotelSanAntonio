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

    /**
     * Constructor: Carga credenciales desde config/siat.php
     */
    public function __construct()
    {
        $this->token = config('siat.token');
        $this->systemCode = config('siat.system_code');
        $this->nit = config('siat.nit');
        $this->branchCode = config('siat.branch_code', 0);
        $this->posCode = config('siat.pos_code', 0);
        $this->environment = config('siat.environment', 2);
        $this->modality = config('siat.modality', 2); // 1: Electrónica, 2: Computarizada

        $this->baseUrl = $this->environment == 1 
            ? 'https://siatrest.impuestos.gob.bo/v2/' // Producción
            : 'https://pilotosiatservicios.impuestos.gob.bo/v2/'; // Piloto
    }

    /**
     * Centraliza la creación del cliente SOAP para evitar repetición de código.
     */
    private function getSoapClient(string $endpoint): SoapClient
    {
        $options = [
            'http' => [
                'header' => "apikey: TokenApi " . $this->token,
                'timeout' => 10
            ]
        ];

        $context = stream_context_create($options);

        return new SoapClient($this->baseUrl . $endpoint . '?wsdl', [
            'stream_context' => $context,
            'cache_wsdl' => WSDL_CACHE_NONE,
            'compression' => SOAP_COMPRESSION_ACCEPT | SOAP_COMPRESSION_GZIP | SOAP_COMPRESSION_DEFLATE,
            'trace' => true,
        ]);
    }

    /**
     * Genera los parámetros base requeridos por casi todas las peticiones del SIAT.
     */
    private function getBaseParameters(bool $includeModality = true): array
    {
        $params = [
            'codigoAmbiente' => $this->environment,
            'codigoPuntoVenta' => $this->posCode,
            'codigoSistema' => $this->systemCode,
            'codigoSucursal' => $this->branchCode,
            'nit' => $this->nit,
        ];

        if ($includeModality) {
            $params['codigoModalidad'] = $this->modality;
        }

        return $params;
    }

    // ==========================================
    // 1. COMUNICACIÓN Y CÓDIGOS (CUIS / CUFD)
    // ==========================================

    /**
     * Verifica que los servicios del SIAT estén en línea.
     */
    public function verifyCommunication(): array
    {
        try {
            $client = $this->getSoapClient('FacturacionCodigos');
            $result = $client->verificarComunicacion();

            return [
                'success' => true,
                'message' => 'Comunicación Exitosa',
                'data' => $result
            ];
        } catch (SoapFault $fault) {
            Log::error('SIAT verifyCommunication Error: ' . $fault->getMessage());
            return ['success' => false, 'message' => $fault->getMessage()];
        }
    }

    /**
     * Obtiene el Código Único de Inicio de Sistemas (CUIS).
     */
    public function getCuis(): array
    {
        try {
            $client = $this->getSoapClient('FacturacionCodigos');
            $params = ['SolicitudCuis' => $this->getBaseParameters()];
            
            $response = $client->cuis($params);

            // Si la transacción fue exitosa
            if (isset($response->RespuestaCuis->transaccion) && $response->RespuestaCuis->transaccion) {
                return [
                    'success' => true, 
                    'codigo' => $response->RespuestaCuis->codigo
                ];
            }

            // Si Impuestos rechazó la solicitud (ej. Token expirado, NIT inválido)
            return [
                'success' => false, 
                'error' => 'Rechazado por SIAT', 
                'detalles' => $response->RespuestaCuis->mensajesList ?? 'Error desconocido'
            ];

        } catch (SoapFault $fault) {
            Log::error('SIAT getCuis Error: ' . $fault->getMessage());
            return [
                'success' => false, 
                'error' => 'Fallo de conexión SOAP', 
                'mensaje' => $fault->getMessage()
            ];
        }
    }

    /**
     * Obtiene el Código Único de Facturación Diaria (CUFD).
     */
    /**
     * Obtiene el Código Único de Facturación Diaria (CUFD).
     * Requiere el CUIS vigente. El CUFD cambia todos los días.
     * * @param string $cuis El Código CUIS vigente.
     */
    public function getCufd(string $cuis): array
    {
        try {
            $client = $this->getSoapClient('FacturacionCodigos');
            // Unimos los parámetros base (NIT, Sistema, etc.) con el CUIS que recibimos
            $params = ['SolicitudCufd' => array_merge($this->getBaseParameters(), ['cuis' => $cuis])];
            
            $response = $client->cufd($params);

            // Verificamos si la transacción fue exitosa
            if (isset($response->RespuestaCufd->transaccion) && $response->RespuestaCufd->transaccion) {
                return [
                    'success' => true, 
                    'codigo' => $response->RespuestaCufd->codigo,
                    'codigoControl' => $response->RespuestaCufd->codigoControl,
                    'fechaVigencia' => $response->RespuestaCufd->fechaVigencia
                ];
            }

            return [
                'success' => false, 
                'error' => 'Rechazado por SIAT', 
                'detalles' => $response->RespuestaCufd->mensajesList ?? 'Error desconocido'
            ];

        } catch (SoapFault $fault) {
            Log::error('SIAT getCufd Error: ' . $fault->getMessage());
            return [
                'success' => false, 
                'error' => 'Fallo de conexión SOAP', 
                'mensaje' => $fault->getMessage()
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
                $this->getBaseParameters(false), // Sincronización no usa codigoModalidad
                ['cuis' => $cuis]
            )];
            
            return $client->$method($params);
        } catch (SoapFault $fault) {
            Log::error("SIAT $method Error: " . $fault->getMessage());
            return $fault->faultstring;
        }
    }

    public function syncActivities(string $cuis) { return $this->executeSync('sincronizarActividades', $cuis); }
    public function syncProductsServices(string $cuis) { return $this->executeSync('sincronizarListaProductosServicios', $cuis); }
    public function syncUnitTypes(string $cuis) { return $this->executeSync('sincronizarParametricaUnidadMedida', $cuis); }
    public function syncInvoiceLegends(string $cuis) { return $this->executeSync('sincronizarListaLeyendasFactura', $cuis); }
    public function syncCancellationReasons(string $cuis) { return $this->executeSync('sincronizarParametricaMotivoAnulacion', $cuis); }

    // ==========================================
    // 3. OPERACIONES DE FACTURACIÓN
    // ==========================================

    /**
     * Envía la factura firmada (XML) a Impuestos Nacionales.
     */
    public function receiveInvoice(string $cuis, string $cufd, string $archive, string $issueDate, string $hashArchive)
    {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');
            
            $baseParams = $this->getBaseParameters();
            $invoiceParams = [
                'codigoDocumentoSector' => 1, // Compra Venta
                'codigoEmision' => 1, // Online
                'tipoFacturaDocumento' => 1, // Factura con derecho a crédito fiscal
                'cuis' => $cuis,
                'cufd' => $cufd,
                'archivo' => $archive,
                'fechaEnvio' => $issueDate,
                'hashArchivo' => $hashArchive
            ];

            $params = ['SolicitudServicioRecepcionFactura' => array_merge($baseParams, $invoiceParams)];
            
            return $client->recepcionFactura($params);
        } catch (SoapFault $fault) {
            Log::error('SIAT receiveInvoice Error: ' . $fault->getMessage());
            return $fault->faultstring;
        }
    }

    /**
     * Anula una factura previamente emitida.
     */
    public function voidInvoice(string $cuis, string $cufd, string $cuf, int $reasonCode)
    {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');
            
            $baseParams = $this->getBaseParameters();
            $voidParams = [
                'codigoDocumentoSector' => 1,
                'codigoEmision' => 1,
                'tipoFacturaDocumento' => 1,
                'cuis' => $cuis,
                'cufd' => $cufd,
                'cuf' => $cuf,
                'codigoMotivo' => $reasonCode
            ];

            $params = ['SolicitudServicioAnulacionFactura' => array_merge($baseParams, $voidParams)];
            
            return $client->anulacionFactura($params);
        } catch (SoapFault $fault) {
            Log::error('SIAT voidInvoice Error: ' . $fault->getMessage());
            return $fault->faultstring;
        }
    }

    /**
     * Revierte la anulación de una factura.
     */
    public function reverseVoidInvoice(string $cuis, string $cufd, string $cuf)
    {
        try {
            $client = $this->getSoapClient('ServicioFacturacionCompraVenta');
            
            $baseParams = $this->getBaseParameters();
            $reverseParams = [
                'codigoDocumentoSector' => 1,
                'codigoEmision' => 1,
                'tipoFacturaDocumento' => 1,
                'cuis' => $cuis,
                'cufd' => $cufd,
                'cuf' => $cuf
            ];

            $params = ['SolicitudServicioReversionAnulacionFactura' => array_merge($baseParams, $reverseParams)];
            
            return $client->reversionAnulacionFactura($params);
        } catch (SoapFault $fault) {
            Log::error('SIAT reverseVoidInvoice Error: ' . $fault->getMessage());
            return $fault->faultstring;
        }
    }

    /**
     * Obtiene el CUIS activo desde la caché, o solicita uno nuevo si no existe.
     * El caché se configura para expirar un poco antes del año.
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
     * Obtiene el CUFD activo desde la caché, o solicita uno nuevo si caducó.
     * El CUFD se renueva automáticamente cada 24 horas.
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
                    'codigo' => $response['codigo'],
                    'codigoControl' => $response['codigoControl']
                ];
            }
            
            Log::error('SIAT Error: Failed to auto-renew CUFD');
            return null;
        });
    }
}