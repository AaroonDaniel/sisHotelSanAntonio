import BackButton from '@/components/BackButton';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useCan } from '@/hooks/use-can';
import {
    BedDouble,
    Calendar,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Pencil,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CheckinDetailModal from './checkindetailModal';
import DeleteModal from './deleteModal';

// --- INTERFACES ---
interface Service {
    id: number;
    name: string;
    price: number;
}

interface Room {
    id: number;
    number: string;
}

interface Guest {
    id: number;
    full_name: string;
}

interface Checkin {
    id: number;
    room_id: number;
    guest_id: number;
    guest: Guest;
    room: Room;
}

interface CheckinDetail {
    id: number;
    checkin_id: number;
    service_id: number;
    quantity: number;
    selling_price: number;
    created_at: string;
    service: Service;
    checkin: Checkin;
}

interface Props {
    auth: { user: User };
    checkindetails: CheckinDetail[];
    checkins: Checkin[]; // Lista de checkins activos
    services: Service[];
}

export default function CheckinDetailsIndex({
    auth,
    checkindetails,
    checkins,
    services,
}: Props) {
    const { hasRole } = useCan();
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [detailToEdit, setDetailToEdit] = useState<CheckinDetail | null>(
        null,
    );
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [detailToDeleteId, setDetailToDeleteId] = useState<number | null>(
        null,
    );

    // --- FILTRADO ---
    const filteredDetails = checkindetails.filter((detail) => {
        const searchLower = searchTerm.toLowerCase();
        // 🚀 Check-in diferido: guest.full_name puede llegar en null
        // (huésped aún sin datos completos) — sin el fallback, .toLowerCase()
        // sobre null tumba todo el filtro.
        return (
            detail.service.name.toLowerCase().includes(searchLower) ||
            (detail.checkin.guest.full_name ?? '')
                .toLowerCase()
                .includes(searchLower) ||
            detail.checkin.room.number.toString().includes(searchLower)
        );
    });

    // 🚀 Paginación en cliente, igual que Huéspedes.
    const DETAILS_PER_PAGE = 15;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(
        1,
        Math.ceil(filteredDetails.length / DETAILS_PER_PAGE),
    );
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);
    const paginatedDetails = filteredDetails.slice(
        (currentPage - 1) * DETAILS_PER_PAGE,
        currentPage * DETAILS_PER_PAGE,
    );

    // --- ACCIONES ---
    const openCreateModal = () => {
        setDetailToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (detail: CheckinDetail) => {
        setDetailToEdit(detail);
        setIsModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDetailToDeleteId(id);
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
            <Head title="Detalle de Consumos" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-3xl font-bold text-white">
                        Gestión de Consumos
                    </h2>
                    <BackButton />
                </div>

                <div className="py-12">
                    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {/* Header: Buscador y Botón Agregar (Sin select externo) */}
                        <div className="flex flex-col gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
                            {/* Buscador */}
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
                                    placeholder="Buscar servicio, huésped o habitación..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            {/* Botón Agregar */}
                            <button
                                onClick={openCreateModal}
                                className="group flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Agregar Consumo</span>
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
                                        <th className="px-6 py-4">Servicio</th>
                                        <th className="px-6 py-4 text-center">
                                            Cantidad
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Total
                                        </th>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedDetails.length > 0 ? (
                                        paginatedDetails.map((detail) => (
                                            <tr
                                                key={detail.id}
                                                className="transition-colors hover:bg-gray-50"
                                            >
                                                {/* Habitación */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 font-bold text-gray-900">
                                                        <div className="rounded bg-green-100 p-1 text-green-600">
                                                            <BedDouble className="h-4 w-4" />
                                                        </div>
                                                        {
                                                            detail.checkin.room
                                                                .number
                                                        }
                                                    </div>
                                                </td>

                                                {/* Huésped */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                                        <span className="font-medium text-gray-800">
                                                            {
                                                                detail.checkin
                                                                    .guest
                                                                    .full_name
                                                            }
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Servicio */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="rounded bg-blue-50 p-1 text-blue-500">
                                                            <ShoppingCart className="h-4 w-4" />
                                                        </div>
                                                        {detail.service.name}
                                                    </div>
                                                </td>

                                                {/* Cantidad */}
                                                <td className="px-6 py-4 text-center font-medium">
                                                    {detail.quantity}
                                                </td>

                                                {/* Total */}
                                                <td className="px-6 py-4 text-right font-mono font-bold text-green-700">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {(
                                                            detail.quantity *
                                                            detail.selling_price
                                                        ).toFixed(2)}
                                                    </div>
                                                </td>

                                                {/* Fecha */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1 text-gray-500">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(
                                                            detail.created_at,
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() =>
                                                                openEditModal(
                                                                    detail,
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
{hasRole('administrador') && (
                                                        <button
                                                            onClick={() =>
                                                                openDeleteModal(
                                                                    detail.id,
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-red-600"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados.'
                                                    : 'No hay consumos registrados.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
                                <span className="text-xs text-gray-500">
                                    Página {currentPage} de {totalPages} (
                                    {filteredDetails.length} consumos)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
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

                {/* MODALES */}
                <CheckinDetailModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    detailToEdit={detailToEdit}
                    checkins={checkins} // Pasamos la lista completa de habitaciones
                    services={services}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    checkindetailId={detailToDeleteId}
                />
            </div>
        </AuthenticatedLayout>
    );
}
