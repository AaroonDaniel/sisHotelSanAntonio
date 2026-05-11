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
     * Genera el Código Único de Factura (CUF) usando el algoritmo Módulo 11 y Base 16.
     */
    public function generateCuf(): string
    {
        $nit = str_pad(config('siat.nit'), 13, '0', STR_PAD_LEFT);
        $date = $this->invoice->issue_time->format('YmdHisv'); 
        $branch = str_pad(config('siat.branch_code'), 4, '0', STR_PAD_LEFT);
        $modality = config('siat.modality');
        $emissionType = 1; // 1: Online
        $invoiceType = 1;  // 1: Factura con Derecho a Crédito Fiscal
        
        // 👇 AQUÍ ESTABA EL ERROR: El Sector Documento exige 2 dígitos obligatorios ('01')
        $sectorDocument = str_pad('1', 2, '0', STR_PAD_LEFT); 
        
        $number = str_pad($this->invoice->invoice_number, 10, '0', STR_PAD_LEFT);
        $pos = str_pad(config('siat.pos_code'), 4, '0', STR_PAD_LEFT);

        // Concatenación para Módulo 11 (Debe medir exactamente 53 caracteres)
        $concatenated = $nit . $date . $branch . $modality . $emissionType . $invoiceType . $sectorDocument . $number . $pos;

        // Calcular Dígito Verificador
        $digit = SiatUtils::modulo11($concatenated, 1, 9, false);
        
        // Conversión a Base 16 (Hexadecimal)
        $cufLong = $concatenated . $digit;
        $cufHex = SiatUtils::toBase16($cufLong);

        return $cufHex . $this->controlCode;
    }

    /**
     * Construye el documento XML respetando el orden estricto del XSD v2.
     */
    public function buildXml(): string
    {

        $this->xmlDocument = new \DOMDocument('1.0', 'UTF-8');
        $this->xmlDocument->formatOutput = true; // Mantiene el XML ordenado

        $root = $this->xmlDocument->createElement('facturaComputarizadaCompraVenta');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $root->setAttribute('xsi:noNamespaceSchemaLocation', 'facturaComputarizadaCompraVenta.xsd');
        $this->xmlDocument->appendChild($root);

        // --- SECTION: HEADER (CABECERA) ---
        $header = $this->xmlDocument->createElement('cabecera');
        
        $header->appendChild($this->xmlDocument->createElement('nitEmisor', config('siat.nit')));
        $header->appendChild($this->xmlDocument->createElement('razonSocialEmisor', 'HOTEL SAN ANTONIO'));
        $header->appendChild($this->xmlDocument->createElement('municipio', 'Potosi'));
        $header->appendChild($this->xmlDocument->createElement('telefono', '2222222'));
        $header->appendChild($this->xmlDocument->createElement('numeroFactura', (string) $this->invoice->invoice_number));
        $header->appendChild($this->xmlDocument->createElement('cuf', $this->generateCuf()));
        $header->appendChild($this->xmlDocument->createElement('cufd', $this->cufd));
        $header->appendChild($this->xmlDocument->createElement('codigoSucursal', config('siat.branch_code')));
        $header->appendChild($this->xmlDocument->createElement('direccion', 'CALLE X NRO Y'));
        
        // Punto de Venta (xsi:nil si es 0)
        $posNode = $this->xmlDocument->createElement('codigoPuntoVenta');
        if (config('siat.pos_code') == 0) {
            $posNode->setAttribute('xsi:nil', 'true');
        } else {
            $posNode->nodeValue = config('siat.pos_code');
        }
        $header->appendChild($posNode);

        $header->appendChild($this->xmlDocument->createElement('fechaEmision', $this->invoice->issue_time->format('Y-m-d\TH:i:s.v')));
        $header->appendChild($this->xmlDocument->createElement('nombreRazonSocial', $this->invoice->customer_name));
        $header->appendChild($this->xmlDocument->createElement('codigoTipoDocumentoIdentidad', '1')); 
        $header->appendChild($this->xmlDocument->createElement('numeroDocumento', $this->invoice->customer_nit));

        // Complemento (Obligatorio, usualmente nulo)
        $complementNode = $this->xmlDocument->createElement('complemento');
        $complementNode->setAttribute('xsi:nil', 'true');
        $header->appendChild($complementNode);

        $header->appendChild($this->xmlDocument->createElement('codigoCliente', $this->invoice->customer_nit));
        $header->appendChild($this->xmlDocument->createElement('codigoMetodoPago', (string) $this->invoice->payment_method_code));
        
        // Número de Tarjeta (xsi:nil si no es pago por tarjeta)
        $cardNode = $this->xmlDocument->createElement('numeroTarjeta');
        $cardNode->setAttribute('xsi:nil', 'true');
        $header->appendChild($cardNode);

        $header->appendChild($this->xmlDocument->createElement('montoTotal', number_format($this->invoice->total_amount, 2, '.', '')));
        $header->appendChild($this->xmlDocument->createElement('montoTotalSujetoIva', number_format($this->invoice->total_subject_to_vat, 2, '.', '')));
        $header->appendChild($this->xmlDocument->createElement('codigoMoneda', '1')); 
        $header->appendChild($this->xmlDocument->createElement('tipoCambio', '1'));
        $header->appendChild($this->xmlDocument->createElement('montoTotalMoneda', number_format($this->invoice->total_amount, 2, '.', '')));
        
        // Monto Gift Card (Obligatorio nulo)
        $giftNode = $this->xmlDocument->createElement('montoGiftCard');
        $giftNode->setAttribute('xsi:nil', 'true');
        $header->appendChild($giftNode);

        $header->appendChild($this->xmlDocument->createElement('descuentoAdicional', '0.00'));
        $header->appendChild($this->xmlDocument->createElement('codigoExcepcion', '0'));

        // CAFC (Obligatorio nulo en emisión online)
        $cafcNode = $this->xmlDocument->createElement('cafc');
        $cafcNode->setAttribute('xsi:nil', 'true');
        $header->appendChild($cafcNode);

        $header->appendChild($this->xmlDocument->createElement('leyenda', 'Ley N° 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados.'));
        $header->appendChild($this->xmlDocument->createElement('usuario', 'RECEPCION'));
        $header->appendChild($this->xmlDocument->createElement('codigoDocumentoSector', '1'));
        
        $root->appendChild($header);

        // --- SECTION: DETAILS (DETALLES) ---
       
        foreach ($this->invoice->details as $item) {
            $detailElement = $this->xmlDocument->createElement('detalle');
            $detailElement->appendChild($this->xmlDocument->createElement('actividadEconomica', '620000'));
            $detailElement->appendChild($this->xmlDocument->createElement('codigoProductoSin', '99100')); 
            
            // 👇👇👇 LA CORRECCIÓN ESTÁ AQUÍ 👇👇👇
            // Aseguramos que NUNCA esté vacío. Si no hay ID, mandamos '001' por defecto.
            $codigoInterno = !empty($item->id) ? (string) $item->id : '001';
            $detailElement->appendChild($this->xmlDocument->createElement('codigoProducto', $codigoInterno)); 
            // 👆👆👆 ============================== 👆👆👆

            $detailElement->appendChild($this->xmlDocument->createElement('descripcion', $item->description));
            $detailElement->appendChild($this->xmlDocument->createElement('cantidad', number_format($item->quantity, 2, '.', '')));
            $detailElement->appendChild($this->xmlDocument->createElement('unidadMedida', '58')); 
            $detailElement->appendChild($this->xmlDocument->createElement('precioUnitario', number_format($item->unit_price, 2, '.', '')));
            
            $itemDiscount = $this->xmlDocument->createElement('montoDescuento');
            $itemDiscount->setAttribute('xsi:nil', 'true');
            $detailElement->appendChild($itemDiscount);
            
            $detailElement->appendChild($this->xmlDocument->createElement('subTotal', number_format($item->cost, 2, '.', '')));
            
            $serialNode = $this->xmlDocument->createElement('numeroSerie');
            $serialNode->setAttribute('xsi:nil', 'true');
            $detailElement->appendChild($serialNode);

            $imeiNode = $this->xmlDocument->createElement('numeroImei');
            $imeiNode->setAttribute('xsi:nil', 'true');
            $detailElement->appendChild($imeiNode);

            $root->appendChild($detailElement);
        }

        return $this->xmlDocument->saveXML();
    }

    /**
     * Comprime el XML en formato GZIP para el envío SOAP.
     */
    public function getGzipArchive(): string
    {
        $xmlContent = $this->buildXml();
        return gzencode($xmlContent, 9);
    }
}