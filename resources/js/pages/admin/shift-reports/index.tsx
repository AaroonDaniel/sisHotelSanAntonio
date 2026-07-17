import ShiftPreviewModal from '@/components/ShiftPreviewModal';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Eye, Vault } from 'lucide-react';
import { useState } from 'react';

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

interface Props {
    auth: { user: User };
    Shifts: ShiftRow[];
}

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

export default function ShiftReportsIndex({ auth, Shifts }: Props) {
    const [previewRegisterId, setPreviewRegisterId] = useState<number | null>(null);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Aperturas y Cierres" />

            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Botón de Volver */}
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                {/* Encabezado */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                        <Vault className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Aperturas y Cierres
                        </h1>
                        <p className="text-sm text-gray-400">
                            Reporte histórico de turnos de caja
                        </p>
                    </div>
                </div>

                {/* TABLA ÚNICA: REPORTE POR TURNO */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Turno</th>
                                    <th className="px-4 py-3">Operador</th>
                                    <th className="px-4 py-3">Fecha/Hora Inicio</th>
                                    <th className="px-4 py-3">Fecha/Hora Cierre</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3 text-right">Saldo Final</th>
                                    <th className="px-4 py-3 text-right">Dejó en Caja</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {Shifts.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-10 text-center text-gray-400 italic"
                                        >
                                            Todavía no hay turnos registrados.
                                        </td>
                                    </tr>
                                )}
                                {Shifts.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50">
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
                                                ? formatCurrency(s.final_balance)
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-600">
                                            {s.left_amount !== null
                                                ? formatCurrency(s.left_amount)
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewRegisterId(s.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
                                                title="Ver resumen visual de la caja"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Reutilizable de Resumen de Caja */}
            <ShiftPreviewModal
                cashRegisterId={previewRegisterId}
                onClose={() => setPreviewRegisterId(null)}
            />
        </AuthenticatedLayout>
    );
}