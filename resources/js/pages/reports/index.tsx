import BackButton from '@/components/BackButton';
import GuestSelectionGenerator, {
    Guest,
} from '@/components/GuestSelectionGenerator';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Calendar, Eye, FileText, History, X } from 'lucide-react';
import { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';

interface User {
    id: number;
    name: string;
    email: string;
    nickname: string;
    full_name: string;
}

interface Props {
    auth: { user: User; active_register?: any };
    Entrantes: Guest[];
    Quedantes: Guest[];
    Salientes: Guest[];
    TargetDate: string;
}

export default function ReportsIndex({
    auth,
    Entrantes = [],
    Quedantes = [],
    Salientes = [],
    TargetDate,
}: Props) {
    const [selectedDate, setSelectedDate] = useState(
        TargetDate || new Date().toISOString().split('T')[0],
    );

    // --- HISTORIAL DE PARTES DIARIOS ---
    const [viewMode, setViewMode] = useState<'generator' | 'history'>(
        'generator',
    );
    const [history, setHistory] = useState<{ date: string; total: number }[]>(
        [],
    );
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [modalDate, setModalDate] = useState<string | null>(null);

    const formatDate = (iso: string) => {
        const [yy, mm, dd] = iso.split('-');
        return `${dd}/${mm}/${yy}`;
    };

    const openHistory = async () => {
        setViewMode('history');
        setLoadingHistory(true);
        try {
            const res = await fetch('/reports/history', {
                headers: { Accept: 'application/json' },
            });
            setHistory(await res.json());
        } catch {
            setHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Calcular Correlativo
    const baseDate = new Date(2026, 3, 18);
    const [y, m, d] = selectedDate.split('-');
    const todayForCalc = new Date(Number(y), Number(m) - 1, Number(d));
    const diffDays = Math.floor(
        (todayForCalc.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const numeroSerie = (6608 + diffDays).toString().padStart(6, '0');

    // Cambiar fecha
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        router.get(
            '/reports',
            { date: newDate },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reportes" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                            <h2 className="text-3xl font-bold text-white">
                                Generador de Parte Diario
                            </h2>
                            <div className="flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 shadow-sm">
                                <span className="text-sm font-black tracking-widest text-emerald-300">
                                    Nº {numeroSerie}
                                </span>
                            </div>
                            <button
                                onClick={() =>
                                    viewMode === 'history'
                                        ? setViewMode('generator')
                                        : openHistory()
                                }
                                className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-emerald-300 shadow-sm transition hover:bg-emerald-500/20"
                            >
                                {viewMode === 'history' ? (
                                    <>
                                        <FaArrowLeft className="h-3.5 w-3.5" />{' '}
                                        Volver a Reportes
                                    </>
                                ) : (
                                    <>
                                        <History className="h-4 w-4" />{' '}
                                        Historial
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/10 p-2 pr-4 shadow-md backdrop-blur-md">
                            <Calendar className="ml-2 h-5 w-5 text-emerald-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                max={new Date().toISOString().split('T')[0]}
                                className="cursor-pointer border-none bg-transparent font-bold text-white focus:ring-0"
                            />
                        </div>
                    </div>
                    <BackButton />
                </div>

                <div className="py-6">
                    {viewMode === 'history' ? (
                        /* ===================== VISTA HISTORIAL ===================== */
                        <div className="animate-in duration-200 fade-in">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    <History className="h-5 w-5 text-emerald-400" />{' '}
                                    Historial de Partes Diarios
                                </h3>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="px-6 py-3 text-left font-bold">
                                                Fecha del Reporte
                                            </th>
                                            <th className="px-6 py-3 text-center font-bold">
                                                Huéspedes
                                            </th>
                                            <th className="px-6 py-3 text-right font-bold">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingHistory ? (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-6 py-10 text-center text-gray-400"
                                                >
                                                    Cargando historial...
                                                </td>
                                            </tr>
                                        ) : history.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="px-6 py-10 text-center text-gray-400"
                                                >
                                                    No hay reportes en el
                                                    periodo.
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((h) => (
                                                <tr
                                                    key={h.date}
                                                    className="transition-colors hover:bg-emerald-50/40"
                                                >
                                                    <td className="px-6 py-4 font-semibold text-gray-800">
                                                        {formatDate(h.date)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                                            {h.total}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() =>
                                                                setModalDate(
                                                                    h.date,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                                        >
                                                            <Eye className="h-4 w-4" />{' '}
                                                            Ver detalles
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <GuestSelectionGenerator
                            entrantes={Entrantes}
                            quedantes={Quedantes}
                            salientes={Salientes}
                            targetDate={selectedDate}
                        />
                    )}

                    {/* ===================== MODAL VER DETALLES ===================== */}
                    {modalDate && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                            onClick={() => setModalDate(null)}
                        >
                            <div
                                className="flex h-[80vh] w-[92vw] max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-6 py-4">
                                    <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
                                        <FileText className="h-5 w-5" /> Parte
                                        Diario — {formatDate(modalDate)}
                                    </h2>
                                    <button
                                        onClick={() => setModalDate(null)}
                                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden bg-gray-200/40 p-2">
                                    <iframe
                                        src={`/reports/generate-pdf?date=${modalDate}&auto=1&t=${Date.now()}`}
                                        className="h-full w-full rounded border border-gray-300 bg-white"
                                        title="Parte Diario"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
