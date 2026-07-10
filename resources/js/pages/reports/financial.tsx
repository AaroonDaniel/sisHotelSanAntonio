import CloseRegisterModal from '@/components/CloseRegisterModal';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowLeft,
    ArrowUpCircle,
    Banknote,
    Calendar,
    FileSpreadsheet,
    FileText,
    Layers,
    Loader2,
    LogOut,
    Printer,
    QrCode,
    Receipt,
    Scale,
    User as UserIcon,
    Wallet,
} from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';

/* ===================== TIPOS ===================== */
interface PaymentRow {
    id: number;
    user_name: string;
    amount: number; // ya viene con signo: devoluciones negativas
    method: string;
    bank_name?: string | null;
    type: string; // ADELANTO | PAGO | DEVOLUCION ...
    date: string;
    time: string;
    room_number: string;
    guest_name: string;
}

interface ExpenseRow {
    id: number;
    user_name: string;
    amount: number;
    description: string;
    date: string;
    time: string;
}

interface Summary {
    apertura: number;
    ingresos: number;
    devoluciones: number; // valor negativo
    gastos: number;
    liquidacion: number;
}

interface Props {
    auth: {
        user: User;
        active_register?: any;
    };
    users?: User[];
    Payments?: PaymentRow[];
    Expenses?: ExpenseRow[];
    Summary?: Summary;
    Filters?: {
        start_date?: string;
        end_date?: string;
        user_id?: string | null;
    };
    CanViewAll?: boolean;
}

/* ===================== HELPERS ===================== */
const bs = (n: number) =>
    new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n ?? 0);

