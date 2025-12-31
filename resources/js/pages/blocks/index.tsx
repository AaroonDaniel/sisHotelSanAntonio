import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react'; // <--- CORREGIDO: Agregado 'router'
import { ArrowLeft, MapPin, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'; // <--- CORREGIDO: Agregado 'Power'
import { useState } from 'react';
import BlockModal from './blockModal'; 
import DeleteModal from './deleteModal'; 

interface Block {
    id: number;
    code: string;
    description: string | null;
    is_active: boolean;
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
    // --- 1. ESTADO PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para los modales
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<Block | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingBlockId, setDeletingBlockId] = useState<number | null>(null);

    // --- 2. LÓGICA DE FILTRADO ---
    const filteredBlocks = blocks.filter((block) => 
        block.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (block.description && block.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- 3. NUEVO: FUNCIÓN PARA CAMBIAR ESTADO ---
    const toggleStatus = (block: Block) => {
        // Asegúrate de tener esta ruta en tu web.php o dará error 404
        router.patch(`/bloques/${block.id}/toggle`);
    };

    // Funciones Helper
    const openCreateModal = () => {
        setEditingBlock(null);
        setIsBlockModalOpen(true);
    };

    const openEditModal = (block: Block) => {
        setEditingBlock(block);
        setIsBlockModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingBlockId(id);
        setIsDeleteModalOpen(true);
    };

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
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por código..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
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
                                        
                                        <th className="px-6 py-4">Código</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredBlocks.length > 0 ? (
                                        filteredBlocks.map((block) => (
                                            <tr key={block.id} className={`transition-colors hover:bg-gray-50 ${!block.is_active ? 'bg-gray-50' : ''}`}>
                                                
                                                <td className="px-6 py-4 font-bold text-gray-900">{block.code}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 opacity-50" />
                                                        {block.description || 'Sin descripción'}
                                                    </div>
                                                </td>
                                                
                                                {/* --- COLUMNA ESTADO --- */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            block.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {block.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        
                                                        {/* --- NUEVO: BOTÓN POWER --- */}
                                                        <button
                                                            onClick={() => toggleStatus(block)}
                                                            title={block.is_active ? 'Desactivar' : 'Activar'}
                                                            className={`transition ${
                                                                block.is_active
                                                                    ? 'text-green-600 hover:text-green-800'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>

                                                        <button 
                                                            onClick={() => openEditModal(block)}
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => openDeleteModal(block.id)}
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
                                            <td colSpan={5} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay registros aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <BlockModal
                    show={isBlockModalOpen}
                    onClose={() => setIsBlockModalOpen(false)}
                    blockToEdit={editingBlock}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    blockId={deletingBlockId}
                />
            </div>
        </AuthenticatedLayout>
    );
}