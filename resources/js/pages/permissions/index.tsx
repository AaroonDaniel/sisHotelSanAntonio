import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, Plus, Search, Trash2, Key } from 'lucide-react';
import { useState } from 'react';
import DeleteModal from './deleteModal';
import PermissionModal from './permissionModal';

interface Permission {
    id: number;
    name: string;
}

interface Props {
    auth: {
        user: User;
    };
    permissions: Permission[];
}

export default function PermissionsIndex({ auth, permissions }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const [isPermModalOpen, setIsPermModalOpen] = useState(false);
    const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPermId, setDeletingPermId] = useState<number | null>(null);

    const filteredPerms = permissions.filter((perm) =>
        perm.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const openCreateModal = () => {
        setEditingPerm(null);
        setIsPermModalOpen(true);
    };

    const openEditModal = (perm: Permission) => {
        setEditingPerm(perm);
        setIsPermModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingPermId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Catálogo de Permisos" />
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
                        <Key className="h-8 w-8 text-amber-400" />
                        Catálogo de Permisos
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
                                    placeholder="Buscar permiso..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-amber-500 focus:ring-amber-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-amber-400 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Permiso</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Nombre Técnico</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredPerms.length > 0 ? (
                                        filteredPerms.map((perm) => (
                                            <tr key={perm.id} className="transition-colors hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    <span className="bg-gray-100 text-gray-700 py-1 px-3 rounded-lg border border-gray-200">
                                                        {perm.name}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(perm)}
                                                            className="text-gray-400 transition hover:text-amber-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => openDeleteModal(perm.id)}
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
                                            <td colSpan={2} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay permisos registrados aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <PermissionModal
                    show={isPermModalOpen}
                    onClose={() => setIsPermModalOpen(false)}
                    PermissionToEdit={editingPerm}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    permissionId={deletingPermId}
                />
            </div>
        </AuthenticatedLayout>
    );
}