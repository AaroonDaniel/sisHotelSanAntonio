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
    public function checkDailyBookStatus()
    {
        // Buscamos asignaciones ACTIVAS (ocupadas) que tengan huéspedes con perfil INCOMPLETE
        // Asumimos que status 'activo' u 'ocupado' define que están en el hotel actualmente
        $incompleteCheckins = Checkin::whereHas('room', function($q) {
                $q->where('status', 'occupied')
                  ->orWhere('status', 'OCUPADO');
            })
            ->whereHas('guest', function($q) {
                $q->where('profile_status', 'INCOMPLETE');
            })
            ->with(['guest', 'room'])
            ->get();

        if ($incompleteCheckins->count() > 0) {
            return response()->json([
                'can_generate' => false,
                'message' => 'Existen huéspedes con datos incompletos.',
                'details' => $incompleteCheckins->map(function($c) {
                    return "Hab. " . $c->room->number . " - " . $c->guest->full_name;
                })
            ]);
        }

        return response()->json(['can_generate' => true]);
    }

    // 2. GENERAR PDF LIBRO DIARIO
    public function generateDailyBookPdf()
    {
        // Obtenemos solo los checkins activos (habitaciones ocupadas)
        $checkins = Checkin::with(['guest', 'room'])
            ->whereHas('room', function($q) {
                $q->whereIn('status', ['occupied', 'OCUPADO', 'ocupado']);
            })
            ->join('rooms', 'checkins.room_id', '=', 'rooms.id')
            ->orderBy('rooms.number', 'asc') // Ordenar por número de habitación
            ->select('checkins.*')
            ->get();

        // Configuración PDF (Landscape para que entren las columnas)
        $pdf = new \FPDF('L', 'mm', 'A4');
        $pdf->SetMargins(10, 10, 10);
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->AddPage();

        // --- TÍTULOS ---
        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, utf8_decode('CÁMARA DEPARTAMENTAL DE HOTELERÍA DE POTOSÍ'), 0, 1, 'C');
        $pdf->Ln(2);
        
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 6, utf8_decode('HOTEL SAN ANTONIO'), 0, 1, 'C');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', '', 10);
        $pdf->Cell(0, 6, utf8_decode('LIBRO DIARIO DE PASAJEROS - FECHA: ' . now()->format('d/m/Y')), 0, 1, 'C');
        $pdf->Ln(5);

        // --- ENCABEZADOS DE TABLA ---
        $pdf->SetFillColor(230, 230, 230);
        $pdf->SetFont('Arial', 'B', 7); // Letra pequeña para que entre todo

        // Anchos de columnas (Total aprox 277mm)
        $w = [
            50, // Nombre y Apellidos
            10, // Edad
            30, // Nacionalidad
            30, // Profesión
            15, // Estado (Civil)
            30, // Procedencia
            35, // Carnet / Pasaporte
            20, // Otorgado
            20  // Plaza Nº
        ];

        $headers = [
            'Nombre y Apellidos', 'Edad', 'Nacionalidad', 'Profesión', 'Estado',
            'Procedencia', 'CI / Pasaporte', 'Otorgado', 'Plaza Nº'
        ];

        // Dibujar Cabecera
        for($i = 0; $i < count($headers); $i++) {
            $pdf->Cell($w[$i], 6, utf8_decode($headers[$i]), 1, 0, 'C', true);
        }
        $pdf->Ln();

        // --- DATOS ---
        $pdf->SetFont('Arial', '', 7);

        foreach ($checkins as $checkin) {
            $guest = $checkin->guest;

            // Calcular Edad
            $edad = $guest->birth_date ? Carbon::parse($guest->birth_date)->age : '-';
            
            // Primera letra del estado civil
            $estadoCivil = $guest->civil_status ? substr($guest->civil_status, 0, 1) : '-';

            $pdf->Cell($w[0], 6, utf8_decode(substr($guest->full_name, 0, 35)), 1, 0, 'L');
            $pdf->Cell($w[1], 6, $edad, 1, 0, 'C');
            $pdf->Cell($w[2], 6, utf8_decode(substr($guest->nationality, 0, 18)), 1, 0, 'L');
            $pdf->Cell($w[3], 6, utf8_decode(substr($guest->profession, 0, 18)), 1, 0, 'L');
            $pdf->Cell($w[4], 6, strtoupper($estadoCivil), 1, 0, 'C');
            $pdf->Cell($w[5], 6, utf8_decode(substr($guest->origin, 0, 18)), 1, 0, 'L');
            $pdf->Cell($w[6], 6, $guest->identification_number, 1, 0, 'C');
            $pdf->Cell($w[7], 6, utf8_decode($guest->issued_in), 1, 0, 'C');
            $pdf->Cell($w[8], 6, $checkin->room->number, 1, 0, 'C');
            
            $pdf->Ln();
        }

        if (count($checkins) === 0) {
            $pdf->Cell(array_sum($w), 10, 'No hay habitaciones ocupadas en este momento.', 1, 1, 'C');
        }

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="libro-diario-'.now()->format('Ymd').'.pdf"');
    }
}