import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Eye, History, Pencil, Vault, Wallet } from 'lucide-react';
import { useState } from 'react';
import PdfPreviewModal from './PdfPreviewModal';

interface ShiftRow {
    id: number;
    operator_name: string;
    opening_amount: number;
    opened_at: string | null;
    closed_at: string | null;
    status: string;
    final_balance: number | null;
    left_amount: number | null;
}

interface DayReportRow {
    id: number;
    operator_name: string;
    status: string;
    opening_amount: number;
    total_income: number;
    total_expenses: number;
    expected_cash: number;
}

interface DayReport {
    date: string;
    shifts: DayReportRow[];
    totals: {
        opening_amount: number;
        total_income: number;
        total_expenses: number;
        expected_cash: number;
    };
}

interface Props {
    auth: { user: User };
    Shifts: ShiftRow[];
    InitialDate: string;
    DayReport: DayReport;
}

type TabKey = 'turnos' | 'dia';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);

const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

export default function ShiftReportsIndex({
    auth,
    Shifts,
    InitialDate,
    DayReport,
}: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>('turnos');
    const [date, setDate] = useState(InitialDate);
    const [previewId, setPreviewId] = useState<number | null>(null);

    const handleDateChange = (value: string) => {
        setDate(value);
        router.get(
            '/admin/shift-reports',
            { date: value },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['DayReport', 'InitialDate'],
            },
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Aperturas y Cierres" />

            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                        <Vault className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-write">
                            Aperturas y Cierres
                        </h1>
                       
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex gap-2 border-b border-gray-200">
                    {(
                        [
                            {
                                key: 'turnos',
                                label: 'Reporte por Turno',
                                icon: History,
                            },
                            {
                                key: 'dia',
                                label: 'Informe del Día',
                                icon: Calendar,
                            },
                        ] as const
                    ).map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                                    isActive
                                        ? 'border-b-2 border-emerald-600 text-emerald-700'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: REPORTE POR TURNO */}
                {activeTab === 'turnos' && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Turno</th>
                                        <th className="px-4 py-3">Operador</th>
                                        <th className="px-4 py-3">
                                            Fecha/Hora Inicio
                                        </th>
                                        <th className="px-4 py-3">
                                            Fecha/Hora Cierre
                                        </th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-right">
                                            Saldo Final
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Dejó en Caja
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {Shifts.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="px-4 py-10 text-center text-gray-400 italic"
                                            >
                                                Todavía no hay turnos
                                                registrados.
                                            </td>
                                        </tr>
                                    )}
                                    {Shifts.map((s) => (
                                        <tr
                                            key={s.id}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-3 font-mono text-gray-400">
                                                #{s.id}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-800">
                                                {s.operator_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {formatDateTime(s.opened_at)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {formatDateTime(s.closed_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide uppercase ${
                                                        s.status === 'CERRADA'
                                                            ? 'bg-gray-200 text-gray-700'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                    }`}
                                                >
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                {s.final_balance !== null
                                                    ? formatCurrency(
                                                          s.final_balance,
                                                      )
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">
                                                {s.left_amount !== null
                                                    ? formatCurrency(
                                                          s.left_amount,
                                                      )
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPreviewId(s.id)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Ver
                                                    </button>
                                                    <Link
                                                        href={`/admin/shift-reports/${s.id}/edit`}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Editar
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: INFORME DEL DÍA */}
                {activeTab === 'dia' && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                                Fecha a consolidar
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) =>
                                    handleDateChange(e.target.value)
                                }
                                className="w-full max-w-xs rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold text-gray-800 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            <p className="mt-2 text-xs text-gray-400">
                                Incluye todos los turnos con actividad ese día,
                                aunque hayan empezado el día anterior (turnos
                                nocturnos) o sigan abiertos.
                            </p>
                        </div>

                        {/* TOTAL CONSOLIDADO: lo que debe haber en la caja fuerte */}
                        <div className="rounded-2xl border-2 border-gray-800 bg-gray-900 p-6 text-center shadow-lg">
                            <p className="flex items-center justify-center gap-1.5 text-xs font-bold tracking-wider text-gray-300 uppercase">
                                <Wallet className="h-4 w-4" />
                                Total Consolidado en Caja Fuerte
                            </p>
                            <p className="mt-2 text-4xl font-black text-white">
                                {formatCurrency(DayReport.totals.expected_cash)}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                {DayReport.shifts.length} turno(s) con actividad
                                el{' '}
                                {new Date(
                                    DayReport.date + 'T00:00:00',
                                ).toLocaleDateString('es-BO')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                                <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                    Saldos Iniciales
                                </p>
                                <p className="mt-1 text-xl font-black text-gray-800">
                                    {formatCurrency(
                                        DayReport.totals.opening_amount,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                                <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                    Total Cobrado
                                </p>
                                <p className="mt-1 text-xl font-black text-emerald-600">
                                    {formatCurrency(
                                        DayReport.totals.total_income,
                                    )}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
                                <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                    Total Gastos
                                </p>
                                <p className="mt-1 text-xl font-black text-red-600">
                                    {formatCurrency(
                                        DayReport.totals.total_expenses,
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* DESGLOSE POR TURNO */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">
                                                Operador
                                            </th>
                                            <th className="px-4 py-3">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Apertura
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Ingresos
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Gastos
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Efectivo Esperado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {DayReport.shifts.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-4 py-10 text-center text-gray-400 italic"
                                                >
                                                    Sin turnos con actividad en
                                                    esta fecha.
                                                </td>
                                            </tr>
                                        )}
                                        {DayReport.shifts.map((s) => (
                                            <tr
                                                key={s.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-3 font-bold text-gray-800">
                                                    {s.operator_name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide uppercase ${
                                                            s.status ===
                                                            'CERRADA'
                                                                ? 'bg-gray-200 text-gray-700'
                                                                : 'bg-emerald-100 text-emerald-700'
                                                        }`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {formatCurrency(
                                                        s.opening_amount,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-emerald-600">
                                                    {formatCurrency(
                                                        s.total_income,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-600">
                                                    {formatCurrency(
                                                        s.total_expenses,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                    {formatCurrency(
                                                        s.expected_cash,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PdfPreviewModal
                cashRegisterId={previewId}
                onClose={() => setPreviewId(null)}
            />
        </AuthenticatedLayout>
    );
}
