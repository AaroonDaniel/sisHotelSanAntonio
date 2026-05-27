<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Guest;
use App\Models\SiatCredential;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use DOMDocument;
use DOMElement;
use Exception;

/**
 * SiatXmlBuilder
 *
 * Construye el XML de la Factura Electrónica Computarizada
 * (Sector 1 - Compra Venta) según el XSD vigente del SIAT.
 *
 * Modalidad: Computarizada (codigoModalidad = 2).
 * Tipo de emisión:
 *  - 1 = Online (por defecto)
 *  - 2 = Offline / Contingencia (durante un Evento Significativo)
 *
 * El builder consume directamente la credencial CUFD vigente
 * (modelo SiatCredential) en lugar de un array suelto, de modo que
 * el CUF y el nodo <cufd> provienen de la misma fuente de verdad.
 *
 * Hashing: SHA-256 sobre el XML plano (sin firma XAdES).
 */
class SiatXmlBuilder
{
    public const EMISSION_ONLINE  = 1;
    public const EMISSION_OFFLINE = 2;

    protected Invoice $invoice;
    protected SiatCredential $cufd;
    protected CarbonInterface $issuedAt;
    protected DOMDocument $xmlDocument;

    /** 1 = Online, 2 = Offline (contingencia). */
    protected int $emissionType = self::EMISSION_ONLINE;

    /**
     * @param Invoice         $invoice  Factura ya persistida con sus detalles y Huésped.
     * @param SiatCredential  $cufd     Credencial CUFD vigente (o CUFD del evento en offline).
     * @param int             $emissionType  EMISSION_ONLINE | EMISSION_OFFLINE
     */
    public function __construct(Invoice $invoice, SiatCredential $cufd, int $emissionType = self::EMISSION_ONLINE)
    {
        $this->invoice      = $invoice;
        $this->cufd         = $cufd;
        $this->emissionType = $this->normalizeEmissionType($emissionType);

        // Fecha/hora real de la transacción. Se fija una sola vez para que el
        // CUF, el nodo <fechaEmision> y fechaEnvio del SOAP usen el mismo instante.
        $this->issuedAt = $invoice->issue_time
            ? Carbon::parse($invoice->issue_time)
            : Carbon::now();

        $this->xmlDocument = new DOMDocument('1.0', 'UTF-8');
        $this->xmlDocument->formatOutput = true;
    }

    /**
     * Permite cambiar el tipo de emisión después de la construcción
     * (útil cuando el controlador detecta un evento activo más tarde).
     */
    public function setEmissionType(int $emissionType): self
    {
        $this->emissionType = $this->normalizeEmissionType($emissionType);
        return $this;
    }

    public function getEmissionType(): int
    {
        return $this->emissionType;
    }

    public function isOffline(): bool
    {
        return $this->emissionType === self::EMISSION_OFFLINE;
    }

    private function normalizeEmissionType(int $type): int
    {
        if (!in_array($type, [self::EMISSION_ONLINE, self::EMISSION_OFFLINE], true)) {
            throw new Exception("Tipo de emisión inválido: {$type}. Use 1 (online) o 2 (offline).");
        }
        return $type;
    }

    // =========================================================
    // 1. GENERACIÓN DEL CUF
    // =========================================================

    /**
     * Genera el Código Único de Factura (CUF) usando SiatUtils.
     *
     * En modo offline el algoritmo es idéntico al online; solo cambia
     * el dígito de emissionType (posición 36 de la cadena base):
     *   - Online  -> 1
     *   - Offline -> 2
     *
     * El control_code del CUFD del evento se concatena al final.
     */
    public function generateCuf(): string
    {
        return SiatUtils::buildCuf($this->cufd, $this->issuedAt, [
            'nit'          => config('siat.nit'),
            'branch'       => config('siat.branch_code', 0),
            'modality'     => config('siat.modality', 2),
            'emissionType' => $this->emissionType,
            'invoiceType'  => 1, // 1 = Factura con Derecho a Crédito Fiscal
            'sectorDoc'    => 1, // 01 = Compra Venta
            'number'       => $this->invoice->invoice_number,
            'pos'          => config('siat.pos_code', 0),
        ]);
    }

