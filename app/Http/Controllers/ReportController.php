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
        $incompleteCheckins = Checkin::whereHas('room', function($q) {
                // Buscamos habitaciones en estado ocupado (mayúscula o minúscula)
                $q->whereIn('status', ['occupied', 'OCUPADO', 'ocupado']);
            })
            ->whereHas('guest', function($q) {
                // Y que tengan el perfil incompleto
                $q->where('profile_status', 'INCOMPLETE');
            })
            ->with(['guest', 'room'])
            ->get();

        if ($incompleteCheckins->count() > 0) {
            return response()->json([
                'can_generate' => false,
                'message' => 'Faltan datos en huéspedes activos.',
                'details' => $incompleteCheckins->map(function($c) {
                    return "Hab. " . $c->room->number . " - " . $c->guest->full_name;
                })
            ]);
        }

        return response()->json(['can_generate' => true]);
    }

    // 2. GENERAR PDF LIBRO DIARIO (El método que te faltaba)
    public function generateDailyBookPdf()
    {
        // Obtenemos solo los checkins activos (habitaciones ocupadas)
        $checkins = Checkin::with(['guest', 'room'])
            ->whereHas('room', function($q) {
                $q->whereIn('status', ['occupied', 'OCUPADO', 'ocupado']);
            })
            ->join('rooms', 'checkins.room_id', '=', 'rooms.id')
            ->orderBy('rooms.number', 'asc') 
            ->select('checkins.*')
            ->get();

        // Configuración PDF: LANDSCAPE (L)
        $pdf = new \FPDF('L', 'mm', 'A4');
        $pdf->SetMargins(10, 10, 10);
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->AddPage();

        // ==========================================
        //              CABECERA OFICIAL
        // ==========================================
        
        // LOGO (Triángulo de la imagen)
        // Si tienes el archivo, descomenta la siguiente línea:
        // $pdf->Image(public_path('images/logo_camara.png'), 10, 8, 25); 

        // 1. TÍTULO PRINCIPAL (Centrado en la página)
        $pdf->SetFont('Arial', 'B', 16);
        // Color rojo oscuro tipo sello (opcional, si es B/N quitar SetTextColor)
        $pdf->SetTextColor(60, 0, 0); 
        $pdf->Cell(0, 8, utf8_decode('Cámara Departamental de Hotelería de Potosí'), 0, 1, 'C');
        
        // 2. CELULAR (A la derecha)
        $pdf->SetTextColor(0, 0, 0); // Negro
        $pdf->SetFont('Arial', 'B', 10);
        // Nos movemos a la derecha
        $pdf->SetXY(230, 15); 
        $pdf->Cell(40, 5, 'CEL : 70461010', 0, 1, 'R');

        // 3. NOMBRE DEL HOTEL (Centrado abajo del título)
        $pdf->SetY(18); // Ajustamos Y para que quede debajo del título principal
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 6, utf8_decode('HOTEL  "SAN ANTONIO"'), 0, 1, 'C');

        // 4. "Parte de Pasajeros" y Línea (Izquierda - Centro)
        $pdf->SetY(28); 
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(35, 5, utf8_decode('Parte de Pasajeros'), 0, 0, 'L');
        
        // Línea subrayada manual para simular el formulario
        $pdf->Cell(120, 5, '_______________________________________________________', 0, 0, 'L');

        // 5. NÚMERO DE CORRELATIVO (Derecha, alineado con "Parte de...")
        // Usamos la fecha como número de serie diario o un contador si tienes
        $numeroSerie = now()->format('Ymd'); 
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('Nº  ' . $numeroSerie), 0, 1, 'R');

        // Letra "R" grande debajo de la línea (si es requerida por la imagen)
        $pdf->Ln(6);
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, 'R', 0, 1, 'C'); // La R centrada debajo de la línea

        $pdf->Ln(4);

        // ==========================================
        //              TABLA DE DATOS
        // ==========================================

        // Configuración de Tabla
        $pdf->SetFillColor(230, 230, 230); // Gris claro
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetLineWidth(0.2);

        // Definición de Anchos (Total: 275mm aprox para A4 apaisado)
        // Ajustado para centrar la tabla en la hoja (A4 width = 297mm - 20mm margen = 277mm útiles)
        $w = [
            65, // Nombre y Apellidos
            10, // Edad
            30, // Nacionalidad
            35, // Profesión
            15, // Estado (1 letra)
            35, // Procedencia
            30, // CI / Pasaporte
            25, // Otorgado
            20  // Plaza Nº
        ];

        $headers = [
            'Nombre y Apellidos', 
            'Edad', 
            'Nacionalidad', 
            'Profesión', 
            'Estado',
            'Procedencia', 
            'CI / Pasaporte', 
            'Otorgado', 
            'Plaza'
        ];

        // --- DIBUJAR CABECERA ---
        for($i = 0; $i < count($headers); $i++) {
            $pdf->Cell($w[$i], 8, utf8_decode($headers[$i]), 1, 0, 'C', true);
        }
        $pdf->Ln();

        // --- DIBUJAR FILAS ---
        $pdf->SetFont('Arial', '', 7); // Letra pequeña para los datos

        foreach ($checkins as $checkin) {
            $g = $checkin->guest;

            // Cálculos
            $edad = $g->birth_date ? Carbon::parse($g->birth_date)->age : '-';
            
            $estadoCivilFull = $g->civil_status ?? '-';
            $estadoCivilLetra = strtoupper(substr($estadoCivilFull, 0, 1)); 
            // Mapeo simple
            if($estadoCivilLetra == 'S') $estadoCivilLetra = 'S'; 
            if($estadoCivilLetra == 'M') $estadoCivilLetra = 'C'; 
            if($estadoCivilLetra == 'W') $estadoCivilLetra = 'V'; 

            // Celdas
            $pdf->Cell($w[0], 6, utf8_decode(substr($g->full_name, 0, 38)), 1, 0, 'L');
            $pdf->Cell($w[1], 6, $edad, 1, 0, 'C');
            $pdf->Cell($w[2], 6, utf8_decode(substr($g->nationality, 0, 18)), 1, 0, 'L');
            $pdf->Cell($w[3], 6, utf8_decode(substr($g->profession, 0, 20)), 1, 0, 'L');
            $pdf->Cell($w[4], 6, $estadoCivilLetra, 1, 0, 'C');
            $pdf->Cell($w[5], 6, utf8_decode(substr($g->origin, 0, 20)), 1, 0, 'L');
            $pdf->Cell($w[6], 6, $g->identification_number, 1, 0, 'C');
            $pdf->Cell($w[7], 6, utf8_decode($g->issued_in), 1, 0, 'C');
            $pdf->Cell($w[8], 6, $checkin->room->number, 1, 0, 'C');
            
            $pdf->Ln();
        }

        // Mensaje si está vacío
        if (count($checkins) === 0) {
            $pdf->SetFont('Arial', 'I', 10);
            $pdf->Cell(array_sum($w), 12, utf8_decode('No hay pasajeros registrados en este momento.'), 1, 1, 'C');
        }

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="libro-diario-'.now()->format('Ymd').'.pdf"');
    }
}