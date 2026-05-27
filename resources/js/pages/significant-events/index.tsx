import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    FileText,
    Loader2,
    Plus,
    ShieldAlert,
    Wifi,
    WifiOff,
    X,
    XCircle,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

// =====================================================================
// Tipos
// =====================================================================
interface EventRow {
    id: number;
    event_code: number;
    code_label: string;
    description: string;
    start_at: string;
    end_at: string | null;
    status: 'active' | 'closed' | 'registered' | 'failed' | string;
    siat_reception_code: string | null;
    invoices_count: number;
    user_name: string;
}

interface EventCodeOption {
    value: number;
    label: string;
}

interface Props {
    auth: { user: any };
    events: EventRow[];
    hasActiveEvent: boolean;
    eventCodes: EventCodeOption[];
}

// =====================================================================
// Helpers de presentación
// =====================================================================
const STATUS_STYLES: Record<
    string,
    { label: string; bg: string; text: string; ring: string; Icon: typeof CheckCircle2 }
> = {
    active: {
        label: 'Activo',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        ring: 'ring-amber-200',
        Icon: WifiOff,
    },
    closed: {
        label: 'Cerrado',
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        ring: 'ring-slate-200',
        Icon: AlertTriangle,
    },
    registered: {
        label: 'Registrado',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        ring: 'ring-emerald-200',
        Icon: CheckCircle2,
    },
    failed: {
        label: 'Fallido',
        bg: 'bg-red-50',
        text: 'text-red-700',
        ring: 'ring-red-200',
        Icon: XCircle,
    },
};

const getStatusStyle = (status: string) =>
    STATUS_STYLES[status] ?? {
        label: status,
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        ring: 'ring-gray-200',
        Icon: FileText,
    };

