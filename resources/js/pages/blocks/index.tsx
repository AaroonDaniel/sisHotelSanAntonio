import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { ArrowLeft, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CreateModal from './createModal';

interface Block {
    id: number;
    code: string;
    description: string | null;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    auth: {
        user: User;
    };
    blocks: Block[];
}

export default function BlocksIndex({ auth, blocks }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Bloques" />
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
                        Lista de Bloques
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                            {/* Header: Buscador y Botón */}
                            <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                                <div className="relative w-full sm:w-72">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar bloque..."
                                        className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>

                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                                >
                                    <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                    <span>Nuevo Bloque</span>
                                </button>
                            </div>

                            {/* Tabla */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">ID</th>
                                            <th className="px-6 py-4">
                                                Código
                                            </th>
                                            <th className="px-6 py-4">
                                                Descripción
                                            </th>
                                            <th className="px-6 py-4 text-right">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {blocks.length > 0 ? (
                                            blocks.map((block) => (
                                                <tr
                                                    key={block.id}
                                                    className="transition-colors hover:bg-gray-50"
                                                >
                                                    <td className="px-6 py-4 font-bold">
                                                        {block.id}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {block.code}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 opacity-50" />
                                                            {block.description ||
                                                                'Sin descripción'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button className="text-gray-400 transition hover:text-blue-600">
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button className="text-gray-400 transition hover:text-red-600">
                                                                <Trash2 className="h-4 w-4" />
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
                                                    No hay registros aún.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <CreateModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
