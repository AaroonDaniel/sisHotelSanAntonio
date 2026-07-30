import BackButton from '@/components/BackButton';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Banknote,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Receipt,
    Search,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';

export interface Payment {
    id: number;
    date: string; // ISO 8601, ya resuelto en el backend (payment_date o created_at)
    room_number: string; // Número de habitación, o "N/A"
    type: string; // PAGO | ADELANTO | DEVOLUCION
    payment_method: string; // EFECTIVO | QR | TARJETA | TRANSFERENCIA | N/D
    bank_name: string | null; // YAPE | BNB | FIE | ECO (solo si payment_method === 'QR')
    amount: number;
    operator_name: string;
}

// Logos disponibles en public/images/bancos/. Si el banco no tiene logo
// (o bank_name viene null/otro valor), se muestra solo el texto — el
// onError del <img> también cubre el caso de un archivo faltante.
const BANK_LOGOS: Record<string, string> = {
    YAPE: '/images/bancos/yape.png',
    BNB: '/images/bancos/bnb.png',
    FIE: '/images/bancos/fie.png',
    ECO: '/images/bancos/eco.png',
};

function PaymentMethodBadge({
    method,
    bankName,
}: {
    method: string;
    bankName: string | null;
}) {
    const upperMethod = method?.toUpperCase();

    if (upperMethod === 'EFECTIVO') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                <Banknote className="h-3.5 w-3.5" />
                Efectivo
            </span>
        );
    }

    if (upperMethod === 'QR') {
        const logo = bankName ? BANK_LOGOS[bankName] : undefined;
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                {logo && (
                    <img
                        src={logo}
                        alt={bankName ?? 'QR'}
                        className="h-5 w-auto object-contain"
                        onError={(e) => {
                            (
                                e.currentTarget as HTMLImageElement
                            ).style.display = 'none';
                        }}
                    />
                )}
                QR{bankName ? ` - ${bankName}` : ''}
            </span>
        );
    }

    // TARJETA / TRANSFERENCIA / N/D — método distinto a efectivo/QR.
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
            <CreditCard className="h-3.5 w-3.5" />
            {upperMethod || 'N/D'}
        </span>
    );
}

interface Props {
    auth: { user: User };
    // Laravel paginate() envía los datos dentro de un objeto con la propiedad "data"
    payments: {
        data: Payment[];
        total?: number;
        current_page: number;
        last_page: number;
        prev_page_url: string | null;
        next_page_url: string | null;
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
            payment.payment_method?.toLowerCase().includes(term) ||
            payment.bank_name?.toLowerCase().includes(term) ||
            payment.type?.toLowerCase().includes(term) ||
            payment.room_number?.toLowerCase().includes(term) ||
            payment.operator_name?.toLowerCase().includes(term) ||
            payment.amount.toString().includes(term)
        );
    });

    const goToPage = (url: string | null) => {
        if (!url) return;
        router.get(
            url,
            {},
            { preserveState: true, replace: true, only: ['payments'] },
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Historial de Pagos" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            Historial de Transacciones
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Registro de todos los pagos y devoluciones
                            procesados
                        </p>
                    </div>
                    <BackButton />
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
                                                            <PaymentMethodBadge
                                                                method={
                                                                    payment.payment_method
                                                                }
                                                                bankName={
                                                                    payment.bank_name
                                                                }
                                                            />
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
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 uppercase">
                                                            <UserRound className="h-3.5 w-3.5 text-gray-400" />
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

                        {/* Paginación */}
                        {payments.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
                                <span className="text-xs text-gray-500">
                                    Página {payments.current_page} de{' '}
                                    {payments.last_page} (
                                    {payments.total ?? payments.data.length}{' '}
                                    registros)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            goToPage(payments.prev_page_url)
                                        }
                                        disabled={!payments.prev_page_url}
                                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() =>
                                            goToPage(payments.next_page_url)
                                        }
                                        disabled={!payments.next_page_url}
                                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Siguiente
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
