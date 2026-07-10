import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowLeft,
    ArrowUpRight,
    Receipt,
    Search,
} from 'lucide-react';
import { useState } from 'react';

export interface Payment {
    id: number;
    date: string; // ISO 8601, ya resuelto en el backend (payment_date o created_at)
    room_number: string; // Número de habitación, o "N/A"
    type: string; // PAGO | ADELANTO | DEVOLUCION
    method: string; // Ej. "EFECTIVO" o "QR (BNB)"
    amount: number;
    operator_name: string;
}

interface Props {
    auth: { user: User };
    // Laravel paginate() envía los datos dentro de un objeto con la propiedad "data"
    payments: {
        data: Payment[];
        total?: number;
    };
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);

// Formato explícito DD/MM/YYYY, HH:MM a.m./p.m. — nunca debe devolver "-":
// el backend ya garantiza que `date` siempre trae un valor (payment_date o,
// si ese venía vacío, created_at).
const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Sin fecha';

    const datePart = date.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    const timePart = date
        .toLocaleTimeString('es-BO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
        .replace('a. m.', 'a.m.')
        .replace('p. m.', 'p.m.');

    return `${datePart}, ${timePart}`;
};

export default function PaymentHistory({ auth, payments }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Filtro básico en el cliente (para la página actual)
    const filteredPayments = payments.data.filter((payment) => {
        const term = searchTerm.toLowerCase();

        return (
            payment.method?.toLowerCase().includes(term) ||
            payment.type?.toLowerCase().includes(term) ||
            payment.room_number?.toLowerCase().includes(term) ||
            payment.operator_name?.toLowerCase().includes(term) ||
            payment.amount.toString().includes(term)
        );
    });

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
                    <h2 className="text-3xl font-bold text-white">
                        Historial de Transacciones
                    </h2>
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
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    placeholder="Buscar por habitación, método, tipo, operador..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                                <Receipt className="h-5 w-5" />
                                Total Registros:{' '}
                                {payments.total ?? payments.data.length}
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">
                                            Fecha y Hora
                                        </th>
                                        <th className="px-6 py-4">
                                            Habitación
                                        </th>
                                        <th className="px-6 py-4">
                                            Tipo / Método
                                        </th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4">
                                            Recibido por
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredPayments.length > 0 ? (
                                        filteredPayments.map((payment) => {
                                            // Determinamos si es devolución para el color (rojo = sale dinero)
                                            const isRefund =
                                                payment.type?.toUpperCase() ===
                                                    'DEVOLUCION' ||
                                                payment.type?.toUpperCase() ===
                                                    'DEVOLUCIÓN';

                                            return (
                                                <tr
                                                    key={payment.id}
                                                    className="transition-colors hover:bg-gray-50"
                                                >
                                                    <td className="px-6 py-4 font-medium whitespace-nowrap text-gray-900">
                                                        {formatDateTime(
                                                            payment.date,
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {payment.room_number}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {isRefund ? (
                                                                <ArrowUpRight className="h-4 w-4 shrink-0 text-red-500" />
                                                            ) : (
                                                                <ArrowDownRight className="h-4 w-4 shrink-0 text-green-500" />
                                                            )}
                                                            <span
                                                                className={`font-semibold whitespace-nowrap ${isRefund ? 'text-red-700' : 'text-green-700'}`}
                                                            >
                                                                {payment.type?.toUpperCase() ||
                                                                    'PAGO'}
                                                            </span>
                                                            <span className="mx-1 text-gray-400">
                                                                -
                                                            </span>
                                                            <span className="whitespace-nowrap text-gray-600">
                                                                {payment.method}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td
                                                        className={`px-6 py-4 font-bold whitespace-nowrap ${isRefund ? 'text-red-600' : 'text-green-600'}`}
                                                    >
                                                        {isRefund && '- '}
                                                        {formatCurrency(
                                                            Math.abs(
                                                                payment.amount,
                                                            ),
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 uppercase">
                                                            {
                                                                payment.operator_name
                                                            }
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados.'
                                                    : 'No hay transacciones registradas.'}
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
