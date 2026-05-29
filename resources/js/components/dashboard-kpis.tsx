import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    Activity,
    BedDouble,
    DollarSign,
    Hotel,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
 
// ---------- Tipos esperados desde el backend ----------
interface Kpis {
    porcentaje_ocupacion: number;
    habitaciones_total: number;
    habitaciones_ocupadas: number;
    habitaciones_libres: number;
    habitaciones_reservadas: number;
    habitaciones_limpieza: number;
    habitaciones_mantenim: number;
    ingresos_hoy: number;
    devoluciones_hoy: number;
    egresos_hoy: number;
    neto_hoy: number;
    ingresos_mes: number;
    egresos_mes: number;
    checkins_activos: number;
    reservas_pendientes: number;
    caja_abierta: boolean;
    caja_apertura_monto: number | null;
}
 
interface IngresoSerie {
    fecha: string;
    ingresos: number;
    egresos: number;
}
 
interface OcupacionTipo {
    nombre: string;
    total: number;
    ocupadas: number;
    libres: number;
    porcentaje: number;
}
 
interface RankingTipo {
    nombre: string;
    total: number;
}
 
interface PagoMetodo {
    metodo: string;
    total: number;
}
 
interface Props {
    kpis: Kpis;
    ingresosMes: IngresoSerie[];
    ocupacionTipo: OcupacionTipo[];
    rankingTipos: RankingTipo[];
    pagosMetodo: PagoMetodo[];
}
 
// ---------- Helpers ----------
const moneda = (n: number) =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
        minimumFractionDigits: 2,
    }).format(n);
 
const fechaCorta = (iso: string) => {
    // 'YYYY-MM-DD' -> 'DD/MM'
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
};
 
// Paleta de colores cohesiva con el resto del sistema
const PALETA = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
 
