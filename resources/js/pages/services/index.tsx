import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    FileText,
    Pencil,
    Plus,
    Power,
    Search,
    Trash2,
    Tag,
    DollarSign
} from 'lucide-react';
import { useState } from 'react';
import ServiceModal from './serviceModal';
import DeleteModal from './deleteModal';

interface Service {
    id: number;
    name: string;
    status: string;
    price: number;
    description: string | null;
    is_active: boolean;
    quantity?: number;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    auth: {
        user: User;
    };
    Services: Service[];
}

export default function ServicesIndex({ auth, Services }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);

    // --- 1. FILTRO CORREGIDO (Por nombre y descripción) ---
    const filteredServices = Services.filter((Service) =>
        Service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Service.description && Service.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- 2. RUTA CORREGIDA (/servicios) ---
    const toggleStatus = (Service: Service) => {
        router.patch(`/servicios/${Service.id}/toggle`, {}, {
            preserveScroll: true
        });
    };

    // Funciones Helper
    const openCreateModal = () => {
        setEditingService(null);
        setIsServiceModalOpen(true);
    };

    const openEditModal = (Service: Service) => {
        setEditingService(Service);
        setIsServiceModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingServiceId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Servicios" />
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
                        Lista de Servicios
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
                                    placeholder="Buscar servicio..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Servicio</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        
                                        <th className="px-6 py-4">Nombre</th>
                                        <th className="px-6 py-4">Precio</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredServices.length > 0 ? (
                                        filteredServices.map((Service) => (
                                            <tr key={Service.id} className={`transition-colors hover:bg-gray-50 ${!Service.is_active ? 'bg-gray-50 opacity-75' : ''}`}>
                                                
                                                
                                                {/* Nombre */}
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <Tag className="h-4 w-4 text-blue-500" />
                                                        {Service.name}
                                                    </div>
                                                </td>

                                                {/* Precio (Nueva Columna) */}
                                                <td className="px-6 py-4 font-mono font-medium text-green-700">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {Service.price}
                                                    </div>
                                                </td>

                                                {/* Descripción */}
                                                <td className="px-6 py-4 text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 opacity-50" />
                                                        <span className="truncate max-w-[200px] block">
                                                            {Service.description || '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                
                                                {/* Estado */}
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            Service.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {Service.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => toggleStatus(Service)}
                                                            title={Service.is_active ? 'Desactivar' : 'Activar'}
                                                            className={`transition ${
                                                                Service.is_active
                                                                    ? 'text-green-600 hover:text-green-800'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>

                                                        <button 
                                                            onClick={() => openEditModal(Service)}
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => openDeleteModal(Service.id)}
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
                                            <td colSpan={6} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay registros aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Modales */}
                <ServiceModal
                    show={isServiceModalOpen}
                    onClose={() => setIsServiceModalOpen(false)}
                    ServiceToEdit={editingService}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    // Asegúrate de que tu DeleteModal reciba 'serviceId' (o el nombre genérico que uses)
                    serviceId={deletingServiceId} 
                />
            </div>
        </AuthenticatedLayout>
    );
}