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

// --- 1. DICCIONARIO DE TRADUCCIÓN DE ESTADOS ---
const statusTranslations: Record<string, string> = {
    available: 'Libre',
    occupied: 'Ocupado',
    reserved: 'Reservado',
    cleaning: 'Limpieza',
    maintenance: 'Mantenimiento',
    disabled: 'Inhabilitado',
};

const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-red-100 text-red-800',
    reserved: 'bg-yellow-100 text-yellow-800',
    cleaning: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-orange-100 text-orange-800',
    disabled: 'bg-gray-100 text-gray-800',
};

// --- 2. INTERFACES (Coinciden con el Backend) ---
interface RoomType { id: number; name: string; }
interface Block { id: number; code: string; description?: string; }
interface Floor { id: number; name: string; }
interface Price { id: number; amount: number; bathroom_type: string; }

interface Room {
    id: number;
    number: string;
    status: string;
    is_active: boolean;
    // Relaciones (pueden venir nulas si se borró el padre, por seguridad usamos ?)
    room_type?: RoomType;
    block?: Block;
    floor?: Floor;
    price?: Price;
    // IDs para edición
    room_type_id: number;
    block_id: number;
    floor_id: number;
    price_id: number;
    notes?: string;
    image_path?: string;
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

export default function RoomsIndex({ auth, Rooms, RoomTypes, Blocks, Floors, Prices }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);

    // --- 3. FILTRO AVANZADO ---
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
            { preserveScroll: true }
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
                                    onChange={(e) => setSearchTerm(e.target.value)}
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
                                        <th className="px-6 py-4">Activo</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
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
                                                <td className="px-6 py-4 font-bold text-gray-900 text-lg">
                                                    {room.number}
                                                </td>

                                                {/* Columna: Ubicación (Bloque y Piso) */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1 text-gray-900 font-medium">
                                                            <Building2 className="h-3 w-3 text-gray-400" />
                                                            {room.block?.code || '-'}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                                                            <Layers className="h-3 w-3" />
                                                            {room.floor?.name || '-'}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Columna: Tipo */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <BedDouble className="h-4 w-4 text-blue-500" />
                                                        {room.room_type?.name || 'Sin tipo'}
                                                    </div>
                                                </td>

                                                {/* Columna: Precio */}
                                                <td className="px-6 py-4 font-bold text-green-700">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {room.price?.amount}
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-normal">
                                                        {room.price?.bathroom_type === 'private' ? 'Privado' : 'Compartido'}
                                                    </span>
                                                </td>

                                                {/* Columna: Estado (Limpieza, Ocupado, etc) */}
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[room.status] || 'bg-gray-50 text-gray-600 ring-gray-500/10'} ring-opacity-20`}>
                                                        {statusTranslations[room.status] || room.status}
                                                    </span>
                                                </td>

                                                {/* Columna: Activo (Toggle) */}
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => toggleStatus(room)}
                                                        title={room.is_active ? 'Desactivar' : 'Activar'}
                                                        className={`transition-colors ${room.is_active ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        <Power className="h-5 w-5" />
                                                    </button>
                                                </td>

                                                {/* Columna: Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(room)}
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(room.id)}
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
                                            <td colSpan={7} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay habitaciones registradas.'}
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
                    // IMPORTANTE: Pasamos todas las listas necesarias
                    roomTypes={RoomTypes}
                    blocks={Blocks}
                    floors={Floors}
                    prices={Prices}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    roomId={deletingRoomId} // Nombre corregido
                />
            </div>
        </AuthenticatedLayout>
    );
}