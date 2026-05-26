import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Hash,
    Loader2,
    PackageCheck,
    Receipt,
    ShieldAlert,
    Upload,
    User as UserIcon,
    Wifi,
    WifiOff,
    XCircle,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

// =====================================================================
// Tipos
// =====================================================================
interface EventDetail {
    id: number;
    code_label: string;
    description: string;
    start_at: string;
    end_at: string | null;
    status: 'active' | 'closed' | 'registered' | 'failed' | string;
    siat_reception_code: string | null;
    user_name: string;
}

interface InvoiceRow {
    id: number;
    invoice_number: string;
    cuf: string | null;
    siat_status: 'offline' | 'accepted' | 'rejected' | string;
    total_amount: number | string;
    guest_name: string | null;
    has_offline_xml: boolean;
}

interface Props {
    auth: { user: any };
    event: EventDetail;
    invoices: InvoiceRow[];
}

// =====================================================================
// Helpers
// =====================================================================
const EVENT_STATUS: Record<
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
        label: 'Registrado en SIAT',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        ring: 'ring-emerald-200',
        Icon: CheckCircle2,
    },
    failed: {
        label: 'Falló registro',
        bg: 'bg-red-50',
        text: 'text-red-700',
        ring: 'ring-red-200',
        Icon: XCircle,
    },
};

const INVOICE_STATUS: Record<
    string,
    { label: string; bg: string; text: string; ring: string }
> = {
    offline: {
        label: 'Offline',
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        ring: 'ring-gray-200',
    },
    accepted: {
        label: 'Aceptada',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        ring: 'ring-emerald-200',
    },
    rejected: {
        label: 'Rechazada',
        bg: 'bg-red-50',
        text: 'text-red-700',
        ring: 'ring-red-200',
    },
};

const getEventStatus = (s: string) =>
    EVENT_STATUS[s] ?? {
        label: s,
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        ring: 'ring-gray-200',
        Icon: FileText,
    };

const getInvoiceStatus = (s: string) =>
    INVOICE_STATUS[s] ?? {
        label: s,
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        ring: 'ring-gray-200',
    };

