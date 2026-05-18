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
 * Construye el XML de la Factura Electrónica Computarizada en Línea
 * (Sector 1 - Compra Venta) según el XSD vigente del SIAT.
 *
 * Modalidad: Computarizada en Línea (codigoModalidad = 2)
 * Hashing:   SHA-256 sobre el XML plano (sin firma XAdES).
 *
 * El builder consume directamente la credencial CUFD vigente
 * (modelo SiatCredential) en lugar de un array suelto, de modo que
 * el CUF y el nodo <cufd> provienen de la misma fuente de verdad.
 */
class SiatXmlBuilder
{
    protected Invoice $invoice;
    protected SiatCredential $cufd;
    protected CarbonInterface $issuedAt;
    protected DOMDocument $xmlDocument;

    /**
     * @param Invoice         $invoice  Factura ya persistida con sus detalles y Huésped.
     * @param SiatCredential  $cufd     Credencial CUFD vigente (tabla siat_credentials).
     */
    public function __construct(Invoice $invoice, SiatCredential $cufd)
    {
        $this->invoice = $invoice;
        $this->cufd    = $cufd;

        // Fecha/hora real de la transacción. Se fija una sola vez en el
        // constructor para que el CUF, el nodo <fechaEmision> y el campo
        // fechaEnvio del SOAP usen exactamente el mismo instante.
        $this->issuedAt = $invoice->issue_time
            ? Carbon::parse($invoice->issue_time)
            : Carbon::now();

        $this->xmlDocument = new DOMDocument('1.0', 'UTF-8');
        $this->xmlDocument->formatOutput = true;
    }

    // =========================================================
    // 1. GENERACIÓN DEL CUF
    // =========================================================

    /**
     * Genera el Código Único de Factura (CUF) delegando el algoritmo
     * a SiatUtils, que valida la vigencia del CUFD y aplica Módulo 11.
     */
    public function generateCuf(): string
    {
        return SiatUtils::buildCuf($this->cufd, $this->issuedAt, [
            'nit'          => config('siat.nit'),
            'branch'       => config('siat.branch_code', 0),
            'modality'     => config('siat.modality', 2),
            'emissionType' => 1, // 1 = Online
            'invoiceType'  => 1, // 1 = Factura con Derecho a Crédito Fiscal
            'sectorDoc'    => 1, // 01 = Compra Venta
            'number'       => $this->invoice->invoice_number,
            'pos'          => config('siat.pos_code', 0),
        ]);
    }

    // =========================================================
    // 2. CONSTRUCCIÓN DEL XML (orden estricto del XSD)
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
     * Construye el nodo <cabecera>. El orden de los elementos es estricto.
     */
    protected function buildHeader(): DOMElement
    {
        $header = $this->xmlDocument->createElement('cabecera');
        $guest  = $this->getInvoiceGuest();

        // --- Datos del emisor ---
        $this->appendText($header, 'nitEmisor', (string) config('siat.nit'));
        $this->appendText($header, 'razonSocialEmisor', config('siat.razon_social'));
        $this->appendText($header, 'municipio', config('siat.municipio', 'Potosi'));
        $this->appendText($header, 'telefono', config('siat.telefono', ''));
        $this->appendText($header, 'numeroFactura', (string) $this->invoice->invoice_number);
        $this->appendText($header, 'cuf', $this->generateCuf());
        $this->appendText($header, 'cufd', $this->cufd->code);
        $this->appendText($header, 'codigoSucursal', (string) config('siat.branch_code'));
        $this->appendText($header, 'direccion', config('siat.direccion'));

        // Punto de Venta (nil si es 0)
        $posCode = (int) config('siat.pos_code', 0);
        if ($posCode === 0) {
            $this->appendNil($header, 'codigoPuntoVenta');
        } else {
            $this->appendText($header, 'codigoPuntoVenta', (string) $posCode);
        }

        // --- Fecha de emisión real de la transacción ---
        // Mismo instante usado para el CUF; formato ISO-8601 con milisegundos.
        $this->appendText(
            $header,
            'fechaEmision',
            $this->issuedAt->format('Y-m-d\TH:i:s.v')
        );

        // --- Datos del comprador (extraídos del Huésped) ---
        $this->appendText($header, 'nombreRazonSocial', $this->resolveBusinessName($guest));
        $this->appendText($header, 'codigoTipoDocumentoIdentidad', (string) $this->resolveDocumentType($guest));
        $this->appendText($header, 'numeroDocumento', $this->resolveDocumentNumber($guest));

        // Complemento del documento (obligatorio, generalmente nulo)
        $this->appendNil($header, 'complemento');

        $this->appendText($header, 'codigoCliente', (string) $this->invoice->checkin->guest_id);

        // --- Datos del pago ---
        $this->appendText($header, 'codigoMetodoPago', (string) $this->invoice->payment_method_code);

        // Número de tarjeta (solo aplica si codigoMetodoPago = 2)
        if ((int) $this->invoice->payment_method_code === 2 && !empty($this->invoice->card_number)) {
            $this->appendText($header, 'numeroTarjeta', $this->invoice->card_number);
        } else {
            $this->appendNil($header, 'numeroTarjeta');
        }

        // --- Montos ---
        $this->appendText($header, 'montoTotal', $this->money($this->invoice->total_amount));
        $this->appendText($header, 'montoTotalSujetoIva', $this->money($this->invoice->total_subject_to_vat));
        $this->appendText($header, 'codigoMoneda', '1'); // 1 = Bolivianos
        $this->appendText($header, 'tipoCambio', '1');
        $this->appendText($header, 'montoTotalMoneda', $this->money($this->invoice->total_amount));

        // Gift card (no aplica en hotelería)
        $this->appendNil($header, 'montoGiftCard');

        $this->appendText($header, 'descuentoAdicional', $this->money($this->invoice->additional_discount ?? 0));
        $this->appendText($header, 'codigoExcepcion', '0');

        // CAFC: solo aplica en modalidad offline. En Computarizada en Línea va nulo.
        $this->appendNil($header, 'cafc');

        $this->appendText(
            $header,
            'leyenda',
            config('siat.leyenda', 'Ley N° 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados.')
        );

        // Usuario que emite (debe ser el Gerente según regla de negocio)
        $this->appendText(
            $header,
            'usuario',
            optional($this->invoice->user)->name ?? 'GERENTE'
        );

        $this->appendText($header, 'codigoDocumentoSector', '1'); // 1 = Compra Venta

        return $header;
    }

