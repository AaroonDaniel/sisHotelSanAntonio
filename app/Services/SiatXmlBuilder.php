<?php

namespace App\Services;

use App\Models\Invoice;
use DOMDocument;
use Exception;

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

    /**
     * Genera el Código Único de Factura (CUF) usando el algoritmo Modulo 11 y Base 16.
     */
    public function generateCuf(): string
    {
        $nit = str_pad(config('siat.nit'), 13, '0', STR_PAD_LEFT);
        $date = $this->invoice->issue_time->format('YmdHisv'); // Fecha y milisegundos
        $branch = str_pad(config('siat.branch_code'), 4, '0', STR_PAD_LEFT);
        $modality = config('siat.modality');
        $emissionType = 1; // 1: Online
        $invoiceType = 1; // 1: Factura con Derecho a Crédito Fiscal
        $sectorDocument = 1; // 1: Compra Venta
        $number = str_pad($this->invoice->invoice_number, 10, '0', STR_PAD_LEFT);
        $pos = str_pad(config('siat.pos_code'), 4, '0', STR_PAD_LEFT);

        // 1. Concatenar campos
        $concatenated = $nit . $date . $branch . $modality . $emissionType . $invoiceType . $sectorDocument . $number . $pos;

        // 2. Calcular Módulo 11 (Dígito Verificador)
        $digit = SiatUtils::modulo11($concatenated, 1, 9, false);
        
        // 3. Unir concatenado + dígito y pasar a Base 16
        $cufLong = $concatenated . $digit;
        $cufHex = SiatUtils::toBase16($cufLong);

        // 4. Concatenar el Código de Control del CUFD al final
        return $cufHex . $this->controlCode;
    }

    /**
     * Construye el documento XML completo requerido para la Facturación de Compra Venta.
     */
    public function buildXml(): string
    {
        $root = $this->xmlDocument->createElement('facturaComputarizadaCompraVenta');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $this->xmlDocument->appendChild($root);

        $header = $this->xmlDocument->createElement('cabecera');
        
        $fields = [
            'nitEmisor' => config('siat.nit'),
            'razonSocialEmisor' => 'HOTEL SAN ANTONIO', // Cambiar por el real
            'municipio' => 'Potosi',
            'telefono' => '2222222',
            'numeroFactura' => $this->invoice->invoice_number,
            'cuf' => $this->generateCuf(),
            'cufd' => $this->cufd,
            'codigoSucursal' => config('siat.branch_code'),
            'direccion' => 'CALLE X NRO Y',
            'codigoPuntoVenta' => config('siat.pos_code'),
            'fechaEmision' => $this->invoice->issue_time->format('Y-m-d\TH:i:s.v'),
            'nombreRazonSocial' => $this->invoice->customer_name,
            'codigoTipoDocumentoIdentidad' => 1, // 1: CI, 5: NIT
            'numeroDocumento' => $this->invoice->customer_nit,
            'codigoCliente' => $this->invoice->checkin->guest_id,
            'codigoMetodoPago' => $this->invoice->payment_method_code,
            'montoTotal' => number_format($this->invoice->total_amount, 2, '.', ''),
            'montoTotalSujetoIva' => number_format($this->invoice->total_subject_to_vat, 2, '.', ''),
            'codigoMoneda' => 1, // 1: Boliviano
            'tipoCambio' => 1,
            'montoTotalMoneda' => number_format($this->invoice->total_amount, 2, '.', ''),
            'leyenda' => 'Ley Nro 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados.',
            'usuario' => $this->invoice->user->name,
            'codigoDocumentoSector' => 1
        ];

        foreach ($fields as $key => $value) {
            $header->appendChild($this->xmlDocument->createElement($key, $value));
        }
        
        $root->appendChild($header);

        // Detalles
        foreach ($this->invoice->details as $item) {
            $detail = $this->xmlDocument->createElement('detalle');
            $detail->appendChild($this->xmlDocument->createElement('actividadEconomica', '551010')); // Código actividad hotelera
            $detail->appendChild($this->xmlDocument->createElement('codigoProductoServicio', '99100')); // Código SIAT
            $detail->appendChild($this->xmlDocument->createElement('codigoProducto', $item->id));
            $detail->appendChild($this->xmlDocument->createElement('descripcion', $item->description));
            $detail->appendChild($this->xmlDocument->createElement('cantidad', $item->quantity));
            $detail->appendChild($this->xmlDocument->createElement('unidadMedida', 58)); // 58: Unidad
            $detail->appendChild($this->xmlDocument->createElement('precioUnitario', number_format($item->unit_price, 2, '.', '')));
            $detail->appendChild($this->xmlDocument->createElement('montoDescuento', '0.00'));
            $detail->appendChild($this->xmlDocument->createElement('subTotal', number_format($item->cost, 2, '.', '')));
            $root->appendChild($detail);
        }

        return $this->xmlDocument->saveXML();
    }

    /**
     * Comprime el XML en formato GZIP (Requerido por SIAT antes del envío).
     */
    public function getGzipArchive(): string
    {
        $xmlContent = $this->buildXml();
        return base64_encode(gzencode($xmlContent, 9));
    }
}