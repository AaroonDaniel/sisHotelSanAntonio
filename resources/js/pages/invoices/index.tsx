import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Ban,
    CheckCircle2,
    ExternalLink, // Añadimos el ícono para el enlace externo
    FileText,
    LifeBuoy,
    Receipt,
    RefreshCw,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import VoidInvoiceModal from './VoidInvoiceModal';

interface InvoiceData {
    id: number;
    checkin_id: number;
    invoice_number: string;
    issue_date: string;
    issue_time: string;
    control_code: string;
    payment_method: string;
    guest_name: string;
    room_number: string;
    user_name: string;
    status: string; // 'valid' | 'voided'
    siat_status: string; // 'pending' | 'accepted' | 'rejected' | 'offline'
    is_factura: boolean;
    is_offline: boolean;
    is_voided: boolean;
    can_void: boolean;
    can_resend: boolean;
    total_amount?: number; // Asegúrate de enviarlo desde el backend para formar la URL
}

interface Props {
    auth: any;
    Invoices: InvoiceData[];
    hasOrphanedOffline: boolean;
    orphanedOfflineCount: number;
}

export default function InvoicesIndex({
    auth,
    Invoices,
    hasOrphanedOffline,
    orphanedOfflineCount,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<
        'facturas' | 'recibos' | 'ambos'
    >('ambos');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Modal de anulación
    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [invoiceToVoid, setInvoiceToVoid] = useState<{
        id: number;
        number: string;
    } | null>(null);

    // Loading state para reenvío
    const [resendingId, setResendingId] = useState<number | null>(null);

    // Loading state para rescate de huérfanas
    const [isRescuing, setIsRescuing] = useState(false);

    const openVoidModal = (id: number, number: string) => {
        setInvoiceToVoid({ id, number });
        setIsVoidModalOpen(true);
    };

    const handleRescueOrphans = () => {
        const confirmMsg =
            `Se detectaron ${orphanedOfflineCount} factura(s) offline huérfana(s) ` +
            `(emitidas sin vincular a un Evento Significativo).\n\n` +
            `El sistema verificará la conexión con SIAT y creará un Evento de Rescate ` +
            `para vincular automáticamente todas estas facturas.\n\n` +
            `Si no hay conexión, el evento se creará localmente igual.\n\n` +
            `¿Desea continuar?`;

        if (!confirm(confirmMsg)) return;

        setIsRescuing(true);

        router.post(
            '/facturacion/rescatar-huerfanas',
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsRescuing(false),
            },
        );
    };

    const handleResendOffline = (invoice: InvoiceData) => {
        if (
            !confirm(
                `¿Re-enviar la factura #${invoice.invoice_number} al SIAT?\n\n` +
                    `Esta operación intentará subir el XML guardado en contingencia.`,
            )
        ) {
            return;
        }

        setResendingId(invoice.id);

        router.post(
            `/facturacion/${invoice.id}/resend-offline`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setResendingId(null),
            },
        );
    };

    const filteredInvoices = Invoices.filter((invoice) => {
        if (activeTab === 'facturas' && !invoice.is_factura) return false;
        if (activeTab === 'recibos' && invoice.is_factura) return false;
        return (
            String(invoice.invoice_number)
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            String(invoice.guest_name)
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            String(invoice.room_number).includes(searchTerm)
        );
    });

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Facturación y Recibos" />

            <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
                <button
                    onClick={() => window.history.back()}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div className="mb-4 flex flex-shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* =========================================================
    ALERTA DE FACTURAS OFFLINE HUÉRFANAS (RESCATE)
    Aparece solo si hay facturas con siat_status='offline'
    y significant_event_id = NULL