    /**
     * Construye un nodo <detalle> a partir de una línea de la factura.
     */
    protected function buildDetail($item): DOMElement
    {
        $detail = $this->xmlDocument->createElement('detalle');

        $this->appendText(
            $detail,
            'actividadEconomica',
            (string) config('siat.actividad_economica', '551011') // Hotelería
        );

        $this->appendText(
            $detail,
            'codigoProductoSin',
            (string) config('siat.codigo_producto_sin', '83111') // Servicios de alojamiento
        );

        // Código interno del producto/servicio
        $codigoInterno = !empty($item->id) ? (string) $item->id : '001';
        $this->appendText($detail, 'codigoProducto', $codigoInterno);

        $this->appendText($detail, 'descripcion', $item->description);
        $this->appendText($detail, 'cantidad', $this->money($item->quantity));

        // Unidad de medida 62 = Servicio (catálogo SIAT)
        $this->appendText($detail, 'unidadMedida', (string) config('siat.unidad_medida', '62'));

        $this->appendText($detail, 'precioUnitario', $this->money($item->unit_price));

        // Descuento por ítem
        if (!empty($item->discount) && $item->discount > 0) {
            $this->appendText($detail, 'montoDescuento', $this->money($item->discount));
        } else {
            $this->appendNil($detail, 'montoDescuento');
        }

        $this->appendText($detail, 'subTotal', $this->money($item->cost));

        // Número de serie e IMEI: solo aplican para venta de bienes con seriales.
        // En servicios hoteleros se envían como nulos.
        $this->appendNil($detail, 'numeroSerie');
        $this->appendNil($detail, 'numeroImei');

        return $detail;
    }

    // =========================================================
    // 3. RESOLUCIÓN DE DATOS DEL HUÉSPED
    // =========================================================

    /**
     * Obtiene el Huésped asociado a la factura a través del Checkin.
     */
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

    /**
     * Razón Social / Nombre del comprador.
     * Cuando el documento es 0 (consumidor sin nombre), el SIAT exige "SIN NOMBRE".
     */
    protected function resolveBusinessName(Guest $guest): string
    {
        $doc = trim((string) $guest->identification_number);

        if ($doc === '' || $doc === '0') {
            return 'SIN NOMBRE';
        }

        return strtoupper(trim($guest->full_name));
    }

    /**
     * Resuelve el código de tipo de documento de identidad según catálogo SIAT.
     *
     * Catálogo:
     *  1 = CI   (Cédula de Identidad)
     *  2 = CEX  (Cédula de Identidad de Extranjero)
     *  3 = PAS  (Pasaporte)
     *  4 = OD   (Otro Documento)
     *  5 = NIT  (Número de Identificación Tributaria)
     *
     * Se lee directamente la propiedad explícita `document_type` del Huésped.
     * Si está ausente o vacía, se usa '1' (CI) como fallback. Ya NO se infiere
     * por nacionalidad: esa heurística producía clasificaciones fiscales
     * incorrectas para huéspedes extranjeros con CI boliviana, dobles
     * nacionalidades o nacionalidad no registrada.
     */
    protected function resolveDocumentType(Guest $guest): int
    {
        $type = $guest->document_type ?? null;

        if ($type === null || trim((string) $type) === '') {
            return 1; // Fallback: CI
        }

        return (int) $type;
    }

    /**
     * Número de documento del comprador.
     * Si el documento es vacío o "0", SIAT exige el literal "0".
     */
    protected function resolveDocumentNumber(Guest $guest): string
    {
        $doc = trim((string) $guest->identification_number);
        return ($doc === '' || $doc === '0') ? '0' : $doc;
    }

    // =========================================================
    // 4. HELPERS DE FORMATO Y NODOS
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
     * Comprime el XML en formato GZIP para el envío SOAP.
     */
    public function getGzipArchive(): string
    {
        return gzencode($this->buildXml(), 9);
    }
}