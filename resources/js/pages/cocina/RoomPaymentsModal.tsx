import axios from 'axios';
import {
    Banknote,
    CheckCircle2,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface OperatorOption {
    id: number;
    full_name: string;
    nickname?: string;
}

interface PaymentRow {
    id: number;
    amount: string | number;
    method: string;
    bank_name: string | null;
    type: string;
    payment_date: string;
    operador: OperatorOption | null;
}

interface CheckinRow {
    id: number;
    check_in_date: string;
    guest: { id: number; full_name: string } | null;
    payments: PaymentRow[];
}

interface PaginatedCheckins {
    data: CheckinRow[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    show: boolean;
    onClose: () => void;
    roomId: number;
    roomNumber: string;
    roomStatusLabel: string;
    operators: OperatorOption[];
}

const QR_BANKS = ['YAPE', 'BNB', 'FIE', 'ECO'];
const PAYMENT_TYPES = ['PAGO', 'ADELANTO', 'DEVOLUCION'];

// Formulario compartido por "Agregar" y "Editar" -- mismos campos.
interface PaymentFormState {
    amount: string;
    method: string;
    bank_name: string;
    type: string;
    payment_date: string;
    operator_id: string;
}

const emptyForm = (): PaymentFormState => ({
    amount: '',
    method: 'EFECTIVO',
    bank_name: '',
    type: 'PAGO',
    payment_date: new Date().toISOString().slice(0, 16),
    operator_id: '',
});

export default function RoomPaymentsModal({
    show,
    onClose,
    roomId,
    roomNumber,
    roomStatusLabel,
    operators,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [data, setData] = useState<PaginatedCheckins | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // Formulario de "Agregar pago" -- addingToCheckinId marca a qué
    // estadía pertenece el pago nuevo (null = formulario cerrado).
    const [addingToCheckinId, setAddingToCheckinId] = useState<number | null>(
        null,
    );
    const [addForm, setAddForm] = useState<PaymentFormState>(emptyForm());

    // Edición de un pago existente.
    const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(
        null,
    );
    const [editForm, setEditForm] = useState<PaymentFormState>(emptyForm());

    const [submitting, setSubmitting] = useState(false);

    const fetchPayments = (targetPage: number) => {
        setLoading(true);
        setError(null);
        axios
            .get(`/admin/cocina/rooms/${roomId}/payments`, {
                params: { page: targetPage },
            })
            .then((res) => setData(res.data))
            .catch(() =>
                setError('No se pudo cargar el historial de pagos.'),
            )
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (show) {
            setPage(1);
            fetchPayments(1);
        } else {
            // Limpieza al cerrar, para no arrastrar formularios abiertos
            // la próxima vez que se abra el modal.
            setData(null);
            setAddingToCheckinId(null);
            setEditingPayment(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, roomId]);

    useEffect(() => {
        if (show) fetchPayments(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    if (!show) return null;

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    };

    const startAdd = (checkinId: number) => {
        setAddingToCheckinId(checkinId);
        setAddForm(emptyForm());
    };

    const submitAdd = async () => {
        if (addingToCheckinId === null) return;
        if (!addForm.amount || !addForm.operator_id) {
            setError('Monto y operador son obligatorios.');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(
                `/admin/cocina/checkins/${addingToCheckinId}/payments`,
                {
                    amount: addForm.amount,
                    method: addForm.method,
                    bank_name: addForm.bank_name || null,
                    type: addForm.type,
                    payment_date: addForm.payment_date,
                    operator_id: addForm.operator_id,
                },
            );
            setAddingToCheckinId(null);
            showToast('Pago agregado.');
            fetchPayments(page);
        } catch {
            setError('No se pudo agregar el pago.');
        } finally {
            setSubmitting(false);
        }
    };

    const startEdit = (payment: PaymentRow) => {
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
            await axios.patch(
                `/admin/cocina/payments/${editingPayment.id}`,
                {
                    amount: editForm.amount,
                    method: editForm.method,
                    bank_name: editForm.bank_name || null,
                    type: editForm.type,
                    payment_date: editForm.payment_date,
                    operator_id: editForm.operator_id,
                },
            );
            setEditingPayment(null);
            showToast('Pago corregido.');
            fetchPayments(page);
        } catch {
            setError('No se pudo corregir el pago.');
        } finally {
            setSubmitting(false);
        }
    };

    const deletePayment = async (payment: PaymentRow) => {
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
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-black text-gray-900">
                            Habitación {roomNumber}
                        </h2>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black tracking-wide text-gray-600 uppercase">
                            {roomStatusLabel}
                        </span>
                    </div>
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

                {/* Cuerpo */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading && (
                        <p className="py-8 text-center text-sm text-gray-400">
                            Cargando...
                        </p>
                    )}

                    {!loading && data?.data.length === 0 && (
                        <p className="py-8 text-center text-sm text-gray-400">
                            Esta habitación no tiene estadías registradas.
                        </p>
                    )}

                    {!loading &&
                        data?.data.map((checkin) => (
                            <div
                                key={checkin.id}
                                className="mb-4 overflow-hidden rounded-xl border border-gray-200"
                            >
                                <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
                                    <div>
                                        <span className="text-sm font-bold text-gray-800">
                                            {checkin.guest?.full_name ??
                                                'N/D'}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-400">
                                            Ingreso:{' '}
                                            {new Date(
                                                checkin.check_in_date,
                                            ).toLocaleDateString('es-BO')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => startAdd(checkin.id)}
                                        className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Agregar pago
                                    </button>
                                </div>

                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-t border-gray-100 text-[10px] font-black tracking-wide text-gray-400 uppercase">
                                            <th className="px-4 py-2">
                                                Fecha
                                            </th>
                                            <th className="px-4 py-2">
                                                Tipo de pago
                                            </th>
                                            <th className="px-4 py-2">
                                                Monto (Bs)
                                            </th>
                                            <th className="px-4 py-2">
                                                Pagado a
                                            </th>
                                            <th className="px-4 py-2 text-right">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {checkin.payments.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-4 py-3 text-center text-gray-300"
                                                >
                                                    —
                                                </td>
                                            </tr>
                                        )}
                                        {checkin.payments.map((p) => (
                                            <tr
                                                key={p.id}
                                                className="border-t border-gray-100"
                                            >
                                                <td className="px-4 py-2 text-gray-600">
                                                    {new Date(
                                                        p.payment_date,
                                                    ).toLocaleString('es-BO')}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                            p.method ===
                                                            'EFECTIVO'
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
                                                <td className="px-4 py-2 font-bold text-gray-800">
                                                    {Number(p.amount).toFixed(
                                                        2,
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-gray-600">
                                                    {p.operador?.full_name ??
                                                        'N/D'}
                                                </td>
                                                <td className="px-4 py-2">
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

                                {/* Formulario "Agregar pago" para ESTA estadía */}
                                {addingToCheckinId === checkin.id && (
                                    <div className="border-t border-gray-100 bg-blue-50/40 p-4">
                                        <PaymentFieldset
                                            form={addForm}
                                            setForm={setAddForm}
                                            operators={operators}
                                        />
                                        <div className="mt-3 flex justify-end gap-2">
                                            <button
                                                onClick={() =>
                                                    setAddingToCheckinId(null)
                                                }
                                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={submitAdd}
                                                disabled={submitting}
                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                                            >
                                                Guardar pago
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>

                {/* Footer: paginación */}
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
                        <PaymentFieldset
                            form={editForm}
                            setForm={setEditForm}
                            operators={operators}
                        />
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

// Campos compartidos por "Agregar" y "Editar".
function PaymentFieldset({
    form,
    setForm,
    operators,
}: {
    form: PaymentFormState;
    setForm: (f: PaymentFormState) => void;
    operators: OperatorOption[];
}) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                    Monto (Bs)
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
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
                    value={form.payment_date}
                    onChange={(e) =>
                        setForm({ ...form, payment_date: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                />
            </div>
            {/* Método de pago: mismos botones (Efectivo + bancos QR) que
                usa el modal de asignación real (checkinModal.tsx) -- solo
                estos dos métodos existen de verdad en el hotel. */}
            <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                    Método de Pago
                </label>
                <button
                    type="button"
                    onClick={() =>
                        setForm({ ...form, method: 'EFECTIVO', bank_name: '' })
                    }
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 transition-all ${
                        form.method === 'EFECTIVO'
                            ? 'border-green-500 bg-green-50 shadow-sm ring-1 ring-green-500'
                            : 'border-gray-400 bg-white hover:bg-gray-50'
                    }`}
                >
                    <Banknote
                        className={`h-4 w-4 ${form.method === 'EFECTIVO' ? 'text-green-600' : 'text-gray-500'}`}
                    />
                    <span
                        className={`text-sm font-bold uppercase ${form.method === 'EFECTIVO' ? 'text-green-800' : 'text-gray-700'}`}
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
                            form.method === 'QR' && form.bank_name === banco;
                        return (
                            <button
                                key={banco}
                                type="button"
                                onClick={() =>
                                    setForm({
                                        ...form,
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
                    value={form.type}
                    onChange={(e) =>
                        setForm({ ...form, type: e.target.value })
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
                    value={form.operator_id}
                    onChange={(e) =>
                        setForm({ ...form, operator_id: e.target.value })
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
    );
}
