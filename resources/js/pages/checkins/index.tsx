import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Clock,
    LogIn,
    LogOut,
    Pencil,
    Plus,
    Printer,
    Search,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import CheckinModal from './checkinModal';
import DeleteModal from './deleteModal';

// --- INTERFACES ---
interface Guest {
    id: number;
    first_name: string;
    last_name: string;
    identification_number: string;
}
interface Room {
    id: number;
    number: string;
    status: string;
    room_type?: { name: string };
    price?: { amount: number };
}

interface Checkin {
    id: number;
    guest_id: number;
    room_id: number;
    check_in_date: string;
    check_out_date?: string | null;
    duration_days: number;
    advance_payment: number;
    notes?: string;
    guest?: Guest;
    room?: Room;
}

interface Props {
    auth: { user: User };
    Checkins: Checkin[];
    Guests: Guest[];
    Rooms: Room[];
}

export default function CheckinsIndex({
    auth,
    Checkins,
    Guests,
    Rooms,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [editingCheckin, setEditingCheckin] = useState<Checkin | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingCheckinId, setDeletingCheckinId] = useState<number | null>(
        null,
    );

    // --- 1. LÓGICA DE FILTRADO ---
    const filteredCheckins = Checkins.filter((checkin) => {
        const term = searchTerm.toLowerCase();
        const guestName = checkin.guest
            ? `${checkin.guest.first_name} ${checkin.guest.last_name}`.toLowerCase()
            : '';
        const roomNumber = checkin.room
            ? checkin.room.number.toLowerCase()
            : '';
        return guestName.includes(term) || roomNumber.includes(term);
    });

    // --- 2. ACCIONES ---
    const handleCheckout = (checkin: Checkin) => {
        if (
            confirm(
                `¿Finalizar la estadía de la habitación ${checkin.room?.number}?`,
            )
        ) {
            router.patch(
                `/checks/${checkin.id}/checkout`,
                {},
                { preserveScroll: true },
            );
        }
    };

    const openCreateModal = () => {
        setEditingCheckin(null);
        setIsCheckinModalOpen(true);
    };

    const openEditModal = (checkin: Checkin) => {
        setEditingCheckin(checkin);
        setIsCheckinModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingCheckinId(id);
        setIsDeleteModalOpen(true);
    };

    const formatDate = (dateString: string) => {
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
            <Head title="Gestión de Hospedajes" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Botón Volver */}
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
                        Recepción y Check-in
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {/* Header: Buscador y Botón Crear */}
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
                                    placeholder="Buscar huésped o habitación..."
                                    // CAMBIO: Estilos verdes para coincidir con FloorsIndex
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                // CAMBIO: Botón verde para coincidir con FloorsIndex
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Ingreso</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">
                                            Habitación
                                        </th>
                                        <th className="px-6 py-4">Huésped</th>
                                        <th className="px-6 py-4">
                                            Entrada / Salida
                                        </th>
                                        <th className="px-6 py-4">Adelanto</th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredCheckins.length > 0 ? (
                                        filteredCheckins.map((checkin) => (
                                            <tr
                                                key={checkin.id}
                                                className="transition-colors hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 font-bold text-gray-400">
                                                    #{checkin.id}
                                                </td>

                                                {/* Habitación */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 font-bold text-gray-900">
                                                        {/* CAMBIO: Icono con fondo verde */}
                                                        <div className="rounded bg-green-100 p-1 text-green-600">
                                                            <BedDouble className="h-4 w-4" />
                                                        </div>
                                                        {checkin.room?.number ||
                                                            'S/N'}
                                                    </div>
                                                    <span className="ml-7 text-xs text-gray-500">
                                                        {
                                                            checkin.room
                                                                ?.room_type
                                                                ?.name
                                                        }
                                                    </span>
                                                </td>

                                                {/* Huésped */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                                        <span className="font-medium text-gray-800">
                                                            {
                                                                checkin.guest
                                                                    ?.first_name
                                                            }{' '}
                                                            {
                                                                checkin.guest
                                                                    ?.last_name
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="ml-6 text-xs text-gray-500">
                                                        CI:{' '}
                                                        {
                                                            checkin.guest
                                                                ?.identification_number
                                                        }
                                                    </div>
                                                </td>

                                                {/* Fechas */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        {/* CAMBIO: Texto verde para la fecha */}
                                                        <div className="flex items-center gap-1 text-green-700">
                                                            <LogIn className="h-3 w-3" />
                                                            {formatDate(
                                                                checkin.check_in_date,
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-gray-500">
                                                            <Clock className="h-3 w-3" />
                                                            {
                                                                checkin.duration_days
                                                            }{' '}
                                                            días
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Pago */}
                                                <td className="px-6 py-4 font-mono font-medium text-green-700">
                                                    Bs.{' '}
                                                    {checkin.advance_payment}
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Botón Imprimir Recibo */}
                                                        <button
                                                            onClick={() =>
                                                                window.open(
                                                                    `/checks/${checkin.id}/receipt`,
                                                                    '_blank',
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-purple-600"
                                                            title="Imprimir Recibo"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </button>

                                                        {/* Botón Checkout */}
                                                        {!checkin.check_out_date && (
                                                            <button
                                                                onClick={() =>
                                                                    handleCheckout(
                                                                        checkin,
                                                                    )
                                                                }
                                                                title="Finalizar Estadía (Check-out)"
                                                                // CAMBIO: Verde para acción principal
                                                                className="text-green-600 transition hover:text-green-800"
                                                            >
                                                                <LogOut className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {/* Botón Editar */}
                                                        <button
                                                            onClick={() =>
                                                                openEditModal(
                                                                    checkin,
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                            title="Editar Check-in"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        {/* Botón Eliminar */}
                                                        <button
                                                            onClick={() =>
                                                                openDeleteModal(
                                                                    checkin.id,
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-red-600"
                                                            title="Eliminar Registro"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
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
                                                    : 'No hay registros activos.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Modales */}
                <CheckinModal
                    show={isCheckinModalOpen}
                    onClose={() => setIsCheckinModalOpen(false)}
                    checkinToEdit={editingCheckin}
                    guests={Guests}
                    rooms={Rooms}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    checkinId={deletingCheckinId}
                />
            </div>
        </AuthenticatedLayout>
    );
}
