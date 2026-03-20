import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    Pencil,
    Plus,
    Power,
    Search,
    ShieldAlert,
    UserCheck,
    UserX,
} from 'lucide-react';
import { useState } from 'react';
import UserModal from './userModal';
import DeleteModal from './deleteModal'; // <-- Importamos tu nuevo modal inteligente

// Interfaz del Usuario
export interface User {
    id: number;
    nickname: string;
    full_name: string;
    phone: string;
    address: string;
    is_active: boolean;
}

interface Props {
    auth: { user: User };
    users: User[];
}

export default function UsersIndex({ auth, users }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para el Modal de Crear/Editar
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Estados para el Modal de Habilitar/Deshabilitar (DeleteModal)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUserForStatus, setSelectedUserForStatus] = useState<User | null>(null);

    // Filtro: Busca por nombre, nickname o teléfono
    const filteredUsers = users.filter(
        (user) =>
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm),
    );

    // Función para abrir el modal de Habilitar/Deshabilitar
    const openStatusModal = (user: User) => {
        setSelectedUserForStatus(user);
        setIsDeleteModalOpen(true);
    };

    // Funciones de apertura del modal de Crear/Editar
    const openCreateModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Usuarios" />
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
                        Personal del Sistema
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-fit min-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
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
                                    placeholder="Buscar usuario..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Usuario</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="px-6 py-4">Usuario</th>
                                        <th className="px-6 py-4">Contacto</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className={`transition-colors hover:bg-gray-50 ${!user.is_active ? 'bg-gray-50' : ''}`}
                                            >
                                                {/* Columna: Nombre y Nickname */}
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 uppercase">
                                                        {user.full_name}
                                                    </div>
                                                    <div className="text-xs text-blue-600 font-semibold">
                                                        @{user.nickname}
                                                    </div>
                                                </td>

                                                {/* Columna: Contacto */}
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-800 font-medium">
                                                        {user.phone}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                                                        {user.address}
                                                    </div>
                                                </td>

                                                {/* Columna: Estado */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                    >
                                                        {user.is_active ? (
                                                            <><UserCheck className="h-3 w-3" /> Activo</>
                                                        ) : (
                                                            <><UserX className="h-3 w-3" /> Inactivo</>
                                                        )}
                                                    </span>
                                                </td>

                                                {/* Columna: Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Botón Habilitar/Deshabilitar */}
                                                        <button
                                                            onClick={() => openStatusModal(user)}
                                                            title={user.is_active ? 'Deshabilitar' : 'Habilitar'}
                                                            className={`transition ${user.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}
                                                        >
                                                            {user.is_active ? <Power className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                                                        </button>
                                                        
                                                        {/* Botón Editar */}
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            title="Editar Usuario"
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados para tu búsqueda.'
                                                    : 'No hay usuarios registrados en el sistema.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- MODALES CONECTADOS --- */}
                
                {/* Modal Crear/Editar */}
                <UserModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    userToEdit={editingUser}
                />

                {/* Modal Habilitar/Deshabilitar (DeleteModal) */}
                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    user={selectedUserForStatus}
                />
            </div>
        </AuthenticatedLayout>
    );
}