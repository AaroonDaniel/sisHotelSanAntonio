import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowDownRight,
    ArrowUpRight,
    Search,
    Receipt
} from 'lucide-react';
import { useState } from 'react';

export interface Payment {
    id: number;
    amount: string | number;
    method: string;
    type: string;
    payment_date: string;
    status: string;
    user?: {
        id: number;
        name: string;
        full_name?: string;
        nickname?: string;
    };
    checkin?: {
        id: number;
        room?: {
            name: string;
            number: string;
        };
    };
}

interface Props {
    auth: { user: User };
    // Laravel paginate() envía los datos dentro de un objeto con la propiedad "data"
    payments: {
        data: Payment[];
    };
}

export default function PaymentHistory({ auth, payments }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Filtro básico en el cliente (para la página actual)
    const filteredPayments = payments.data.filter((payment) => {
        const term = searchTerm.toLowerCase();
        const receiverName = (payment.user?.full_name || payment.user?.name || '').toLowerCase();
        
        return (
            payment.method?.toLowerCase().includes(term) ||
            payment.type?.toLowerCase().includes(term) ||
            receiverName.includes(term) ||
            payment.amount.toString().includes(term)
        );
    });

    // Formateador de fecha y hora
    const formatDateTime = (dateString?: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Historial de Pagos" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div>
                    <h2 className="text-3xl font-bold text-white">Historial de Transacciones</h2>
                    <p className="mt-1 text-sm text-gray-400">
                        Registro de todos los pagos y devoluciones procesados
                    </p>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {/* Header: Buscador */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-72">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por método, tipo, usuario..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm">
                                <Receipt className="h-5 w-5" />
                                Total Registros: {payments.data.length}
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Fecha y Hora</th>
                                        <th className="px-6 py-4">Tipo / Método</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4">Recibido por</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredPayments.length > 0 ? (
                                        filteredPayments.map((payment) => {
                                            // Determinamos si es pago o devolución para el color
                                            const isRefund = payment.type?.toLowerCase() === 'devolución' || payment.type?.toLowerCase() === 'refund';
                                            
                                            return (
                                                <tr key={payment.id} className="transition-colors hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {formatDateTime(payment.payment_date)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {isRefund ? (
                                                                <ArrowUpRight className="h-4 w-4 text-red-500" />
                                                            ) : (
                                                                <ArrowDownRight className="h-4 w-4 text-green-500" />
                                                            )}
                                                            <span className={`font-semibold ${isRefund ? 'text-red-700' : 'text-green-700'}`}>
                                                                {payment.type || 'Pago'}
                                                            </span>
                                                            <span className="text-gray-400 mx-1">-</span>
                                                            <span className="text-gray-600 capitalize">{payment.method}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        Bs. {Number(payment.amount).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                                            {payment.user?.full_name || payment.user?.nickname || payment.user?.name || 'Sistema'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay transacciones registradas.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
