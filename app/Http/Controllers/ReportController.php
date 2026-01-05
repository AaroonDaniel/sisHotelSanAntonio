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

        // 1. CONFIGURACIÓN DE PÁGINA Y MÁRGENES
        // Carta Vertical (P). Margen Izquierdo 20mm, Superior 10mm, Derecho 10mm
        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(20, 10, 10);
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->AddPage();

        // ==========================================
        //              CABECERA
        // ==========================================

        $logoPath = public_path('images/logo_camara.png');
        if (file_exists($logoPath)) {
            // Coordenada X=20 (respetando margen izq), Y=10
            $pdf->Image($logoPath, 20, 10, 20);
        }

        // TÍTULO
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->SetTextColor(60, 0, 0);
        // Ajustamos posición para centrar visualmente considerando el margen izq más grande
        $pdf->SetY(12);
        $pdf->SetX(45); // Un poco a la derecha del logo
        $pdf->Cell(120, 8, utf8_decode('Cámara Departamental. de Hotelería de Potosí'), 0, 1, 'C');

        // CELULAR (Alineado a la derecha, margen derecho es 10mm -> termina en 206mm)
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetXY(160, 18); // Ajustado para que no se salga
        $pdf->Cell(45, 5, 'CEL : 70461010', 0, 1, 'R');

        // SUBTÍTULOS
        $pdf->Ln(8);
        $pdf->SetX(20); // Retomamos margen izquierdo
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(35, 5, utf8_decode('Parte de Pasajeros'), 0, 0, 'L');
        $pdf->Cell(80, 5, 'HOTEL  "SAN ANTONIO"', 0, 0, 'L');

        // NÚMERO DE SERIE
        $numeroSerie = now()->format('Ymd');
        $pdf->SetFont('Arial', 'B', 12);
        // Cell(0) llega hasta el margen derecho definido (10mm)
        $pdf->Cell(0, 5, utf8_decode('Nº  ' . $numeroSerie), 0, 1, 'R');

        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, 'R', 0, 1, 'C');

        $pdf->Ln(4);

        // ==========================================
        //              TABLA RECALCULADA
        // ==========================================
        // ANCHO TOTAL DISPONIBLE: 186 mm

        $pdf->SetFillColor(230, 230, 230);
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->SetLineWidth(0.2);

        // Definición de anchos para sumar exactamente 186
        // Nom=46, Ed=7, Nac=20, Prof=22, Est=18, Proc=20, CI=18, Ot=25, Hab=10
        $w = [46, 7, 20, 22, 18, 20, 18, 25, 10];

        $headers = [
            'Nombre Completo',
            'Edad',
            'Nacionalidad',
            'Profesión',
            'Est. Civil',
            'Procedencia',
            'CI/Pasap.',
            'Otorgado',
            'Hab'
        ];

        $pdf->SetX(20); // Asegurar margen izquierdo en la cabecera

        for ($i = 0; $i < count($headers); $i++) {
            $pdf->Cell($w[$i], 8, utf8_decode($headers[$i]), 1, 0, 'C', true);
        }
        $pdf->Ln();

        // FUENTE DEL CONTENIDO
        $pdf->SetFont('Arial', '', 6.5);

        foreach ($checkins as $checkin) {
            $g = $checkin->guest;
            $edad = $g->birth_date ? \Carbon\Carbon::parse($g->birth_date)->age : '-';

            // Lógica Estado Civil (Abreviado para que entre en 18mm)
            $estadoCivilFull = $g->civil_status ?? '-';
            $letra = strtoupper(substr($estadoCivilFull, 0, 1));

            // Usamos palabras cortas sin "(A)" para ahorrar espacio horizontal
            $textoEstado = '-';
            if (in_array($letra, ['M', 'C'])) $textoEstado = 'CASADO';
            elseif ($letra == 'S') $textoEstado = 'SOLTERO';
            elseif ($letra == 'W' || $letra == 'V') $textoEstado = 'VIUDO';
            elseif ($letra == 'D') $textoEstado = 'DIVORC.';
            else $textoEstado = substr($estadoCivilFull, 0, 9);

            // Aseguramos margen izquierdo en cada fila
            $pdf->SetX(20);

            // Rellenado de celdas con recorte (substr) para evitar superposición
            $pdf->Cell($w[0], 6, utf8_decode(substr($g->full_name, 0, 28)), 1, 0, 'L');
            $pdf->Cell($w[1], 6, $edad, 1, 0, 'L');
            $pdf->Cell($w[2], 6, utf8_decode(substr($g->nationality, 0, 11)), 1, 0, 'L'); // Recorte más estricto
            $pdf->Cell($w[3], 6, utf8_decode(substr($g->profession, 0, 13)), 1, 0, 'L');
            $pdf->Cell($w[4], 6, utf8_decode($textoEstado), 1, 0, 'C'); // Ahora entra bien
            $pdf->Cell($w[5], 6, utf8_decode(substr($g->origin, 0, 11)), 1, 0, 'L');
            $pdf->Cell($w[6], 6, substr($g->identification_number, 0, 10), 1, 0, 'C');
            $pdf->Cell($w[7], 6, utf8_decode(substr($g->issued_in, 0, 14)), 1, 0, 'C');
            $pdf->Cell($w[8], 6, $checkin->room->number, 1, 0, 'C');

            $pdf->Ln();
        }

        if (count($checkins) === 0) {
            $pdf->SetX(20);
            $pdf->SetFont('Arial', 'I', 10);
            $pdf->Cell(array_sum($w), 12, utf8_decode('No hay pasajeros registrados.'), 1, 1, 'C');
        }

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="libro-diario-' . now()->format('Ymd') . '.pdf"');
    }
}
