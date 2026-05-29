<?php

namespace App\Http\Controllers;

use App\Models\Checkin;
use App\Models\CheckinDetail;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomType;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * Vista principal del dashboard.
     *
     * Devuelve los KPIs y series para gráficos del Dashboard Gerencial,
     * cerrando la HU-12 "Visualización del Dashboard Gerencial con datos consolidados"
     * y el Escenario 12 de la Tabla 4.23 de pruebas de sistema.
     *
     * Solo es invocado para roles Administrador y Gerente General (filtrado en frontend),
     * por lo que las consultas pueden ser intensivas sin afectar al recepcionista.
     */
    public function index()
    {
        $hoy        = Carbon::today();
        $inicioMes  = Carbon::now()->startOfMonth();
        $hace30dias = Carbon::today()->subDays(29); // Incluye hoy = 30 puntos

        return Inertia::render('dashboard', [
            'kpis'          => $this->calcularKpis($hoy, $inicioMes),
            'ingresosMes'   => $this->ingresosUltimos30Dias($hace30dias),
            'ocupacionTipo' => $this->ocupacionPorTipo(),
            'rankingTipos'  => $this->rankingTiposMasVendidos($inicioMes),
            'pagosMetodo'   => $this->ingresosPorMetodoMes($inicioMes),
        ]);
    }

    /**
     * KPIs principales: ocupación, ingresos del día/mes, check-ins activos,
     * habitaciones libres, estado de caja, reservas pendientes.
     */
    private function calcularKpis(Carbon $hoy, Carbon $inicioMes): array
    {
        // Habitaciones (solo activas para el % de ocupación).
        // IMPORTANTE: en el sistema real, los valores del status de Room
        // están en mayúsculas y en español: LIBRE, OCUPADO, RESERVADO,
        // LIMPIEZA, MANTENIMIENTO (a pesar de que la migración los definió
        // en inglés). Mantenemos consistencia con el código existente.
        $totalHabitaciones      = Room::where('is_active', true)->count();
        $habitacionesOcupadas   = Room::where('is_active', true)
            ->where('status', 'OCUPADO')->count();
        $habitacionesLibres     = Room::where('is_active', true)
            ->where('status', 'LIBRE')->count();
        $habitacionesReservadas = Room::where('is_active', true)
            ->where('status', 'RESERVADO')->count();
        $habitacionesLimpieza   = Room::where('is_active', true)
            ->where('status', 'LIMPIEZA')->count();
        $habitacionesMantenim   = Room::where('is_active', true)
            ->where('status', 'MANTENIMIENTO')->count();

        $porcentajeOcupacion = $totalHabitaciones > 0
            ? round(($habitacionesOcupadas / $totalHabitaciones) * 100, 1)
            : 0.0;

        // Ingresos del día (PAGO = positivo, DEVOLUCION = negativo -> sum() ya los compensa)
        // Usa whereDate (ojo: en PostgreSQL es 'date(created_at)'); Laravel lo abstrae.
        $ingresosHoy = (float) Payment::whereDate('created_at', $hoy)
            ->where('type', 'PAGO')->sum('amount');

        $devolucionesHoy = abs((float) Payment::whereDate('created_at', $hoy)
            ->where('type', 'DEVOLUCION')->sum('amount'));

        $egresosHoy = (float) Expense::whereDate('created_at', $hoy)->sum('amount');

        $netoHoy = $ingresosHoy - $devolucionesHoy - $egresosHoy;

        // Ingresos acumulados del mes (solo PAGO, sin devoluciones)
        $ingresosMes = (float) Payment::where('created_at', '>=', $inicioMes)
            ->where('type', 'PAGO')->sum('amount');

        $egresosMes = (float) Expense::where('created_at', '>=', $inicioMes)->sum('amount');

        // Operación
        $checkinsActivos     = Checkin::where('status', 'activo')->count();

        // Reservas pendientes VIGENTES: status='pendiente' Y fecha de llegada
        // hoy o futura. Excluye las pendientes históricas no actualizadas.
        $reservasPendientes  = Reservation::where('status', 'pendiente')
            ->whereDate('arrival_date', '>=', $hoy)
            ->count();

        // Estado de caja: ¿hay alguna caja ABIERTA ahora mismo?
        $cajaAbierta = DB::table('cash_registers')
            ->where('status', 'ABIERTA')
            ->select('id', 'user_id', 'opening_amount', 'opened_at')
            ->first();

        return [
            'porcentaje_ocupacion'    => $porcentajeOcupacion,
            'habitaciones_total'      => $totalHabitaciones,
            'habitaciones_ocupadas'   => $habitacionesOcupadas,
            'habitaciones_libres'     => $habitacionesLibres,
            'habitaciones_reservadas' => $habitacionesReservadas,
            'habitaciones_limpieza'   => $habitacionesLimpieza,
            'habitaciones_mantenim'   => $habitacionesMantenim,
            'ingresos_hoy'            => $ingresosHoy,
            'devoluciones_hoy'        => $devolucionesHoy,
            'egresos_hoy'             => $egresosHoy,
            'neto_hoy'                => $netoHoy,
            'ingresos_mes'            => $ingresosMes,
            'egresos_mes'             => $egresosMes,
            'checkins_activos'        => $checkinsActivos,
            'reservas_pendientes'     => $reservasPendientes,
            'caja_abierta'            => $cajaAbierta !== null,
            'caja_apertura_monto'     => $cajaAbierta?->opening_amount,
        ];
    }

    /**
     * Serie de ingresos vs egresos de los últimos 30 días.
     * Devuelve una fila por cada día con: fecha, ingresos, egresos.
     */
    private function ingresosUltimos30Dias(Carbon $desde): array
    {
        // Agrupación nativa por fecha. PostgreSQL: DATE(created_at).
        $pagos = Payment::where('created_at', '>=', $desde)
            ->where('type', 'PAGO')
            ->selectRaw('DATE(created_at) as fecha, SUM(amount) as total')
            ->groupBy('fecha')
            ->pluck('total', 'fecha');

        $gastos = Expense::where('created_at', '>=', $desde)
            ->selectRaw('DATE(created_at) as fecha, SUM(amount) as total')
            ->groupBy('fecha')
            ->pluck('total', 'fecha');

        // Generar los 30 días aunque no haya movimientos (mejora la lectura del gráfico)
        $serie = [];
        for ($i = 0; $i < 30; $i++) {
            $f = $desde->copy()->addDays($i)->toDateString();
            $serie[] = [
                'fecha'    => $f,
                'ingresos' => (float) ($pagos[$f]  ?? 0),
                'egresos'  => (float) ($gastos[$f] ?? 0),
            ];
        }

        return $serie;
    }

    /**
     * Ocupación actual desglosada por tipo de habitación.
     * Devuelve para cada tipo: nombre, total, ocupadas, libres, % ocupación.
     */
    private function ocupacionPorTipo(): array
    {
        $tipos = RoomType::where('is_active', true)
            ->withCount([
                'rooms as total_rooms' => function ($q) {
                    $q->where('is_active', true);
                },
                'rooms as ocupadas_rooms' => function ($q) {
                    $q->where('is_active', true)->where('status', 'OCUPADO');
                },
            ])
            ->get();

        return $tipos->map(function ($t) {
            $total    = (int) $t->total_rooms;
            $ocupadas = (int) $t->ocupadas_rooms;
            $libres   = $total - $ocupadas;
            $pct      = $total > 0 ? round(($ocupadas / $total) * 100, 1) : 0.0;

            return [
                'nombre'     => $t->name,
                'total'      => $total,
                'ocupadas'   => $ocupadas,
                'libres'     => $libres,
                'porcentaje' => $pct,
            ];
        })->values()->all();
    }

    /**
     * Ranking de tipos de habitación más vendidos en el mes actual.
     * Cuenta cuántos check-ins (no cancelados/nunca llego) ha tenido cada tipo.
     */
    private function rankingTiposMasVendidos(Carbon $inicioMes): array
    {
        $rows = DB::table('checkins as c')
            ->join('rooms as r', 'r.id', '=', 'c.room_id')
            ->join('room_types as rt', 'rt.id', '=', 'r.room_type_id')
            ->where('c.created_at', '>=', $inicioMes)
            ->whereNotIn('c.status', ['cancelado', 'nunca llego'])
            ->select('rt.name as nombre', DB::raw('COUNT(c.id) as total'))
            ->groupBy('rt.name')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        return $rows->map(fn ($r) => [
            'nombre' => $r->nombre,
            'total'  => (int) $r->total,
        ])->all();
    }

    /**
     * Distribución de ingresos del mes por método de pago.
     * Para el gráfico de pastel.
     */
    private function ingresosPorMetodoMes(Carbon $inicioMes): array
    {
        $rows = Payment::where('created_at', '>=', $inicioMes)
            ->where('type', 'PAGO')
            ->select('method', DB::raw('SUM(amount) as total'))
            ->groupBy('method')
            ->orderByDesc('total')
            ->get();

        return $rows->map(fn ($r) => [
            'metodo' => $r->method ?: 'OTRO',
            'total'  => (float) $r->total,
        ])->all();
    }
}