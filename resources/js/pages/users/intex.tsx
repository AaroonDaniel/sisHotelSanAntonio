import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import UserModal from './userModal';
import { Edit, ShieldAlert, UserCheck, UserX } from 'lucide-react';

export default function UsersIndex({ users }: { users: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const openModal = (user = null) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const toggleStatus = (user: any) => {
        const action = user.is_active ? 'desactivar' : 'reactivar';
        if (confirm(`¿Estás seguro de que deseas ${action} a ${user.full_name}?`)) {
            router.delete(`/users/${user.id}`, { preserveScroll: true });
        }
    };

    return (
        <AppLayout>
            <Head title="Gestión de Usuarios" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Personal del Sistema</h1>
                        <p className="text-sm text-gray-500">Administra los accesos al sistema del hotel.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
                    >
                        + Nuevo Usuario
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 uppercase text-gray-700">
                            <tr>
                                <th className="px-6 py-4 font-bold">Nombre / Nickname</th>
                                <th className="px-6 py-4 font-bold">Contacto</th>
                                <th className="px-6 py-4 font-bold">Estado</th>
                                <th className="px-6 py-4 text-center font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 uppercase">{user.full_name}</div>
                                        <div className="text-xs text-gray-500">@{user.nickname}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-800">{user.phone}</div>
                                        <div className="text-xs text-gray-500 uppercase">{user.address}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.is_active ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                                                <UserCheck className="h-3 w-3" /> Activo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                                                <UserX className="h-3 w-3" /> Inactivo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => openModal(user)}
                                                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleStatus(user)}
                                                className={`rounded p-1 ${user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                                title={user.is_active ? 'Desactivar' : 'Reactivar'}
                                            >
                                                <ShieldAlert className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserModal
                show={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={selectedUser}
            />
        </AppLayout>
    );
}