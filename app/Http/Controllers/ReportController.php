<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\Guest;
use App\Models\User;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\CashRegister;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Fpdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ReportController extends Controller
{
    public function index()
    {
        $activeCheckins = Checkin::with(['guest', 'room', 'companions'])
            ->whereRaw('LOWER(status) = ?', ['activo'])
            ->get()
            ->sortBy(function($checkin) {
                return $checkin->room ? $checkin->room->number : '9999';
            });

        $guestsList = collect();

        // 🚨 VALIDADOR ESTRICTO DE DATOS
        // Detecta nulls, espacios vacíos ("   "), guiones ("-"), "S/N", "N/A", etc.
        $isDataMissing = function($value) {
            if (is_null($value)) return true;
            $cleanValue = trim((string) $value);
            
            if (
                $cleanValue === '' || 
                $cleanValue === '-' || 
                strtoupper($cleanValue) === 'S/N' || 
                strtoupper($cleanValue) === 'N/A' ||
                strtoupper($cleanValue) === 'SIN DATO'
            ) {
                return true;
            }
            return false;
        };

        foreach ($activeCheckins as $checkin) {
            
            $formatGuest = function ($person, $role) use ($checkin, $isDataMissing) {
                if (!$person) return null;

                // 1. Verificamos estrictamente cada campo
                $missingFields = [];
                if ($isDataMissing($person->full_name)) $missingFields[] = 'Nombre Completo';
                if ($isDataMissing($person->birth_date)) $missingFields[] = 'Fecha de Nacimiento (Edad)';
                if ($isDataMissing($person->nationality)) $missingFields[] = 'Nacionalidad';
                if ($isDataMissing($person->profession)) $missingFields[] = 'Profesión';
                if ($isDataMissing($person->civil_status)) $missingFields[] = 'Estado Civil';
                if ($isDataMissing($person->identification_number)) $missingFields[] = 'CI / Pasaporte';
                if ($isDataMissing($person->issued_in)) $missingFields[] = 'Expedido en';
                if ($isDataMissing($checkin->origin)) $missingFields[] = 'Procedencia';

                // 2. Si falta AL MENOS UN DATO, se reporta y SE ELIMINA de la lista
                if (count($missingFields) > 0) {
                    $nombreParaLog = $person->full_name && trim($person->full_name) !== '' 
                                        ? trim($person->full_name) 
                                        : 'Huésped Sin Nombre (ID: '.$person->id.')';
                                        
                    Log::warning("⚠️ IGNORADO POR DATOS INCOMPLETOS: {$nombreParaLog}", [
                        'Habitacion' => $checkin->room ? $checkin->room->number : '-',
                        'Faltan' => $missingFields
                    ]);
                    
                    return null; // 🚫 RECHAZADO
                }

                // 3. Si llega aquí, sus datos están 100% completos
                $age = Carbon::parse($person->birth_date)->age;
                
                return [
                    'id' => $person->id,
                    'full_name' => trim($person->full_name),
                    'age' => $age,
                    'nationality' => trim($person->nationality),
                    'profession' => trim($person->profession),
                    'civil_status' => trim($person->civil_status),
                    'origin' => trim($checkin->origin),
                    'identification_number' => trim($person->identification_number),
                    'issued_in' => trim($person->issued_in),
                    'room_number' => $checkin->room ? $checkin->room->number : '-',
                    'role' => $role,
                ];
            };

            // Procesar Titular
            if ($checkin->guest) {
                $formattedTitular = $formatGuest($checkin->guest, 'Titular');
                if ($formattedTitular !== null) {
                    $guestsList->push($formattedTitular);
                }
            }

            // Procesar Acompañantes
            if ($checkin->companions && $checkin->companions->count() > 0) {
                foreach ($checkin->companions as $companion) {
                    $formattedCompanion = $formatGuest($companion, 'Acompañante');
                    if ($formattedCompanion !== null) {
                        $guestsList->push($formattedCompanion);
                    }
                }
            }
        }

        Log::info('=== DEBUG REPORTES: LISTA FINAL DE HUÉSPEDES (DATOS 100% COMPLETOS) ===', [
            'total_personas_completas' => $guestsList->count(),
            'nombres' => $guestsList->pluck('full_name')->toArray()
        ]);

        return Inertia::render('reports/index', [
            'Guests' => $guestsList->values()->all() 
        ]);
    }

    // --- GENERAR PDF CON TU LÓGICA Y DISEÑO ---
    public function generateGuestsReportPdf(Request $request)
    {
        $ids = explode(',', $request->query('ids', ''));
        $guests = Guest::whereIn('id', $ids)->get();

        Log::info('=== DEBUG PDF: GENERANDO PARA IDS ===', ['ids' => $ids]);

        foreach ($guests as $guest) {
            $checkin = Checkin::where('guest_id', $guest->id)
                ->whereRaw('LOWER(status) = ?', ['activo'])
                ->with('room')
                ->first();

            if ($checkin) {
                $guest->room_number = $checkin->room->number;
                $guest->origin = $checkin->origin;
            } else {
                $checkinAcomp = Checkin::whereRaw('LOWER(status) = ?', ['activo'])
                    ->whereHas('companions', function ($q) use ($guest) {
                        $q->where('guests.id', $guest->id);
                    })
                    ->with('room')
                    ->first();
                    
                $guest->room_number = $checkinAcomp ? $checkinAcomp->room->number : '-';
                $guest->origin = $checkinAcomp ? $checkinAcomp->origin : '-';
            }
        }

        $guests = $guests->sortBy('room_number');

        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(20, 10, 10);
        $pdf->SetAutoPageBreak(true, 10);
        $pdf->AddPage();

        $logoPath = public_path('images/logocaramahotelera.png');
        if (file_exists($logoPath)) {
            $pdf->Image($logoPath, 20, 10, 20);
        }

        $pdf->SetFont('Arial', 'B', 14);
        $pdf->SetTextColor(60, 0, 0);
        $pdf->SetY(12);
        $pdf->SetX(45);
        $pdf->Cell(120, 6, utf8_decode('Cámara Departamental. de Hotelería de Potosí'), 0, 1, 'C');

        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->SetXY(160, 12);
        $pdf->Cell(45, 6, 'CEL : 70461010', 0, 1, 'R');

        $pdf->Ln(2);

        $pdf->SetX(20);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 5, utf8_decode('Parte de Pasajeros HOTEL  "SAN ANTONIO"'), 0, 1, 'C');

        // CÁLCULO DEL CORRELATIVO: Base 006608 el 18 de Abril de 2026
        $fechaBase = \Carbon\Carbon::create(2026, 4, 18)->startOfDay();
        $hoy = now()->startOfDay();
        
        $diferenciaDias = $fechaBase->diffInDays($hoy, false);
        $numeroBase = 6608;
        $numeroCalculado = $numeroBase + $diferenciaDias;
        
        // str_pad rellena con '0' a la izquierda hasta tener 6 dígitos
        $numeroSerie = str_pad($numeroCalculado, 6, '0', STR_PAD_LEFT);

        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('Nº  ' . $numeroSerie), 0, 1, 'R');

        $pdf->SetFont('Arial', 'B', 14);
        $pdf->Cell(0, 6, 'R', 0, 1, 'C');

        $pdf->Ln(1);

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

        $pdf->SetFont('Arial', '', 6.5);

        foreach ($guests as $persona) {
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
            $pdf->Cell($w[8], $h, $persona->room_number, 1, 0, 'C'); 

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
            'users' => User::where('is_active', true)->get(['id', 'full_name', 'nickname']),
        ]);
    }

    // =========================================================
    // GENERADOR PDF: CIERRE DE CAJA
    // =========================================================
    public function generateFinancialReportPdf(Request $request)
    {
        $startDate = $request->query('start_date', now()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        $userId = $request->query('user_id', 'todos');
        $recordType = $request->query('record_type', 'ambos');

        $query = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        if ($userId !== 'todos') {
            $query->where('user_id', $userId);
        }

        if ($recordType === 'efectivo') {
            $query->where('method', 'EFECTIVO');
        } elseif ($recordType === 'bancos') {
            $query->where('method', '!=', 'EFECTIVO');
        }

        $payments = $query->orderBy('created_at')->get();

        $efectivoPayments = $payments->filter(function($p) { return strtoupper($p->method) === 'EFECTIVO'; });
        $qrPayments = $payments->filter(function($p) { return strtoupper($p->method) !== 'EFECTIVO'; });

        $expensesQuery = Expense::whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
        if ($userId !== 'todos') $expensesQuery->where('user_id', $userId);
        $gastos = $expensesQuery->orderBy('created_at')->get();
        $totalGastos = $gastos->sum('amount');

        $aperturaQuery = CashRegister::whereBetween('opened_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);
        if ($userId !== 'todos') $aperturaQuery->where('user_id', $userId);
        $totalApertura = $aperturaQuery->sum('opening_amount');

        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 30); 
        $pdf->AddPage();
        
        $pdf->SetFont('Arial', 'B', 15);
        $pdf->Cell(0, 8, utf8_decode('HOTEL "SAN ANTONIO"'), 0, 1, 'C');
        
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 6, utf8_decode('REPORTE DE CAJA'), 0, 1, 'C');

        $tipoTexto = 'AMBOS (Efectivo y QR/Bancos)';
        if ($recordType === 'efectivo') $tipoTexto = 'SOLO EFECTIVO';
        if ($recordType === 'bancos') $tipoTexto = 'SOLO QR / BANCOS';

        $pdf->SetFont('Arial', '', 9);
        $pdf->Cell(0, 5, utf8_decode('Tipo de Registro: ' . $tipoTexto), 0, 1, 'C');
        
        $cajeroTexto = $userId === 'todos' ? 'TODOS LOS RECEPCIONISTAS' : ($payments->first()->user->name ?? 'Usuario');
        $pdf->Cell(0, 5, utf8_decode('Cajero / Usuario: ' . strtoupper($cajeroTexto)), 0, 1, 'C');
        
        $rangoTexto = "Desde: " . \Carbon\Carbon::parse($startDate)->format('d/m/Y') . "  Hasta: " . \Carbon\Carbon::parse($endDate)->format('d/m/Y');
        $pdf->Cell(0, 5, utf8_decode($rangoTexto), 0, 1, 'C');
        $pdf->Ln(6);

        $granTotalEfectivo = 0;
        $granTotalQR = 0;

        if ($efectivoPayments->isNotEmpty()) {
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetFillColor(210, 255, 210); 
            $pdf->Cell(0, 6, utf8_decode(' INGRESOS EN EFECTIVO'), 1, 1, 'L', true);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(13, 5, 'Fecha', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hora', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hab', 1, 0, 'C', true);
            $pdf->Cell(65, 5, 'Huesped', 1, 0, 'L', true);
            $pdf->Cell(32, 5, 'Cajero', 1, 0, 'L', true);
            $pdf->Cell(30, 5, 'Concepto', 1, 0, 'C', true);
            $pdf->Cell(25, 5, 'Monto (Bs)', 1, 1, 'R', true);

            $pdf->SetFont('Arial', '', 7);
            foreach ($efectivoPayments as $p) {
                $montoReal = $p->type === 'DEVOLUCION' ? -abs($p->amount) : (float) $p->amount;
                $granTotalEfectivo += $montoReal;

                $pdf->Cell(13, 5, $p->created_at->format('d/m'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->created_at->format('H:i'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->checkin->room->number ?? '-', 1, 0, 'C');
                $pdf->Cell(65, 5, utf8_decode(substr($p->checkin->guest->full_name ?? 'Sin Huésped', 0, 35)), 1, 0, 'L');
                $pdf->Cell(32, 5, utf8_decode(substr($p->user->name ?? '', 0, 18)), 1, 0, 'L');
                
                if ($p->type === 'DEVOLUCION') $pdf->SetTextColor(200, 0, 0);
                $pdf->Cell(30, 5, utf8_decode($p->type), 1, 0, 'C');
                $pdf->Cell(25, 5, number_format($montoReal, 2), 1, 1, 'R');
                $pdf->SetTextColor(0, 0, 0);
            }
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(160, 5, 'TOTAL INGRESOS EFECTIVO:', 1, 0, 'R');
            $pdf->Cell(25, 5, number_format($granTotalEfectivo, 2), 1, 1, 'R');
            $pdf->Ln(4);
        }

        if ($qrPayments->isNotEmpty()) {
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetFillColor(210, 235, 255); 
            $pdf->Cell(0, 6, utf8_decode(' INGRESOS POR QR Y TRANSFERENCIAS BANCARIAS'), 1, 1, 'L', true);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(13, 5, 'Fecha', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hora', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hab', 1, 0, 'C', true);
            $pdf->Cell(65, 5, 'Huesped', 1, 0, 'L', true);
            $pdf->Cell(32, 5, 'Banco Destino', 1, 0, 'C', true);
            $pdf->Cell(30, 5, 'Concepto', 1, 0, 'C', true);
            $pdf->Cell(25, 5, 'Monto (Bs)', 1, 1, 'R', true);

            $pdf->SetFont('Arial', '', 7);
            foreach ($qrPayments as $p) {
                $montoReal = $p->type === 'DEVOLUCION' ? -abs($p->amount) : (float) $p->amount;
                $granTotalQR += $montoReal;

                $pdf->Cell(13, 5, $p->created_at->format('d/m'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->created_at->format('H:i'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->checkin->room->number ?? '-', 1, 0, 'C');
                $pdf->Cell(65, 5, utf8_decode(substr($p->checkin->guest->full_name ?? 'Sin Huésped', 0, 35)), 1, 0, 'L');
                
                $bancoText = 'QR - ' . ($p->bank_name ? strtoupper($p->bank_name) : 'OTROS');
                $pdf->Cell(32, 5, utf8_decode(substr($bancoText, 0, 18)), 1, 0, 'C');
                
                if ($p->type === 'DEVOLUCION') $pdf->SetTextColor(200, 0, 0);
                $pdf->Cell(30, 5, utf8_decode($p->type), 1, 0, 'C');
                $pdf->Cell(25, 5, number_format($montoReal, 2), 1, 1, 'R');
                $pdf->SetTextColor(0, 0, 0);
            }
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(160, 5, 'TOTAL INGRESOS QR/BANCOS:', 1, 0, 'R');
            $pdf->Cell(25, 5, number_format($granTotalQR, 2), 1, 1, 'R');
            $pdf->Ln(4);
        }

        if ($gastos->isNotEmpty() && $recordType !== 'bancos') {
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetFillColor(255, 210, 200); 
            $pdf->Cell(0, 6, utf8_decode(' DETALLE DE GASTOS / EGRESOS (Descontados de Caja Física)'), 1, 1, 'L', true);

            $pdf->SetFont('Arial', 'B', 8);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(20, 5, 'Hora', 1, 0, 'C', true);
            $pdf->Cell(140, 5, utf8_decode('Descripción / Concepto del Gasto'), 1, 0, 'L', true);
            $pdf->Cell(25, 5, 'Monto (Bs)', 1, 1, 'R', true); 

            $pdf->SetFont('Arial', '', 8);
            foreach ($gastos as $g) {
                $pdf->Cell(20, 5, $g->created_at->format('H:i'), 1, 0, 'C');
                $pdf->Cell(140, 5, utf8_decode($g->description), 1, 0, 'L');
                $pdf->Cell(25, 5, number_format($g->amount, 2), 1, 1, 'R');
            }
            
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(160, 5, 'TOTAL GASTOS:', 1, 0, 'R'); 
            $pdf->Cell(25, 5, number_format($totalGastos, 2), 1, 1, 'R');
            $pdf->Ln(4);
        }

        $pdf->Ln(4);
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->Cell(0, 6, utf8_decode('RESUMEN FINAL DE LIQUIDACIÓN'), 0, 1, 'C');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', '', 10);
        
        if ($recordType === 'efectivo' || $recordType === 'ambos') {
            $pdf->Cell(136, 6, utf8_decode('(+) Monto Inicial de Apertura de Caja:'), 0, 0, 'R');
            $pdf->Cell(50, 6, number_format($totalApertura, 2) . ' Bs', 0, 1, 'R');

            $pdf->Cell(136, 6, utf8_decode('(+) Ingresos Recaudados (Solo Efectivo):'), 0, 0, 'R');
            $pdf->Cell(50, 6, number_format($granTotalEfectivo, 2) . ' Bs', 0, 1, 'R');

            $pdf->SetTextColor(200, 0, 0);
            $pdf->Cell(136, 6, utf8_decode('(-) Gastos Realizados en el Turno:'), 0, 0, 'R');
            $pdf->Cell(50, 6, '- ' . number_format($totalGastos, 2) . ' Bs', 0, 1, 'R');
            $pdf->SetTextColor(0, 0, 0);

            $efectivoNeto = $totalApertura + $granTotalEfectivo - $totalGastos;
            
            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->SetFillColor(210, 255, 210); 
            $pdf->Cell(106, 8, '', 0, 0);
            $pdf->Cell(50, 8, utf8_decode('EFECTIVO EN CAJA:'), 1, 0, 'R', true);
            $pdf->Cell(40, 8, number_format($efectivoNeto, 2) . ' Bs', 1, 1, 'R', true);
        }

        if ($recordType === 'bancos' || $recordType === 'ambos') {
            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 11);
            $pdf->SetFillColor(210, 235, 255); 
            $pdf->Cell(106, 7, '', 0, 0);
            $pdf->Cell(50, 7, utf8_decode('TOTAL EN BANCOS (QR):'), 1, 0, 'R', true);
            $pdf->Cell(40, 7, number_format($granTotalQR, 2) . ' Bs', 1, 1, 'R', true);
        }

        $pdf->Ln(25);
        $pdf->SetFont('Arial', '', 10);
        
        $pdf->Cell(93, 5, '___________________________________', 0, 0, 'C');
        $pdf->Cell(93, 5, '___________________________________', 0, 1, 'C');
        $pdf->Cell(93, 5, 'Firma Recepcionista', 0, 0, 'C');
        $pdf->Cell(93, 5, 'Firma Administrador (Conforme)', 0, 1, 'C');

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="cierre-caja-' . $startDate . '.pdf"');
    }

    public function generateFinancialReportExcel(Request $request)
    {
        $startDate = $request->query('start_date', now()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        $userId = $request->query('user_id', 'todos');

        $query = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        if ($userId !== 'todos') {
            $query->where('user_id', $userId);
        }

        $payments = $query->orderBy('user_id')->orderBy('created_at')->get();
        $fileName = 'cierre-caja-' . $startDate . '.csv';

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
            fputs($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
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
            fputcsv($file, ['', '', '', '', '', '', '', 'TOTAL NETO', number_format($granTotal, 2, '.', '')], ';');
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}