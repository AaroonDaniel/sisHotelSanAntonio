import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, Plus, Search, Trash2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import DeleteModal from './deleteModal';
import RoleModal from './roleModal';

interface Role {
    id: number;
    name: string;
    permissions: any[];
}

interface Props {
    auth: {
        user: User;
    };
    roles: Role[];
    permissions: any[]; // Todos los permisos disponibles para el modal
}

export default function RolesIndex({ auth, roles, permissions }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingRoleId, setDeletingRoleId] = useState<number | null>(null);

    const filteredRoles = roles.filter((role) =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const openCreateModal = () => {
        setEditingRole(null);
        setIsRoleModalOpen(true);
    };

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setIsRoleModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingRoleId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Cargos y Roles" />
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
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-blue-400" />
                        Lista de Cargos (Roles)
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {/* Header: Buscador y Botón Crear */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-72">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar cargo..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Cargo</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Nombre del Cargo</th>
                                        <th className="px-6 py-4">Permisos Asignados</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredRoles.length > 0 ? (
                                        filteredRoles.map((role) => (
                                            <tr key={role.id} className="transition-colors hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold text-gray-900 uppercase">
                                                    {role.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {role.permissions.length > 0 ? (
                                                            role.permissions.map((perm) => (
                                                                <span key={perm.id} className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase border border-blue-200">
                                                                    {perm.name.replace(/_/g, ' ')}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Sin accesos</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(role)}
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                            title="Editar Cargo"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        
                                                            <button
                                                                onClick={() => openDeleteModal(role.id)}
                                                                className="text-gray-400 transition hover:text-red-600"
                                                                title="Eliminar Cargo"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                            
                                                            
                                                        
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay cargos registrados aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <RoleModal
                    show={isRoleModalOpen}
                    onClose={() => setIsRoleModalOpen(false)}
                    RoleToEdit={editingRole}
                    allPermissions={permissions}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    roleId={deletingRoleId}
                />
            </div>
        </AuthenticatedLayout>
    );
}