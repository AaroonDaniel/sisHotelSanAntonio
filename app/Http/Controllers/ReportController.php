<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Fpdf;
use Carbon\Carbon;

class ReportController extends Controller
{
    // Renderiza la vista del menú de reportes
    public function index()
    {
        return Inertia::render('reports/index');
    }

    // 1. VALIDACIÓN PREVIA (JSON)
    // Verifica que no haya huéspedes "INCOMPLETE" en habitaciones ocupadas
    public function checkDailyBookStatus()
    {
        $incompleteCheckins = Checkin::whereHas('room', function ($q) {
            // Buscamos habitaciones en estado ocupado (mayúscula o minúscula)
            $q->whereIn('status', ['occupied', 'OCUPADO', 'ocupado']);
        })
            ->whereHas('guest', function ($q) {
                // Y que tengan el perfil incompleto
                $q->where('profile_status', 'INCOMPLETE');
            })
            ->with(['guest', 'room'])
            ->get();

        if ($incompleteCheckins->count() > 0) {
            return response()->json([
                'can_generate' => false,
                'message' => 'Faltan datos en huéspedes activos.',
                'details' => $incompleteCheckins->map(function ($c) {
                    return "Hab. " . $c->room->number . " - " . $c->guest->full_name;
                })
            ]);
        }

        return response()->json(['can_generate' => true]);
    }

    // 2. GENERAR PDF LIBRO DIARIO (El método que te faltaba)
    public function generateDailyBookPdf()
    {
        // ... (Tu consulta de checkins se mantiene igual) ...
        $checkins = Checkin::with(['guest', 'room'])
            ->whereHas('room', function ($q) {
                $q->whereIn('status', ['occupied', 'OCUPADO', 'ocupado']);
            })
            ->join('rooms', 'checkins.room_id', '=', 'rooms.id')
            ->orderBy('rooms.number', 'asc')
            ->select('checkins.*')
            ->get();

        // 1. CONFIGURACIÓN DE PÁGINA
        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(20, 10, 10);
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->AddPage();

        // ==========================================
        //              CABECERA COMPACTA
        // ==========================================

        $logoPath = public_path('images/logo_camara.png');
        if (file_exists($logoPath)) {
            // Logo un poco más pequeño o misma posición
            $pdf->Image($logoPath, 20, 10, 20);
        }

        // TÍTULO
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->SetTextColor(60, 0, 0);
        $pdf->SetY(12);
        $pdf->SetX(45);
        // Reduje la altura de celda de 8 a 6 para compactar
        $pdf->Cell(120, 6, utf8_decode('Cámara Departamental. de Hotelería de Potosí'), 0, 1, 'C');

        // CELULAR
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('Arial', 'B', 9);
        // Ajuste fino de posición Y para pegarlo más arriba
        $pdf->SetXY(160, 12);
        $pdf->Cell(45, 6, 'CEL : 70461010', 0, 1, 'R');

        // SUBTÍTULOS (AQUÍ ESTABA EL ESPACIO GRANDE)
        // Cambiado Ln(8) por Ln(2) para subir el subtítulo
        $pdf->Ln(2);

        $pdf->SetX(20);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 5, utf8_decode('Parte de Pasajeros HOTEL  "SAN ANTONIO"'), 0, 1, 'C');

        // NÚMERO DE SERIE
        $numeroSerie = now()->format('Ymd');
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('Nº  ' . $numeroSerie), 0, 1, 'R');

        // LETRA R (Quitamos el Ln(2) que había aquí)
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, 'R', 0, 1, 'C');

        // ESPACIO ANTES DE TABLA (Reducido de 4 a 1)
        $pdf->Ln(1);

        // ==========================================
        //              TABLA
        // ==========================================
        $pdf->SetFillColor(230, 230, 230);
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->SetLineWidth(0.2);

        $w = [46, 7, 20, 22, 18, 20, 18, 25, 10];
        $headers = ['Nombre Completo', 'Edad', 'Nacionalidad', 'Profesión', 'Est. Civil', 'Procedencia', 'CI/Pasap.', 'Otorgado', 'Hab'];

        $pdf->SetX(20);
        for ($i = 0; $i < count($headers); $i++) {
            // Reducida altura de cabecera de 8 a 6 mm
            $pdf->Cell($w[$i], 6, utf8_decode($headers[$i]), 1, 0, 'C', true);
        }
        $pdf->Ln();

        // CONTENIDO
        $pdf->SetFont('Arial', '', 6.5);

        foreach ($checkins as $checkin) {
            $g = $checkin->guest;
            $edad = $g->birth_date ? \Carbon\Carbon::parse($g->birth_date)->age : '-';

            $estadoCivilFull = $g->civil_status ?? '-';
            $letra = strtoupper(substr($estadoCivilFull, 0, 1));
            $textoEstado = '-';
            if (in_array($letra, ['M', 'C'])) $textoEstado = 'CASADO';
            elseif ($letra == 'S') $textoEstado = 'SOLTERO';
            elseif ($letra == 'W' || $letra == 'V') $textoEstado = 'VIUDO';
            elseif ($letra == 'D') $textoEstado = 'DIVORC.';
            else $textoEstado = substr($estadoCivilFull, 0, 9);

            $pdf->SetX(20);
            // Altura de fila ajustada a 5mm (antes 6mm) para más filas por hoja
            $h = 5;

            $pdf->Cell($w[0], $h, utf8_decode(substr($g->full_name, 0, 28)), 1, 0, 'L');
            $pdf->Cell($w[1], $h, $edad, 1, 0, 'L');
            $pdf->Cell($w[2], $h, utf8_decode(substr($g->nationality, 0, 11)), 1, 0, 'L');
            $pdf->Cell($w[3], $h, utf8_decode(substr($g->profession, 0, 13)), 1, 0, 'L');
            $pdf->Cell($w[4], $h, utf8_decode($textoEstado), 1, 0, 'C');
            $pdf->Cell($w[5], $h, utf8_decode(substr($g->origin, 0, 11)), 1, 0, 'L');
            $pdf->Cell($w[6], $h, substr($g->identification_number, 0, 10), 1, 0, 'C');
            $pdf->Cell($w[7], $h, utf8_decode(substr($g->issued_in, 0, 14)), 1, 0, 'C');
            $pdf->Cell($w[8], $h, $checkin->room->number, 1, 0, 'C');

            $pdf->Ln();
        }

        if (count($checkins) === 0) {
            $pdf->SetX(20);
            $pdf->SetFont('Arial', 'I', 10);
            $pdf->Cell(array_sum($w), 10, utf8_decode('No hay pasajeros registrados.'), 1, 1, 'C');
        }

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="libro-diario-' . now()->format('Ymd') . '.pdf"');
    }
}