const formatMoney = (value: number | string): string => {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(n)) return '0.00';
    return n.toLocaleString('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const nowForDatetimeLocal = (): string => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// =====================================================================
// Componente
// =====================================================================
export default function SignificantEventShow({ event, invoices, auth }: Props) {
    const eventStatus = getEventStatus(event.status);
    const [showCloseForm, setShowCloseForm] = useState(false);

    // Formulario para cerrar evento
    const closeForm = useForm({
        end_at: nowForDatetimeLocal(),
    });

    // Formulario para reenviar paquete (sin payload — la ruta es el ID)
    const resendForm = useForm({});

    const handleClose: FormEventHandler = (e) => {
        e.preventDefault();
        closeForm.post(`/contingencias/${event.id}/finalizar`, {
            preserveScroll: true,
            onSuccess: () => setShowCloseForm(false),
        });
    };

    const handleResend = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (resendForm.processing) return;

        const ok = window.confirm(
            'Se enviará el paquete .tar.gz con todas las facturas offline al SIAT. ¿Continuar?',
        );
        if (!ok) return;

        resendForm.post(`/contingencias/${event.id}/reenviar`, {
            preserveScroll: true,
        });
    };

    // Resumen rápido de estado de facturas
    const offlineCount = invoices.filter((i) => i.siat_status === 'offline').length;
    const acceptedCount = invoices.filter((i) => i.siat_status === 'accepted').length;
    const rejectedCount = invoices.filter((i) => i.siat_status === 'rejected').length;
    const totalAmount = invoices.reduce((acc, inv) => {
        const n =
            typeof inv.total_amount === 'string'
                ? parseFloat(inv.total_amount)
                : inv.total_amount;
        return acc + (Number.isNaN(n) ? 0 : n);
    }, 0);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Evento #${event.id} — Contingencia`} />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* ========== MIGAS / VOLVER ========== */}
                <div className="mb-4">
                    <Link
                        href="/contingencias"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-[#b3282d]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al listado
                    </Link>
                </div>

                {/* ========== TARJETA DE EVENTO ========== */}
                <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    Evento significativo #{event.id}
                                </div>
                                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                                    {event.code_label}
                                </h1>
                                <p className="mt-1 max-w-2xl text-sm text-gray-600">
                                    {event.description}
                                </p>
                            </div>

                            <span
                                className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${eventStatus.bg} ${eventStatus.text} ${eventStatus.ring}`}
                            >
                                <eventStatus.Icon className="h-3.5 w-3.5" />
                                {eventStatus.label}
                            </span>
                        </div>
                    </div>

                    {/* Metadatos */}
                    <div className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-4">
                        <Metadata icon={Clock} label="Inicio" value={event.start_at} />
                        <Metadata
                            icon={Clock}
                            label="Fin"
                            value={event.end_at ?? '—'}
                            muted={!event.end_at}
                        />
                        <Metadata
                            icon={Hash}
                            label="Cód. recepción SIAT"
                            value={event.siat_reception_code ?? '—'}
                            muted={!event.siat_reception_code}
                            mono
                        />
                        <Metadata
                            icon={UserIcon}
                            label="Registrado por"
                            value={event.user_name}
                        />
                    </div>

                    {/* Acciones según estado */}
                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                        {event.status === 'active' && (
                            <ActionPanelActive
                                showForm={showCloseForm}
                                onToggle={() => setShowCloseForm((v) => !v)}
                                form={closeForm}
                                onSubmit={handleClose}
                            />
                        )}

                        {event.status === 'closed' && (
                            <InfoLine
                                tone="amber"
                                icon={AlertTriangle}
                                message="El evento fue cerrado localmente pero aún no se ha registrado en SIAT. Reintente el cierre."
                            />
                        )}

                        {event.status === 'registered' && (
                            <ActionPanelRegistered
                                pendingCount={offlineCount}
                                processing={resendForm.processing}
                                onResend={handleResend}
                            />
                        )}

                        {event.status === 'failed' && (
                            <InfoLine
                                tone="red"
                                icon={XCircle}
                                message="El registro en SIAT falló. Revise los logs y verifique las credenciales antes de reintentar."
                            />
                        )}
                    </div>
                </div>

                {/* ========== RESUMEN DE FACTURAS ========== */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard
                        label="Total facturas"
                        value={invoices.length.toString()}
                        Icon={Receipt}
                        tone="gray"
                    />
                    <SummaryCard
                        label="Pendientes"
                        value={offlineCount.toString()}
                        Icon={WifiOff}
                        tone="amber"
                    />
                    <SummaryCard
                        label="Aceptadas"
                        value={acceptedCount.toString()}
                        Icon={CheckCircle2}
                        tone="emerald"
                    />
                    <SummaryCard
                        label="Importe total"
                        value={`Bs. ${formatMoney(totalAmount)}`}
                        Icon={Wifi}
                        tone="slate"
                    />
                </div>

                {/* ========== TABLA DE FACTURAS ========== */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4">
                        <h2 className="text-base font-semibold text-gray-900">
                            Facturas asociadas
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Generadas mientras el evento estuvo activo.
                            {rejectedCount > 0 && (
                                <span className="ml-1 font-medium text-red-600">
                                    {rejectedCount} fueron rechazadas por SIAT.
                                </span>
                            )}
                        </p>
                    </div>

                    {invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                            <Receipt className="mb-3 h-10 w-10 text-gray-300" />
                            <p className="text-sm text-gray-500">
                                No se generaron facturas durante este evento.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Escritorio */}
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                N° Factura
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Huésped
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                CUF
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Importe (Bs.)
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                XML
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                Estado SIAT
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {invoices.map((invoice) => {
                                            const st = getInvoiceStatus(invoice.siat_status);
                                            return (
                                                <tr
                                                    key={invoice.id}
                                                    className="transition-colors hover:bg-gray-50"
                                                >
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                        {invoice.invoice_number}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-700">
                                                        {invoice.guest_name ?? (
                                                            <span className="text-gray-400">
                                                                Sin huésped
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {invoice.cuf ? (
                                                            <span
                                                                className="block max-w-[220px] truncate font-mono text-xs text-gray-600"
                                                                title={invoice.cuf}
                                                            >
                                                                {invoice.cuf}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                                        {formatMoney(invoice.total_amount)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {invoice.has_offline_xml ? (
                                                            <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <XCircle className="mx-auto h-4 w-4 text-gray-300" />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${st.bg} ${st.text} ${st.ring}`}
                                                        >
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Móvil */}
                            <div className="divide-y divide-gray-100 lg:hidden">
                                {invoices.map((invoice) => {
                                    const st = getInvoiceStatus(invoice.siat_status);
                                    return (
                                        <div key={invoice.id} className="px-4 py-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Factura #{invoice.invoice_number}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {invoice.guest_name ?? 'Sin huésped'}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st.bg} ${st.text} ${st.ring}`}
                                                >
                                                    {st.label}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-sm">
                                                <span className="text-gray-500">
                                                    Bs. {formatMoney(invoice.total_amount)}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                    XML offline:
                                                    {invoice.has_offline_xml ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="h-3.5 w-3.5 text-gray-300" />
                                                    )}
                                                </span>
                                            </div>
                                            {invoice.cuf && (
                                                <p
                                                    className="mt-1.5 truncate font-mono text-[11px] text-gray-400"
                                                    title={invoice.cuf}
                                                >
                                                    {invoice.cuf}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// =====================================================================
// Subcomponentes
// =====================================================================

function Metadata({
    icon: Icon,
    label,
    value,
    muted = false,
    mono = false,
}: {
    icon: typeof Clock;
    label: string;
    value: string;
    muted?: boolean;
    mono?: boolean;
}) {
    return (
        <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                <Icon className="h-3 w-3" />
                {label}
            </div>
            <p
                className={`${mono ? 'font-mono text-xs' : 'text-sm'} truncate ${
                    muted ? 'text-gray-400' : 'text-gray-900'
                }`}
                title={value}
            >
                {value}
            </p>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    Icon,
    tone,
}: {
    label: string;
    value: string;
    Icon: typeof CheckCircle2;
    tone: 'gray' | 'amber' | 'emerald' | 'slate';
}) {
    const toneClass = {
        gray: 'bg-gray-50 text-gray-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        slate: 'bg-slate-50 text-slate-600',
    }[tone];

    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${toneClass}`}
            >
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-500">{label}</p>
                <p className="truncate text-base font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

function InfoLine({
    tone,
    icon: Icon,
    message,
}: {
    tone: 'amber' | 'red';
    icon: typeof AlertTriangle;
    message: string;
}) {
    const cls =
        tone === 'amber'
            ? 'text-amber-700 bg-amber-50 border-amber-200'
            : 'text-red-700 bg-red-50 border-red-200';
    return (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${cls}`}>
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{message}</span>
        </div>
    );
}

// Panel cuando el evento está ACTIVO
function ActionPanelActive({
    showForm,
    onToggle,
    form,
    onSubmit,
}: {
    showForm: boolean;
    onToggle: () => void;
    form: ReturnType<typeof useForm<{ end_at: string }>>;
    onSubmit: FormEventHandler;
}) {
    if (!showForm) {
        return (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                    Cuando se restablezca la conexión, cierre el evento para registrarlo en
                    el SIAT.
                </p>
                <button
                    type="button"
                    onClick={onToggle}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                    <Wifi className="h-4 w-4" />
                    Cerrar evento
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <div>
                <label
                    htmlFor="end_at"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                    Fecha y hora de cierre
                </label>
                <input
                    id="end_at"
                    type="datetime-local"
                    value={form.data.end_at}
                    onChange={(e) => form.setData('end_at', e.target.value)}
                    className={`block w-full max-w-sm rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[#b3282d] focus:outline-none focus:ring-1 focus:ring-[#b3282d] ${
                        form.errors.end_at ? 'border-red-400' : 'border-gray-300'
                    }`}
                />
                {form.errors.end_at && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                        {form.errors.end_at}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="submit"
                    disabled={form.processing}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.processing ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Registrando en SIAT…
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="h-4 w-4" />
                            Confirmar cierre
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={form.processing}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}

// Panel cuando el evento está REGISTERED (listo para reenviar paquete)
function ActionPanelRegistered({
    pendingCount,
    processing,
    onResend,
}: {
    pendingCount: number;
    processing: boolean;
    onResend: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
    const hasPending = pendingCount > 0;

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
                <PackageCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div>
                    <p className="text-sm font-medium text-gray-900">
                        Evento registrado en SIAT
                    </p>
                    <p className="text-xs text-gray-600">
                        {hasPending
                            ? `${pendingCount} factura(s) offline pendientes de empaquetar y enviar.`
                            : 'Todas las facturas ya fueron procesadas.'}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onResend}
                disabled={processing || !hasPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#b3282d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#9a2126] disabled:cursor-not-allowed disabled:opacity-60"
            >
                {processing ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando paquete…
                    </>
                ) : (
                    <>
                        <Upload className="h-4 w-4" />
                        Reenviar paquete de facturas
                    </>
                )}
            </button>
        </div>
    );
}