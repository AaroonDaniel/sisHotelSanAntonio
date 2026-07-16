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
        <div className="min-h-screen bg-gray-50 px-4 py-8 print:bg-white print:p-0">
            <Head title={`Cierre de Caja #${CashRegister.id}`} />

            <div className="mx-auto w-full max-w-5xl print:max-w-full">
                {/* ===== 1. BARRA SUPERIOR DE ACCIONES ===== */}
                <div className="mb-6 flex items-center justify-between print:hidden">
                    <button
                        onClick={() => router.visit('/dashboard')}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir
                    </button>
                </div>

                {/* ===== 2. TARJETA PRINCIPAL ===== */}
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none print:p-0">
                    
                    {/* ===== 3. CABECERA + ESTADO ===== */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold tracking-wider text-gray-900 uppercase">
                                Hotel San Antonioo
                            </h1>
                            <p className="mt-1 text-sm font-semibold tracking-wide text-gray-400 uppercase">
                                Cierre de Caja — Turno #{CashRegister.id}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase shadow-sm ${
                                isClosed
                                    ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                        >
                            {isClosed ? 'Cerrado' : 'Abierto'}
                        </span>
                    </div>
                    
                    <div className="mt-6 border-b border-dashed border-gray-200" />

                    {/* ===== 4. GRID DE INFORMACIÓN GENERAL ===== */}
                    <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Operador
                            </p>
                            <p className="mt-1 font-bold text-gray-800 uppercase">
                                {operatorName}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Hora de Inicio
                            </p>
                            <p className="mt-1 font-bold text-gray-800">
                                {formatDateTime(CashRegister.opened_at)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Hora de Fin
                            </p>
                            <p className="mt-1 font-bold text-gray-800">
                                {isClosed
                                    ? formatDateTime(CashRegister.closed_at)
                                    : 'Turno en curso'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                                Saldo Inicial
                            </p>
                            <p className="mt-1 font-bold text-gray-800">
                                {formatCurrency(Number(CashRegister.opening_amount))}
                            </p>
                        </div>
                    </div>

                    {/* ===== 5. TARJETAS DE RESUMEN FINANCIERO ===== */}
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
                        
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900 p-6 shadow-lg print:bg-gray-100 print:text-black">
                            <p className="text-[11px] font-bold tracking-widest text-slate-300 uppercase print:text-gray-600">
                                Efectivo Esperado en Caja
                            </p>
                            <p className="mt-2 text-3xl font-black text-white print:text-black">
                                {formatCurrency(ExpectedCash)}
                            </p>
                        </div>
                    </div>

                    {isClosed && LeftAmount !== null && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
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
                                    <tr key={m.method} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-800 uppercase text-[11px]">
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
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
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
                                            {p.bank_name ? ` (${p.bank_name})` : ''}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-500 uppercase text-[11px]">
                                            {p.operator_name}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-bold ${
                                                p.amount < 0 ? 'text-red-500' : 'text-gray-900'
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
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-500">
                                            {s.consumed_at}
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-900">
                                            {s.room_number}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-700 uppercase text-[11px]">
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
                        <Table head={['Fecha', 'Descripción', 'Operador', 'Monto']}>
                            {Expenses.length === 0 ? (
                                <EmptyRow colSpan={4} />
                            ) : (
                                Expenses.map((e) => (
                                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-500">
                                            {e.created_at ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-700 uppercase text-[11px]">
                                            {e.description}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-500 uppercase text-[11px]">
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

                    <p className="mt-12 text-center text-[10px] font-medium tracking-wide text-gray-400 uppercase print:mt-8">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-10 mb-6 break-inside-avoid print:mt-6">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-xs font-extrabold tracking-widest text-gray-800 uppercase">
                {title}
            </h2>
            {children}
        </div>
    );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-100 print:border-none print:overflow-visible">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-gray-50/80 text-[10px] font-black tracking-widest text-gray-500 uppercase print:bg-transparent print:border-b print:border-gray-200">
                    <tr>
                        {head.map((h, i) => (
                            <th 
                                key={h} 
                                className={`px-4 py-3 ${
                                    i === head.length - 1 ? 'text-right' : 
                                    i === 1 && head.length === 5 ? 'text-center' : // Centrar N° Mov
                                    i === 3 && head.length === 6 ? 'text-center' : // Centrar Cantidad
                                    ''
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
                className="px-4 py-8 text-center text-xs font-medium text-gray-400 italic bg-gray-50/30"
            >
                Sin registros en esta sección.
            </td>
        </tr>
    );
}