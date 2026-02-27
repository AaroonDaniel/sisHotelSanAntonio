import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { 
    Receipt, FileText, Search, FileDown, Eye, CheckCircle2, XCircle
} from 'lucide-react';
import { useState } from 'react';

// Interfaz de los datos que nos envía el InvoiceController
interface InvoiceData {
    id: number;
    invoice_number: string;
    issue_date: string;
    issue_time: string;
    control_code: string;
    payment_method: string;
    status: string;
    guest_name: string;
    room_number: string;
    user_name: string;
}

interface Props {
    auth: {
        user: User;
    };
    Invoices: InvoiceData[];
}

export default function InvoicesIndex({ auth, Invoices }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Función simple para filtrar la tabla
    const filteredInvoices = Invoices.filter(invoice => 
        String(invoice.invoice_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(invoice.guest_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(invoice.room_number).includes(searchTerm)
    );

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Facturación y Recibos" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-4rem)]">
                
                {/* ENCABEZADO */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                            <div className="rounded-xl bg-green-500/20 p-2">
                                <Receipt className="h-8 w-8 text-green-400" />
                            </div>
                            Facturación e Historial
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Registro de todas las facturas y recibos emitidos en el sistema.
                        </p>
                    </div>

                    {/* Buscador */}
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por N°, Huésped o Hab..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-gray-600 bg-gray-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* TARJETA DE LA TABLA */}
                <div className="flex-1 overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col animate-in fade-in duration-300">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs">N° Doc.</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs">Fecha / Hora</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs">Huésped</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs">Hab</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs">Método</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs">Estado</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs text-center">Cajero</th>
                                    <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-xs text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredInvoices.length > 0 ? (
                                    filteredInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                                            
                                            {/* Número de Factura */}
                                            <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-gray-400" />
                                                    {invoice.invoice_number}
                                                </div>
                                            </td>

                                            {/* Fecha y Hora */}
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="font-medium text-gray-800">{invoice.issue_date}</div>
                                                <div className="text-xs text-gray-500">{invoice.issue_time}</div>
                                            </td>

                                            {/* Huésped */}
                                            <td className="px-6 py-3 text-gray-800 font-medium">
                                                {invoice.guest_name}
                                            </td>

                                            {/* Habitación */}
                                            <td className="px-6 py-3 text-gray-600 font-semibold">
                                                {invoice.room_number}
                                            </td>

                                            {/* Método de Pago */}
                                            <td className="px-6 py-3 text-gray-600">
                                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                    {invoice.payment_method}
                                                </span>
                                            </td>

                                            {/* Estado */}
                                            <td className="px-6 py-3">
                                                {invoice.status.toLowerCase() === 'anulada' || invoice.status.toLowerCase() === 'cancelada' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                                                        <XCircle className="h-3.5 w-3.5" /> Anulada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> {invoice.status || 'Emitida'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Cajero */}
                                            <td className="px-6 py-3 text-gray-500 text-sm text-center">
                                                {invoice.user_name}
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-3 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="Ver Documento"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button 
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                                        title="Descargar PDF"
                                                    >
                                                        <FileDown className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <Receipt className="h-12 w-12 text-gray-300 mb-3" />
                                                <p className="text-lg font-medium text-gray-900">No hay facturas registradas</p>
                                                <p className="text-sm">Intenta buscar con otro término o genera una nueva desde Recepción.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* FOOTER TABLA */}
                    <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-3 flex items-center justify-between text-sm text-gray-500">
                        Mostrando {filteredInvoices.length} documentos
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}