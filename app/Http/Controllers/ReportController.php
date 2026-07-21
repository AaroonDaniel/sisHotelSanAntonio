<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\Guest;
use App\Models\User;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\CashRegister;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use Inertia\Inertia;
use Fpdf;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Encuentra el turno (CashRegister) del usuario cuya ventana activa
     * [opened_at, closed_at ?? ahora] se SOLAPA con el rango de calendario
     * solicitado [$rangoInicio, $rangoFin].
     *
     * Reemplaza la heurística anterior (buscar por `created_at` dentro del
     * día calendario), que fallaba en turnos que cruzan la medianoche: un
     * turno abierto a las 20:00 y cerrado al día siguiente a las 10:00 no
     * aparecía al consultar "hoy" (el día del cierre), porque su
     * `created_at` pertenecía al día anterior. El solapamiento de rangos
     * es correcto sin importar de qué lado de la medianoche caiga la
     * fecha consultada.
     */
    private function findShiftOverlapping(string $userId, string $rangoInicio, string $rangoFin): ?CashRegister
    {
        return CashRegister::where('user_id', $userId)
            ->where('opened_at', '<=', $rangoFin)
            ->where(function ($q) use ($rangoInicio) {
                $q->whereNull('closed_at')
                    ->orWhere('closed_at', '>=', $rangoInicio);
            })
            ->orderByDesc('opened_at')
            ->first();
    }

    /**
     * Normaliza start_date/end_date a límites de rango Carbon-parseables.
     * Acepta tanto fechas puras ("2026-07-16", día completo 00:00–23:59,
     * usadas por la vista agregada "Todos") como datetimes exactos
     * ("2026-07-16T22:15", la hora real de apertura/cierre de un turno que
     * ahora manda el <input type="datetime-local"> del Cierre de Caja por
     * operador) — Carbon no necesita la 'T', solo un espacio.
     */
    private function normalizeRangeBounds(string $startDate, string $endDate): array
    {
        $isDateOnly = fn (string $v) => strlen($v) <= 10;

        $rangoInicio = $isDateOnly($startDate)
            ? $startDate . ' 00:00:00'
            : str_replace('T', ' ', $startDate);

        $rangoFin = $isDateOnly($endDate)
            ? $endDate . ' 23:59:59'
            : str_replace('T', ' ', $endDate);

        return [$rangoInicio, $rangoFin];
    }

    public function index(Request $request)
    {
        $targetDate = $request->query('date', now()->toDateString());
        $targetDateStart = Carbon::parse($targetDate)->startOfDay();
        $targetDateEnd = Carbon::parse($targetDate)->endOfDay();

        // 1. OBTENER ACTIVOS (Entrantes y Quedantes)
        $activeCheckins = Checkin::with(['guest', 'room', 'companions'])
            ->where('check_in_date', '<=', $targetDateEnd)
            ->where(function ($query) use ($targetDateEnd) {
                $query->whereRaw('LOWER(status) = ?', ['activo'])
                    ->orWhere(function ($sub) use ($targetDateEnd) {
                        $sub->whereRaw('LOWER(status) = ?', ['finalizado'])
                            ->where('updated_at', '>', $targetDateEnd);
                    });
            })->get();

        $entrantes = collect();
        $quedantes = collect();

        $isDataMissing = function ($value) {
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
                    'checkin_date' => Carbon::parse($checkin->check_in_date)->toDateString()
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

        // ============================================================
        // 📒 LIBRO DIARIO (Punto 7.9) — Movimientos del día en curso
        // ============================================================
        $payments = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$targetDateStart, $targetDateEnd]) // Corrección a created_at aplicada
            ->get()
            ->map(function ($p) {
                $monto = (float) $p->amount; // las devoluciones ya vienen negativas
                return [
                    'id'          => 'PAY-' . $p->id,
                    'kind'        => $monto < 0 ? 'devolucion' : 'ingreso',
                    'concept'     => $monto < 0
                        ? 'Devolución a huésped'
                        : ($p->type === 'ADELANTO' ? 'Adelanto de estadía' : 'Pago / Amortización'),
                    'reference'   => $p->checkin && $p->checkin->room
                        ? 'Hab. ' . $p->checkin->room->number
                        : '—',
                    'guest'       => $p->checkin && $p->checkin->guest
                        ? $p->checkin->guest->full_name
                        : 'Sin Huésped',
                    'method'      => $p->method,
                    'bank'        => $p->bank_name,
                    'user'        => $p->user->name ?? 'Sistema',
                    'amount'      => $monto,
                    'occurred_at' => Carbon::parse($p->created_at)->toIso8601String(),
                ];
            });

        $expenses = Expense::with('user')
            ->whereBetween('created_at', [$targetDateStart, $targetDateEnd])
            ->get()
            ->map(function ($e) {
                return [
                    'id'          => 'EXP-' . $e->id,
                    'kind'        => 'egreso',
                    'concept'     => $e->description ?? 'Gasto operativo',
                    'reference'   => 'Egreso de caja',
                    'guest'       => '—',
                    'method'      => 'EFECTIVO',
                    'bank'        => null,
                    'user'        => $e->user->name ?? 'Sistema',
                    'amount'      => -1 * abs((float) $e->amount), // egreso siempre negativo
                    'occurred_at' => Carbon::parse($e->created_at)->toIso8601String(),
                ];
            });

        // Unificamos y ordenamos cronológicamente (más reciente primero).
        $dailyBook = $payments->concat($expenses)
            ->sortByDesc('occurred_at')
            ->values();

        // Totales para las Cards superiores.
        $ingresosHoy     = $payments->where('kind', 'ingreso')->sum('amount');
        $devolucionesHoy = abs($payments->where('kind', 'devolucion')->sum('amount'));
        $egresosHoy      = abs($expenses->sum('amount'));
        $totalNeto       = $ingresosHoy - $devolucionesHoy - $egresosHoy;

        return Inertia::render('reports/index', [
            'Entrantes'  => $entrantes->sortBy('room_number')->values()->all(),
            'Quedantes'  => $quedantes->sortBy('room_number')->values()->all(),
            'Salientes'  => $salientes->sortBy('room_number')->values()->all(),
            'TargetDate' => $targetDate,
            'DailyBook'  => $dailyBook,
            'BookSummary' => [
                'ingresos'     => round($ingresosHoy, 2),
                'egresos'      => round($egresosHoy, 2),
                'devoluciones' => round($devolucionesHoy, 2),
                'neto'         => round($totalNeto, 2),
            ],
        ]);
    }

    public function generateGuestsReportPdf(Request $request)
    {
        $idsParam = $request->query('ids', '');
        $ids = ($request->boolean('auto') || $idsParam === '')
            ? $this->guestIdsForDate($request->query('date', now()->toDateString()))
            : explode(',', $idsParam);
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
                            // 🔧 CORREGIDO: usamos check_out_date (fecha real de
                            // salida) en vez de updated_at, que puede cambiar
                            // por cualquier edición ajena al checkout real
                            // (ej. corrección manual de user_id) y falsear
                            // este reporte en fechas pasadas.
                            $sub->whereRaw('LOWER(status) = ?', ['finalizado'])
                                ->where('check_out_date', '>', $targetDateEnd);
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
                                    ->where('check_out_date', '>', $targetDateEnd);
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

                // 🔧 CORREGIDO: la fecha de referencia para "¿llegó hoy o ya
                // estaba?" debe ser la llegada REAL del huésped, no cuándo se
                // insertó la fila en la base de datos.
                $fechaLlegadaReal = $actualCheckin->actual_arrival_date
                    ?? $actualCheckin->check_in_date
                    ?? $actualCheckin->created_at;

                $checkinDateStr = Carbon::parse($fechaLlegadaReal)->toDateString();
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
        // 🔧 CORREGIDO: "salió hoy" se determina por check_out_date (fecha real
        // de checkout), no por updated_at (que cambia con cualquier edición
        // posterior no relacionada con la salida, ej. correcciones de datos).
        $checkinsFinalizadosHoy = Checkin::with(['guest', 'companions', 'room'])
            ->whereRaw('LOWER(status) = ?', ['finalizado'])
            ->whereBetween('check_out_date', [$targetDateStart, $targetDateEnd])
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

        $imprimirCabeceraSeccion = function ($titulo) use ($pdf, $w) {
            $pdf->SetX(10);
            $pdf->SetFont('Courier', 'B', 9);
            $pdf->Cell($w[0], 6, utf8_decode($titulo), 'LR', 0, 'L');
            for ($i = 1; $i < count($w); $i++) {
                $pdf->Cell($w[$i], 6, '', 'LR', 0, 'C');
            }
            $pdf->Ln();
        };

        $imprimirFilaVacia = function () use ($pdf, $w) {
            $pdf->SetX(10);
            $pdf->SetFont('Courier', '', 7);
            $pdf->Cell($w[0], 5, '.......................', 'LR', 0, 'L');
            for ($i = 1; $i < count($w); $i++) {
                $pdf->Cell($w[$i], 5, '', 'LR', 0, 'C');
            }
            $pdf->Ln();
        };

        $imprimirFila = function ($persona) use ($pdf, $w) {
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

        $imprimirCabeceraSeccion(' ENTRANTES');
        if ($entrantes->isNotEmpty()) {
            foreach ($entrantes as $persona) $imprimirFila($persona);
        } else {
            $imprimirFilaVacia();
        }

        $imprimirCabeceraSeccion(' QUEDANTES');
        if ($quedantes->isNotEmpty()) {
            foreach ($quedantes as $persona) $imprimirFila($persona);
        } else {
            $imprimirFilaVacia();
        }

        $imprimirCabeceraSeccion(' SALIENTES');
        if ($salientes->isNotEmpty()) {
            foreach ($salientes as $persona) $imprimirFila($persona);
        } else {
            $imprimirFilaVacia();
        }

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

    /**
     * Filtra pagos/gastos por el operador REAL. Bajo Terminal Compartida el
     * dinero se atribuye vía `operator_id` (el avatar elegido en el
     * OperatorSelector), no `user_id` (que en filas nuevas es siempre la
     * cuenta genérica 'recepcion'). El fallback a `user_id` cuando
     * `operator_id` es NULL cubre filas creadas ANTES de este campo
     * existir, donde `user_id` sí era la identidad real.
     */
    private function scopeByOperator($query, string $operatorId): void
    {
        $query->where(function ($q) use ($operatorId) {
            $q->where('operator_id', $operatorId)
                ->orWhere(function ($q2) use ($operatorId) {
                    $q2->whereNull('operator_id')->where('user_id', $operatorId);
                });
        });
    }

    public function financialIndex(Request $request)
    {
        // 'reportes.financiero' habilita la vista agregada "Todos" (todos los
        // operadores a la vez). La ruta ya exige 'reportes.cierre_caja',
        // que alcanza para elegir y revisar/cerrar el turno de UN operador
        // puntual: bajo Terminal Compartida, Auth::id() es siempre la
        // cuenta genérica 'recepcion' y nunca representa a un operador
        // real, así que ya no se puede forzar la selección a Auth::id()
        // como antes (eso dejaba al recepcionista sin poder elegir a
        // nadie).
        $puedeVerTodos = Auth::user()->can('reportes.financiero');

        $startDate = $request->query('start_date', now()->toDateString());
        $endDate   = $request->query('end_date', now()->toDateString());

        $requestedUserId = $request->query('user_id');
        if ($puedeVerTodos) {
            $userId = $requestedUserId ?: 'todos';
        } else {
            // 'todos' queda vedado sin el permiso agregado; sin selección
            // explícita del operador, no hay nada que consultar todavía.
            $userId = ($requestedUserId && $requestedUserId !== 'todos')
                ? $requestedUserId
                : null;
        }

        // Turno ABIERTO de cada operador (si tiene uno): el frontend lo usa
        // para auto-completar "Fecha de Inicio" con la hora exacta de
        // apertura apenas se elige el avatar, sin que el recepcionista
        // tenga que calcularlo a mano.
        $openShiftsByOperator = CashRegister::where('status', 'ABIERTA')
            ->get(['user_id', 'opened_at'])
            ->keyBy('user_id');

        $operators = User::operadores()->get(['id', 'full_name', 'nickname'])
            ->map(function ($op) use ($openShiftsByOperator) {
                $openShift = $openShiftsByOperator->get($op->id);
                return [
                    'id' => $op->id,
                    'full_name' => $op->full_name,
                    'nickname' => $op->nickname,
                    'active_shift_opened_at' => $openShift
                        ? optional($openShift->opened_at)->toIso8601String()
                        : null,
                ];
            })
            ->values();

        [$rangoInicio, $rangoFin] = $this->normalizeRangeBounds($startDate, $endDate);

        if ($userId && $userId !== 'todos' && $startDate === $endDate) {
            $ultimaCaja = $this->findShiftOverlapping($userId, $rangoInicio, $rangoFin);

            if ($ultimaCaja) {
                $rangoInicio = $ultimaCaja->opened_at ?? $ultimaCaja->created_at;
                $rangoFin = $ultimaCaja->closed_at ?? now();
            }
        }

        // Recepcionista que todavía no eligió avatar: nada que mostrar.
        if ($userId === null) {
            return Inertia::render('reports/financial', [
                'Payments' => [],
                'Expenses' => [],
                'Summary'  => [
                    'apertura'     => 0,
                    'ingresos'     => 0,
                    'devoluciones' => 0,
                    'gastos'       => 0,
                    'liquidacion'  => 0,
                ],
                'Filters' => [
                    'start_date' => $startDate,
                    'end_date'   => $endDate,
                    'user_id'    => null,
                ],
                'users' => $operators,
                'CanViewAll' => $puedeVerTodos,
                'HasMovements' => false,
            ]);
        }

        // =========================================================
        // 1. INGRESOS Y DEVOLUCIONES (tabla payments)
        // Las devoluciones ya vienen como valores negativos, por lo que
        // un sum('amount') refleja la caja real automáticamente.
        // =========================================================
        $paymentsQuery = Payment::with(['user', 'operador', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$rangoInicio, $rangoFin]);

        if ($userId !== 'todos') {
            $this->scopeByOperator($paymentsQuery, $userId);
        }

        $payments = $paymentsQuery->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($p) {
                // Monto real con signo: las DEVOLUCION se fuerzan a negativo
                // por seguridad, aunque ya deberían venir negativas en BD.
                $montoReal = $p->type === 'DEVOLUCION'
                    ? -abs((float) $p->amount)
                    : (float) $p->amount;

                return [
                    'id'          => $p->id,
                    'user_name'   => $p->operador->name ?? $p->user->name ?? 'Desconocido',
                    'amount'      => $montoReal,
                    'method'      => $p->method,
                    'bank_name'   => $p->bank_name,
                    'type'        => $p->type,
                    'date'        => $p->created_at->format('d/m/Y'),
                    'time'        => $p->created_at->format('H:i'),
                    'room_number' => $p->checkin->room->number ?? '-',
                    'guest_name'  => $p->checkin->guest->full_name ?? 'Sin Huésped',
                ];
            });

        // =========================================================
        // 2. EGRESOS / GASTOS (tabla expenses)
        // =========================================================
        $expensesQuery = Expense::with(['user', 'operador'])
            ->whereBetween('created_at', [$rangoInicio, $rangoFin]);

        if ($userId !== 'todos') {
            $this->scopeByOperator($expensesQuery, $userId);
        }

        $expenses = $expensesQuery->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($e) {
                return [
                    'id'          => $e->id,
                    'user_name'   => $e->operador->name ?? $e->user->name ?? 'Desconocido',
                    'amount'      => (float) $e->amount,
                    'description' => $e->description,
                    'date'        => $e->created_at->format('d/m/Y'),
                    'time'        => $e->created_at->format('H:i'),
                ];
            });

        // =========================================================
        // 3. APERTURA DE CAJA (monto inicial del turno)
        // CashRegister.user_id YA es el operador real (así se abre el
        // turno desde el OperatorSelector), no hace falta el fallback.
        // =========================================================
        $aperturaQuery = CashRegister::whereBetween('opened_at', [$rangoInicio, $rangoFin]);
        if ($userId !== 'todos') {
            $aperturaQuery->where('user_id', $userId);
        }
        $totalApertura = (float) $aperturaQuery->sum('opening_amount');

        // =========================================================
        // 4. CÁLCULO DE TOTALES (la caja debe cuadrar matemáticamente)
        //    payments->sum() ya incluye pagos (+) y devoluciones (-).
        // =========================================================
        $totalIngresos     = (float) $payments->where('type', '!=', 'DEVOLUCION')->sum('amount');
        $totalDevoluciones = (float) $payments->where('type', 'DEVOLUCION')->sum('amount'); // negativo
        $totalGastos       = (float) $expenses->sum('amount');

        // Total de Liquidación: Apertura + Ingresos + Devoluciones(neg) - Gastos
        $totalLiquidacion = $totalApertura + $totalIngresos + $totalDevoluciones - $totalGastos;

        return Inertia::render('reports/financial', [
            'Payments' => $payments->values(),
            'Expenses' => $expenses->values(),
            'Summary'  => [
                'apertura'      => round($totalApertura, 2),
                'ingresos'      => round($totalIngresos, 2),
                'devoluciones'  => round($totalDevoluciones, 2), // valor negativo
                'gastos'        => round($totalGastos, 2),
                'liquidacion'   => round($totalLiquidacion, 2),
            ],
            'Filters' => [
                'start_date' => $startDate,
                'end_date'   => $endDate,
                'user_id'    => $userId,
            ],
            // Lista de OPERADORES reales (excluye 'recepcion' y
            // 'sistema_web', que nunca abren turno propio): cualquiera que
            // llegue a esta pantalla (recepcionista o gerente/admin) puede
            // elegir a quién revisar/cerrar.
            'users' => $operators,
            'CanViewAll' => $puedeVerTodos, // 👈 el frontend lo usa para mostrar/ocultar la opción "Todos"
            // Turno sin ningún movimiento (ni pagos ni gastos): el frontend
            // lo usa para bloquear "Generar y Revisar" / "Cerrar Caja" y
            // mostrar la alerta de "nada que cerrar".
            'HasMovements' => $payments->count() > 0 || $expenses->count() > 0,
        ]);
    }

    /**
     * Historial de turnos CERRADOS (para el modal "Historial de Turnos" en
     * la vista de Cierre de Caja). Solo trae lo necesario para la tabla —
     * el detalle financiero completo se genera bajo demanda con
     * generateFinancialReportPdf(cash_register_id=...) al hacer clic en
     * "Ver PDF", reutilizando exactamente la misma lógica del cierre.
     */
    public function shiftsHistory()
    {
        $shifts = CashRegister::with('user')
            ->where('status', 'CERRADA')
            ->orderByDesc('closed_at')
            ->get()
            ->map(function (CashRegister $cr) {
                return [
                    'id' => $cr->id,
                    'operator_name' => $cr->user->full_name ?? $cr->user->nickname ?? 'N/D',
                    'opened_at' => optional($cr->opened_at)->toIso8601String(),
                    'closed_at' => optional($cr->closed_at)->toIso8601String(),
                ];
            });

        return response()->json(['Shifts' => $shifts]);
    }

    public function generateFinancialReportPdf(Request $request)
    {
        $cashRegisterId = $request->query('cash_register_id');
        $recordType = $request->query('record_type', 'ambos');

        if ($cashRegisterId) {
            // ==========================================
            // MODO TURNO ESPECÍFICO: aísla EXACTAMENTE ese
            // cash_register_id, sin importar fechas ni si hubo
            // otro turno el mismo día.
            // ==========================================
            $cashRegister = CashRegister::findOrFail($cashRegisterId);

            // Bajo Terminal Compartida, Auth::id() ya no identifica al
            // operador dueño del turno (siempre es la cuenta 'recepcion').
            // Cualquier recepcionista de la terminal puede imprimir el
            // cierre que se acaba de generar; el detalle completo por
            // rango de fechas sigue restringido a reportes.financiero.
            if (
                !Auth::user()->hasRole('recepcionista') &&
                !Auth::user()->can('reportes.financiero')
            ) {
                abort(403, 'No tienes permiso para generar este reporte.');
            }

            $userId = (string) $cashRegister->user_id;
            $rangoInicio = $cashRegister->opened_at;
            $rangoFin = $cashRegister->closed_at ?? now();
            $startDate = \Carbon\Carbon::parse($rangoInicio)->toDateString();
            $endDate = \Carbon\Carbon::parse($rangoFin)->toDateString();
            // Turno exacto ya identificado por su ID: sirve para imprimir
            // el left_amount más abajo.
            $cashRegisterResuelto = $cashRegister;
        } else {
            // ==========================================
            // MODO ORIGINAL: por rango de fechas (histórico/supervisores)
            // ==========================================
            $startDate = $request->query('start_date', now()->toDateString());
            $endDate = $request->query('end_date', now()->toDateString());
            $userId = $request->query('user_id', 'todos');

            [$rangoInicio, $rangoFin] = $this->normalizeRangeBounds($startDate, $endDate);
            $cashRegisterResuelto = null;

            if ($userId !== 'todos' && $startDate === $endDate) {
                $ultimaCaja = $this->findShiftOverlapping($userId, $rangoInicio, $rangoFin);

                if ($ultimaCaja) {
                    $rangoInicio = $ultimaCaja->opened_at ?? $ultimaCaja->created_at;
                    $rangoFin = $ultimaCaja->closed_at ?? now();
                    // Turno único identificado por solapamiento de fechas:
                    // también sirve para imprimir el left_amount.
                    $cashRegisterResuelto = $ultimaCaja;
                }
            }
        }

        // ==========================================
        // 2. APLICAR RANGOS A LAS CONSULTAS (sin cambios de aquí en adelante)
        // ==========================================
        $query = Payment::with(['user', 'operador', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$rangoInicio, $rangoFin]);

        if ($userId !== 'todos') $this->scopeByOperator($query, $userId);
        if ($recordType === 'efectivo') $query->where('method', 'EFECTIVO');
        elseif ($recordType === 'bancos') $query->where('method', '!=', 'EFECTIVO');

        $payments = $query->orderBy('created_at')->get();

        $efectivoPayments = $payments->filter(function ($p) {
            return strtoupper($p->method) === 'EFECTIVO';
        });
        $qrPayments = $payments->filter(function ($p) {
            return strtoupper($p->method) !== 'EFECTIVO';
        });

        // --- Gastos ---
        $expensesQuery = Expense::whereBetween('created_at', [$rangoInicio, $rangoFin]);
        if ($userId !== 'todos') $this->scopeByOperator($expensesQuery, $userId);
        $gastos = $expensesQuery->orderBy('created_at')->get();
        $totalGastos = $gastos->sum('amount');

        // --- Apertura ---
        $aperturaQuery = CashRegister::whereBetween('opened_at', [$rangoInicio, $rangoFin]);
        if ($userId !== 'todos') $aperturaQuery->where('user_id', $userId);
        $totalApertura = $aperturaQuery->sum('opening_amount');

        // 🛑 Turno sin ningún movimiento (ni pagos ni gastos): no tiene
        // sentido generar/imprimir un cierre en blanco. 'todos' queda
        // fuera de esta regla (vista agregada de supervisión, no un cierre
        // de turno puntual) y también el modo cash_register_id: eso es
        // HISTORIAL (un turno que ya fue cerrado en el pasado, quizás sin
        // movimientos), no un intento de generar/cerrar uno nuevo — se debe
        // poder revisar igual.
        if (!$cashRegisterId && $userId !== 'todos' && $payments->isEmpty() && $gastos->isEmpty()) {
            abort(422, 'No se registraron nuevos movimientos (ingresos/egresos) desde su último cierre. No hay nada que cerrar.');
        }

        // ==========================================
        // 3. GENERACIÓN DEL PDF
        // ==========================================
        $pdf = new \FPDF('P', 'mm', 'Letter');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 30);
        $pdf->AddPage();
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 6, utf8_decode('REPORTE DE CAJA'), 0, 1, 'C');

        $tipoTexto = 'AMBOS (Efectivo y QR)';
        if ($recordType === 'efectivo') $tipoTexto = 'SOLO EFECTIVO';
        if ($recordType === 'bancos') $tipoTexto = 'SOLO QR ';

        $pdf->SetFont('Arial', '', 9);
        $cajeroTexto = $userId === 'todos'
            ? 'TODOS LOS RECEPCIONISTAS'
            : (User::find($userId)->full_name ?? 'Usuario');
        $pdf->Cell(0, 5, utf8_decode('Cajero: ' . strtoupper($cajeroTexto)), 0, 1, 'L');
        // Estampa de tiempo EXACTA (Día/Mes/Año Hora:Minuto) de apertura y
        // cierre, no solo la fecha: crítico para auditar turnos que cruzan
        // la medianoche, donde "Desde/Hasta" sin hora sería ambiguo.
        $rangoTexto = "Desde: " . \Carbon\Carbon::parse($rangoInicio)->format('d/m/Y H:i') . "  Hasta: " . \Carbon\Carbon::parse($rangoFin)->format('d/m/Y H:i');
        $pdf->Cell(0, 5, utf8_decode($rangoTexto), 0, 1, 'L');
        $pdf->Ln(6);

        $granTotalEfectivo = 0;
        $granTotalQR = 0;

        // La columna "Cajero" solo aporta información en modo "todos" los
        // operadores: para un solo operador la cabecera ya dice
        // "Cajero: <nombre>" y repetirlo en cada fila es redundante.
        // Compartida entre la tabla de EFECTIVO y la de QR/bancos.
        $mostrarCajero = ($userId === 'todos');

        if ($efectivoPayments->isNotEmpty()) {
            // El ancho que libera "Cajero" (32mm) se lo suma a "Huesped"
            // (65->97) para que la fila siga sumando 185mm en ambos modos.
            $anchoHuesped = $mostrarCajero ? 65 : 97;

            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetFillColor(210, 255, 210);
            $pdf->Cell(0, 6, utf8_decode(' INGRESOS EN EFECTIVO'), 1, 1, 'L', true);
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(13, 5, 'Fecha', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hora', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hab', 1, 0, 'C', true);
            $pdf->Cell($anchoHuesped, 5, 'Huesped', 1, 0, 'L', true);
            if ($mostrarCajero) {
                $pdf->Cell(32, 5, 'Cajero', 1, 0, 'L', true);
            }
            $pdf->Cell(30, 5, 'Concepto', 1, 0, 'C', true);
            $pdf->Cell(25, 5, 'Monto (Bs)', 1, 1, 'R', true);
            $pdf->SetFont('Arial', '', 7);
            foreach ($efectivoPayments as $p) {
                $montoReal = $p->type === 'DEVOLUCION' ? -abs($p->amount) : (float) $p->amount;
                $granTotalEfectivo += $montoReal;
                $pdf->Cell(13, 5, $p->created_at->format('d/m'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->created_at->format('H:i'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->checkin->room->number ?? '-', 1, 0, 'C');
                $pdf->Cell($anchoHuesped, 5, utf8_decode(substr($p->checkin->guest->full_name ?? 'Sin Huésped', 0, 35)), 1, 0, 'L');
                if ($mostrarCajero) {
                    $pdf->Cell(32, 5, utf8_decode(substr($p->operador->nickname ?? $p->user->nickname ?? '', 0, 18)), 1, 0, 'L');
                }
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
            // "Banco Destino" siempre se necesita (no es redundante como
            // Cajero en la tabla de efectivo), así que en modo "todos" el
            // operador se agrega como columna NUEVA angosta (nickname es
            // corto) robándole ancho a "Huesped" (65->45), no a Banco
            // Destino. 13+10+10+45+32+20+30+25 = 185, igual que
            // 13+10+10+65+32+30+25 = 185 cuando no se muestra.
            $anchoHuespedQr = $mostrarCajero ? 45 : 65;

            $pdf->SetFont('Arial', 'B', 10);
            $pdf->SetFillColor(210, 235, 255);
            $pdf->Cell(0, 6, utf8_decode(' INGRESOS POR QR'), 1, 1, 'L', true);
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->Cell(13, 5, 'Fecha', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hora', 1, 0, 'C', true);
            $pdf->Cell(10, 5, 'Hab', 1, 0, 'C', true);
            $pdf->Cell($anchoHuespedQr, 5, 'Huesped', 1, 0, 'L', true);
            $pdf->Cell(32, 5, 'Banco Destino', 1, 0, 'C', true);
            if ($mostrarCajero) {
                $pdf->Cell(20, 5, 'Cajero', 1, 0, 'L', true);
            }
            $pdf->Cell(30, 5, 'Concepto', 1, 0, 'C', true);
            $pdf->Cell(25, 5, 'Monto (Bs)', 1, 1, 'R', true);
            $pdf->SetFont('Arial', '', 7);
            foreach ($qrPayments as $p) {
                $montoReal = $p->type === 'DEVOLUCION' ? -abs($p->amount) : (float) $p->amount;
                $granTotalQR += $montoReal;
                $pdf->Cell(13, 5, $p->created_at->format('d/m'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->created_at->format('H:i'), 1, 0, 'C');
                $pdf->Cell(10, 5, $p->checkin->room->number ?? '-', 1, 0, 'C');
                $pdf->Cell($anchoHuespedQr, 5, utf8_decode(substr($p->checkin->guest->full_name ?? 'Sin Huésped', 0, 35)), 1, 0, 'L');
                $bancoText = 'QR - ' . ($p->bank_name ? strtoupper($p->bank_name) : 'OTROS');
                $pdf->Cell(32, 5, utf8_decode(substr($bancoText, 0, 18)), 1, 0, 'C');
                if ($mostrarCajero) {
                    $pdf->Cell(20, 5, utf8_decode(substr($p->operador->nickname ?? $p->user->nickname ?? '', 0, 12)), 1, 0, 'L');
                }
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

        // TOTAL GENERAL: Efectivo + QR (todos los ingresos, sin importar el
        // medio) menos los gastos del turno. Es un neto de "cuánto entró
        // menos cuánto salió", distinto de "EFECTIVO EN CAJA" (que además
        // suma la apertura, porque ese sí representa el billete físico que
        // debe cuadrar en el cajón).
        $totalGeneralNeto = $granTotalEfectivo + $granTotalQR - $totalGastos;
        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->SetFillColor(230, 230, 230);
        $pdf->Cell(106, 8, '', 0, 0);
        $pdf->Cell(50, 8, utf8_decode('TOTAL:'), 1, 0, 'R', true);
        $pdf->Cell(40, 8, number_format($totalGeneralNeto, 2) . ' Bs', 1, 1, 'R', true);

        // Constancia impresa de cuánto efectivo físico declaró dejar el
        // operador en el cajón para el siguiente turno (left_amount): solo
        // se conoce cuando el turno específico quedó identificado (por
        // cash_register_id o por solapamiento de un único día).
        if ($cashRegisterResuelto && $cashRegisterResuelto->left_amount !== null) {
            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 11);
            $pdf->SetFillColor(255, 243, 205);
            $pdf->Cell(106, 7, '', 0, 0);
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

    public function generateFinancialReportCsv(Request $request)
    {
        $startDate = $request->query('start_date', now()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());
        $userId = $request->query('user_id', 'todos');

        [$rangoInicio, $rangoFin] = $this->normalizeRangeBounds($startDate, $endDate);

        $query = Payment::with(['user', 'operador', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$rangoInicio, $rangoFin]);

        if ($userId !== 'todos') $this->scopeByOperator($query, $userId);

        $payments = $query->orderBy('user_id')->orderBy('created_at')->get();
        // Filename siempre con fecha limpia (sin ':'/'T'), aunque venga un
        // datetime-local exacto de un turno puntual.
        $fileName = 'cierre-caja-' . Carbon::parse($rangoInicio)->format('Y-m-d') . '.csv';

        $headers = array(
            "Content-type"        => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        );

        $columns = ['Fecha', 'Hora', 'Cajero', 'Habitacion', 'Huesped', 'Metodo', 'Banco/QR', 'Tipo', 'Monto (Bs)'];

        $callback = function () use ($payments, $columns) {
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
                    $p->operador->name ?? $p->user->name ?? 'Desconocido',
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


    public function financialMovement(Request $request)
    {
        $targetDate = $request->query('date', now()->toDateString());
        $userId = Auth::id(); // El recepcionista que hizo clic en Vista Previa

        // Rango por defecto (todo el día)
        $rangoInicio = $targetDate . ' 00:00:00';
        $rangoFin    = $targetDate . ' 23:59:59';

        // --- LÓGICA DE TURNO INTELIGENTE ---
        // Si la vista previa es de "hoy", buscamos el último turno abierto por este usuario
        if ($targetDate === now()->toDateString()) {
            $ultimaCaja = $this->findShiftOverlapping($userId, $rangoInicio, $rangoFin);

            if ($ultimaCaja) {
                $rangoInicio = $ultimaCaja->opened_at ?? $ultimaCaja->created_at;
                $rangoFin = $ultimaCaja->closed_at ?? now();
            }
        }

        // ============================================================
        // 📒 LIBRO DIARIO — Movimientos del turno aislado
        // ============================================================
        $payments = Payment::with(['user', 'checkin.room', 'checkin.guest'])
            ->whereBetween('created_at', [$rangoInicio, $rangoFin])
            ->where('user_id', $userId) // <- Forzamos a que solo vea SUS cobros de este turno
            ->get()
            ->map(function ($p) {
                $monto = (float) $p->amount; // las devoluciones ya vienen negativas
                return [
                    'id'          => 'PAY-' . $p->id,
                    'kind'        => $monto < 0 ? 'devolucion' : 'ingreso',
                    'concept'     => $monto < 0
                        ? 'Devolución a huésped'
                        : ($p->type === 'ADELANTO' ? 'Adelanto de estadía' : 'Pago / Amortización'),
                    'reference'   => $p->checkin && $p->checkin->room
                        ? 'Hab. ' . $p->checkin->room->number
                        : '—',
                    'guest'       => $p->checkin && $p->checkin->guest
                        ? $p->checkin->guest->full_name
                        : 'Sin Huésped',
                    'method'      => $p->method,
                    'bank'        => $p->bank_name,
                    'user'        => $p->user->name ?? 'Sistema',
                    'amount'      => $monto,
                    'occurred_at' => \Carbon\Carbon::parse($p->created_at)->toIso8601String(),
                ];
            });

        $expenses = Expense::with('user')
            ->whereBetween('created_at', [$rangoInicio, $rangoFin])
            ->where('user_id', $userId) // <- Forzamos a que solo vea SUS gastos de este turno
            ->get()
            ->map(function ($e) {
                return [
                    'id'          => 'EXP-' . $e->id,
                    'kind'        => 'egreso',
                    'concept'     => $e->description ?? 'Gasto operativo',
                    'reference'   => 'Egreso de caja',
                    'guest'       => '—',
                    'method'      => 'EFECTIVO',
                    'bank'        => null,
                    'user'        => $e->user->name ?? 'Sistema',
                    'amount'      => -1 * abs((float) $e->amount), // egreso siempre negativo
                    'occurred_at' => \Carbon\Carbon::parse($e->created_at)->toIso8601String(),
                ];
            });

        // Unificamos y ordenamos cronológicamente (más reciente primero).
        $dailyBook = $payments->concat($expenses)
            ->sortByDesc('occurred_at')
            ->values();

        // Totales para las Cards superiores.
        $ingresosHoy     = $payments->where('kind', 'ingreso')->sum('amount');
        $devolucionesHoy = abs($payments->where('kind', 'devolucion')->sum('amount'));
        $egresosHoy      = abs($expenses->sum('amount'));
        $totalNeto       = $ingresosHoy - $devolucionesHoy - $egresosHoy;

        return Inertia::render('reports/financialMovement', [
            'TargetDate' => $targetDate,
            'DailyBook'  => $dailyBook,
            'BookSummary' => [
                'ingresos'     => round($ingresosHoy, 2),
                'egresos'      => round($egresosHoy, 2),
                'devoluciones' => round($devolucionesHoy, 2),
                'neto'         => round($totalNeto, 2),
            ],
        ]);
    }

    private function guestIdsForDate(string $date): array
    {
        $end = Carbon::parse($date)->endOfDay();

        $checkins = Checkin::with('companions:id')
            ->where('created_at', '<=', $end)
            ->where(function ($q) use ($end) {
                $q->whereRaw('LOWER(status) = ?', ['activo'])
                    ->orWhere(function ($s) use ($end) {
                        $s->whereRaw('LOWER(status) = ?', ['finalizado'])
                            ->where('updated_at', '>', $end);
                    });
            })->get();

        $ids = collect();
        foreach ($checkins as $ck) {
            if ($ck->guest_id) $ids->push($ck->guest_id);
            foreach ($ck->companions as $c) $ids->push($c->id);
        }

        return $ids->unique()->values()->all();
    }

    public function history(Request $request)
    {
        $days = min((int) $request->query('days', 60), 180);

        $rows = [];
        for ($i = 0; $i < $days; $i++) {
            $date  = now()->subDays($i)->toDateString();
            $total = count($this->guestIdsForDate($date));
            if ($total > 0) {
                $rows[] = ['date' => $date, 'total' => $total];
            }
        }

        return response()->json($rows);
    }
}