========================================================= */}
                    {hasOrphanedOffline && !pdfUrl && (
                        <div className="mb-4 flex flex-col gap-3 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow-md">
                                    <AlertTriangle className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-amber-900">
                                        Facturas Offline Huérfanas Detectadas
                                    </h3>
                                    <p className="mt-1 text-sm text-amber-800">
                                        Se encontraron{' '}
                                        <strong className="font-extrabold">
                                            {orphanedOfflineCount}
                                        </strong>{' '}
                                        factura
                                        {orphanedOfflineCount === 1 ? '' : 's'}{' '}
                                        emitida
                                        {orphanedOfflineCount === 1
                                            ? ''
                                            : 's'}{' '}
                                        en contingencia que no están vinculada
                                        {orphanedOfflineCount === 1 ? '' : 's'}{' '}
                                        a un Evento Significativo. Cree un
                                        evento de rescate para poder reenviarlas
                                        al SIAT.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleRescueOrphans}
                                disabled={isRescuing}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:flex-shrink-0"
                            >
                                {isRescuing ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <LifeBuoy className="h-4 w-4" />
                                        Crear Evento para Facturas Huérfanas
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                    <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                        <div className="rounded-xl border border-green-100 bg-green-100 p-2">
                            <FileText className="h-8 w-8 text-green-600" />
                        </div>
                        Gestión de Documentos
                    </h2>

                    {!pdfUrl && (
                        <div className="relative w-full sm:w-72">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por N° o Huésped..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-600 bg-gray-800 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>

                {pdfUrl ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="flex h-[75vh] w-full max-w-3xl animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl zoom-in-95 fade-in">
                            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                                <h2 className="text-sm font-semibold text-gray-700">
                                    Vista previa del PDF
                                </h2>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                                    >
                                        Abrir
                                    </a>

                                    <a
                                        href={pdfUrl}
                                        download
                                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                                    >
                                        Descargar
                                    </a>

                                    <button
                                        onClick={() => setPdfUrl(null)}
                                        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-black"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 bg-gray-200 p-2">
                                <iframe
                                    src={pdfUrl}
                                    className="h-full w-full rounded-xl border border-gray-300 bg-white shadow-sm"
                                    title="Visor de Documento"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="sticky top-0 z-10 bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">
                                            N° Doc.
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">
                                            Estado
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">
                                            Fecha / Hora
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase">
                                            Huésped
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredInvoices.map((invoice) => {
                                        const isFactura = invoice.is_factura;
                                        const isAnulada = invoice.is_voided;
                                        const isOffline = invoice.is_offline;
                                        const isResending =
                                            resendingId === invoice.id;

                                        // CONSTRUCCIÓN DE LA URL DE VERIFICACIÓN SIAT
                                        // Usa config('siat.nit') si lo envías desde backend, o pon tu NIT real.
                                        const siatUrl = `https://pilotosiat.impuestos.gob.bo/consulta/QR?nit=3327479013&cuf=${invoice.control_code}&numero=${invoice.invoice_number}&t=${invoice.total_amount || 720}`;

                                        return (
                                            <tr
                                                key={invoice.id}
                                                className={`transition-colors hover:bg-gray-50/50 ${isAnulada ? 'bg-red-50/20' : ''} ${isOffline ? 'bg-amber-50/30' : ''}`}
                                            >
                                                <td className="px-6 py-3 font-medium whitespace-nowrap text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        {isFactura ? (
                                                            <FileText
                                                                className={`h-4 w-4 ${isAnulada ? 'text-red-400' : 'text-green-600'}`}
                                                            />
                                                        ) : (
                                                            <Receipt className="h-4 w-4 text-emerald-400" />
                                                        )}
                                                        <span
                                                            className={
                                                                isAnulada
                                                                    ? 'text-red-400 line-through'
                                                                    : ''
                                                            }
                                                        >
                                                            #
                                                            {
                                                                invoice.invoice_number
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    {isFactura ? (
                                                        isAnulada ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                                                <Ban className="h-3 w-3" />
                                                                Anulada
                                                            </span>
                                                        ) : isOffline ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                Offline
                                                                (Contingencia)
                                                            </span>
                                                        ) : invoice.siat_status ===
                                                          'rejected' ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                Rechazada
                                                            </span>
                                                        ) : invoice.siat_status ===
                                                          'accepted' ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Validada
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                                                Pendiente
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                                            Recibo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <div className="font-medium text-gray-800">
                                                        {invoice.issue_date}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {invoice.issue_time}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 font-medium text-gray-800">
                                                    {invoice.guest_name}
                                                </td>
                                                <td className="px-6 py-3 text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-2">
                                                        {/* BOTÓN: VER PDF */}
                                                        <button
                                                            onClick={() =>
                                                                setPdfUrl(
                                                                    `/facturacion/${invoice.id}/download`,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white"
                                                            title="Ver documento"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" />
                                                            Ver PDF
                                                        </button>

                                                        {/* BOTÓN: VERIFICAR EN SIAT */}
                                                        {isFactura &&
                                                            invoice.siat_status ===
                                                                'accepted' &&
                                                            !isAnulada && (
                                                                <a
                                                                    href={
                                                                        siatUrl
                                                                    }
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-600 hover:text-white"
                                                                    title="Verificar en Impuestos Nacionales"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                    Validar SIAT
                                                                </a>
                                                            )}

                                                        {/* BOTÓN: RE-ENVIAR OFFLINE */}
                                                        {invoice.can_resend && (
                                                            <button
                                                                onClick={() =>
                                                                    handleResendOffline(
                                                                        invoice,
                                                                    )
                                                                }
                                                                disabled={
                                                                    isResending
                                                                }
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                                                title="Re-enviar al SIAT"
                                                            >
                                                                <RefreshCw
                                                                    className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`}
                                                                />
                                                                {isResending
                                                                    ? 'Enviando...'
                                                                    : 'Re-enviar'}
                                                            </button>
                                                        )}

                                                        {/* BOTÓN: ANULAR */}
                                                        {invoice.can_void && (
                                                            <button
                                                                onClick={() =>
                                                                    openVoidModal(
                                                                        invoice.id,
                                                                        invoice.invoice_number,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                                                                title="Anular factura"
                                                            >
                                                                <Ban className="h-3.5 w-3.5" />
                                                                Anular
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-6 py-10 text-center text-sm text-gray-400"
                                            >
                                                {activeTab === 'recibos'
                                                    ? 'Los recibos no se registran en esta tabla. Para verlos, ingresa al historial de check-ins finalizados.'
                                                    : 'No hay documentos para mostrar.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <VoidInvoiceModal
                isOpen={isVoidModalOpen}
                onClose={() => setIsVoidModalOpen(false)}
                invoiceId={invoiceToVoid?.id || null}
                invoiceNumber={invoiceToVoid?.number || null}
            />
        </AuthenticatedLayout>
    );
}
