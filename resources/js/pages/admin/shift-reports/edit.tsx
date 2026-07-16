import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Eye,
    MinusCircle,
    PlusCircle,
    ShieldAlert,
} from 'lucide-react';
import { FormEventHandler, ReactNode, useState } from 'react';

interface PaymentRow {
    id: number;
    amount: number;
    method: string | null;
    bank_name: string | null;
    type: string;
    payment_date: string | null;
    room_number: string;
    guest_name: string;
    operator_name: string;
}

interface ServiceRow {
    service_name: string;
    quantity: number;
    selling_price: number;
    total: number;
    consumed_at: string;
    room_number: string;
}

interface ExpenseRow {
    id: number;
    description: string;
    amount: number;
    created_at: string | null;
    operator_name: string;
}

interface ByMethodRow {
    method: string;
    total: number;
    count: number;
    refunds: number;
    collections: number;
}

interface CashRegisterData {
    id: number;
    user_id: number;
    opening_amount: string | number;
    status: string;
    opened_at: string | null;
    closed_at: string | null;
    user?: { id: number; full_name: string; nickname: string };
}

interface Props {
    auth: { user: User };
    CashRegister: CashRegisterData;
    Payments: PaymentRow[];
    Services: ServiceRow[];
    Expenses: ExpenseRow[];
    TotalIncome: number;
    TotalExpenses: number;
    ByMethod: ByMethodRow[];
    ExpectedCash: number;
    LeftAmount: number | null;
}

type AdjustmentType = 'expense' | 'income';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);

