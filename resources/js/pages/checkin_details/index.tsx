import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Clock,
    FileText,
    LogIn,
    Printer,
    Search,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';

// --- INTERFACES ---
interface Guest {
    id: number;
    full_name: string;
    identification_number: string;
}

interface Room {
    id: number;
    number: string;
    status: string;
    room_type?: { name: string };
}

interface Service {
    id: number;
    name: string;
}

interface Checkin {
    id: number;
    guest_id: number;
    room_id: number;
    check_in_date: string;
    check_out_date?: string | null;
    duration_days: number;
    advance_payment: number;
    guest?: Guest;
    room?: Room;
}

interface CheckinDetail {
    id: number;
    quantity: number;
    checkin_id: number;
    service_id: number;
    created_at: string;
    checkin?: Checkin;
    service?: Service;
}

interface Props {
    auth: { user: User };
    checkinDetails: CheckinDetail[];
    services?: Service[];
}

export default function CheckinDetailsIndex({ auth, checkinDetails }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Protección para evitar errores si llega undefined
    const dataList = checkinDetails || [];

    // --- LÓGICA DE FILTRADO ---
    const filteredDetails = dataList.filter((detail) => {
        const term = searchTerm.toLowerCase();

        const guestName = detail.checkin?.guest
            ? `${detail.checkin.guest.full_name}`.toLowerCase()
            : '';

        const roomNumber = detail.checkin?.room
            ? detail.checkin.room.number.toLowerCase()
            : '';

        const serviceName = detail.service?.name.toLowerCase() || '';

        return (
            guestName.includes(term) ||
            roomNumber.includes(term) ||
            serviceName.includes(term)
        );
    });

    // --- FORMATEO DE FECHA ---
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-BO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Detalles de Asignación" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => window.history.back()}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div>
                    <h2 className="text-3xl font-bold text-white">
                        Asignación y Detalles
                    </h2>
                    <p className="mt-1 text-gray-400">
                        Vista detallada de los consumos y servicios en
                        ocupaciones.
                    </p>
                </div>

                <div className="py-8">
                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {/* Buscador */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-96">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    placeholder="Buscar por huésped o habitación..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                // Agregamos esto para probar:
                                onClick={() =>
                                    alert('¡El botón funciona correctamente!')
                                }
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <FileText className="h-5 w-5" />
                                <span>Reporte General</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">
                                            Habitación
                                        </th>
                                        <th className="px-6 py-4">Huésped</th>
                                        <th className="px-6 py-4">
                                            Servicio / Detalle
                                        </th>
                                        <th className="px-6 py-4">
                                            Fecha Check-in
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            Estado Hab.
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredDetails.length > 0 ? (
                                        filteredDetails.map((detail) => (
                                            <tr
                                                key={detail.id}
                                                className="transition-colors hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 font-bold text-gray-900">
                                                        <div className="rounded bg-green-100 p-1 text-green-600">
                                                            <BedDouble className="h-4 w-4" />
                                                        </div>
                                                        {detail.checkin?.room
                                                            ?.number || 'S/N'}
                                                    </div>
                                                    <span className="ml-7 text-xs text-gray-500">
                                                        {
                                                            detail.checkin?.room
                                                                ?.room_type
                                                                ?.name
                                                        }
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                                        <span className="font-medium text-gray-800">
                                                            {detail.checkin
                                                                ?.guest
                                                                ?.full_name ||
                                                                'Desconocido'}
                                                        </span>
                                                    </div>
                                                    <div className="ml-6 text-xs text-gray-500">
                                                        CI:{' '}
                                                        {detail.checkin?.guest
                                                            ?.identification_number ||
                                                            '-'}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">
                                                        {detail.service?.name ||
                                                            'Servicio General'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Cant: {detail.quantity}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <div className="flex items-center gap-1 text-green-700">
                                                            <LogIn className="h-3 w-3" />
                                                            {formatDate(
                                                                detail.checkin
                                                                    ?.check_in_date,
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-gray-500">
                                                            <Clock className="h-3 w-3" />
                                                            {
                                                                detail.checkin
                                                                    ?.duration_days
                                                            }{' '}
                                                            días
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            !detail.checkin
                                                                ?.check_out_date
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                    >
                                                        {!detail.checkin
                                                            ?.check_out_date
                                                            ? 'Ocupado'
                                                            : 'Finalizado'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                            title="Ver Detalle"
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                if (
                                                                    detail.checkin_id
                                                                ) {
                                                                    window.open(
                                                                        `/checks/${detail.checkin_id}/receipt`,
                                                                        '_blank',
                                                                    );
                                                                }
                                                            }}
                                                            className="text-gray-400 transition hover:text-purple-600"
                                                            title="Imprimir Nota"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados.'
                                                    : 'No hay detalles registrados.'}
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
