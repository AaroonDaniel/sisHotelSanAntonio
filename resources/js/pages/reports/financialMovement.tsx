import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowLeft,
    ArrowUpCircle,
    CalendarDays,
    FileText,
    Printer,
    Search,
    Undo2,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

// =====================================================================
// TIPOS
// =====================================================================
interface Guest {
    id: number;
    full_name: string;
    age: number | string;
    nationality: string;
    profession: string;
    civil_status: string;
    origin: string;
    identification_number: string;
    issued_in: string;
    room_number: string;
    role: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    nickname: string;
    full_name: string;
}

type MovementKind = 'ingreso' | 'egreso' | 'devolucion';

interface DailyMovement {
    id: string;
    kind: MovementKind;
    concept: string;
    reference: string;
    guest: string;
    method: string;
    bank: string | null;
    user: string;
    amount: number;
    occurred_at: string;
}

interface BookSummary {
    ingresos: number;
    egresos: number;
    devoluciones: number;
    neto: number;
}

interface Props {
    auth: { user: User; active_register?: unknown };
    Entrantes: Guest[];
    Quedantes: Guest[];
    Salientes: Guest[];
    TargetDate: string;
    DailyBook: DailyMovement[];
    BookSummary: BookSummary;
}

// =====================================================================
// HELPERS
// =====================================================================
const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
        minimumFractionDigits: 2,
    }).format(amount);

const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-BO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const formatLongDate = (dateStr: string): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-BO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

// =====================================================================
// SUB-COMPONENTE: Card de resumen (estilo shadcn)
// =====================================================================
interface SummaryCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    accent: string;
    ring: string;
    isNet?: boolean;
}

function SummaryCard({ label, value, icon, accent, ring, isNet }: SummaryCardProps) {
    const netColor = value >= 0 ? 'text-emerald-600' : 'text-red-600';
    return (
        <div
            className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${ring}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                        {label}
                    </p>
                    <p
                        className={`mt-2 text-2xl font-black tracking-tight ${
                            isNet ? netColor : 'text-gray-800'
                        }`}
                    >
                        {formatCurrency(value)}
                    </p>
                </div>
                <div className={`rounded-xl p-2.5 ${accent}`}>{icon}</div>
            </div>
        </div>
    );
}

