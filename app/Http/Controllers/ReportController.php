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
        // 1. CONSULTA CORREGIDA (Especificando 'checkins.status')
        $checkins = Checkin::with(['guest', 'room', 'companions'])
            // CORRECCIÓN AQUÍ: Agregamos 'checkins.' antes de 'status'
            ->where('checkins.status', 'activo') 
            
            ->whereHas('room', function ($q) {
                // Aquí no es ambiguo porque está dentro del scope de Room, pero por si acaso:
                $q->whereIn('rooms.status', ['occupied', 'OCUPADO', 'ocupado']);
            })
            ->join('rooms', 'checkins.room_id', '=', 'rooms.id')
            ->orderBy('rooms.number', 'asc')
            ->orderBy('checkins.created_at', 'desc')
            
            // Select específico para evitar conflictos en el ORDER BY
            ->select('checkins.*', 'rooms.number')
            ->get();

        // 2. FILTRO DE UNICIDAD (Por seguridad)
        $checkins = $checkins->unique('room_id');

        // 3. CONFIGURACIÓN DE PÁGINA
        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(20, 10, 10);
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->AddPage();

        // ==========================================
        //              CABECERA COMPACTA
        // ==========================================

        $logoPath = public_path('images/logo_camara.png');
        if (file_exists($logoPath)) {
            $pdf->Image($logoPath, 20, 10, 20);
        }

        // TÍTULO
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->SetTextColor(60, 0, 0);
        $pdf->SetY(12);
        $pdf->SetX(45);
        $pdf->Cell(120, 6, utf8_decode('Cámara Departamental. de Hotelería de Potosí'), 0, 1, 'C');

        // CELULAR
        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetXY(160, 12);
        $pdf->Cell(45, 6, 'CEL : 70461010', 0, 1, 'R');

        // SUBTÍTULOS
        $pdf->Ln(2);

        $pdf->SetX(20);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 5, utf8_decode('Parte de Pasajeros HOTEL  "SAN ANTONIO"'), 0, 1, 'C');

        // NÚMERO DE SERIE
        $numeroSerie = now()->format('Ymd');
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('Nº  ' . $numeroSerie), 0, 1, 'R');

        // LETRA R
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, 'R', 0, 1, 'C');

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
            $pdf->Cell($w[$i], 6, utf8_decode($headers[$i]), 1, 0, 'C', true);
        }
        $pdf->Ln();

        // CONTENIDO
        $pdf->SetFont('Arial', '', 6.5);

        foreach ($checkins as $checkin) {
            
            // --- UNIFICACIÓN DE PASAJEROS ---
            $personasEnHabitacion = collect([$checkin->guest]); 
            
            if ($checkin->companions && $checkin->companions->count() > 0) {
                $personasEnHabitacion = $personasEnHabitacion->merge($checkin->companions);
            }

            foreach ($personasEnHabitacion as $persona) {
                
                $edad = $persona->birth_date ? \Carbon\Carbon::parse($persona->birth_date)->age : '-';

                $estadoCivilFull = $persona->civil_status ?? '-';
                $letra = strtoupper(substr($estadoCivilFull, 0, 1));
                $textoEstado = '-';
                
                if (in_array($letra, ['M', 'C'])) $textoEstado = 'CASADO';
                elseif ($letra == 'S') $textoEstado = 'SOLTERO';
                elseif ($letra == 'W' || $letra == 'V') $textoEstado = 'VIUDO';
                elseif ($letra == 'D') $textoEstado = 'DIVORC.';
                else $textoEstado = substr($estadoCivilFull, 0, 9);

                $pdf->SetX(20);
                $h = 5;

                $pdf->Cell($w[0], $h, utf8_decode(substr($persona->full_name, 0, 28)), 1, 0, 'L');
                $pdf->Cell($w[1], $h, $edad, 1, 0, 'L');
                $pdf->Cell($w[2], $h, utf8_decode(substr($persona->nationality ?? '', 0, 11)), 1, 0, 'L');
                $pdf->Cell($w[3], $h, utf8_decode(substr($persona->profession ?? '', 0, 13)), 1, 0, 'L');
                $pdf->Cell($w[4], $h, utf8_decode($textoEstado), 1, 0, 'C');
                $pdf->Cell($w[5], $h, utf8_decode(substr($persona->origin ?? '', 0, 11)), 1, 0, 'L');
                $pdf->Cell($w[6], $h, substr($persona->identification_number ?? '', 0, 10), 1, 0, 'C');
                $pdf->Cell($w[7], $h, utf8_decode(substr($persona->issued_in ?? '', 0, 14)), 1, 0, 'C');
                $pdf->Cell($w[8], $h, $checkin->room->number, 1, 0, 'C');

                $pdf->Ln();
            }
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
