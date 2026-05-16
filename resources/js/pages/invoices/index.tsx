import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Ban,
    CheckCircle2,
    FileText,
    Receipt,
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
    guest_name: string;
    room_number: string;
    user_name: string;
    status: string; // Ej: VALIDADA, ANULADA, PENDIENTE_ENVIO_OFFLINE
}

interface Props {
    auth: any;
    Invoices: InvoiceData[];
}

export default function InvoicesIndex({ auth, Invoices }: Props) {
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

    const checkIsFactura = (code: string) => {
        if (!code) return false;
        if (code === '-') return false; // Los recibos antiguos o ventas sin SIAT
        return code.length > 5; // Un CUF o código de control siempre tiene más de 5 caracteres
    };

    const openVoidModal = (id: number, number: string) => {
        setInvoiceToVoid({ id, number });
        setIsVoidModalOpen(true);
    };

    const filteredInvoices = Invoices.filter((invoice) => {
        const isFactura = checkIsFactura(invoice.control_code);
        if (activeTab === 'facturas' && !isFactura) return false;
        if (activeTab === 'recibos' && isFactura) return false;
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
                            {/* Header del visor */}
                            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                                {/* Título opcional */}
                                <h2 className="text-sm font-semibold text-gray-700">
                                    Vista previa del PDF
                                </h2>

                                {/* Botones */}
                                <div className="flex items-center gap-2">
                                    {/* Abrir en nueva pestaña */}
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                                    >
                                        Abrir
                                    </a>

                                    {/* Descargar PDF */}
                                    <a
                                        href={pdfUrl}
                                        download
                                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                                    >
                                        Descargar
                                    </a>

                                    {/* Cerrar visor */}
                                    <button
                                        onClick={() => setPdfUrl(null)}
                                        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-black"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>

                            {/* Visor PDF */}
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
                                        const isFactura = checkIsFactura(
                                            invoice.control_code,
                                        );
                                        const isAnulada =
                                            invoice.status === 'ANULADA' ||
                                            invoice.status === 'voided';
                                        const isOffline =
                                            invoice.status ===
                                            'PENDIENTE_ENVIO_OFFLINE';

                                        return (
                                            <tr
                                                key={invoice.id}
                                                className={`transition-colors hover:bg-gray-50/50 ${isAnulada ? 'bg-red-50/20' : ''}`}
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
                                                                <Ban className="h-3 w-3" />{' '}
                                                                Anulada
                                                            </span>
                                                        ) : isOffline ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                                                <AlertTriangle className="h-3 w-3" />{' '}
                                                                Offline
                                                                (Contingencia)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                                                <CheckCircle2 className="h-3 w-3" />{' '}
                                                                Validada
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
                                                        <button
                                                            onClick={() =>
                                                                setPdfUrl(
                                                                    `/checks/${invoice.checkin_id}/checkout-${isFactura ? 'invoice' : 'receipt'}`,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-600 hover:text-white"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" />{' '}
                                                            Ver Doc
                                                        </button>
                                                        {isFactura &&
                                                            !isAnulada && (
                                                                <button
                                                                    onClick={() =>
                                                                        openVoidModal(
                                                                            invoice.id,
                                                                            invoice.invoice_number,
                                                                        )
                                                                    }
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                                                                >
                                                                    <Ban className="h-3.5 w-3.5" />{' '}
                                                                    Anular
                                                                </button>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