export default function FinancialReport({
    auth,
    users = [],
    Payments = [],
    Expenses = [],
    Summary,
    Filters,
    CanViewAll = false,
}: Props) {
    // Modal de Cierre de Caja
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Estados del formulario
    const [fechaInicio, setFechaInicio] = useState(Filters?.start_date || '');
    const [fechaFin, setFechaFin] = useState(Filters?.end_date || '');
    const [userId, setUserId] = useState(Filters?.user_id || '');
    const [tipoRegistro, setTipoRegistro] = useState<
        'efectivo' | 'bancos' | 'ambos'
    >('ambos');
    const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf');

    // Estados de UI
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    /* ============ CÁLCULO DE LIQUIDACIÓN EN PANTALLA ============
       Se prioriza el Summary del backend; si por algún motivo no llega,
       se recalcula localmente con los arrays para que nunca quede vacío. */
    const resumen: Summary = useMemo(() => {
        if (Summary) return Summary;

        const ingresos = Payments.filter((p) => p.type !== 'DEVOLUCION').reduce(
            (acc, p) => acc + (Number(p.amount) || 0),
            0,
        );

        const devoluciones = Payments.filter(
            (p) => p.type === 'DEVOLUCION',
        ).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

        const gastos = Expenses.reduce(
            (acc, e) => acc + (Number(e.amount) || 0),
            0,
        );

        return {
            apertura: 0,
            ingresos,
            devoluciones,
            gastos,
            liquidacion: ingresos + devoluciones - gastos,
        };
    }, [Summary, Payments, Expenses]);

    const hayDatos = Payments.length > 0 || Expenses.length > 0;

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFin('');
        setUserId('');
        setTipoRegistro('ambos');
        setFormato('pdf');
    };

    /* Carga las transacciones en pantalla (Inertia recarga financialIndex) */
    const handleConsultar = () => {
        if (!fechaInicio || !fechaFin || !userId) return;
        router.get(
            '/reports/financial',
            {
                start_date: fechaInicio,
                end_date: fechaFin,
                user_id: userId,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleGenerar: FormEventHandler = (e) => {
        e.preventDefault();
        if (!fechaInicio || !fechaFin || !userId) return;

        setIsGenerating(true);
        setPdfUrl(null);

        const params = new URLSearchParams({
            start_date: fechaInicio,
            end_date: fechaFin,
            user_id: userId,
            record_type: tipoRegistro,
        });

        setTimeout(() => {
            setIsGenerating(false);
            if (formato === 'pdf') {
                setPdfUrl(
                    `/reports/financial/pdf?${params.toString()}&t=${Date.now()}`,
                );
            } else {
                window.location.href = `/reports/financial/csv?${params.toString()}`;
            }
        }, 600);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cierre de Caja" />

            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-7">
                {/* ENCABEZADO */}
                <div className="mb-4 flex-shrink-0 pt-0">
                    <button
                        onClick={() => router.visit('/dashboard')}
                        className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-white"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 transition-all group-hover:bg-gray-700">
                            <ArrowLeft className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-400">Volver atrás</span>
                    </button>
                    <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                        Cierre de Caja
                    </h2>
                </div>

                {/* ============ VISTA PREVIA PDF ============ */}
                {pdfUrl && formato === 'pdf' ? (
                    <div className="flex h-[calc(100vh-12rem)] w-full animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                Paso 2: Revisa tu Parte Diario
                            </h2>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={() => setPdfUrl(null)}
                                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Cerrar
                                </button>
                                {userId !== 'todos' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsCloseModalOpen(true)
                                        }
                                        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95"
                                    >
                                        <LogOut className="h-4 w-4" /> Todo en
                                        orden: Cerrar Caja
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
                            <Printer className="h-4 w-4" />
                            <p>
                                No olvides <b>imprimir el PDF</b> usando el
                                botón de la impresora dentro del visor antes de
                                salir del sistema.
                            </p>
                        </div>

                        <div className="flex-1 bg-gray-300/50 p-2">
                            <iframe
                                src={pdfUrl}
                                className="h-full w-full rounded border border-gray-300 bg-white shadow-inner"
                                title="Reporte PDF"
                            />
                        </div>
                    </div>
                ) : (
                    /* ============ PASO 1: FORMULARIO + LIQUIDACIÓN ============ */
                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* ---------- TARJETA FORMULARIO ---------- */}
                        <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl lg:w-[420px] lg:flex-shrink-0">
                            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <Printer className="h-5 w-5" />
                                    </div>
                                    Paso 1: Generar Reporte
                                </h2>
                            </div>

                            <form
                                onSubmit={handleGenerar}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                                    {/* Usuario */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Usuario de Caja
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <UserIcon className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <select
                                                value={userId}
                                                onChange={(e) =>
                                                    setUserId(e.target.value)
                                                }
                                                className="w-full appearance-none rounded-lg border border-gray-400 bg-white py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                            >
                                                <option value="" disabled>
                                                    Selecciona un operador...
                                                </option>
                                                {CanViewAll && (
                                                    <option value="todos">
                                                        Todos
                                                    </option>
                                                )}
                                                {users && users.length > 0 ? (
                                                    users.map((user) => (
                                                        <option
                                                            key={user.id}
                                                            value={user.id}
                                                        >
                                                            {user.full_name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>
                                                        No hay operadores
                                                        disponibles.
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Fechas */}
                                    <div className="flex flex-col gap-4 sm:flex-row">
                                        <div className="w-full sm:w-1/2">
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Fecha de Inicio
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    value={fechaInicio}
                                                    onChange={(e) =>
                                                        setFechaInicio(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-1/2">
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Hasta qué fecha
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    value={fechaFin}
                                                    onChange={(e) =>
                                                        setFechaFin(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botón consultar en pantalla */}
                                    <button
                                        type="button"
                                        onClick={handleConsultar}
                                        disabled={
                                            !fechaInicio || !fechaFin || !userId
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                                    >
                                        <Scale className="h-4 w-4" />
                                        Consultar Liquidación en Pantalla
                                    </button>

                                    {/* Tipo de Registro */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Tipo de Registro
                                        </label>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTipoRegistro('efectivo')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'efectivo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Banknote className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Efectivo
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTipoRegistro('bancos')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'bancos' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <QrCode className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Bancos / QR
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTipoRegistro('ambos')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'ambos' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Layers className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Ambos
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Formato */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Formato de Salida
                                        </label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormato('pdf')
                                                }
                                                className={`flex w-32 flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 transition-all sm:flex-none ${formato === 'pdf' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileText className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    PDF
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormato('excel')
                                                }
                                                className={`flex w-32 flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 transition-all sm:flex-none ${formato === 'excel' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileSpreadsheet className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Excel
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={handleLimpiar}
                                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            isGenerating ||
                                            !fechaInicio ||
                                            !fechaFin ||
                                            !userId
                                        }
                                        className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />{' '}
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="h-4 w-4" />{' '}
                                                Generar y Revisar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* ---------- PANEL DE LIQUIDACIÓN EN PANTALLA ---------- */}
                        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600">
                                    <Scale className="h-5 w-5" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-800">
                                    Liquidación de Caja
                                </h2>
                            </div>

                            {!hayDatos ? (
                                <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center text-gray-400">
                                    <Wallet className="h-10 w-10" />
                                    <p className="text-sm font-medium">
                                        Selecciona un rango de fechas y pulsa{' '}
                                        <b>Consultar Liquidación</b> para ver
                                        las transacciones.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6 p-6">
                                    {/* TARJETAS RESUMEN */}
                                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                        <SummaryCard
                                            label="Apertura"
                                            value={resumen.apertura}
                                            color="text-gray-700"
                                            icon={
                                                <Wallet className="h-4 w-4" />
                                            }
                                        />
                                        <SummaryCard
                                            label="Ingresos / Adelantos"
                                            value={resumen.ingresos}
                                            color="text-emerald-600"
                                            icon={
                                                <ArrowUpCircle className="h-4 w-4" />
                                            }
                                        />
                                        <SummaryCard
                                            label="Devoluciones"
                                            value={resumen.devoluciones}
                                            color="text-amber-600"
                                            icon={
                                                <ArrowDownCircle className="h-4 w-4" />
                                            }
                                        />
                                        <SummaryCard
                                            label="Gastos / Egresos"
                                            value={-Math.abs(resumen.gastos)}
                                            color="text-red-600"
                                            icon={
                                                <Receipt className="h-4 w-4" />
                                            }
                                        />
                                    </div>

                                    {/* TOTAL DE LIQUIDACIÓN */}
                                    <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
                                        <span className="flex items-center gap-2 text-sm font-bold tracking-wide text-indigo-800 uppercase">
                                            <Scale className="h-5 w-5" />
                                            Total de Liquidación
                                        </span>
                                        <span
                                            className={`text-2xl font-black ${resumen.liquidacion >= 0 ? 'text-indigo-700' : 'text-red-600'}`}
                                        >
                                            {bs(resumen.liquidacion)} Bs
                                        </span>
                                    </div>

                                    {/* TABLA DE PAGOS Y DEVOLUCIONES */}
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                            <Banknote className="h-4 w-4 text-emerald-600" />
                                            Pagos y Devoluciones (
                                            {Payments.length})
                                        </h3>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="px-3 py-2">
                                                            Fecha
                                                        </th>
                                                        <th className="px-3 py-2">
                                                            Hab.
                                                        </th>
                                                        <th className="px-3 py-2">
                                                            Huésped
                                                        </th>
                                                        <th className="px-3 py-2">
                                                            Método
                                                        </th>
                                                        <th className="px-3 py-2">
                                                            Concepto
                                                        </th>
                                                        <th className="px-3 py-2 text-right">
                                                            Monto (Bs)
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {Payments.length === 0 ? (
                                                        <tr>
                                                            <td
                                                                colSpan={6}
                                                                className="px-3 py-4 text-center text-gray-400"
                                                            >
                                                                Sin pagos
                                                                registrados.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        Payments.map((p) => (
                                                            <tr
                                                                key={p.id}
                                                                className="text-gray-700"
                                                            >
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    {p.date}{' '}
                                                                    <span className="text-gray-400">
                                                                        {p.time}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {
                                                                        p.room_number
                                                                    }
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {
                                                                        p.guest_name
                                                                    }
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {p.method}
                                                                    {p.bank_name
                                                                        ? ` · ${p.bank_name}`
                                                                        : ''}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <span
                                                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.type === 'DEVOLUCION' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                                                                    >
                                                                        {p.type}
                                                                    </span>
                                                                </td>
                                                                <td
                                                                    className={`px-3 py-2 text-right font-bold ${p.amount < 0 ? 'text-red-600' : 'text-emerald-700'}`}
                                                                >
                                                                    {bs(
                                                                        p.amount,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                                <tfoot className="bg-gray-50 font-bold text-gray-800">
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="px-3 py-2 text-right"
                                                        >
                                                            Subtotal (Ingresos +
                                                            Devoluciones)
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {bs(
                                                                resumen.ingresos +
                                                                    resumen.devoluciones,
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* TABLA DE GASTOS */}
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                                            <Receipt className="h-4 w-4 text-red-600" />
                                            Gastos / Egresos ({Expenses.length})
                                        </h3>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                    <tr>
                                                        <th className="px-3 py-2">
                                                            Fecha
                                                        </th>
                                                        <th className="px-3 py-2">
                                                            Registrado por
                                                        </th>
                                                        <th className="px-3 py-2">
                                                            Descripción
                                                        </th>
                                                        <th className="px-3 py-2 text-right">
                                                            Monto (Bs)
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {Expenses.length === 0 ? (
                                                        <tr>
                                                            <td
                                                                colSpan={4}
                                                                className="px-3 py-4 text-center text-gray-400"
                                                            >
                                                                Sin gastos
                                                                registrados.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        Expenses.map((e) => (
                                                            <tr
                                                                key={e.id}
                                                                className="text-gray-700"
                                                            >
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    {e.date}{' '}
                                                                    <span className="text-gray-400">
                                                                        {e.time}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {
                                                                        e.user_name
                                                                    }
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {
                                                                        e.description
                                                                    }
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-bold text-red-600">
                                                                    -{' '}
                                                                    {bs(
                                                                        e.amount,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                                <tfoot className="bg-gray-50 font-bold text-gray-800">
                                                    <tr>
                                                        <td
                                                            colSpan={3}
                                                            className="px-3 py-2 text-right"
                                                        >
                                                            Total Egresos
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-red-600">
                                                            -{' '}
                                                            {bs(resumen.gastos)}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <CloseRegisterModal
                show={isCloseModalOpen}
                operatorId={userId}
                operatorName={
                    users.find((u) => String(u.id) === String(userId))
                        ?.full_name
                }
                onClose={() => setIsCloseModalOpen(false)}
            />
        </AuthenticatedLayout>
    );
}

/* ===================== SUBCOMPONENTE: Tarjeta resumen ===================== */
function SummaryCard({
    label,
    value,
    color,
    icon,
}: {
    label: string;
    value: number;
    color: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                {icon}
                {label}
            </div>
            <div className={`mt-1 text-lg font-black ${color}`}>
                {bs(value)} Bs
            </div>
        </div>
    );
}
