import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Pencil,
    Plus,
    Power,
    Search,
    Trash2,
    Users,
} from 'lucide-react'; // Agregamos Users para el icono de capacidad
import { useState } from 'react';
import DeleteModal from './deleteModal';
import RoomtypeModal from './roomtypeModal'; // Corregido el nombre del import

interface Roomtype {
    id: number;
    name: string;
    capacity: number;
    description?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    auth: {
        user: User;
    };
    Roomtypes: Roomtype[];
}

export default function RoomtypesIndex({ auth, Roomtypes }: Props) {
    // --- 1. ESTADO PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para los modales
    const [isRoomtypeModalOpen, setIsRoomtypeModalOpen] = useState(false);
    const [editingRoomtype, setEditingRoomtype] = useState<Roomtype | null>(
        null,
    );
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingRoomtypeId, setDeletingRoomtypeId] = useState<number | null>(
        null,
    );

    // --- 2. LÓGICA DE FILTRADO ---
    const filteredRoomtypes = Roomtypes.filter((Roomtype) =>
        Roomtype.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // --- 3. CORRECCIÓN: FUNCIÓN PARA CAMBIAR ESTADO ---
    // Debe apuntar a /tipohabitacion, no a /pisos
    const toggleStatus = (Roomtype: Roomtype) => {
        router.patch(
            `/tipohabitacion/${Roomtype.id}/toggle`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    // Funciones Helper
    const openCreateModal = () => {
        setEditingRoomtype(null);
        setIsRoomtypeModalOpen(true);
    };

    const openEditModal = (Roomtype: Roomtype) => {
        setEditingRoomtype(Roomtype);
        setIsRoomtypeModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingRoomtypeId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Tipos de Habitación" />
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
                        Lista de Tipos de Habitación
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
                                    placeholder="Buscar tipo..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Tipo</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        
                                        <th className="px-6 py-4">Nombre</th>
                                        <th className="px-6 py-4">Capacidad</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredRoomtypes.length > 0 ? (
                                        filteredRoomtypes.map((Roomtype) => (
                                            <tr
                                                key={Roomtype.id}
                                                className={`transition-colors hover:bg-gray-50 ${!Roomtype.is_active ? 'bg-gray-50' : ''}`}
                                            >
                                                
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    {Roomtype.name}
                                                </td>

                                                {/* Columna Capacidad */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-4 w-4 text-gray-400" />
                                                        {Roomtype.capacity}{' '}
                                                        pers.
                                                    </div>
                                                </td>

                                                {/* Columna Descripción */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {Roomtype.description}
                                                    </div>
                                                </td>

                                                {/* Columna Estado */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            Roomtype.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {Roomtype.is_active
                                                            ? 'Activo'
                                                            : 'Inactivo'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Botón Power */}
                                                        <button
                                                            onClick={() =>
                                                                toggleStatus(
                                                                    Roomtype,
                                                                )
                                                            }
                                                            title={
                                                                Roomtype.is_active
                                                                    ? 'Desactivar'
                                                                    : 'Activar'
                                                            }
                                                            className={`transition ${
                                                                Roomtype.is_active
                                                                    ? 'text-green-600 hover:text-green-800'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                openEditModal(
                                                                    Roomtype,
                                                                )
                                                            }
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                openDeleteModal(
                                                                    Roomtype.id,
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
                                                colSpan={5} // Ajustado a 5 columnas
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados.'
                                                    : 'No hay registros aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <RoomtypeModal
                    show={isRoomtypeModalOpen}
                    onClose={() => setIsRoomtypeModalOpen(false)}
                    RoomtypeToEdit={editingRoomtype}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    // CORRECCIÓN: Debe ser minúscula 'roomtypeId' según tu definición anterior
                    roomtypeId={deletingRoomtypeId}
                />
            </div>
        </AuthenticatedLayout>
    );
}