// Datetime-local actual (yyyy-MM-ddTHH:mm) en zona local del navegador.
const nowForDatetimeLocal = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// =====================================================================
// Componente principal
// =====================================================================
export default function SignificantEventsIndex({
    auth,
    events,
    hasActiveEvent,
    eventCodes,
}: Props) {
    const [showModal, setShowModal] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        event_code: eventCodes[0]?.value ?? 1,
        description: '',
        start_at: nowForDatetimeLocal(),
    });

    const openModal = () => {
        if (hasActiveEvent) return;
        clearErrors();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        reset();
        clearErrors();
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/contingencias/iniciar', {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
            },
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Contingencias SIAT" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* ========== ENCABEZADO ========== */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-base font-bold text-red-500">
                            <ShieldAlert className="h-4 w-4" />
                            Facturación SIAT
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Eventos Significativos
                        </h1>
                        <p className="mt-1 max-w-2xl text-base text-white/80">
                            Gestión de cortes de servicio. Registre el evento al inicio y
                            envíe el paquete de facturas offline al SIAT cuando se restablezca
                            la conexión.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openModal}
                        disabled={hasActiveEvent}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            hasActiveEvent
                                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                                : 'bg-[#b3282d] text-white hover:bg-[#9a2126] focus:ring-[#b3282d]'
                        }`}
                    >
                        <Plus className="h-4 w-4" />
                        Iniciar contingencia
                    </button>
                </div>

                {/* ========== BANNER: HAY UN EVENTO ACTIVO ========== */}
                {hasActiveEvent && (
                    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <WifiOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-800">
                                Modo contingencia ACTIVO
                            </p>
                            <p className="mt-0.5 text-sm text-amber-700">
                                Hay un evento significativo abierto. Las facturas se están
                                guardando en modo offline. Debe cerrarlo desde su detalle
                                antes de poder iniciar otro.
                            </p>
                        </div>
                    </div>
                )}

                {/* ========== TABLA DE EVENTOS ========== */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                <Wifi className="h-6 w-6 text-gray-500" />
                            </div>
                            <h3 className="text-base font-medium text-gray-900">
                                Sin eventos registrados
                            </h3>
                            <p className="mt-1 max-w-sm text-sm text-gray-500">
                                No se ha registrado ninguna contingencia hasta el momento.
                                Cuando ocurra un corte de servicio, inicie el evento desde
                                aquí.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Vista tabla — escritorio */}
                            <div className="hidden lg:block">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Motivo
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Inicio
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Fin
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Estado
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Facturas
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Registrado por
                                            </th>
                                            <th className="px-6 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {events.map((event) => {
                                            const s = getStatusStyle(event.status);
                                            return (
                                                <tr
                                                    key={event.id}
                                                    className="transition-colors hover:bg-gray-50"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {event.code_label}
                                                        </div>
                                                        <div className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                                                            {event.description}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                                        {event.start_at}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                                        {event.end_at ?? (
                                                            <span className="text-gray-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
                                                        >
                                                            <s.Icon className="h-3.5 w-3.5" />
                                                            {s.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                                                        {event.invoices_count}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                                        {event.user_name}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-right">
                                                        <Link
                                                            href={`/contingencias/${event.id}`}
                                                            className="inline-flex items-center gap-1 text-sm font-medium text-[#b3282d] hover:text-[#9a2126]"
                                                        >
                                                            Ver detalle
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Vista tarjetas — móvil/tablet */}
                            <div className="divide-y divide-gray-100 lg:hidden">
                                {events.map((event) => {
                                    const s = getStatusStyle(event.status);
                                    return (
                                        <Link
                                            key={event.id}
                                            href={`/contingencias/${event.id}`}
                                            className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-gray-50"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
                                                    >
                                                        <s.Icon className="h-3 w-3" />
                                                        {s.label}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {event.invoices_count} factura(s)
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-sm font-medium text-gray-900">
                                                    {event.code_label}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-gray-500">
                                                    {event.description}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {event.start_at}
                                                    {event.end_at && ` → ${event.end_at}`}
                                                </p>
                                            </div>
                                            <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ========== MODAL: INICIAR CONTINGENCIA ========== */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        onClick={closeModal}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                                    <ShieldAlert className="h-5 w-5 text-[#b3282d]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Iniciar contingencia
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Las facturas se guardarán offline hasta el cierre.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                            {/* Motivo */}
                            <div>
                                <label
                                    htmlFor="event_code"
                                    className="mb-1.5 block text-sm font-medium text-gray-700"
                                >
                                    Motivo del evento
                                </label>
                                <select
                                    id="event_code"
                                    value={data.event_code}
                                    onChange={(e) =>
                                        setData('event_code', Number(e.target.value))
                                    }
                                    className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#b3282d] focus:outline-none focus:ring-1 focus:ring-[#b3282d] ${
                                        errors.event_code
                                            ? 'border-red-400'
                                            : 'border-gray-300'
                                    }`}
                                >
                                    {eventCodes.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.event_code && (
                                    <p className="mt-1 text-xs font-medium text-red-600">
                                        {errors.event_code}
                                    </p>
                                )}
                            </div>

                            {/* Fecha/hora de inicio */}
                            <div>
                                <label
                                    htmlFor="start_at"
                                    className="mb-1.5 block text-sm font-medium text-gray-700"
                                >
                                    Fecha y hora de inicio
                                </label>
                                <input
                                    id="start_at"
                                    type="datetime-local"
                                    value={data.start_at}
                                    onChange={(e) => setData('start_at', e.target.value)}
                                    className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#b3282d] focus:outline-none focus:ring-1 focus:ring-[#b3282d] ${
                                        errors.start_at
                                            ? 'border-red-400'
                                            : 'border-gray-300'
                                    }`}
                                />
                                {errors.start_at && (
                                    <p className="mt-1 text-xs font-medium text-red-600">
                                        {errors.start_at}
                                    </p>
                                )}
                            </div>

                            {/* Descripción */}
                            <div>
                                <label
                                    htmlFor="description"
                                    className="mb-1.5 block text-sm font-medium text-gray-700"
                                >
                                    Descripción
                                    <span className="ml-1 text-xs font-normal text-gray-400">
                                        ({data.description.length}/500)
                                    </span>
                                </label>
                                <textarea
                                    id="description"
                                    rows={4}
                                    value={data.description}
                                    maxLength={500}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Ej: Corte de fibra óptica en el sector reportado por el ISP a las 14:30."
                                    className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#b3282d] focus:outline-none focus:ring-1 focus:ring-[#b3282d] ${
                                        errors.description
                                            ? 'border-red-400'
                                            : 'border-gray-300'
                                    }`}
                                />
                                {errors.description && (
                                    <p className="mt-1 text-xs font-medium text-red-600">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            {/* Aviso */}
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                                Al iniciar el evento, todas las facturas se almacenarán
                                localmente. Recuerde cerrar el evento dentro de las 48 horas
                                cuando vuelva la conexión.
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={processing}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.description.trim()}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#b3282d] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#9a2126] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Iniciando…
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="h-4 w-4" />
                                            Iniciar contingencia
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}