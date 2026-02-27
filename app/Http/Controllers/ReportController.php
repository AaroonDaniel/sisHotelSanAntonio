<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\Guest;
use App\Models\User;
use App\Models\Payment;
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
                    'origin' => $checkin->origin,
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
                $guest->origin = $checkin->origin;
            } else {
                // Buscar si es acompañante activo
                $checkinAcomp = Checkin::where('status', 'activo')
                    ->whereHas('companions', function ($q) use ($guest) {
                        $q->where('guests.id', $guest->id);
                    })
                    ->with('room')
                    ->first();
                $guest->room_number = $checkinAcomp ? $checkinAcomp->room->number : '-';
                $guest->origin = $checkinAcomp->origin;
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
    // =========================================================
    // 1. VISTA: CIERRE DE CAJA (FRONTEND)
    // =========================================================
    public function financialIndex(Request $request)
    {
        $startDate = $request->query('start_date', now()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        $payments = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'user_name' => $p->user->name ?? 'Desconocido',
                    'amount' => (float) $p->amount,
                    'method' => $p->method,
                    'bank_name' => $p->bank_name,
                    'type' => $p->type, 
                    'date' => $p->created_at->format('d/m/Y'),
                    'time' => $p->created_at->format('H:i'),
                    'room_number' => $p->checkin->room->number ?? '-',
                    'guest_name' => $p->checkin->guest->full_name ?? 'Sin Huésped',
                ];
            });

        return Inertia::render('reports/financial', [
            'Payments' => $payments,
            'Filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            // CAMBIO: Ahora enviamos todos los usuarios activos al frontend
            'users' => User::where('is_active', true)->get(['id', 'full_name', 'nickname']),
        ]);
    }

    // =========================================================
    // 2. GENERADOR PDF: CIERRE DE CAJA
    // =========================================================
    public function generateFinancialReportPdf(Request $request)
    {
        $startDate = $request->query('start_date', now()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        // CAMBIO: Recibimos el parámetro del usuario (por defecto 'todos')
        $userId = $request->query('user_id', 'todos');

        // CAMBIO: Construimos la consulta base
        $query = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        // CAMBIO: Si el usuario no es 'todos', filtramos por ese usuario en específico
        if ($userId !== 'todos') {
            $query->where('user_id', $userId);
        }

        $payments = $query->orderBy('user_id')
            ->orderBy('created_at')
            ->get();

        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);
        $pdf->AddPage();

        /* ... AQUI VA EL RESTO DEL CÓDIGO DE TU PDF EXACTAMENTE IGUAL COMO LO TIENES ... */
        
        // CABECERA
        $logoPath = public_path('images/logo_camara.png');
        if (file_exists($logoPath)) {
            $pdf->Image($logoPath, 15, 10, 20);
        }

        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 8, utf8_decode('HOTEL "SAN ANTONIO"'), 0, 1, 'C');
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 6, utf8_decode('REPORTE DE INGRESOS Y CIERRE DE CAJA'), 0, 1, 'C');

        $pdf->SetFont('Arial', '', 9);
        $rangoTexto = "Desde: " . \Carbon\Carbon::parse($startDate)->format('d/m/Y') . "  Hasta: " . \Carbon\Carbon::parse($endDate)->format('d/m/Y');
        $pdf->Cell(0, 5, utf8_decode($rangoTexto), 0, 1, 'C');
        $pdf->Ln(5);

        if ($payments->isEmpty()) {
            $pdf->SetFont('Arial', 'I', 10);
            $pdf->Cell(0, 10, 'No hay transacciones registradas en este rango de fechas.', 0, 1, 'C');
            return response($pdf->Output('S'), 200)->header('Content-Type', 'application/pdf');
        }

        $grouped = $payments->groupBy('user_id');
        $granTotal = 0;
        $granTotalEfectivo = 0;
        $granTotalQR = 0;

        foreach ($grouped as $grupoUserId => $userPayments) {
            $userName = $userPayments->first()->user->name ?? 'Desconocido';

            $pdf->SetFont('Arial', 'B', 9);
            $pdf->SetFillColor(200, 220, 255);
            $pdf->Cell(0, 6, utf8_decode(' CAJERO / USUARIO: ' . strtoupper($userName)), 1, 1, 'L', true);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(15, 5, 'Fecha', 1, 0, 'C', true);
            $pdf->Cell(12, 5, 'Hora', 1, 0, 'C', true);
            $pdf->Cell(12, 5, 'Hab', 1, 0, 'C', true);
            $pdf->Cell(65, 5, 'Huesped', 1, 0, 'L', true);
            $pdf->Cell(33, 5, 'Metodo', 1, 0, 'C', true);
            $pdf->Cell(24, 5, 'Tipo', 1, 0, 'C', true);
            $pdf->Cell(25, 5, 'Monto (Bs)', 1, 1, 'R', true);

            $pdf->SetFont('Arial', '', 7);

            $subEfectivo = 0;
            $subQR = 0;
            $qrPorBanco = [];

            foreach ($userPayments as $p) {
                $montoReal = $p->type === 'DEVOLUCION' ? -abs($p->amount) : (float) $p->amount;

                if (strtoupper($p->method) === 'EFECTIVO') {
                    $subEfectivo += $montoReal;
                } else {
                    $subQR += $montoReal;
                    $banco = strtoupper($p->bank_name ?: 'OTROS');
                    if (!isset($qrPorBanco[$banco])) $qrPorBanco[$banco] = 0;
                    $qrPorBanco[$banco] += $montoReal;
                }

                $pdf->Cell(15, 5, $p->created_at->format('d/m'), 1, 0, 'C');
                $pdf->Cell(12, 5, $p->created_at->format('H:i'), 1, 0, 'C');
                $pdf->Cell(12, 5, $p->checkin->room->number ?? '-', 1, 0, 'C');
                $pdf->Cell(65, 5, utf8_decode(substr($p->checkin->guest->full_name ?? 'Sin Huésped', 0, 35)), 1, 0, 'L');

                $metodoText = $p->method . ($p->bank_name ? ' (' . $p->bank_name . ')' : '');
                $pdf->Cell(33, 5, utf8_decode(substr($metodoText, 0, 18)), 1, 0, 'C');

                if ($p->type === 'DEVOLUCION') $pdf->SetTextColor(200, 0, 0);
                $pdf->Cell(24, 5, utf8_decode($p->type), 1, 0, 'C');
                $pdf->Cell(25, 5, number_format($montoReal, 2), 1, 1, 'R');
                $pdf->SetTextColor(0, 0, 0);
            }

            $subTotal = $subEfectivo + $subQR;
            $granTotal += $subTotal;
            $granTotalEfectivo += $subEfectivo;
            $granTotalQR += $subQR;

            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(137, 5, '', 0, 0);
            $pdf->Cell(24, 5, 'Efectivo:', 1, 0, 'R');
            $pdf->Cell(25, 5, number_format($subEfectivo, 2), 1, 1, 'R');

            if ($subQR > 0) {
                foreach ($qrPorBanco as $bco => $mnt) {
                    $pdf->Cell(137, 5, '', 0, 0);
                    $pdf->Cell(24, 5, substr("QR $bco:", 0, 12), 1, 0, 'R');
                    $pdf->Cell(25, 5, number_format($mnt, 2), 1, 1, 'R');
                }
            }
            $pdf->Cell(137, 5, '', 0, 0);
            $pdf->SetFillColor(220, 255, 220);
            $pdf->Cell(24, 5, 'TOTAL:', 1, 0, 'R', true);
            $pdf->Cell(25, 5, number_format($subTotal, 2), 1, 1, 'R', true);
            $pdf->Ln(4);
        }

        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetFillColor(180, 255, 180);
        $pdf->Cell(137, 7, '', 0, 0);
        $pdf->Cell(49, 7, 'RECAUDACION TOTAL:', 1, 0, 'R', true);
        $pdf->Ln();

        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(137, 6, '', 0, 0);
        $pdf->Cell(24, 6, 'Efectivo:', 1, 0, 'R');
        $pdf->Cell(25, 6, number_format($granTotalEfectivo, 2) . ' Bs', 1, 1, 'R');
        $pdf->Cell(137, 6, '', 0, 0);
        $pdf->Cell(24, 6, 'QR/Bancos:', 1, 0, 'R');
        $pdf->Cell(25, 6, number_format($granTotalQR, 2) . ' Bs', 1, 1, 'R');
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(137, 8, '', 0, 0);
        $pdf->Cell(24, 8, 'NETO:', 1, 0, 'R', true);
        $pdf->Cell(25, 8, number_format($granTotal, 2) . ' Bs', 1, 1, 'R', true);

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="cierre-caja-' . $startDate . '.pdf"');
    }

    // =========================================================
    // 3. GENERADOR EXCEL/CSV: CIERRE DE CAJA
    // =========================================================
    public function generateFinancialReportExcel(Request $request)
    {
        $startDate = $request->query('start_date', now()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        // CAMBIO: Recibimos el parámetro del usuario (por defecto 'todos')
        $userId = $request->query('user_id', 'todos');

        // CAMBIO: Construimos la consulta base
        $query = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        // CAMBIO: Si el usuario no es 'todos', filtramos por ese usuario
        if ($userId !== 'todos') {
            $query->where('user_id', $userId);
        }

        $payments = $query->orderBy('user_id')
            ->orderBy('created_at')
            ->get();

        $fileName = 'cierre-caja-' . $startDate . '.csv';

        // Cabeceras HTTP para forzar la descarga
        $headers = array(
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        );

        $columns = ['Fecha', 'Hora', 'Cajero', 'Habitacion', 'Huesped', 'Metodo', 'Banco/QR', 'Tipo', 'Monto (Bs)'];

        $callback = function() use($payments, $columns) {
            $file = fopen('php://output', 'w');
            
            // Agregar BOM para que Excel lea los tildes (UTF-8) correctamente
            fputs($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
            
            // Escribir cabeceras (usamos ; como separador porque Excel en español lo lee mejor)
            fputcsv($file, $columns, ';'); 

            $granTotal = 0;

            foreach ($payments as $p) {
                $montoReal = $p->type === 'DEVOLUCION' ? -abs($p->amount) : (float) $p->amount;
                $granTotal += $montoReal;

                $row = [
                    $p->created_at->format('d/m/Y'),
                    $p->created_at->format('H:i'),
                    $p->user->name ?? 'Desconocido',
                    $p->checkin->room->number ?? '-',
                    $p->checkin->guest->full_name ?? 'Sin Huésped',
                    $p->method,
                    $p->bank_name ?? '-',
                    $p->type,
                    number_format($montoReal, 2, '.', '')
                ];

                fputcsv($file, $row, ';');
            }

            // Fila de Total Neto al final
            fputcsv($file, ['', '', '', '', '', '', '', 'TOTAL NETO', number_format($granTotal, 2, '.', '')], ';');

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
