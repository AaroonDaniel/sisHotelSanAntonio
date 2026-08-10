import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Vault, Wallet } from 'lucide-react';
import { useState } from 'react';
import TurnoPaymentsModal from './TurnoPaymentsModal';

interface OperatorOption {
    id: number;
    full_name: string;
    nickname?: string;
}

interface TurnoRow {
    id: number;
    operator: string;
    status: string;
    opened_at: string;
    closed_at: string | null;
    payments_count: number;
    totals_by_method: Record<string, string>;
    total: number;
}

interface Props {
    auth: { user: User };
    Turnos: {
        data: TurnoRow[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: { desde?: string; hasta?: string };
    // Lo necesita TurnoPaymentsModal para el selector "Pagado a" al
    // editar un pago (mismo endpoint de la etapa 6).
    Operators: OperatorOption[];
}

export default function CocinaTurnos({
    auth,
    Turnos,
    filters,
    Operators,
}: Props) {
    const [desde, setDesde] = useState(filters.desde ?? '');
    const [hasta, setHasta] = useState(filters.hasta ?? '');
    const [selectedTurno, setSelectedTurno] = useState<TurnoRow | null>(null);

    const applyFilters = () => {
        router.get(
            '/admin/cocina/turnos',
            { desde: desde || undefined, hasta: hasta || undefined },
            { preserveState: true },
        );
    };

    const goToPage = (page: number) => {
        router.get(
            '/admin/cocina/turnos',
            { ...filters, page },
            { preserveState: true },
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cocina — Turnos" />

            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-orange-100 bg-orange-100 p-2">
                            <Vault className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white">
                                Turnos
                            </h1>
                            <p className="text-sm text-gray-400">
                                Arqueo por operador — click en un turno para
                                ver/corregir sus pagos.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/admin/cocina"
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                        ← Volver al tablero
                    </Link>
                </div>

                {/* Filtro por rango de fechas */}
                <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                            Desde
                        </label>
                        <input
                            type="date"
                            value={desde}
                            onChange={(e) => setDesde(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                            Hasta
                        </label>
                        <input
                            type="date"
                            value={hasta}
                            onChange={(e) => setHasta(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        />
                    </div>
                    <button
                        onClick={applyFilters}
                        className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-gray-800"
                    >
                        Filtrar
                    </button>
                </div>

                {/* Lista de turnos */}
                <div className="flex flex-col gap-3">
                    {Turnos.data.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setSelectedTurno(t)}
                            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-blue-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">
                                        {t.operator}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                            t.status === 'ABIERTA'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {t.status}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    {new Date(t.opened_at).toLocaleString(
                                        'es-BO',
                                    )}
                                    {t.closed_at &&
                                        ` — ${new Date(t.closed_at).toLocaleString('es-BO')}`}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {Object.entries(t.totals_by_method).map(
                                    ([method, amount]) => (
                                        <span
                                            key={method}
                                            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600"
                                        >
                                            {method}: Bs{' '}
                                            {Number(amount).toFixed(2)}
                                        </span>
                                    ),
                                )}
                                <span className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                                    <Wallet className="h-3 w-3" />
                                    Total: Bs {t.total.toFixed(2)}
                                </span>
                            </div>
                        </button>
                    ))}

                    {Turnos.data.length === 0 && (
                        <p className="py-12 text-center text-sm text-gray-400">
                            No hay turnos en el rango seleccionado.
                        </p>
                    )}
                </div>

                {/* Paginación */}
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        disabled={Turnos.current_page <= 1}
                        onClick={() => goToPage(Turnos.current_page - 1)}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Anterior
                    </button>
                    <span className="text-xs font-semibold text-gray-400">
                        Página {Turnos.current_page} de {Turnos.last_page}
                    </span>
                    <button
                        disabled={Turnos.current_page >= Turnos.last_page}
                        onClick={() => goToPage(Turnos.current_page + 1)}
                        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Siguiente
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {selectedTurno && (
                <TurnoPaymentsModal
                    show
                    onClose={() => setSelectedTurno(null)}
                    cashRegisterId={selectedTurno.id}
                    operatorName={selectedTurno.operator}
                    operators={Operators}
                />
            )}
        </AuthenticatedLayout>
    );
}