const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    if (!/^\d{2}\/\d{2}\/\d{4}/.test(value)) {
        return new Date(value).toLocaleString('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }
    return value;
};

export default function ShiftReportEdit({
    auth,
    CashRegister,
    Payments,
    Services,
    Expenses,
    TotalIncome,
    TotalExpenses,
    ByMethod,
    ExpectedCash,
    LeftAmount,
}: Props) {
    const isClosed = CashRegister.status === 'CERRADA';
    const operatorName =
        CashRegister.user?.full_name ??
        CashRegister.user?.nickname ??
        `Usuario #${CashRegister.user_id}`;

    const [adjustmentType, setAdjustmentType] =
        useState<AdjustmentType>('expense');

    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'expense' as AdjustmentType,
        amount: '',
        description: '',
        method: 'EFECTIVO',
    });

    const handleTypeChange = (type: AdjustmentType) => {
        setAdjustmentType(type);
        setData('type', type);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // 🔒 Candado de los 50 centavos: solo montos enteros o con 0.50
        // exacto. Se compara en centavos (enteros) para no toparse con el
        // clásico error de punto flotante de "4.50 % 0.5 !== 0" en JS.
        const montoIngresado = Number(data.amount);
        const centavos = Math.round(montoIngresado * 100);
        if (centavos % 50 !== 0) {
            alert(
                'Solo se permiten montos enteros (ej. 60) o con 50 centavos (ej. 4.50). No se permiten otros decimales.',
            );
            return;
        }

        post(`/admin/shift-reports/${CashRegister.id}/adjustments`, {
            preserveScroll: true,
            onSuccess: () => reset('amount', 'description'),
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Editar Caja #${CashRegister.id}`} />

            <div className="mx-auto w-full max-w-5xl px-4 py-8">
                {/* ===== BARRA SUPERIOR ===== */}
                <div className="mb-6 flex items-center justify-between">
                    <Link
                        href="/admin/shift-reports"
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al Panel
                    </Link>
                    <Link
                        href={`/cash-registers/${CashRegister.id}`}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
                    >
                        <Eye className="h-4 w-4" />
                        Ver Recibo
                    </Link>
                </div>

                {/* ===== TARJETA PRINCIPAL ===== */}
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    {/* ===== CABECERA + ESTADO ===== */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-wider text-gray-900 uppercase">
                                <ShieldAlert className="h-6 w-6 text-amber-600" />
                                Corrección Administrativa
                            </h1>
                            <p className="mt-1 text-sm font-semibold tracking-wide text-gray-400 uppercase">
                                Turno #{CashRegister.id}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm ${
                                isClosed
                                    ? 'border border-gray-200 bg-gray-100 text-gray-600'
                                    : 'border border-emerald-200 bg-emerald-100 text-emerald-700'
                            }`}
                        >
                            {isClosed ? 'Cerrado' : 'Abierto'}
                        </span>
                    </div>

                    <div className="mt-6 border-b border-dashed border-gray-200" />

                    {/* ===== GRID DE INFORMACIÓN GENERAL =====
                        Texto en gris (no negro): son datos históricos de
                        solo lectura, no editables desde este formulario. */}
                    <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Operador
                            </p>
                            <p className="mt-1 font-bold text-gray-500 uppercase">
                                {operatorName}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Hora de Inicio
                            </p>
                            <p className="mt-1 font-bold text-gray-500">
                                {formatDateTime(CashRegister.opened_at)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Hora de Fin
                            </p>
                            <p className="mt-1 font-bold text-gray-500">
                                {isClosed
                                    ? formatDateTime(CashRegister.closed_at)
                                    : 'Turno en curso'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Saldo Inicial
                            </p>
                            <p className="mt-1 font-bold text-gray-500">
                                {formatCurrency(
                                    Number(CashRegister.opening_amount),
                                )}
                            </p>
                        </div>
                    </div>

                    {/* ===== TARJETAS DE RESUMEN FINANCIERO ===== */}
                    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
                            <p className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
                                Total Cobrado/Adelantos
                            </p>
                            <p className="mt-2 text-3xl font-black text-emerald-500">
                                {formatCurrency(TotalIncome)}
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/50 p-6 shadow-sm">
                            <p className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">
                                Total Gastos
                            </p>
                            <p className="mt-2 text-3xl font-black text-red-500">
                                {formatCurrency(TotalExpenses)}
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900 p-6 shadow-lg">
                            <p className="text-[11px] font-bold tracking-widest text-slate-300 uppercase">
                                Efectivo Esperado en Caja
                            </p>
                            <p className="mt-2 text-3xl font-black text-white">
                                {formatCurrency(ExpectedCash)}
                            </p>
                        </div>
                    </div>

                    {isClosed && LeftAmount !== null && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                            <p className="text-xs font-bold tracking-wide text-amber-700 uppercase">
                                {LeftAmount > 0
                                    ? 'Monto dejado en caja para el siguiente turno'
                                    : 'El operador no dejó monto en caja'}
                            </p>
                            {LeftAmount > 0 && (
                                <p className="mt-1 text-xl font-black text-amber-800">
                                    {formatCurrency(LeftAmount)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ===== FORMULARIO: AGREGAR AJUSTE ===== */}
                    <Section title="Agregar Gasto o Ingreso Faltante">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                            <p className="mb-4 text-xs leading-relaxed text-amber-800">
                                Usa esto solo para registrar movimientos que
                                el recepcionista olvidó cargar durante el
                                turno. Al guardar, los totales de esta caja
                                (incluido el cierre ya congelado, si
                                corresponde) se recalculan automáticamente.
                            </p>

                            <div className="mb-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('expense')}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                                        adjustmentType === 'expense'
                                            ? 'border-red-300 bg-red-100 text-red-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <MinusCircle className="h-4 w-4" />
                                    Gasto Adicional
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('income')}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                                        adjustmentType === 'income'
                                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    Ingreso Adicional
                                </button>
                            </div>

                            <form
                                onSubmit={submit}
                                className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_auto]"
                            >
                                {adjustmentType === 'expense' ? (
                                    <div>
                                        <label className="mb-1 block text-xs font-bold tracking-wide text-gray-600 uppercase">
                                            Descripción del gasto
                                        </label>
                                        <input
                                            type="text"
                                            value={data.description}
                                            onChange={(e) =>
                                                setData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Ej. Compra de insumos de limpieza"
                                            className="w-full rounded-lg border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-xs font-semibold text-red-600">
                                                {errors.description}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="mb-1 block text-xs font-bold tracking-wide text-gray-600 uppercase">
                                            Método de pago
                                        </label>
                                        <select
                                            value={data.method}
                                            onChange={(e) =>
                                                setData(
                                                    'method',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-lg border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500"
                                        >
                                            <option value="EFECTIVO">
                                                Efectivo
                                            </option>
                                            <option value="QR">QR</option>
                                            <option value="TARJETA">
                                                Tarjeta
                                            </option>
                                            <option value="TRANSFERENCIA">
                                                Transferencia
                                            </option>
                                        </select>
                                        {errors.method && (
                                            <p className="mt-1 text-xs font-semibold text-red-600">
                                                {errors.method}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-xs font-bold tracking-wide text-gray-600 uppercase">
                                        Monto (Bs)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.50"
                                        min="0.01"
                                        value={data.amount}
                                        onChange={(e) =>
                                            setData('amount', e.target.value)
                                        }
                                        placeholder="0.00"
                                        className="w-full rounded-lg border-gray-300 px-3 py-2 text-sm font-bold focus:border-amber-500 focus:ring-amber-500"
                                    />
                                    {errors.amount && (
                                        <p className="mt-1 text-xs font-semibold text-red-600">
                                            {errors.amount}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className={`w-full rounded-lg px-5 py-2 text-sm font-bold text-white shadow-md transition disabled:opacity-50 ${
                                            adjustmentType === 'expense'
                                                ? 'bg-red-600 hover:bg-red-500'
                                                : 'bg-emerald-600 hover:bg-emerald-500'
                                        }`}
                                    >
                                        {processing
                                            ? 'Guardando...'
                                            : 'Agregar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Section>

                    {/* ===== TABLAS DE DESGLOSE (solo lectura) ===== */}
                    <Section title="Desglose por Método de Pago">
                        <Table
                            head={[
                                'Método',
                                'N° Mov.',
                                'Cobros',
                                'Devoluciones',
                                'Total',
                            ]}
                        >
                            {ByMethod.length === 0 ? (
                                <EmptyRow colSpan={5} />
                            ) : (
                                ByMethod.map((m) => (
                                    <tr
                                        key={m.method}
                                        className="transition-colors hover:bg-gray-50/50"
                                    >
                                        <td className="px-4 py-3 text-[11px] font-bold text-gray-800 uppercase">
                                            {m.method}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-gray-600">
                                            {m.count}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                                            {formatCurrency(m.collections)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-red-500">
                                            {m.refunds !== 0
                                                ? formatCurrency(m.refunds)
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {formatCurrency(m.total)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </Table>
                    </Section>

                    <Section title="Cobros y Adelantos del Turno">
                        <Table
                            head={[
                                'Fecha',
                                'Hab.',
                                'Huésped',
                                'Método',
                                'Operador',
                                'Monto',
                            ]}
                        >
                            {Payments.length === 0 ? (
                                <EmptyRow colSpan={6} />
                            ) : (
                                Payments.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="transition-colors hover:bg-gray-50/50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-500">
                                            {p.payment_date ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-900">
                                            {p.room_number}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-700">
                                            {p.guest_name}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">
                                            {p.method}
                                            {p.bank_name
                                                ? ` (${p.bank_name})`
                                                : ''}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase">
                                            {p.operator_name}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-bold ${
                                                p.amount < 0
                                                    ? 'text-red-500'
                                                    : 'text-gray-900'
                                            }`}
                                        >
                                            {formatCurrency(p.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </Table>
                    </Section>

                    <Section title="Consumos y Servicios">
                        <Table
                            head={[
                                'Fecha',
                                'Hab.',
                                'Servicio',
                                'Cant.',
                                'P. Unitario',
                                'Total',
                            ]}
                        >
                            {Services.length === 0 ? (
                                <EmptyRow colSpan={6} />
                            ) : (
                                Services.map((s, idx) => (
                                    <tr
                                        key={idx}
                                        className="transition-colors hover:bg-gray-50/50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-500">
                                            {s.consumed_at}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-900">
                                            {s.room_number}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] font-medium text-gray-700 uppercase">
                                            {s.service_name}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-gray-600">
                                            {s.quantity}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-500">
                                            {formatCurrency(s.selling_price)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {formatCurrency(s.total)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </Table>
                    </Section>

                    <Section title="Gastos del Turno">
                        <Table
                            head={[
                                'Fecha',
                                'Descripción',
                                'Operador',
                                'Monto',
                            ]}
                        >
                            {Expenses.length === 0 ? (
                                <EmptyRow colSpan={4} />
                            ) : (
                                Expenses.map((e) => (
                                    <tr
                                        key={e.id}
                                        className="transition-colors hover:bg-gray-50/50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-500">
                                            {e.created_at ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] font-medium text-gray-700 uppercase">
                                            {e.description}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase">
                                            {e.operator_name}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-red-500">
                                            {formatCurrency(e.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </Table>
                    </Section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="mt-10 mb-6 break-inside-avoid">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-xs font-extrabold tracking-widest text-gray-800 uppercase">
                {title}
            </h2>
            {children}
        </div>
    );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50/80 text-[10px] font-black tracking-widest text-gray-500 uppercase">
                    <tr>
                        {head.map((h, i) => (
                            <th
                                key={h}
                                className={`px-4 py-3 ${
                                    i === head.length - 1
                                        ? 'text-right'
                                        : (i === 1 && head.length === 5) ||
                                            (i === 3 && head.length === 6)
                                          ? 'text-center'
                                          : ''
                                }`}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {children}
                </tbody>
            </table>
        </div>
    );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
    return (
        <tr>
            <td
                colSpan={colSpan}
                className="bg-gray-50/30 px-4 py-8 text-center text-xs font-medium text-gray-400 italic"
            >
                Sin registros en esta sección.
            </td>
        </tr>
    );
}