// ---------- Componente ----------
export default function DashboardKpis({
    kpis,
    ingresosMes,
    ocupacionTipo,
    rankingTipos,
    pagosMetodo,
}: Props) {
    return (
        <section className="mb-8 space-y-6">
            {/* Encabezado */}
            <div>
                <h2 className="text-2xl font-bold text-white">Panel Gerencial</h2>
                <p className="text-sm text-gray-100">
                    Indicadores clave consolidados en tiempo real
                </p>
            </div>
 
            {/* Fila de KPIs (tarjetas) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    titulo="Ocupación actual"
                    valor={`${kpis.porcentaje_ocupacion}%`}
                    subtitulo={`${kpis.habitaciones_ocupadas} de ${kpis.habitaciones_total} habitaciones`}
                    icon={<Hotel className="h-6 w-6" />}
                    color="blue"
                />
                <KpiCard
                    titulo="Ingresos de hoy"
                    valor={moneda(kpis.ingresos_hoy)}
                    subtitulo={`Neto: ${moneda(kpis.neto_hoy)}`}
                    icon={<DollarSign className="h-6 w-6" />}
                    color="green"
                />
                <KpiCard
                    titulo="Ingresos del mes"
                    valor={moneda(kpis.ingresos_mes)}
                    subtitulo={`Egresos: ${moneda(kpis.egresos_mes)}`}
                    icon={<TrendingUp className="h-6 w-6" />}
                    color="amber"
                />
                <KpiCard
                    titulo="Operación activa"
                    valor={`${kpis.checkins_activos}`}
                    subtitulo={`${kpis.reservas_pendientes} reservas pendientes`}
                    icon={<Activity className="h-6 w-6" />}
                    color="purple"
                />
            </div>
 
            {/* Segunda fila: estado de habitaciones y caja */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <MiniCard etiqueta="Libres" valor={kpis.habitaciones_libres} color="green" />
                <MiniCard etiqueta="Ocupadas" valor={kpis.habitaciones_ocupadas} color="red" />
                <MiniCard etiqueta="Reservadas" valor={kpis.habitaciones_reservadas} color="blue" />
                <MiniCard etiqueta="Limpieza" valor={kpis.habitaciones_limpieza} color="yellow" />
                <MiniCard etiqueta="Mantenim." valor={kpis.habitaciones_mantenim} color="gray" />
                <MiniCard
                    etiqueta="Caja"
                    valor={kpis.caja_abierta ? 'Abierta' : 'Cerrada'}
                    color={kpis.caja_abierta ? 'green' : 'gray'}
                />
            </div>
 
            {/* Gráficos */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 1. Ingresos vs Egresos últimos 30 días */}
                <ChartCard
                    titulo="Ingresos vs Egresos · últimos 30 días"
                    subtitulo="Tendencia diaria del flujo de caja"
                >
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={ingresosMes.map((d) => ({ ...d, fecha: fechaCorta(d.fecha) }))}>
                            <defs>
                                <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gEgr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Bs ${v}`} />
                            <Tooltip
                                formatter={(v) => moneda(Number(v))}
                                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area
                                type="monotone"
                                dataKey="ingresos"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#gIng)"
                                name="Ingresos"
                            />
                            <Area
                                type="monotone"
                                dataKey="egresos"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fill="url(#gEgr)"
                                name="Egresos"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>
 
                {/* 2. Ocupación por tipo de habitación */}
                <ChartCard
                    titulo="Ocupación por tipo de habitación"
                    subtitulo="Comparativa actual entre tipos"
                >
                    {ocupacionTipo.length === 0 ? (
                        <Vacio mensaje="Sin datos de habitaciones para mostrar" />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={ocupacionTipo}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="ocupadas" stackId="a" fill="#ef4444" name="Ocupadas" />
                                <Bar dataKey="libres" stackId="a" fill="#10b981" name="Libres" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
 
                {/* 3. Ranking tipos más vendidos */}
                <ChartCard
                    titulo="Top tipos más vendidos · este mes"
                    subtitulo="Check-ins acumulados por tipo de habitación"
                >
                    {rankingTipos.length === 0 ? (
                        <Vacio mensaje="Aún no hay check-ins este mes" />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                                data={rankingTipos}
                                layout="vertical"
                                margin={{ left: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis
                                    type="category"
                                    dataKey="nombre"
                                    tick={{ fontSize: 11 }}
                                    width={100}
                                />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Check-ins" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
 
                {/* 4. Distribución por método de pago */}
                <ChartCard
                    titulo="Ingresos por método de pago · este mes"
                    subtitulo="Distribución de cobros"
                >
                    {pagosMetodo.length === 0 ? (
                        <Vacio mensaje="Sin pagos registrados este mes" />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={pagosMetodo}
                                    dataKey="total"
                                    nameKey="metodo"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label={(entry: any) => entry.metodo ?? entry.name}
                                    labelLine={false}
                                >
                                    {pagosMetodo.map((_, i) => (
                                        <Cell key={i} fill={PALETA[i % PALETA.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v) => moneda(Number(v))}
                                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
        </section>
    );
}
 
// ---------- Subcomponentes ----------
 
interface KpiCardProps {
    titulo: string;
    valor: string;
    subtitulo: string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'amber' | 'purple';
}
 
function KpiCard({ titulo, valor, subtitulo, icon, color }: KpiCardProps) {
    const colorMap = {
        blue:   'bg-blue-50 text-blue-700 border-blue-200',
        green:  'bg-green-50 text-green-700 border-green-200',
        amber:  'bg-amber-50 text-amber-700 border-amber-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
        <div className={`rounded-xl border p-5 shadow-sm ${colorMap[color]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide opacity-75">
                        {titulo}
                    </p>
                    <p className="mt-2 text-2xl font-bold">{valor}</p>
                    <p className="mt-1 text-xs opacity-70">{subtitulo}</p>
                </div>
                <div className="rounded-lg bg-white/60 p-2">{icon}</div>
            </div>
        </div>
    );
}
 
interface MiniCardProps {
    etiqueta: string;
    valor: number | string;
    color: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
}
 
function MiniCard({ etiqueta, valor, color }: MiniCardProps) {
    const colorMap = {
        green:  'border-green-300 bg-green-50 text-green-800',
        red:    'border-red-300 bg-red-50 text-red-800',
        blue:   'border-blue-300 bg-blue-50 text-blue-800',
        yellow: 'border-yellow-300 bg-yellow-50 text-yellow-800',
        gray:   'border-gray-300 bg-gray-50 text-gray-700',
    };
    return (
        <div className={`rounded-lg border px-3 py-2 ${colorMap[color]}`}>
            <p className="text-xs font-medium">{etiqueta}</p>
            <p className="mt-1 text-lg font-bold">{valor}</p>
        </div>
    );
}
 
interface ChartCardProps {
    titulo: string;
    subtitulo?: string;
    children: React.ReactNode;
}
 
function ChartCard({ titulo, subtitulo, children }: ChartCardProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
                {subtitulo && <p className="text-xs text-gray-500">{subtitulo}</p>}
            </div>
            {children}
        </div>
    );
}
 
function Vacio({ mensaje }: { mensaje: string }) {
    return (
        <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
            {mensaje}
        </div>
    );
}