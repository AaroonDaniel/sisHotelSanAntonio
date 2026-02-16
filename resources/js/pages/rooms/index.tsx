import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Building2,
    DollarSign,
    Layers,
    Pencil,
    Plus,
    Power,
    Search,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import DeleteModal from './deleteModal';
import RoomModal from './roomModal';

// --- 1. CONSTANTES Y TRADUCCIONES ---
const statusTranslations: Record<string, string> = {
    AVAILABLE: 'LIBRE',
    OCCUPIED: 'OCUPADO',
    RESERVED: 'RESERVADO',
    CLEANING: 'LIMPIEZA',
    MAINTENANCE: 'MANTENIMIENTO',
    DISABLED: 'INHABILITADO',
};

const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    OCCUPIED: 'bg-red-100 text-red-800',
    RESERVED: 'bg-yellow-100 text-yellow-800',
    CLEANING: 'bg-blue-100 text-blue-800',
    MAINTENANCE: 'bg-orange-100 text-orange-800',
    DISABLED: 'bg-gray-100 text-gray-800',
};

// --- 2. INTERFACES ACTUALIZADAS PARA CORREGIR EL ERROR ---
interface RoomType {
    id: number;
    name: string;
}

interface Block {
    id: number;
    code: string;
    description?: string;
}

interface Floor {
    id: number;
    name: string;
}

// *** CORRECCIÓN CRÍTICA: Añadido room_type_id ***
interface Price {
    id: number;
    amount: number;
    bathroom_type: string;
    room_type_id: number; // <--- Esto soluciona el error de TypeScript
    is_active?: boolean;
    room_type?: RoomType;
}

interface Room {
    id: number;
    number: string;
    status: string;
    is_active: boolean;
    notes?: string;
    image_path?: string;
    // IDs
    room_type_id: number;
    block_id: number;
    floor_id: number;
    price_id: number;
    // Relaciones
    room_type?: RoomType;
    block?: Block;
    floor?: Floor;
    price?: Price;
}

interface Props {
    auth: { user: User };
    Rooms: Room[];
    // Listas para los selectores del modal
    RoomTypes: RoomType[];
    Blocks: Block[];
    Floors: Floor[];
    Prices: Price[];
}

export default function RoomsIndex({
    auth,
    Rooms,
    RoomTypes,
    Blocks,
    Floors,
    Prices,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);

    // Filtro Avanzado
    const filteredRooms = Rooms.filter((room) => {
        const term = searchTerm.toLowerCase();
        return (
            room.number.toLowerCase().includes(term) ||
            (room.room_type?.name || '').toLowerCase().includes(term) ||
            (room.block?.code || '').toLowerCase().includes(term) ||
            statusTranslations[room.status]?.toLowerCase().includes(term)
        );
    });

    const toggleStatus = (room: Room) => {
        router.patch(
            `/habitaciones/${room.id}/toggle`,
            {},
            { preserveScroll: true },
        );
    };

    // Funciones de apertura de modales
    const openCreateModal = () => {
        setEditingRoom(null);
        setIsRoomModalOpen(true);
    };

    const openEditModal = (room: Room) => {
        setEditingRoom(room);
        setIsRoomModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingRoomId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Habitaciones" />
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
                        Lista de Habitaciones
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {/* Header: Buscador y Botón */}
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
                                    placeholder="Buscar habitación..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nueva Habitación</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">N°</th>
                                        <th className="px-6 py-4">Ubicación</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Precio</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4">Imagen</th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredRooms.length > 0 ? (
                                        filteredRooms.map((room) => (
                                            <tr
                                                key={room.id}
                                                className={`transition-colors hover:bg-gray-50 ${!room.is_active ? 'bg-gray-50 opacity-75' : ''}`}
                                            >
                                                {/* Columna: Número */}
                                                <td className="px-6 py-4 text-lg font-bold text-gray-900">
                                                    {room.number}
                                                </td>

                                                {/* Columna: Ubicación */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1 font-medium text-gray-900">
                                                            <Building2 className="h-3 w-3 text-gray-400" />
                                                            {room.block?.code ||
                                                                '-'}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <Layers className="h-3 w-3" />
                                                            {room.floor?.name ||
                                                                '-'}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Columna: Tipo */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <BedDouble className="h-4 w-4 text-blue-500" />
                                                        {room.room_type?.name ||
                                                            'Sin tipo'}
                                                    </div>
                                                </td>

                                                {/* Columna: Precio */}
                                                <td className="px-6 py-4 font-bold text-green-700">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {room.price?.amount}
                                                    </div>
                                                    <span className="text-xs font-normal text-gray-400">
                                                        {room.price
                                                            ?.bathroom_type ===
                                                        'private'
                                                            ? 'Privado'
                                                            : 'Compartido'}
                                                    </span>
                                                </td>

                                                {/* Columna: Estado (Badge) */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[room.status] || 'bg-gray-50 text-gray-600 ring-gray-500/10'} ring-opacity-20`}
                                                    >
                                                        {statusTranslations[
                                                            room.status
                                                        ] || room.status}
                                                    </span>
                                                </td>

                                                {/* Columna: Imagen */}
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        {room.image_path ? (
                                                            <img
                                                                src={`/storage/${room.image_path}`}
                                                                alt={`Habitación ${room.number}`}
                                                                className="h-10 w-10 rounded-lg border border-gray-200 object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
                                                                N/A
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Columna: Acciones (Toggle + Edit + Delete) */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Toggle Activo */}
                                                        <button
                                                            onClick={() =>
                                                                toggleStatus(
                                                                    room,
                                                                )
                                                            }
                                                            title={
                                                                room.is_active
                                                                    ? 'Desactivar'
                                                                    : 'Activar'
                                                            }
                                                            className={`transition ${room.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>

                                                        {/* Editar */}
                                                        <button
                                                            onClick={() =>
                                                                openEditModal(
                                                                    room,
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        

                                                        {/* Eliminar */}
                                                        <button
                                                            onClick={() =>
                                                                openDeleteModal(
                                                                    room.id,
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-red-600"
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
                                                colSpan={7}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados.'
                                                    : 'No hay habitaciones registradas.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- MODALES CONECTADOS --- */}
                <RoomModal
                    show={isRoomModalOpen}
                    onClose={() => setIsRoomModalOpen(false)}
                    RoomToEdit={editingRoom}
                    // Ahora TS reconocerá que 'Prices' es del tipo correcto
                    roomTypes={RoomTypes}
                    blocks={Blocks}
                    floors={Floors}
                    prices={Prices}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    roomId={deletingRoomId}
                />
            </div>
        </AuthenticatedLayout>
    );
}
