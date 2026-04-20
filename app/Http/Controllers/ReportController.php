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

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $targetDate = $request->query('date', now()->toDateString());
        $targetDateStart = Carbon::parse($targetDate)->startOfDay();
        $targetDateEnd = Carbon::parse($targetDate)->endOfDay();

        // 1. OBTENER ACTIVOS (Entrantes y Quedantes)
        $activeCheckins = Checkin::with(['guest', 'room', 'companions'])
            ->where('created_at', '<=', $targetDateEnd)
            ->where(function ($query) use ($targetDateEnd) {
                $query->whereRaw('LOWER(status) = ?', ['activo'])
                      ->orWhere(function ($sub) use ($targetDateEnd) {
                          $sub->whereRaw('LOWER(status) = ?', ['finalizado'])
                              ->where('updated_at', '>', $targetDateEnd);
                      });
            })->get();

        $entrantes = collect();
        $quedantes = collect();

        $isDataMissing = function($value) {
            if (is_null($value)) return true;
            $cleanValue = trim((string) $value);
            if (in_array(strtoupper($cleanValue), ['', '-', 'S/N', 'N/A', 'SIN DATO'])) return true;
            return false;
        };

        foreach ($activeCheckins as $checkin) {
            $formatGuest = function ($person, $role) use ($checkin, $isDataMissing) {
                if (!$person) return null;

                $missingFields = [];
                if ($isDataMissing($person->full_name)) $missingFields[] = 'Nombre';
                if ($isDataMissing($person->birth_date)) $missingFields[] = 'Edad';
                if ($isDataMissing($person->nationality)) $missingFields[] = 'Nacionalidad';
                if ($isDataMissing($person->profession)) $missingFields[] = 'Profesión';
                if ($isDataMissing($person->civil_status)) $missingFields[] = 'Estado Civil';
                if ($isDataMissing($person->identification_number)) $missingFields[] = 'CI';
                if ($isDataMissing($person->issued_in)) $missingFields[] = 'Expedido';
                if ($isDataMissing($checkin->origin)) $missingFields[] = 'Procedencia';

                if (count($missingFields) > 0) return null;

                return [
                    'id' => $person->id,
                    'full_name' => trim($person->full_name),
                    'age' => Carbon::parse($person->birth_date)->age,
                    'nationality' => trim($person->nationality),
                    'profession' => trim($person->profession),
                    'civil_status' => trim($person->civil_status),
                    'origin' => trim($checkin->origin),
                    'identification_number' => trim($person->identification_number),
                    'issued_in' => trim($person->issued_in),
                    'room_number' => $checkin->room ? $checkin->room->number : '-',
                    'role' => $role,
                    'checkin_date' => Carbon::parse($checkin->created_at)->toDateString()
                ];
            };

            if ($checkin->guest) {
                $g = $formatGuest($checkin->guest, 'Titular');
                if ($g) {
                    if ($g['checkin_date'] === $targetDate) $entrantes->push($g);
                    else $quedantes->push($g);
                }
            }

            if ($checkin->companions && $checkin->companions->count() > 0) {
                foreach ($checkin->companions as $companion) {
                    $c = $formatGuest($companion, 'Acompañante');
                    if ($c) {
                        if ($c['checkin_date'] === $targetDate) $entrantes->push($c);
                        else $quedantes->push($c);
                    }
                }
            }
        }

        // 2. OBTENER SALIENTES (Finalizados)
        $salientes = collect();
        $checkinsFinalizadosHoy = Checkin::with(['guest', 'companions', 'room'])
            ->whereRaw('LOWER(status) = ?', ['finalizado'])
            ->whereBetween('updated_at', [$targetDateStart, $targetDateEnd]) 
            ->get();

        foreach ($checkinsFinalizadosHoy as $cf) {
            $formatSaliente = function ($person, $role) use ($cf, $isDataMissing) {
                if (!$person) return null;
                
                $missingFields = [];
                if ($isDataMissing($person->full_name)) $missingFields[] = 'Nombre';
                if ($isDataMissing($person->birth_date)) $missingFields[] = 'Edad';
                if ($isDataMissing($person->nationality)) $missingFields[] = 'Nacionalidad';
                if ($isDataMissing($person->profession)) $missingFields[] = 'Profesión';
                if ($isDataMissing($person->civil_status)) $missingFields[] = 'Estado Civil';
                if ($isDataMissing($person->identification_number)) $missingFields[] = 'CI';
                if ($isDataMissing($person->issued_in)) $missingFields[] = 'Expedido';
                if ($isDataMissing($cf->origin)) $missingFields[] = 'Procedencia';

                if (count($missingFields) > 0) return null;

                return [
                    'id' => $person->id,
                    'full_name' => trim($person->full_name),
                    'age' => Carbon::parse($person->birth_date)->age,
                    'nationality' => trim($person->nationality),
                    'profession' => trim($person->profession),
                    'civil_status' => trim($person->civil_status),
                    'origin' => trim($cf->origin),
                    'identification_number' => trim($person->identification_number),
                    'issued_in' => trim($person->issued_in),
                    'room_number' => $cf->room ? $cf->room->number : '-',
                    'role' => $role,
                ];
            };

            if ($cf->guest) {
                $g = $formatSaliente($cf->guest, 'Titular');
                if ($g) $salientes->push($g);
            }
            if ($cf->companions && $cf->companions->count() > 0) {
                foreach ($cf->companions as $comp) {
                    $c = $formatSaliente($comp, 'Acompañante');
                    if ($c) $salientes->push($c);
                }
            }
        }

        return Inertia::render('reports/index', [
            'Entrantes' => $entrantes->sortBy('room_number')->values()->all(),
            'Quedantes' => $quedantes->sortBy('room_number')->values()->all(),
            'Salientes' => $salientes->sortBy('room_number')->values()->all(),
            'TargetDate' => $targetDate 
        ]);
    }

    public function generateGuestsReportPdf(Request $request)
    {
        $ids = explode(',', $request->query('ids', ''));
        $targetDate = $request->query('date', now()->toDateString());
        $targetDateStart = Carbon::parse($targetDate)->startOfDay();
        $targetDateEnd = Carbon::parse($targetDate)->endOfDay();

        $guests = Guest::whereIn('id', $ids)->get();

        $entrantes = collect();
        $quedantes = collect();

        foreach ($guests as $guest) {
            $checkin = Checkin::where('guest_id', $guest->id)
                ->where('created_at', '<=', $targetDateEnd)
                ->where(function ($query) use ($targetDateEnd) {
                    $query->whereRaw('LOWER(status) = ?', ['activo'])
                          ->orWhere(function ($sub) use ($targetDateEnd) {
                              $sub->whereRaw('LOWER(status) = ?', ['finalizado'])
                                  ->where('updated_at', '>', $targetDateEnd);
                          });
                })
                ->with('room')->orderBy('created_at', 'desc')->first();

            $checkinAcomp = null;
            if (!$checkin) {
                $checkinAcomp = Checkin::where('created_at', '<=', $targetDateEnd)
                    ->where(function ($query) use ($targetDateEnd) {
                        $query->whereRaw('LOWER(status) = ?', ['activo'])
                              ->orWhere(function ($sub) use ($targetDateEnd) {
                                  $sub->whereRaw('LOWER(status) = ?', ['finalizado'])
                                      ->where('updated_at', '>', $targetDateEnd);
                              });
                    })
                    ->whereHas('companions', function ($q) use ($guest) {
                        $q->where('guests.id', $guest->id);
                    })
                    ->with('room')->orderBy('created_at', 'desc')->first();
            }

            $actualCheckin = $checkin ?? $checkinAcomp;

            if ($actualCheckin) {
                $guest->room_number = $actualCheckin->room ? $actualCheckin->room->number : '-';
                $guest->origin = $actualCheckin->origin;
                
                $checkinDateStr = Carbon::parse($actualCheckin->created_at)->toDateString();
                if ($checkinDateStr === $targetDate) {
                    $entrantes->push($guest);
                } else {
                    $quedantes->push($guest);
                }
            }
        }
        
        $entrantes = $entrantes->sortBy('room_number');
        $quedantes = $quedantes->sortBy('room_number');

        $salientes = collect();
        $checkinsFinalizadosHoy = Checkin::with(['guest', 'companions', 'room'])
            ->whereRaw('LOWER(status) = ?', ['finalizado'])
            ->whereBetween('updated_at', [$targetDateStart, $targetDateEnd]) 
            ->get();

        foreach ($checkinsFinalizadosHoy as $cf) {
            // Filtrar para que solo salgan en el PDF si sus IDs fueron enviados
            if ($cf->guest && in_array($cf->guest->id, $ids)) {
                $g = $cf->guest;
                $g->room_number = $cf->room ? $cf->room->number : '-';
                $g->origin = $cf->origin;
                $salientes->push($g);
            }
            if ($cf->companions && $cf->companions->count() > 0) {
                foreach ($cf->companions as $comp) {
                    if (in_array($comp->id, $ids)) {
                        $comp->room_number = $cf->room ? $cf->room->number : '-';
                        $comp->origin = $cf->origin;
                        $salientes->push($comp);
                    }
                }
            }
        }
        $salientes = $salientes->sortBy('room_number');

        Carbon::setLocale('es');
        $fechaStr = strtoupper(Carbon::parse($targetDate)->translatedFormat('d \D\E F \D\E Y'));

        $pdf = new class('P', 'mm', 'Letter') extends \FPDF {
            public $fechaStr = '';
            public function Footer()
            {
                $this->SetY(-35);
                $this->SetFont('Courier', 'B', 10);
                $this->Cell(90, 5, utf8_decode($this->fechaStr), 0, 0, 'C');
                $this->Cell(95, 5, 'HOTEL "SAN ANTONIO"', 0, 1, 'C');
                $this->Cell(90, 5, 'POTOSI', 0, 0, 'C');
                $this->Cell(95, 5, 'ADMINISTRADOR', 0, 1, 'C');
            }
        };

        $pdf->fechaStr = $fechaStr; 
        $pdf->SetMargins(10, 10, 10); 
        $pdf->SetAutoPageBreak(true, 40); 
        $pdf->AddPage();

        $logoPath = public_path('images/logocaramahotelera.png');
        if (file_exists($logoPath)) {
            $pdf->Image($logoPath, 10, 10, 20);
        }

        $pdf->SetFont('Courier', 'B', 13);
        $pdf->SetY(12);
        $pdf->SetX(35);
        $pdf->Cell(120, 6, utf8_decode('Cámara Departamental de Hotelería de Potosí'), 0, 1, 'L');

        $pdf->SetFont('Courier', 'B', 9);
        $pdf->SetXY(160, 12);
        $pdf->Cell(45, 6, 'CEL : 70461010', 0, 1, 'R');

        $pdf->Ln(2);
        $pdf->SetX(10);
        $pdf->SetFont('Courier', 'B', 10);
        $pdf->Cell(0, 5, utf8_decode('Parte de Pasajeros HOTEL  "SAN ANTONIO"'), 0, 1, 'C');

        $fechaBase = Carbon::create(2026, 4, 18)->startOfDay();
        $hoyParaCalculo = Carbon::parse($targetDate)->startOfDay();
        $diferenciaDias = $fechaBase->diffInDays($hoyParaCalculo, false);
        $numeroCalculado = 6608 + $diferenciaDias;
        $numeroSerie = str_pad($numeroCalculado, 6, '0', STR_PAD_LEFT);

        $pdf->SetFont('Courier', 'B', 12);
        $pdf->Cell(0, 5, utf8_decode('Nº  ' . $numeroSerie), 0, 1, 'R');

        $pdf->SetFont('Courier', 'B', 14);
        $pdf->Cell(0, 6, 'R', 0, 1, 'C');
        $pdf->Ln(1);

        $pdf->SetFont('Courier', 'B', 6);
        $pdf->SetLineWidth(0.2);
        
        $w = [48, 8, 20, 20, 18, 24, 28, 20, 10];
        $headers = ['NOMBRES Y APELLIDOS', 'EDAD', 'NACIONALIDAD', 'PROFESION', 'ESTADO', 'PROCEDENCIA', 'C.I./PASAPORTE', 'OTORGADO', 'HAB'];

       $pdf->SetX(10);
        for ($i = 0; $i < count($headers); $i++) {
            $pdf->Cell($w[$i], 6, utf8_decode($headers[$i]), 1, 0, 'C');
        }
        $pdf->Ln();

        // 1. FUNCIÓN PARA IMPRIMIR TÍTULO DE SECCIÓN (¡Esta era la que faltaba!)
        $imprimirCabeceraSeccion = function($titulo) use ($pdf, $w) {
            $pdf->SetX(10);
            $pdf->SetFont('Courier', 'B', 9);
            $pdf->Cell($w[0], 6, utf8_decode($titulo), 'LR', 0, 'L');
            for ($i = 1; $i < count($w); $i++) {
                $pdf->Cell($w[$i], 6, '', 'LR', 0, 'C');
            }
            $pdf->Ln();
        };

        // 2. FUNCIÓN PARA IMPRIMIR FILA CON PUNTOS
        $imprimirFilaVacia = function() use ($pdf, $w) {
            $pdf->SetX(10);
            $pdf->SetFont('Courier', '', 7);
            $pdf->Cell($w[0], 5, '.......................', 'LR', 0, 'L');
            for ($i = 1; $i < count($w); $i++) {
                $pdf->Cell($w[$i], 5, '', 'LR', 0, 'C');
            }
            $pdf->Ln();
        };

        // 3. FUNCIÓN PARA IMPRIMIR HUÉSPEDES
        $imprimirFila = function($persona) use ($pdf, $w) {
            $edad = $persona->birth_date ? Carbon::parse($persona->birth_date)->age : '-';
            $estadoCivilFull = $persona->civil_status ?? '-';
            $letra = strtoupper(substr($estadoCivilFull, 0, 1));
            
            if (in_array($letra, ['M', 'C'])) $textoEstado = 'CASADO';
            elseif ($letra == 'S') $textoEstado = 'SOLTERO';
            elseif (in_array($letra, ['W', 'V'])) $textoEstado = 'VIUDO';
            elseif ($letra == 'D') $textoEstado = 'DIVORC.';
            else $textoEstado = '-';

            $nationality = strtoupper(substr(trim($persona->nationality ?? ''), 0, 12));
            $profession = strtoupper(substr(trim($persona->profession ?? ''), 0, 12));
            $origin = strtoupper(substr(trim($persona->origin ?? ''), 0, 12));
            $issued_in = strtoupper(substr(trim($persona->issued_in ?? ''), 0, 12));

            $pdf->SetX(10);
            $h = 5;
            $pdf->SetFont('Courier', '', 7);
            
            $pdf->Cell($w[0], $h, utf8_decode(substr(trim($persona->full_name), 0, 26)), 'LR', 0, 'L');
            $pdf->Cell($w[1], $h, $edad, 'LR', 0, 'C');
            $pdf->Cell($w[2], $h, utf8_decode($nationality), 'LR', 0, 'C');
            $pdf->Cell($w[3], $h, utf8_decode($profession), 'LR', 0, 'L');
            $pdf->Cell($w[4], $h, utf8_decode($textoEstado), 'LR', 0, 'C');
            $pdf->Cell($w[5], $h, utf8_decode($origin), 'LR', 0, 'L');
            $pdf->Cell($w[6], $h, substr(trim($persona->identification_number ?? ''), 0, 15), 'LR', 0, 'C');
            $pdf->Cell($w[7], $h, utf8_decode($issued_in), 'LR', 0, 'C');
            $pdf->Cell($w[8], $h, $persona->room_number, 'LR', 0, 'C'); 
            $pdf->Ln();
        };

        // ==========================================
        // 5. IMPRIMIR SECCIONES (AHORA SIEMPRE VISIBLES)
        // ==========================================

        // ENTRANTES
        $imprimirCabeceraSeccion(' ENTRANTES');
        if ($entrantes->isNotEmpty()) {
            foreach ($entrantes as $persona) $imprimirFila($persona);
        } else {
            $imprimirFilaVacia();
        }

        // QUEDANTES
        $imprimirCabeceraSeccion(' QUEDANTES');
        if ($quedantes->isNotEmpty()) {
            foreach ($quedantes as $persona) $imprimirFila($persona);
        } else {
            $imprimirFilaVacia();
        }

        // SALIENTES
        $imprimirCabeceraSeccion(' SALIENTES');
        if ($salientes->isNotEmpty()) {
            foreach ($salientes as $persona) $imprimirFila($persona);
        } else {
            $imprimirFilaVacia();
        }

        // 6. CERRAR LA TABLA POR DEBAJO
        $pdf->SetX(10);
        $pdf->Cell(array_sum($w), 0, '', 'T', 1);

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="reporte-camara-hotelera-' . $targetDate . '.pdf"');
    }

    public function checkDailyBookStatus()
    {
        return response()->json(['can_generate' => true]);
    }
    
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

    public function generateFinancialReportPdf(Request $request)
    {
        $startDate = $request->query('start_date', now()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        $userId = $request->query('user_id', 'todos');
        $recordType = $request->query('record_type', 'ambos');

        $query = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59']);

        if ($userId !== 'todos') $query->where('user_id', $userId);
        if ($recordType === 'efectivo') $query->where('method', 'EFECTIVO');
        elseif ($recordType === 'bancos') $query->where('method', '!=', 'EFECTIVO');

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

        if ($userId !== 'todos') $query->where('user_id', $userId);

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