// =====================================================================
// SUB-COMPONENTE: Badge de tipo de movimiento
// =====================================================================
function MovementBadge({ kind }: { kind: MovementKind }) {
    const map: Record<MovementKind, { label: string; cls: string }> = {
        ingreso: {
            label: 'Ingreso',
            cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        },
        egreso: {
            label: 'Egreso',
            cls: 'bg-red-100 text-red-700 border-red-200',
        },
        devolucion: {
            label: 'Devolución',
            cls: 'bg-orange-100 text-orange-700 border-orange-200',
        },
    };
    const { label, cls } = map[kind];
    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${cls}`}
        >
            {label}
        </span>
    );
}

// =====================================================================
// VISTA PRINCIPAL
// =====================================================================
export default function ReportsIndex({
    auth,
    Entrantes = [],
    Quedantes = [],
    Salientes = [],
    TargetDate,
    DailyBook = [],
    BookSummary,
}: Props) {
    const [selectedDate, setSelectedDate] = useState<string>(
        TargetDate || new Date().toISOString().split('T')[0],
    );
    const [bookSearch, setBookSearch] = useState<string>('');

    // --- Cambio de fecha (recarga el Libro Diario y los reportes) ---
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        router.get(
            '/reports',
            { date: newDate },
            { preserveState: true, preserveScroll: true },
        );
    };

    // --- Filtrado del Libro Diario ---
    const filteredBook = useMemo<DailyMovement[]>(() => {
        if (!bookSearch.trim()) return DailyBook;
        const q = bookSearch.toLowerCase();
        // 🚀 Check-in diferido: el nombre del huésped puede llegar en null
        // desde el backend aunque el tipo declare string — sin el
        // fallback, .toLowerCase() sobre null tumba todo el filtro.
        return DailyBook.filter(
            (m) =>
                (m.concept ?? '').toLowerCase().includes(q) ||
                (m.guest ?? '').toLowerCase().includes(q) ||
                (m.reference ?? '').toLowerCase().includes(q) ||
                (m.user ?? '').toLowerCase().includes(q),
        );
    }, [DailyBook, bookSearch]);

    // --- Conteo de huéspedes del reporte (Entrantes/Quedantes/Salientes) ---
    const totalGuestsReport =
        Entrantes.length + Quedantes.length + Salientes.length;

    // --- PDF del reporte de huéspedes (todos los del día) ---
    // --- PDF del reporte de huéspedes (todos los del día) ---
    const handleGuestsReportPdf = (): void => {
        const allIds = [...Entrantes, ...Quedantes, ...Salientes]
            .map((g) => g.id)
            .join(',');
        if (!allIds) return;
        window.open(
            `/reports/generate-pdf?ids=${allIds}&date=${selectedDate}&t=${Date.now()}`,
            '_blank',
        );
    };

    // --- PDF del reporte de caja / Liquidación (¡LA NUEVA!) ---
    const handleFinancialReportPdf = (): void => {
        window.open(
            `/reports/financial/pdf?start_date=${selectedDate}&end_date=${selectedDate}&record_type=ambos&user_id=todos&t=${Date.now()}`,
            '_blank',
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reportes — Libro Diario" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {/* ============================================= */}
                {/* CABECERA: Selector de fecha                   */}
                {/* ============================================= */}

                {/* Botón Volver */}
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>
                <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">
                                Libro Diario de Caja
                            </h3>
                            <p className="text-xs text-gray-500 capitalize">
                                {formatLongDate(selectedDate)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                            Fecha
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* ============================================= */}
                {/* CARDS SUPERIORES                              */}
                {/* ============================================= */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                        label="Ingresos Hoy"
                        value={BookSummary.ingresos}
                        icon={<ArrowUpCircle className="h-5 w-5 text-white" />}
                        accent="bg-emerald-500"
                        ring="border-emerald-100"
                    />
                    <SummaryCard
                        label="Egresos Hoy"
                        value={BookSummary.egresos}
                        icon={<ArrowDownCircle className="h-5 w-5 text-white" />}
                        accent="bg-red-500"
                        ring="border-red-100"
                    />
                    <SummaryCard
                        label="Devoluciones"
                        value={BookSummary.devoluciones}
                        icon={<Undo2 className="h-5 w-5 text-white" />}
                        accent="bg-orange-500"
                        ring="border-orange-100"
                    />
                    <SummaryCard
                        label="Total Neto en Caja"
                        value={BookSummary.neto}
                        icon={<Wallet className="h-5 w-5 text-white" />}
                        accent="bg-indigo-500"
                        ring="border-indigo-100"
                        isNet
                    />
                </div>

                {/* ============================================= */}
                {/* TABLA UNIFICADA: LIBRO DIARIO                 */}
                {/* ============================================= */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-500" />
                            <h3 className="text-sm font-bold text-gray-800">
                                Movimientos del Día
                            </h3>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                                {filteredBook.length}
                            </span>
                        </div>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={bookSearch}
                                onChange={(e) => setBookSearch(e.target.value)}
                                placeholder="Buscar concepto, huésped, cajero..."
                                className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-indigo-500 focus:ring-indigo-500 sm:w-72"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                                    <th className="px-4 py-3">Hora</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Concepto</th>
                                    <th className="px-4 py-3">Referencia</th>
                                    <th className="px-4 py-3">Huésped</th>
                                    <th className="px-4 py-3">Método</th>
                                    <th className="px-4 py-3">Cajero</th>
                                    <th className="px-4 py-3 text-right">
                                        Monto (Bs)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredBook.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-12 text-center text-sm text-gray-400 italic"
                                        >
                                            Sin movimientos registrados para
                                            esta fecha.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBook.map((m) => (
                                        <tr
                                            key={m.id}
                                            className="transition-colors hover:bg-indigo-50/40"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                {formatTime(m.occurred_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <MovementBadge kind={m.kind} />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {m.concept}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {m.reference}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {m.guest}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-medium text-gray-600">
                                                    {m.method}
                                                    {m.bank
                                                        ? ` · ${m.bank}`
                                                        : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {m.user}
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right font-black whitespace-nowrap ${
                                                    m.amount < 0
                                                        ? 'text-red-600'
                                                        : 'text-emerald-600'
                                                }`}
                                            >
                                                {m.amount < 0 ? '− ' : '+ '}
                                                {formatCurrency(
                                                    Math.abs(m.amount),
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {filteredBook.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                                        <td
                                            colSpan={7}
                                            className="px-4 py-3 text-right text-xs tracking-wider text-gray-500 uppercase"
                                        >
                                            Total Neto del Día
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right text-base font-black ${
                                                BookSummary.neto >= 0
                                                    ? 'text-emerald-600'
                                                    : 'text-red-600'
                                            }`}
                                        >
                                            {formatCurrency(BookSummary.neto)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* ============================================= */}
                {/* REPORTE DE HUÉSPEDES (acceso rápido)          */}
                {/* ============================================= */}
                <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">
                            Reporte de Huéspedes del Día
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {Entrantes.length} entrantes · {Quedantes.length}{' '}
                            quedantes · {Salientes.length} salientes
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleGuestsReportPdf}
                        disabled={totalGuestsReport === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Printer className="h-4 w-4" />
                        Generar Reporte PDF
                    </button>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
