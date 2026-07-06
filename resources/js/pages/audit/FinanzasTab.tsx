import { router } from '@inertiajs/react';
import { Save, X } from 'lucide-react';
import { useState } from 'react';

export interface PaymentAudit {
    id: number;
    checkin_id: number | null;
    guest_name: string;
    room_number: string;
    amount: number;
    method: string;
    type: string;
    cash_register_id: number | null;
    operator_id: number | null;
    operator_name: string | null;
    payment_date: string | null;
}

export interface ExpenseAudit {
    id: number;
    description: string;
    amount: number;
    cash_register_id: number | null;
    operator_id: number | null;
    operator_name: string | null;
    user_name: string;
    created_at: string | null;
}

interface OperatorOption {
    id: number;
    full_name: string;
    nickname: string;
}

interface CashRegisterOption {
    id: number;
    label: string;
}

interface Props {
    payments: PaymentAudit[];
    expenses: ExpenseAudit[];
    operators: OperatorOption[];
    cashRegisters: CashRegisterOption[];
}

const PAYMENT_METHODS = ['EFECTIVO', 'QR', 'TARJETA', 'TRANSFERENCIA'];
const PAYMENT_TYPES = ['PAGO', 'ADELANTO', 'DEVOLUCION'];

// La app entera trabaja en hora de La Paz (config/app.php: America/La_Paz).
const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date
        .toLocaleString('sv-SE', { timeZone: 'America/La_Paz' })
        .replace(' ', 'T')
        .slice(0, 16);
};

export default function FinanzasTab({
    payments,
    expenses,
    operators,
    cashRegisters,
}: Props) {
    return (
        <div className="space-y-6">
            <PaymentsTable
                payments={payments}
                operators={operators}
                cashRegisters={cashRegisters}
            />
            <ExpensesTable
                expenses={expenses}
                operators={operators}
                cashRegisters={cashRegisters}
            />
        </div>
    );
}

interface PaymentEditForm {
    amount: string;
    method: string;
    type: string;
    cash_register_id: string;
    operator_id: string;
    payment_date: string;
}

