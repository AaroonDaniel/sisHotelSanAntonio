<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\Guest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Fpdf;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function index()
    {
        $activeCheckins = Checkin::with(['guest', 'room', 'companions'])
            ->where('checkins.status', 'activo')
            ->whereHas('room', function ($q) {
                $q->whereIn('rooms.status', ['occupied', 'OCUPADO', 'ocupado']);
            })
            ->join('rooms', 'checkins.room_id', '=', 'rooms.id')
            ->orderBy('rooms.number', 'asc')
            ->select('checkins.*')
            ->get();

        $guestsList = collect();

        foreach ($activeCheckins as $checkin) {
            $formatGuest = function ($person, $role) use ($checkin) {
                $age = $person->birth_date ? Carbon::parse($person->birth_date)->age : '-';
                return [
                    'id' => $person->id,
                    'full_name' => $person->full_name,
                    'age' => $age,
                    'nationality' => $person->nationality,
                    'profession' => $person->profession,
                    'civil_status' => $person->civil_status,
                    'origin' => $person->origin,
                    'identification_number' => $person->identification_number,
                    'issued_in' => $person->issued_in,
                    'room_number' => $checkin->room->number,
                    'role' => $role,
                ];
            };

            if ($checkin->guest) {
                $guestsList->push($formatGuest($checkin->guest, 'Titular'));
            }

            if ($checkin->companions) {
                foreach ($checkin->companions as $companion) {
                    $guestsList->push($formatGuest($companion, 'Acompañante'));
                }
            }
        }

        return Inertia::render('reports/index', [
            'Guests' => $guestsList
        ]);
    }

    // --- GENERAR PDF CON TU LÓGICA Y DISEÑO ---
    public function generateGuestsReportPdf(Request $request)
    {
        // 1. Obtener IDs seleccionados
        $ids = explode(',', $request->query('ids', ''));
        $guests = Guest::whereIn('id', $ids)->get();

        // 2. Enriquecer con datos de habitación (necesario porque Guest no tiene room_id directo)
        foreach ($guests as $guest) {
            // Buscar si es titular activo
            $checkin = Checkin::where('guest_id', $guest->id)
                ->where('status', 'activo')
                ->with('room')
                ->first();

            if ($checkin) {
                $guest->room_number = $checkin->room->number;
            } else {
                // Buscar si es acompañante activo
                $checkinAcomp = Checkin::where('status', 'activo')
                    ->whereHas('companions', function ($q) use ($guest) {
                        $q->where('guests.id', $guest->id);
                    })
                    ->with('room')
                    ->first();
                $guest->room_number = $checkinAcomp ? $checkinAcomp->room->number : '-';
            }
        }

        // Ordenar por habitación
        $guests = $guests->sortBy('room_number');

        // 3. CONFIGURACIÓN DE PÁGINA (Tu código original)
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

        foreach ($guests as $persona) {
            // Lógica adaptada de tu función original para procesar cada persona
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
            $pdf->Cell($w[8], $h, $persona->room_number, 1, 0, 'C'); // Usamos el dato inyectado

            $pdf->Ln();
        }

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="reporte-seleccionados-' . now()->format('Ymd') . '.pdf"');
    }

    public function checkDailyBookStatus()
    {
        return response()->json(['can_generate' => true]);
    }
}