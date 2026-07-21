<?php

namespace App\Jobs;

use App\Traits\ConvertsNumberToWords;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * 🚀 FINALIZACIÓN DE ESTADÍA EN BACKGROUND: genera el PDF del recibo/factura
 * de un checkout múltiple FUERA del hilo de la petición HTTP.
 *
 * multiCheckout() ya deja todo persistido (checkins finalizados, Payment,
 * Invoice + InvoiceDetail) ANTES de despachar este Job — lo único que se
 * mueve aquí es el renderizado FPDF en sí (la parte lenta: fuentes, imagen
 * del QR, decenas de Cell/MultiCell), que no tiene por qué bloquear la
 * respuesta al recepcionista.
 *
 * El PDF resultante se guarda en storage/app/public/receipts/{invoice_id}.pdf
 * — CheckinController::multiCheckoutReceipt() lo sirve desde ahí en
 * cuanto está listo (y el frontend hace polling corto hasta que aparece).
 */
class GenerateCheckoutReceipt implements ShouldQueue
{
    use Dispatchable, Queueable, InteractsWithQueue, SerializesModels, ConvertsNumberToWords;

    public int $tries = 3;
    public int $backoff = 5;

    public function __construct(
        private readonly int $invoiceId,
        private readonly string $tipoDocumento,
        private readonly ?string $nombreFactura,
        private readonly ?string $nitFactura,
        private readonly array $hospedajesPDF,
        private readonly array $serviciosGlobales,
        private readonly float $granTotal,
        private readonly float $totalAdelantosGlobal,
        private readonly float $saldoPagar,
        private readonly int $primerCheckinId,
        private readonly string $usuarioNombre,
    ) {
    }

    public function handle(): void
    {
        // =========================================================
        // PASO 5 (movido desde CheckinController::multiCheckout()):
        // Generación del PDF (Unificado a 4 columnas y reordenado)
        // =========================================================
        $pdfLargo = max(150, 100 + (count($this->hospedajesPDF) * 5) + (count($this->serviciosGlobales) * 5));
        $pdf = new \FPDF('P', 'mm', [80, $pdfLargo]);
        $pdf->SetMargins(4, 4, 4);
        $pdf->SetAutoPageBreak(true, 2);
        $pdf->AddPage();

        // CABECERA
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 4, 'HOTEL SAN ANTONIO', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 7);

        $esFactura = $this->tipoDocumento === 'factura';