function PaymentsTable({
    payments,
    operators,
    cashRegisters,
}: {
    payments: PaymentAudit[];
    operators: OperatorOption[];
    cashRegisters: CashRegisterOption[];
}) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<PaymentEditForm>({
        amount: '',
        method: 'EFECTIVO',
        type: 'PAGO',
        cash_register_id: '',
        operator_id: '',
        payment_date: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const startEdit = (p: PaymentAudit) => {
        setEditingId(p.id);
        setEditForm({
            amount: String(p.amount ?? 0),
            method: p.method,
            type: p.type,
            cash_register_id: p.cash_register_id
                ? String(p.cash_register_id)
                : '',
            operator_id: p.operator_id ? String(p.operator_id) : '',
            payment_date: formatDateForInput(p.payment_date),
        });
    };

    const cancelEdit = () => setEditingId(null);

    const saveEdit = (id: number) => {
        setIsSaving(true);
        router.put(
            `/admin/god-mode/payments/${id}`,
            {
                amount: editForm.amount,
                method: editForm.method,
                type: editForm.type,
                cash_register_id: editForm.cash_register_id || null,
                operator_id: editForm.operator_id || null,
                payment_date: editForm.payment_date || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingId(null),
                onFinish: () => setIsSaving(false),
            },
        );
    };

    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
            <div className="border-b border-gray-800 px-5 py-4">
                <h2 className="text-sm font-bold text-gray-200">
                    Todos los Pagos
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                    Corrige monto, método, tipo, caja, operador y fecha de
                    cualquier pago o devolución, esté o no ligado a un
                    check-in.
                </p>
            </div>

            <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-800/90 text-xs tracking-wider text-gray-400 uppercase backdrop-blur">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Estadía</th>
                            <th className="px-4 py-3">Monto</th>
                            <th className="px-4 py-3">Método</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Caja</th>
                            <th className="px-4 py-3">Operador</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {payments.length === 0 && (
                            <tr>
                                <td
                                    colSpan={9}
                                    className="px-4 py-8 text-center text-gray-500"
                                >
                                    No hay pagos registrados.
                                </td>
                            </tr>
                        )}

                        {payments.map((p) => {
                            const isEditing = editingId === p.id;

                            if (!isEditing) {
                                const cashLabel = p.cash_register_id
                                    ? (cashRegisters.find(
                                          (cr) => cr.id === p.cash_register_id,
                                      )?.label ?? `#${p.cash_register_id}`)
                                    : '—';

                                return (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-gray-800/40"
                                    >
                                        <td className="px-4 py-3 font-mono text-gray-400">
                                            #{p.id}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            {p.checkin_id
                                                ? `Hab. ${p.room_number} · ${p.guest_name}`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            Bs {p.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {p.method}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                                    p.type === 'DEVOLUCION'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-emerald-500/20 text-emerald-400'
                                                }`}
                                            >
                                                {p.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {cashLabel}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {p.operator_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {p.payment_date
                                                ? new Date(
                                                      p.payment_date,
                                                  ).toLocaleString('es-BO')
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => startEdit(p)}
                                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-700"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={p.id} className="bg-gray-800/60">
                                    <td className="px-4 py-3 font-mono text-gray-400">
                                        #{p.id}
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">
                                        {p.checkin_id
                                            ? `Hab. ${p.room_number} · ${p.guest_name}`
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editForm.amount}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    amount: e.target.value,
                                                }))
                                            }
                                            className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={editForm.method}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    method: e.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        >
                                            {PAYMENT_METHODS.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={editForm.type}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    type: e.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        >
                                            {PAYMENT_TYPES.map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={editForm.cash_register_id}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    cash_register_id:
                                                        e.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        >
                                            <option value="">
                                                (Sin caja)
                                            </option>
                                            {cashRegisters.map((cr) => (
                                                <option
                                                    key={cr.id}
                                                    value={String(cr.id)}
                                                >
                                                    {cr.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={editForm.operator_id}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    operator_id:
                                                        e.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        >
                                            <option value="">
                                                (Sin operador)
                                            </option>
                                            {operators.map((op) => (
                                                <option
                                                    key={op.id}
                                                    value={String(op.id)}
                                                >
                                                    {op.full_name ||
                                                        op.nickname}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="datetime-local"
                                            value={editForm.payment_date}
                                            onChange={(e) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    payment_date:
                                                        e.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                disabled={isSaving}
                                                onClick={() => saveEdit(p.id)}
                                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                                Guardar
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-gray-700"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Cancelar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

interface ExpenseEditForm {
    description: string;
    amount: string;
    cash_register_id: string;
    operator_id: string;
    created_at: string;
}

function ExpensesTable({
    expenses,
    operators,
    cashRegisters,
}: {
    expenses: ExpenseAudit[];
    operators: OperatorOption[];
    cashRegisters: CashRegisterOption[];
}) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<ExpenseEditForm>({
        description: '',
        amount: '',
        cash_register_id: '',
        operator_id: '',
        created_at: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const startEdit = (e: ExpenseAudit) => {
        setEditingId(e.id);
        setEditForm({
            description: e.description,
            amount: String(e.amount ?? 0),
            cash_register_id: e.cash_register_id
                ? String(e.cash_register_id)
                : '',
            operator_id: e.operator_id ? String(e.operator_id) : '',
            created_at: formatDateForInput(e.created_at),
        });
    };

    const cancelEdit = () => setEditingId(null);

    const saveEdit = (id: number) => {
        setIsSaving(true);
        router.put(
            `/admin/god-mode/expenses/${id}`,
            {
                description: editForm.description,
                amount: editForm.amount,
                cash_register_id: editForm.cash_register_id || null,
                operator_id: editForm.operator_id || null,
                created_at: editForm.created_at || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingId(null),
                onFinish: () => setIsSaving(false),
            },
        );
    };

    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
            <div className="border-b border-gray-800 px-5 py-4">
                <h2 className="text-sm font-bold text-gray-200">
                    Todos los Gastos
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                    Corrige descripción, monto, caja, operador y fecha de
                    cualquier gasto registrado.
                </p>
            </div>

            <div className="max-h-[40vh] overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-800/90 text-xs tracking-wider text-gray-400 uppercase backdrop-blur">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Descripción</th>
                            <th className="px-4 py-3">Monto</th>
                            <th className="px-4 py-3">Caja</th>
                            <th className="px-4 py-3">Operador</th>
                            <th className="px-4 py-3">Registrado por</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {expenses.length === 0 && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-4 py-8 text-center text-gray-500"
                                >
                                    No hay gastos registrados.
                                </td>
                            </tr>
                        )}

                        {expenses.map((e) => {
                            const isEditing = editingId === e.id;

                            if (!isEditing) {
                                const cashLabel = e.cash_register_id
                                    ? (cashRegisters.find(
                                          (cr) => cr.id === e.cash_register_id,
                                      )?.label ?? `#${e.cash_register_id}`)
                                    : '—';

                                return (
                                    <tr
                                        key={e.id}
                                        className="hover:bg-gray-800/40"
                                    >
                                        <td className="px-4 py-3 font-mono text-gray-400">
                                            #{e.id}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            {e.description}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">
                                            Bs {e.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {cashLabel}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {e.operator_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {e.user_name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {e.created_at
                                                ? new Date(
                                                      e.created_at,
                                                  ).toLocaleString('es-BO')
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => startEdit(e)}
                                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-700"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={e.id} className="bg-gray-800/60">
                                    <td className="px-4 py-3 font-mono text-gray-400">
                                        #{e.id}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="text"
                                            value={editForm.description}
                                            onChange={(ev) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    description:
                                                        ev.target.value,
                                                }))
                                            }
                                            className="w-full min-w-[10rem] rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editForm.amount}
                                            onChange={(ev) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    amount: ev.target.value,
                                                }))
                                            }
                                            className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={editForm.cash_register_id}
                                            onChange={(ev) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    cash_register_id:
                                                        ev.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        >
                                            <option value="">
                                                (Selecciona una caja)
                                            </option>
                                            {cashRegisters.map((cr) => (
                                                <option
                                                    key={cr.id}
                                                    value={String(cr.id)}
                                                >
                                                    {cr.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={editForm.operator_id}
                                            onChange={(ev) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    operator_id:
                                                        ev.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        >
                                            <option value="">
                                                (Sin operador)
                                            </option>
                                            {operators.map((op) => (
                                                <option
                                                    key={op.id}
                                                    value={String(op.id)}
                                                >
                                                    {op.full_name ||
                                                        op.nickname}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {e.user_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="datetime-local"
                                            value={editForm.created_at}
                                            onChange={(ev) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    created_at:
                                                        ev.target.value,
                                                }))
                                            }
                                            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                disabled={isSaving}
                                                onClick={() => saveEdit(e.id)}
                                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                                Guardar
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-gray-700"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Cancelar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
