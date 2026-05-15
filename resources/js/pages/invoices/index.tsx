import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FileText, Layers, Receipt, Search, ArrowLeft, Ban } from 'lucide-react';
import { useState } from 'react';
import VoidInvoiceModal from './VoidInvoiceModal'; // <-- Asegúrate de que la ruta sea correcta

// Interfaz de datos
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
    status?: string; // <-- Añadido para saber si ya está anulada (opcional)
}

interface Props {
    auth: {
        user: User;
    };
    Invoices: InvoiceData[];
}

export default function InvoicesIndex({ auth, Invoices }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'facturas' | 'recibos' | 'ambos'>('ambos');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Estados para el Modal de Anulación
    const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
    const [invoiceToVoid, setInvoiceToVoid] = useState<{ id: number, number: string } | null>(null);

    const checkIsFactura = (code: string) => {
        return code && code.trim() !== '' && code !== '-';
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
            String(invoice.invoice_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(invoice.guest_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(invoice.room_number).includes(searchTerm)
        );
    });

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Facturación y Recibos" />

            <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
                <button
                    onClick={() => window.history.back()}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>
                
                {/* ENCABEZADO SUPERIOR */}
                <div className="mb-4 flex flex-shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                            <div className="rounded-xl border border-green-100 bg-green-100 p-2">
                                {activeTab === 'facturas' ? (
                                    <FileText className="h-8 w-8 text-green-600" />
                                ) : activeTab === 'recibos' ? (
                                    <Receipt className="h-8 w-8 text-green-600" />
                                ) : (
                                    <Layers className="h-8 w-8 text-green-600" />
                                )}
                            </div>
                            {activeTab === 'facturas'
                                ? 'Historial de Facturas'
                                : activeTab === 'recibos'
                                  ? 'Historial de Recibos'
                                  : 'Todos los Documentos'}
                        </h2>
                    </div>

                    {/* Buscador */}
                    {!pdfUrl && (
                        <div className="relative w-full sm:w-72">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por N°, Huésped o Hab..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-gray-600 bg-gray-800 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-400 transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>

                {/* MENÚ DE PESTAÑAS (TABS) */}
                {!pdfUrl && (
                    <div className="mb-4 flex flex-shrink-0 space-x-3">
                        <button
                            onClick={() => setActiveTab('ambos')}
                            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                                activeTab === 'ambos'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <Layers className="h-4 w-4" />
                            Ambos
                        </button>
                        <button
                            onClick={() => setActiveTab('facturas')}
                            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                                activeTab === 'facturas'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <FileText className="h-4 w-4" />
                            Facturas
                        </button>
                        <button
                            onClick={() => setActiveTab('recibos')}
                            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                                activeTab === 'recibos'
                                    ? 'bg-green-600 text-white shadow-md'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <Receipt className="h-4 w-4" />
                            Recibos
                        </button>
                    </div>
                )}

                {/* CONTENIDO PRINCIPAL (VISOR PDF O TABLA) */}
                {pdfUrl ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="flex h-[70vh] w-full max-w-3xl animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl zoom-in-95 fade-in">
                            <div className="flex-1 bg-gray-200 p-2">
                                <iframe
                                    src={pdfUrl}
                                    className="h-full w-full rounded-xl border border-gray-300 bg-white shadow-sm"
                                    title="Visor de Documento"
                                />
                            </div>
                            <div className="flex justify-end border-t border-gray-100 bg-white px-4 py-2">
                                <button
                                    onClick={() => setPdfUrl(null)}
                                    className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-bold text-white hover:bg-black"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl duration-300 fade-in">
                        <div className="flex-1 overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="sticky top-0 z-10 bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-gray-600 uppercase">N° Doc.</th>
                                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-gray-600 uppercase">Fecha / Hora</th>
                                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-gray-600 uppercase">Huésped</th>
                                        <th className="px-6 py-4 text-xs font-bold tracking-wider text-gray-600 uppercase">Hab</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold tracking-wider text-gray-600 uppercase">Cajero</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-gray-600 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredInvoices.length > 0 ? (
                                        filteredInvoices.map((invoice) => {
                                            const isFactura = checkIsFactura(invoice.control_code);
                                            // Opcional: Si tienes el campo status, puedes ocultar el botón si ya está anulada
                                            const isAnulada = invoice.status === 'ANULADA';

                                            return (
                                                <tr key={invoice.id} className="transition-colors hover:bg-gray-50/50">
                                                    <td className="px-6 py-3 font-medium whitespace-nowrap text-gray-900">
                                                        <div className="flex items-center gap-2" title={isFactura ? 'Factura Oficial' : 'Recibo Interno'}>
                                                            {isFactura ? (
                                                                <FileText className={`h-4 w-4 ${isAnulada ? 'text-red-500' : 'text-green-600'}`} />
                                                            ) : (
                                                                <Receipt className="h-4 w-4 text-green-400" />
                                                            )}
                                                            <span className={isAnulada ? 'line-through text-gray-400' : ''}>
                                                                {invoice.invoice_number}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                        <div className="font-medium text-gray-800">{invoice.issue_date}</div>
                                                        <div className="text-xs text-gray-500">{invoice.issue_time}</div>
                                                    </td>
                                                    <td className="px-6 py-3 font-medium text-gray-800">{invoice.guest_name}</td>
                                                    <td className="px-6 py-3 font-semibold text-gray-600">{invoice.room_number}</td>
                                                    <td className="px-6 py-3 text-center text-sm text-gray-500">{invoice.user_name}</td>
                                                    
                                                    {/* BOTONES DINÁMICOS */}
                                                    <td className="px-6 py-3 text-right whitespace-nowrap">
                                                        <div className="flex justify-end gap-2">
                                                            {isFactura ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => setPdfUrl(`/checks/${invoice.checkin_id}/checkout-invoice`)}
                                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-600 hover:text-white"
                                                                    >
                                                                        <FileText className="h-3.5 w-3.5" />
                                                                        Ver Factura
                                                                    </button>
                                                                    
                                                                    {/* BOTÓN DE ANULAR (Solo si no está ya anulada) */}
                                                                    {!isAnulada && (
                                                                        <button
                                                                            onClick={() => openVoidModal(invoice.id, invoice.invoice_number)}
                                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm transition-all hover:bg-red-600 hover:text-white"
                                                                        >
                                                                            <Ban className="h-3.5 w-3.5" />
                                                                            Anular
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setPdfUrl(`/checks/${invoice.checkin_id}/checkout-receipt`)}
                                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white"
                                                                >
                                                                    <Receipt className="h-3.5 w-3.5" />
                                                                    Ver Recibo
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Layers className="mb-3 h-12 w-12 text-gray-300" />
                                                    <p className="text-lg font-medium text-gray-900">No hay registros disponibles</p>
                                                    <p className="text-sm">Prueba cambiando de pestaña o buscando con otro término.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3 text-sm text-gray-500">
                            Mostrando {filteredInvoices.length} documentos
                        </div>
                    </div>
                )}
            </div>

            {/* RENDERIZAMOS EL MODAL AQUÍ */}
            <VoidInvoiceModal
                isOpen={isVoidModalOpen}
                onClose={() => setIsVoidModalOpen(false)}
                invoiceId={invoiceToVoid?.id || null}
                invoiceNumber={invoiceToVoid?.number || null}
            />
        </AuthenticatedLayout>
    );
}