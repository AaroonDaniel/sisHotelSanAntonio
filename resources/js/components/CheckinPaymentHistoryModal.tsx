import { Banknote, DollarSign, Receipt, X } from 'lucide-react';

export interface CheckinPaymentDetail {
    id: number;
    payment_date: string | null;
    method: string | null;
    bank_name: string | null;
    amount: number;
    operator_name: string;
}

interface CheckinPaymentHistoryModalProps {
    show: boolean;
    onClose: () => void;
    guestName: string | null;
    roomNumber: string | null;
    payments: CheckinPaymentDetail[];
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

// "QR (YAPE)", "QR (BNB)"... si no hay bank_name, solo "QR".
const formatMethod = (method: string | null, bankName: string | null) => {
    if (!method) return 'N/D';
    const upper = method.toUpperCase();
    if (upper === 'QR' && bankName) {
        return `QR (${bankName.toUpperCase()})`;
    }
    return upper;
};

export default function CheckinPaymentHistoryModal({
    show,
    onClose,
    guestName,
    roomNumber,
    payments,
}: CheckinPaymentHistoryModalProps) {
    if (!show) return null;

    const totalPagado = payments.reduce(
        (acc, p) => acc + (Number(p.amount) || 0),
        0,
    );

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="w-full max-w-2xl animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600">
                            <Receipt className="h-5 w-5" />
                        </div>
                        Historial Financiero de la Estadía
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto p-6">
                    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                Huésped
                            </span>
                            <span className="font-bold text-gray-800">
                                {guestName ?? 'Sin huésped'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                Habitación
                            </span>
                            <span className="font-bold text-gray-800">
                                {roomNumber ?? '—'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                Total Pagado
                            </span>
                            <span className="flex items-center gap-1 text-lg font-black text-emerald-600">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(totalPagado)}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Fecha y Hora</th>
                                    <th className="px-4 py-3">Método</th>
                                    <th className="px-4 py-3 text-right">
                                        Monto
                                    </th>
                                    <th className="px-4 py-3">
                                        Registrado por / Operador
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-8 text-center text-gray-400 italic"
                                        >
                                            No hay pagos registrados en esta
                                            estadía.
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((p) => {
                                        const isNegative = p.amount < 0;
                                        return (
                                            <tr
                                                key={p.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                    {formatDateTime(
                                                        p.payment_date,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                                        <Banknote className="h-3.5 w-3.5" />
                                                        {formatMethod(
                                                            p.method,
                                                            p.bank_name,
                                                        )}
                                                    </span>
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                                                        isNegative
                                                            ? 'text-red-600'
                                                            : 'text-emerald-600'
                                                    }`}
                                                >
                                                    {isNegative ? '- ' : '+ '}
                                                    {formatCurrency(
                                                        Math.abs(p.amount),
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm font-black tracking-wide text-gray-800 uppercase">
                                                        {p.operator_name}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-gray-700"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