    // =========================================================
    // 2. CONSTRUCCIÓN DEL XML
    // =========================================================

    public function buildXml(): string
    {
        $this->xmlDocument = new DOMDocument('1.0', 'UTF-8');
        $this->xmlDocument->formatOutput = true;

        $root = $this->xmlDocument->createElement('facturaComputarizadaCompraVenta');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $root->setAttribute('xsi:noNamespaceSchemaLocation', 'facturaComputarizadaCompraVenta.xsd');
        $this->xmlDocument->appendChild($root);

        $root->appendChild($this->buildHeader());

        if ($this->invoice->details->isEmpty()) {
            throw new Exception("La factura #{$this->invoice->invoice_number} no tiene detalles; el XML sería inválido.");
        }

        foreach ($this->invoice->details as $item) {
            $root->appendChild($this->buildDetail($item));
        }

        return $this->xmlDocument->saveXML();
    }

    /**
     * Construye el nodo <cabecera>. Orden estricto según XSD.
     */
    protected function buildHeader(): DOMElement
    {
        $header = $this->xmlDocument->createElement('cabecera');
        $guest  = $this->getInvoiceGuest();

        // --- Emisor ---
        $this->appendText($header, 'nitEmisor', (string) config('siat.nit'));
        $this->appendText($header, 'razonSocialEmisor', config('siat.razon_social'));
        $this->appendText($header, 'municipio', config('siat.municipio', 'Potosi'));
        $this->appendText($header, 'telefono', config('siat.telefono', ''));
        $this->appendText($header, 'numeroFactura', (string) $this->invoice->invoice_number);
        $this->appendText($header, 'cuf', $this->generateCuf());
        $this->appendText($header, 'cufd', $this->cufd->code);
        $this->appendText($header, 'codigoSucursal', (string) config('siat.branch_code'));
        $this->appendText($header, 'direccion', config('siat.direccion'));

        $posCode = (int) config('siat.pos_code', 0);
        if ($posCode === 0) {
            $this->appendNil($header, 'codigoPuntoVenta');
        } else {
            $this->appendText($header, 'codigoPuntoVenta', (string) $posCode);
        }

        $this->appendText(
            $header,
            'fechaEmision',
            $this->issuedAt->format('Y-m-d\TH:i:s.v')
        );

        // --- Comprador (extraído del Huésped) ---
        $this->appendText($header, 'nombreRazonSocial', $this->resolveBusinessName($guest));
        $this->appendText($header, 'codigoTipoDocumentoIdentidad', (string) $this->resolveDocumentType($guest));
        $this->appendText($header, 'numeroDocumento', $this->resolveDocumentNumber($guest));
        $this->appendNil($header, 'complemento');
        $this->appendText($header, 'codigoCliente', (string) $this->invoice->checkin->guest_id);

        // --- Pago ---
        $this->appendText($header, 'codigoMetodoPago', (string) $this->invoice->payment_method_code);

        if ((int) $this->invoice->payment_method_code === 2 && !empty($this->invoice->card_number)) {
            $this->appendText($header, 'numeroTarjeta', $this->invoice->card_number);
        } else {
            $this->appendNil($header, 'numeroTarjeta');
        }

        // --- Montos ---
        $this->appendText($header, 'montoTotal', $this->money($this->invoice->total_amount));
        $this->appendText($header, 'montoTotalSujetoIva', $this->money($this->invoice->total_subject_to_vat));
        $this->appendText($header, 'codigoMoneda', '1');
        $this->appendText($header, 'tipoCambio', '1');
        $this->appendText($header, 'montoTotalMoneda', $this->money($this->invoice->total_amount));

        $this->appendNil($header, 'montoGiftCard');
        $this->appendText($header, 'descuentoAdicional', $this->money($this->invoice->additional_discount ?? 0));
        $this->appendText($header, 'codigoExcepcion', '0');

        // CAFC: no aplica en modalidad Computarizada (ni online ni offline por evento).
        // Los CAFC son para la modalidad de Facturación Manual / Pre-valorada.
        $this->appendNil($header, 'cafc');

        $this->appendText(
            $header,
            'leyenda',
            config('siat.leyenda', 'Ley N° 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados.')
        );

        $this->appendText(
            $header,
            'usuario',
            optional($this->invoice->user)->name ?? 'GERENTE'
        );

        $this->appendText($header, 'codigoDocumentoSector', '1');

        return $header;
    }

