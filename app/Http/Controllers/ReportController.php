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
        // ... (Tu código de consulta de checkins se mantiene igual) ...
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
        //              CABECERA CON IMAGEN
        // ==========================================
        
        // --- AQUÍ ESTÁ EL CÓDIGO PARA LA IMAGEN ---
        
        // 1. Definimos la ruta física de la imagen usando public_path()
        // Asegúrate de crear la carpeta 'images' dentro de 'public' y poner ahí tu logo
        $logoPath = public_path('images/logo_camara.png'); 

        // 2. Verificamos que el archivo exista para que no rompa el PDF si falta
        if (file_exists($logoPath)) {
            // Sintaxis: Image(ruta, x, y, ancho, alto, tipo, link)
            // x=15: Un poco separado del borde izquierdo
            // y=10: En la parte superior
            // w=25: Ancho de 25mm (el alto se calcula solo si lo dejas en 0 o nulo)
            $pdf->Image($logoPath, 15, 10, 20); 
        }

        // 1. TÍTULO PRINCIPAL (Centrado en la página)
        $pdf->SetFont('Arial', 'B', 16);
        $pdf->SetTextColor(60, 0, 0); 
        
        // Movemos un poco el cursor a la derecha si la imagen es muy ancha para no tapar el título,
        // pero como el título es centrado ('C'), suele ajustarse bien.
        $pdf->Cell(0, 8, utf8_decode('Cámara Departamental de Hotelería de Potosí'), 0, 1, 'C');
        
        // ... (El resto de tu código sigue igual) ...
        
        // 2. CELULAR (A la derecha)
        $pdf->SetTextColor(0, 0, 0); // Negro
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetXY(230, 15); 
        $pdf->Cell(40, 5, 'CEL : 70461010', 0, 1, 'R');

        // ... (Resto del código de la cabecera y tabla) ...
        
        // 4. "Parte de Pasajeros" y Línea (Izquierda - Centro)
        $pdf->Ln(10);
        $pdf->Ln(10);
        $pdf->SetY(28); 
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(35, 5, utf8_decode('Parte de Pasajeros'), 0, 0, 'L');
        $pdf->Cell(120, 5, 'HOTEL  "SAN ANTONIO"', 0, 0, 'L');

        $numeroSerie = now()->format('Ymd'); 
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('Nº  ' . $numeroSerie), 0, 1, 'R');

        $pdf->Ln(6);
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, 'R', 0, 1, 'C'); 

        $pdf->Ln(4);

        // ... (Código de la tabla) ...
        
        // (Pega aquí el resto de tu código de tabla que tenías abajo)
        
        // Configuración de Tabla
        $pdf->SetFillColor(230, 230, 230); // Gris claro
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->SetLineWidth(0.2);

        $w = [65, 10, 30, 35, 15, 35, 30, 25, 20];

        $headers = [
            'Nombre y Apellidos', 'Edad', 'Nacionalidad', 'Profesión', 
            'Estado', 'Procedencia', 'CI / Pasaporte', 'Otorgado', 'Plaza'
        ];

        for($i = 0; $i < count($headers); $i++) {
            $pdf->Cell($w[$i], 8, utf8_decode($headers[$i]), 1, 0, 'C', true);
        }
        $pdf->Ln();

        $pdf->SetFont('Arial', '', 7); 

        foreach ($checkins as $checkin) {
            $g = $checkin->guest;
            $edad = $g->birth_date ? Carbon::parse($g->birth_date)->age : '-';
            $estadoCivilFull = $g->civil_status ?? '-';
            $estadoCivilLetra = strtoupper(substr($estadoCivilFull, 0, 1)); 
            if($estadoCivilLetra == 'S') $estadoCivilLetra = 'S'; 
            if($estadoCivilLetra == 'M') $estadoCivilLetra = 'C'; 
            if($estadoCivilLetra == 'W') $estadoCivilLetra = 'V'; 

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

        if (count($checkins) === 0) {
            $pdf->SetFont('Arial', 'I', 10);
            $pdf->Cell(array_sum($w), 12, utf8_decode('No hay pasajeros registrados en este momento.'), 1, 1, 'C');
        }

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="libro-diario-'.now()->format('Ymd').'.pdf"');
    }
}