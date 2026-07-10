import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';

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

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);

const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    // El backend ya envía la fecha formateada como 'd/m/Y H:i' (payments,
    // expenses) o como ISO (opened_at/closed_at de CashRegister). Solo
    // reformateamos si detectamos un ISO real.
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

export default function CashRegisterShow({
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

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-8 print:bg-white print:p-0">
            <Head title={`Cierre de Caja #${CashRegister.id}`} />

            <div className="mx-auto w-full max-w-4xl print:max-w-full">
                {/* ===== 1. BARRA SUPERIOR DE ACCIONES ===== */}
                <div className="mb-4 flex items-center justify-between print:hidden">
                    <button
                        onClick={() => router.visit('/dashboard')}
                        className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-black"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir
                    </button>
                </div>

                {/* ===== 2. TARJETA PRINCIPAL ===== */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm md:p-8 print:rounded-none print:border-none print:shadow-none">
                    {/* ===== 3. CABECERA + ESTADO ===== */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-lg font-bold tracking-widest text-gray-800 uppercase">
                                Hotel San Antonio
                            </h1>
                            <p className="text-sm text-gray-500 uppercase">
                                Cierre de Caja — Turno #{CashRegister.id}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${
                                isClosed
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-green-100 text-green-700'
                            }`}
                        >
                            {isClosed ? 'Cerrado' : 'Abierto'}
                        </span>
                    </div>
                    <div className="mt-4 border-b border-dashed border-gray-200 pb-4" />

                    {/* ===== 4. GRID DE INFORMACIÓN GENERAL (4 COLUMNAS) ===== */}
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                                Operador
                            </p>
                            <p className="mt-0.5 font-semibold text-gray-800">
                                {operatorName}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                                Hora de Inicio
                            </p>
                            <p className="mt-0.5 font-semibold text-gray-800">
                                {formatDateTime(CashRegister.opened_at)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                                Hora de Fin
                            </p>
                            <p className="mt-0.5 font-semibold text-gray-800">
                                {isClosed
                                    ? formatDateTime(CashRegister.closed_at)
                                    : 'Turno en curso'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                                Saldo Inicial
                            </p>
                            <p className="mt-0.5 font-semibold text-gray-800">
                                {formatCurrency(
                                    Number(CashRegister.opening_amount),
                                )}
                            </p>
                        </div>
                    </div>

                    {/* ===== 5. TARJETAS DE RESUMEN FINANCIERO (3 COLUMNAS) ===== */}
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 p-4 text-center">
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                                Total Cobrado/Adelantos
                            </p>
                            <p className="mt-1 text-2xl font-bold text-green-600">
                                {formatCurrency(TotalIncome)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 p-4 text-center">
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                                Total Gastos
                            </p>
                            <p className="mt-1 text-2xl font-bold text-red-600">
                                {formatCurrency(TotalExpenses)}
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-900 p-4 text-center">
                            <p className="text-xs font-semibold text-gray-300 uppercase">
                                Efectivo Esperado en Caja
                            </p>
                            <p className="mt-1 text-2xl font-bold text-white">
                                {formatCurrency(ExpectedCash)}
                            </p>
                        </div>
                    </div>

                    {isClosed && LeftAmount !== null && (
                        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                            <p className="text-xs font-semibold text-amber-700 uppercase">
                                {LeftAmount > 0
                                    ? 'Monto dejado en caja para el siguiente turno'
                                    : 'El operador no dejó monto en caja'}
                            </p>
                            {LeftAmount > 0 && (
                                <p className="mt-1 text-xl font-bold text-amber-800">
                                    {formatCurrency(LeftAmount)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ===== 6. TABLAS DE DESGLOSE ===== */}
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
                                    <tr key={m.method}>
                                        <td className="px-3 py-2 font-bold text-gray-800">
                                            {m.method}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {m.count}
                                        </td>
                                        <td className="px-3 py-2 text-right text-green-600">
                                            {formatCurrency(m.collections)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-red-500">
                                            {m.refunds !== 0
                                                ? formatCurrency(m.refunds)
                                                : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-900">
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
                                    <tr key={p.id}>
                                        <td className="px-3 py-2 text-gray-600">
                                            {p.payment_date ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 font-bold text-gray-800">
                                            {p.room_number}
                                        </td>
                                        <td className="px-3 py-2 text-gray-700">
                                            {p.guest_name}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600 uppercase">
                                            {p.method}
                                            {p.bank_name
                                                ? ` (${p.bank_name})`
                                                : ''}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                            {p.operator_name}
                                        </td>
                                        <td
                                            className={`px-3 py-2 text-right font-bold ${p.amount < 0 ? 'text-red-500' : 'text-gray-900'}`}
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
                                    <tr key={idx}>
                                        <td className="px-3 py-2 text-gray-600">
                                            {s.consumed_at}
                                        </td>
                                        <td className="px-3 py-2 font-bold text-gray-800">
                                            {s.room_number}
                                        </td>
                                        <td className="px-3 py-2 text-gray-700 uppercase">
                                            {s.service_name}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {s.quantity}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {formatCurrency(s.selling_price)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                                            {formatCurrency(s.total)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </Table>
                    </Section>

                    <Section title="Gastos del Turno">
                        <Table
                            head={['Fecha', 'Descripción', 'Operador', 'Monto']}
                        >
                            {Expenses.length === 0 ? (
                                <EmptyRow colSpan={4} />
                            ) : (
                                Expenses.map((e) => (
                                    <tr key={e.id}>
                                        <td className="px-3 py-2 text-gray-600">
                                            {e.created_at ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-gray-700 uppercase">
                                            {e.description}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                            {e.operator_name}
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-red-600">
                                            {formatCurrency(e.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </Table>
                    </Section>

                    <p className="mt-8 text-center text-[10px] text-gray-400">
                        Documento generado el{' '}
                        {new Date().toLocaleString('es-BO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="mt-8 mb-4 break-inside-avoid">
            <h2 className="mb-4 border-b border-gray-200 pb-2 text-sm font-bold text-gray-700 uppercase">
                {title}
            </h2>
            {children}
        </div>
    );
}

function Table({
    head,
    children,
}: {
    head: string[];
    children: React.ReactNode;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
                <thead className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                    <tr>
                        {head.map((h) => (
                            <th key={h} className="px-3 py-2">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">{children}</tbody>
            </table>
        </div>
    );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
    return (
        <tr>
            <td
                colSpan={colSpan}
                className="px-3 py-4 text-center text-gray-400 italic"
            >
                Sin registros en este turno.
            </td>
        </tr>
    );
}
