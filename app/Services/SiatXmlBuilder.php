<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Guest;
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
 * Hashing: SHA-256 sobre el XML plano (sin firma XAdES).
 */
class SiatXmlBuilder
{
    protected Invoice $invoice;
    protected string $cufd;
    protected string $controlCode;
    protected DOMDocument $xmlDocument;

    public function __construct(Invoice $invoice, array $cufdData)
    {
        $this->invoice = $invoice;
        $this->cufd = $cufdData['codigo'];
        $this->controlCode = $cufdData['codigoControl'];
        $this->xmlDocument = new DOMDocument('1.0', 'UTF-8');
        $this->xmlDocument->formatOutput = true;
    }

    // =========================================================
    // 1. GENERACIÓN DEL CUF (56 dígitos + verificador + control)
    // =========================================================

    /**
     * Genera el Código Único de Factura (CUF).
     *
     * Estructura de la cadena base (56 dígitos):
     *  - NIT emisor             : 13 dígitos
     *  - Fecha/hora emisión     : 17 dígitos (YYYYMMDDHHmmssSSS)
     *  - Sucursal               : 4 dígitos
     *  - Modalidad              : 1 dígito
     *  - Tipo de emisión        : 1 dígito
     *  - Tipo de factura        : 1 dígito
     *  - Tipo doc. sector       : 2 dígitos
     *  - Número de factura      : 10 dígitos
     *  - Punto de venta         : 4 dígitos
     *  ------------------------------------
     *  TOTAL                    : 53 dígitos numéricos base
     *
     *  Sobre estos 53 dígitos se calcula el dígito verificador
     *  Módulo 11, se concatena, se convierte a Base 16, y finalmente
     *  se anexa el Código de Control del CUFD.
     */
    public function generateCuf(): string
    {
        $nit          = str_pad((string) config('siat.nit'), 13, '0', STR_PAD_LEFT);
        $date         = $this->invoice->issue_time->format('YmdHisv'); // 17 dígitos
        $branch       = str_pad((string) config('siat.branch_code'), 4, '0', STR_PAD_LEFT);
        $modality     = (string) config('siat.modality', 2); // 2 = Computarizada
        $emissionType = '1'; // 1 = Online
        $invoiceType  = '1'; // 1 = Factura con Derecho a Crédito Fiscal
        $sectorDoc    = str_pad('1', 2, '0', STR_PAD_LEFT); // 01 = Compra Venta
        $number       = str_pad((string) $this->invoice->invoice_number, 10, '0', STR_PAD_LEFT);
        $pos          = str_pad((string) config('siat.pos_code', 0), 4, '0', STR_PAD_LEFT);

        $concatenated = $nit . $date . $branch . $modality . $emissionType
                      . $invoiceType . $sectorDoc . $number . $pos;

        // Validación defensiva: la cadena base DEBE medir 53 dígitos exactos.
        if (strlen($concatenated) !== 53) {
            throw new Exception(
                "Cadena CUF inválida: se esperaban 53 dígitos, se obtuvieron "
                . strlen($concatenated) . " ({$concatenated})"
            );
        }

        $digit  = SiatUtils::modulo11($concatenated, 1, 9, false);
        $cufHex = SiatUtils::toBase16($concatenated . $digit);

        return $cufHex . $this->controlCode;
    }

    // =========================================================
    // 2. CONSTRUCCIÓN DEL XML (orden estricto del XSD)
    // =========================================================

    /**
     * Construye el documento XML respetando el orden estricto del XSD.
     */
    public function buildXml(): string
    {
        $this->xmlDocument = new DOMDocument('1.0', 'UTF-8');
        $this->xmlDocument->formatOutput = true;

        $root = $this->xmlDocument->createElement('facturaComputarizadaCompraVenta');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $root->setAttribute('xsi:noNamespaceSchemaLocation', 'facturaComputarizadaCompraVenta.xsd');
        $this->xmlDocument->appendChild($root);

        $root->appendChild($this->buildHeader());

        foreach ($this->invoice->details as $item) {
            $root->appendChild($this->buildDetail($item));
        }

        return $this->xmlDocument->saveXML();
    }

    /**
     * Construye el nodo <cabecera>.
     *
     * IMPORTANTE: el orden de los elementos es estricto y no admite alteraciones.
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
        $this->appendText($header, 'cufd', $this->cufd);
        $this->appendText($header, 'codigoSucursal', (string) config('siat.branch_code'));
        $this->appendText($header, 'direccion', config('siat.direccion'));

        // Punto de Venta (nil si es 0)
        $posCode = (int) config('siat.pos_code', 0);
        if ($posCode === 0) {
            $this->appendNil($header, 'codigoPuntoVenta');
        } else {
            $this->appendText($header, 'codigoPuntoVenta', (string) $posCode);
        }

        // --- Fecha de emisión ---
        $this->appendText(
            $header,
            'fechaEmision',
            $this->invoice->issue_time->format('Y-m-d\TH:i:s.v')
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
     * Lanza excepción si no existe la relación, ya que es un requisito fiscal.
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
     * Cuando el NIT es 0 (consumidor sin nombre), el SIAT exige literal "SIN NOMBRE".
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
     * Mientras el modelo Guest no tenga un campo explícito `document_type`,
     * se infiere por nacionalidad. Cuando se agregue ese campo, esta función
     * deberá leerlo directamente.
     */
    protected function resolveDocumentType(Guest $guest): int
    {
        // Hook para cuando se agregue el campo en la migración:
        if (!empty($guest->document_type)) {
            return (int) $guest->document_type;
        }

        $nationality = strtoupper(trim((string) $guest->nationality));

        // Boliviano sin marca explícita => CI
        if ($nationality === '' || str_starts_with($nationality, 'BOLIVIAN')) {
            return 1;
        }

        // Extranjero => CEX por defecto (el operador podrá ajustar a Pasaporte si corresponde)
        return 2;
    }

    /**
     * Número de documento del comprador.
     * Si el NIT es vacío o "0", SIAT exige el literal "0".
     */
    protected function resolveDocumentNumber(Guest $guest): string
    {
        $doc = trim((string) $guest->identification_number);
        return ($doc === '' || $doc === '0') ? '0' : $doc;
    }

    // =========================================================
    // 4. HELPERS DE FORMATO Y NODOS
    // =========================================================

    /**
     * Formatea un valor monetario al estilo SIAT (punto decimal, 2 dígitos).
     */
    protected function money($value): string
    {
        return number_format((float) $value, 2, '.', '');
    }

    /**
     * Agrega un nodo de texto al elemento padre.
     */
    protected function appendText(DOMElement $parent, string $tag, string $value): void
    {
        $textoSeguro = (string) $value;
        $parent->appendChild($this->xmlDocument->createElement($tag, htmlspecialchars($textoSeguro, ENT_XML1)));
    }

    /**
     * Agrega un nodo nulo con atributo xsi:nil="true".
     */
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