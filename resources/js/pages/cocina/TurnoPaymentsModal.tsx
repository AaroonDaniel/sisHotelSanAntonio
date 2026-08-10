import axios from 'axios';
import { Banknote, CheckCircle2, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OperatorOption {
    id: number;
    full_name: string;
    nickname?: string;
}

interface TurnoPaymentRow {
    id: number;
    amount: string | number;
    method: string;
    bank_name: string | null;
    type: string;
    payment_date: string;
    checkin: {
        guest: { full_name: string } | null;
        room: { number: string } | null;
    } | null;
    operador: OperatorOption | null;
}

interface PaginatedPayments {
    data: TurnoPaymentRow[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    show: boolean;
    onClose: () => void;
    cashRegisterId: number;
    operatorName: string;
    operators: OperatorOption[];
}

const QR_BANKS = ['YAPE', 'BNB', 'FIE', 'ECO'];
const PAYMENT_TYPES = ['PAGO', 'ADELANTO', 'DEVOLUCION'];

interface EditFormState {
    amount: string;
    method: string;
    bank_name: string;
    type: string;
    payment_date: string;
    operator_id: string;
}

const emptyForm = (): EditFormState => ({
    amount: '',
    method: 'EFECTIVO',
    bank_name: '',
    type: 'PAGO',
    payment_date: '',
    operator_id: '',
});

// Mismo patrón que RoomPaymentsModal (etapa 6) -- reutiliza los MISMOS
// endpoints de editar/borrar (son genéricos por Payment, no por
// habitación), así que este modal es solo la vista de lectura por turno +
// el mismo diálogo de edición.
export default function TurnoPaymentsModal({
    show,
    onClose,
    cashRegisterId,
    operatorName,
    operators,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<PaginatedPayments | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [editingPayment, setEditingPayment] =
        useState<TurnoPaymentRow | null>(null);
    const [editForm, setEditForm] = useState<EditFormState>(emptyForm());

    const fetchPayments = (targetPage: number) => {
        setLoading(true);
        setError(null);
        axios
            .get(`/admin/cocina/turnos/${cashRegisterId}/payments`, {
                params: { page: targetPage },
            })
            .then((res) => setData(res.data))
            .catch(() => setError('No se pudo cargar los pagos del turno.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (show) {
            setPage(1);
            fetchPayments(1);
        } else {
            setData(null);
            setEditingPayment(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, cashRegisterId]);

    useEffect(() => {
        if (show) fetchPayments(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    if (!show) return null;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    };

    const startEdit = (payment: TurnoPaymentRow) => {
        setEditingPayment(payment);
        setEditForm({
            amount: String(payment.amount),
            method: payment.method,
            bank_name: payment.bank_name ?? '',
            type: payment.type,
            payment_date: payment.payment_date.slice(0, 16),
            operator_id: payment.operador ? String(payment.operador.id) : '',
        });
    };

    const submitEdit = async () => {
        if (!editingPayment) return;
        setSubmitting(true);
        try {
            await axios.patch(`/admin/cocina/payments/${editingPayment.id}`, {
                amount: editForm.amount,
                method: editForm.method,
                bank_name: editForm.bank_name || null,
                type: editForm.type,
                payment_date: editForm.payment_date,
                operator_id: editForm.operator_id,
            });
            setEditingPayment(null);
            showToast('Pago corregido.');
            fetchPayments(page);
        } catch {
            setError('No se pudo corregir el pago.');
        } finally {
            setSubmitting(false);
        }
    };

    const deletePayment = async (payment: TurnoPaymentRow) => {
        if (!confirm(`¿Eliminar el pago de Bs ${Number(payment.amount).toFixed(2)}?`)) {
            return;
        }
        try {
            await axios.delete(`/admin/cocina/payments/${payment.id}`);
            showToast('Pago eliminado.');
            fetchPayments(page);
        } catch {
            setError('No se pudo eliminar el pago.');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-black text-gray-900">
                        Turno de {operatorName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {toast && (
                    <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {toast}
                    </div>
                )}
                {error && (
                    <div className="mx-6 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading && (
                        <p className="py-8 text-center text-sm text-gray-400">
                            Cargando...
                        </p>
                    )}
                    {!loading && data?.data.length === 0 && (
                        <p className="py-8 text-center text-sm text-gray-400">
                            Este turno no tiene pagos registrados.
                        </p>
                    )}
                    {!loading && data && data.data.length > 0 && (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] font-black tracking-wide text-gray-400 uppercase">
                                    <th className="px-2 py-2">Fecha</th>
                                    <th className="px-2 py-2">
                                        Pernoctante / Hab.
                                    </th>
                                    <th className="px-2 py-2">Tipo</th>
                                    <th className="px-2 py-2">Monto (Bs)</th>
                                    <th className="px-2 py-2 text-right">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.data.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="border-t border-gray-100"
                                    >
                                        <td className="px-2 py-2 text-gray-600">
                                            {new Date(
                                                p.payment_date,
                                            ).toLocaleString('es-BO')}
                                        </td>
                                        <td className="px-2 py-2 text-gray-700">
                                            {p.checkin?.guest?.full_name ??
                                                'N/D'}{' '}
                                            {p.checkin?.room?.number && (
                                                <span className="text-gray-400">
                                                    (Hab.{' '}
                                                    {p.checkin.room.number})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                    p.method === 'EFECTIVO'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                {p.type} · {p.method}
                                                {p.bank_name
                                                    ? ` (${p.bank_name})`
                                                    : ''}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 font-bold text-gray-800">
                                            {Number(p.amount).toFixed(2)}
                                        </td>
                                        <td className="px-2 py-2">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        startEdit(p)
                                                    }
                                                    title="Editar"
                                                    className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        deletePayment(p)
                                                    }
                                                    title="Borrar"
                                                    className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
                    <span className="text-xs font-semibold text-gray-500">
                        {data
                            ? `Página ${data.current_page} de ${data.last_page}`
                            : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={!data || data.current_page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <button
                            disabled={
                                !data || data.current_page >= data.last_page
                            }
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                        <button
                            onClick={onClose}
                            className="ml-2 rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-gray-800"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {editingPayment && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setEditingPayment(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-3 text-base font-black text-gray-900">
                            Editar pago #{editingPayment.id}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                    Monto (Bs)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editForm.amount}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            amount: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                    Fecha
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editForm.payment_date}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            payment_date: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                                />
                            </div>
                            {/* Método de pago: mismos botones (Efectivo +
                                bancos QR) que usa el modal de asignación
                                real (checkinModal.tsx) -- solo estos dos
                                métodos existen de verdad en el hotel. */}
                            <div className="col-span-2">
                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                    Método de Pago
                                </label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditForm({
                                            ...editForm,
                                            method: 'EFECTIVO',
                                            bank_name: '',
                                        })
                                    }
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 transition-all ${
                                        editForm.method === 'EFECTIVO'
                                            ? 'border-green-500 bg-green-50 shadow-sm ring-1 ring-green-500'
                                            : 'border-gray-400 bg-white hover:bg-gray-50'
                                    }`}
                                >
                                    <Banknote
                                        className={`h-4 w-4 ${editForm.method === 'EFECTIVO' ? 'text-green-600' : 'text-gray-500'}`}
                                    />
                                    <span
                                        className={`text-sm font-bold uppercase ${editForm.method === 'EFECTIVO' ? 'text-green-800' : 'text-gray-700'}`}
                                    >
                                        Efectivo
                                    </span>
                                </button>
                            </div>

                            <div className="col-span-2">
                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                    Transferencia QR
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {QR_BANKS.map((banco) => {
                                        const isSelected =
                                            editForm.method === 'QR' &&
                                            editForm.bank_name === banco;
                                        return (
                                            <button
                                                key={banco}
                                                type="button"
                                                onClick={() =>
                                                    setEditForm({
                                                        ...editForm,
                                                        method: 'QR',
                                                        bank_name: banco,
                                                    })
                                                }
                                                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 transition-all ${
                                                    isSelected
                                                        ? 'border-green-500 bg-blue-50 shadow-sm ring-1 ring-green-500'
                                                        : 'border-gray-400 bg-white hover:bg-gray-50'
                                                }`}
                                            >
                                                <img
                                                    src={`/images/bancos/${banco.toLowerCase()}.png`}
                                                    alt={banco}
                                                    className={`h-5 object-contain ${!isSelected && 'opacity-60 grayscale'}`}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                    Tipo
                                </label>
                                <select
                                    value={editForm.type}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            type: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                                >
                                    {PAYMENT_TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                    Pagado a (operador)
                                </label>
                                <select
                                    value={editForm.operator_id}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            operator_id: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                                >
                                    <option value="">Seleccionar...</option>
                                    {operators.map((op) => (
                                        <option key={op.id} value={op.id}>
                                            {op.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setEditingPayment(null)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submitEdit}
                                disabled={submitting}
                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