        if ($esFactura) {
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(0, 3, 'CASA MATRIZ', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 6);
            $pdf->Cell(0, 3, 'No. Punto de Venta 0', 0, 1, 'C');
            $pdf->Cell(0, 3, 'Calle 9 - Potosi', 0, 1, 'C');
            $pdf->Cell(0, 3, utf8_decode('Teléfono: 70461010'), 0, 1, 'C');
            $pdf->Cell(0, 3, 'BOLIVIA', 0, 1, 'C');
            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(0, 4, 'FACTURA', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 6);

            $pdf->Ln(2);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, 'NIT:', 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, '3327479013', 0, 1, 'L');
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, utf8_decode('FACTURA N°:'), 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, str_pad((string) $this->primerCheckinId, 5, '0', STR_PAD_LEFT), 0, 1, 'L');
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, utf8_decode('CÓD. AUTORIZACIÓN:'), 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, '456123ABC', 0, 1, 'L');
            $pdf->Ln(1);
        } else {
            $pdf->Cell(0, 4, utf8_decode('Calle Principal #123 - Potosi'), 0, 1, 'C');
            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell(0, 6, 'NOTA DE SALIDA GRUPAL', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 8);
            $pdf->Cell(0, 4, 'Ref: ' . str_pad((string) $this->primerCheckinId, 6, '0', STR_PAD_LEFT), 0, 1, 'C');
            $pdf->Ln(1);
        }

        $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
        $pdf->Ln(2);

        // DATOS CLIENTE
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Fecha:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, now()->format('d/m/Y H:i:s'), 0, 1);
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Cliente:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->MultiCell(0, 4, utf8_decode($this->nombreFactura ?? 'S/N'), 0, 'L');
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'NIT/CI:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, $this->nitFactura ?? '0', 0, 1);

        $pdf->Ln(1);
        $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
        $pdf->Ln(2);

        // =========================================================
        // DETALLE ITEMS UNIFICADOS (REORDENADOS)
        // =========================================================
        $pdf->SetFont('Arial', 'B', 6);
        $pdf->Cell(35, 3, 'DETALLE', 0, 0, 'L');
        $pdf->Cell(8, 3, 'CNT', 0, 0, 'C');
        $pdf->Cell(12, 3, 'P.UNI', 0, 0, 'R');
        $pdf->Cell(17, 3, 'TOTAL', 0, 1, 'R');
        $pdf->Ln(1);

        $pdf->SetFont('Arial', '', 6);

        // 1. Hospedajes
        foreach ($this->hospedajesPDF as $hosp) {
            $pdf->Cell(35, 3, utf8_decode(substr($hosp['desc'], 0, 22)), 0, 0, 'L');
            $pdf->Cell(8, 3, $hosp['cant'], 0, 0, 'C');
            $pdf->Cell(12, 3, number_format($hosp['punit'], 2), 0, 0, 'R');
            $pdf->Cell(17, 3, number_format($hosp['subtot'], 2), 0, 1, 'R');
        }

        // 2. Consumos Globales
        foreach ($this->serviciosGlobales as $name => $data) {
            $pUnit = $data['qty'] > 0 ? $data['total'] / $data['qty'] : 0;
            $pdf->Cell(35, 3, utf8_decode(substr($name, 0, 22)), 0, 0, 'L');
            $pdf->Cell(8, 3, $data['qty'], 0, 0, 'C');
            $pdf->Cell(12, 3, number_format($pUnit, 2), 0, 0, 'R');
            $pdf->Cell(17, 3, number_format($data['total'], 2), 0, 1, 'R');
        }

        $pdf->Ln(1);
        $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
        $pdf->Ln(2);

        // TOTALES AL PIE
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(50, 4, 'TOTAL Bs', 0, 0, 'R');
        $pdf->Cell(22, 4, number_format($this->granTotal, 2), 0, 1, 'R');

        if ($this->totalAdelantosGlobal > 0) {
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(50, 4, '(-) Pagos Anticipados:', 0, 0, 'R');
            $pdf->Cell(22, 4, number_format($this->totalAdelantosGlobal, 2), 0, 1, 'R');

            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(50, 4, 'A PAGAR EN CAJA:', 0, 0, 'R');
            $pdf->Cell(22, 4, number_format($this->saldoPagar, 2), 0, 1, 'R');
        }

        if ($esFactura) {
            $pdf->Ln(2);
            $pdf->SetFont('Arial', '', 7);
            $montoLetras = $this->convertirNumeroALetras($this->granTotal);
            $pdf->MultiCell(0, 4, 'Son: ' . utf8_decode($montoLetras), 0, 'L');

            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 6);
            $pdf->Cell(35, 3, utf8_decode('IMPORTE BASE CRÉDITO FISCAL:'), 0, 0, 'L');
            $pdf->Cell(0, 3, number_format($this->granTotal, 2), 0, 1, 'R');
            $pdf->Ln(2);
            $pdf->Cell(0, 3, utf8_decode('CÓDIGO DE CONTROL: 8A-F1-2C-99'), 0, 1, 'C');
            $pdf->Ln(2);

            $logoPath = public_path('images/qrCop.png');
            if (file_exists($logoPath)) {
                $x = (80 - 22) / 2;
                $pdf->Image($logoPath, $x, $pdf->GetY(), 22, 22);
                $pdf->Ln(24);
            } else {
                $pdf->Ln(24);
            }

            $pdf->SetFont('Arial', 'B', 5);
            $pdf->MultiCell(0, 2.5, utf8_decode('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"'), 0, 'C');
            $pdf->Ln(1);
            $pdf->SetFont('Arial', '', 5);
            $pdf->MultiCell(0, 2.5, utf8_decode('Ley N° 453: Tienes derecho a recibir información correcta, veraz, oportuna y completa sobre las características y contenidos de los productos que compras.'), 0, 'C');
        } else {
            $pdf->Ln(6);
            $pdf->SetFont('Arial', 'I', 7);
            $pdf->MultiCell(0, 3, utf8_decode("Gracias por su preferencia.\nRevise su cambio antes de retirarse."), 0, 'C');
        }

        $pdf->Ln(3);
        $pdf->Cell(0, 3, 'Atendido por: ' . utf8_decode($this->usuarioNombre), 0, 1, 'C');

        Storage::disk('public')->put(
            "receipts/{$this->invoiceId}.pdf",
            $pdf->Output('S'),
        );

        Log::info("Recibo de checkout múltiple generado en background para invoice {$this->invoiceId}.");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("GenerateCheckoutReceipt falló para invoice {$this->invoiceId}: " . $exception->getMessage());
    }
}