    protected function buildDetail($item): DOMElement
    {
        $detail = $this->xmlDocument->createElement('detalle');

        $this->appendText(
            $detail,
            'actividadEconomica',
            (string) config('siat.actividad_economica', '551011')
        );

        $this->appendText(
            $detail,
            'codigoProductoSin',
            (string) config('siat.codigo_producto_sin', '83111')
        );

        $codigoInterno = !empty($item->id) ? (string) $item->id : '001';
        $this->appendText($detail, 'codigoProducto', $codigoInterno);

        $this->appendText($detail, 'descripcion', $item->description);
        $this->appendText($detail, 'cantidad', $this->money($item->quantity));
        $this->appendText($detail, 'unidadMedida', (string) config('siat.unidad_medida', '62'));
        $this->appendText($detail, 'precioUnitario', $this->money($item->unit_price));

        if (!empty($item->discount) && $item->discount > 0) {
            $this->appendText($detail, 'montoDescuento', $this->money($item->discount));
        } else {
            $this->appendNil($detail, 'montoDescuento');
        }

        $this->appendText($detail, 'subTotal', $this->money($item->cost));
        $this->appendNil($detail, 'numeroSerie');
        $this->appendNil($detail, 'numeroImei');

        return $detail;
    }

    // =========================================================
    // 3. DATOS DEL HUÉSPED
    // =========================================================

    protected function getInvoiceGuest(): Guest
    {
        $guest = optional($this->invoice->checkin)->guest;

        if (!$guest instanceof Guest) {
            throw new Exception(
                "La factura #{$this->invoice->invoice_number} no tiene un Huésped asociado. "
                . "Los datos fiscales deben extraerse del modelo Guest."
            );
        }

        return $guest;
    }

    protected function resolveBusinessName(Guest $guest): string
    {
        $doc = trim((string) $guest->identification_number);
        if ($doc === '' || $doc === '0') {
            return 'SIN NOMBRE';
        }
        return strtoupper(trim($guest->full_name));
    }

    protected function resolveDocumentType(Guest $guest): int
    {
        $type = $guest->document_type ?? null;
        if ($type === null || trim((string) $type) === '') {
            return 1; // CI
        }
        return (int) $type;
    }

    protected function resolveDocumentNumber(Guest $guest): string
    {
        $doc = trim((string) $guest->identification_number);
        return ($doc === '' || $doc === '0') ? '0' : $doc;
    }

    // =========================================================
    // 4. HELPERS
    // =========================================================

    protected function money($value): string
    {
        return number_format((float) $value, 2, '.', '');
    }

    protected function appendText(DOMElement $parent, string $tag, string $value): void
    {
        $parent->appendChild(
            $this->xmlDocument->createElement($tag, htmlspecialchars((string) $value, ENT_XML1))
        );
    }

    protected function appendNil(DOMElement $parent, string $tag): void
    {
        $node = $this->xmlDocument->createElement($tag);
        $node->setAttribute('xsi:nil', 'true');
        $parent->appendChild($node);
    }

    // =========================================================
    // 5. SALIDA
    // =========================================================

    /**
     * Devuelve el XML plano (sin comprimir). Útil para almacenar
     * en disco o calcular hashes antes de empaquetar.
     */
    public function getRawXml(): string
    {
        return $this->buildXml();
    }

    /**
     * Comprime el XML en GZIP (nivel 9). Usado tanto para el envío
     * SOAP online como para almacenar la factura offline en disco.
     */
    public function getGzipArchive(): string
    {
        return gzencode($this->buildXml(), 9);
    }
}