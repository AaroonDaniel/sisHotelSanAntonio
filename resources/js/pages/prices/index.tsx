import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, Plus, Power, Search, Trash2, Tag, DollarSign } from 'lucide-react'; // Agregamos Tag y DollarSign
import { useState } from 'react';
import DeleteModal from './deleteModal';
import PriceModal from './priceModal';

interface Price {
    id: number;
    bathroom_type: string;
    amount: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    auth: {
        user: User;
    };
    Prices: Price[];
}

export default function PricesIndex({ auth, Prices }: Props) {
    // --- 1. ESTADO PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para los modales
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [editingPrice, setEditingPrice] = useState<Price | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingPriceId, setDeletingPriceId] = useState<number | null>(null);

    // --- 2. LÓGICA DE FILTRADO CORREGIDA ---
    const filteredPrices = Prices.filter((Price) =>
        Price.bathroom_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Price.amount.toString().includes(searchTerm) ||
        (Price.is_active ? 'activo' : 'inactivo').includes(searchTerm.toLowerCase())
    );

    // --- 3. FUNCIÓN PARA CAMBIAR ESTADO ---
    const toggleStatus = (Price: Price) => {
        router.patch(`/precios/${Price.id}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    // Funciones Helper
    const openCreateModal = () => {
        setEditingPrice(null);
        setIsPriceModalOpen(true);
    };

    const openEditModal = (Price: Price) => {
        setEditingPrice(Price);
        setIsPriceModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingPriceId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Tarifas" /> {/* CORREGIDO */}
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
                        Lista de Tarifas
                    </h2> {/* CORREGIDO */}
                </div>

                <div className="py-12">
                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        
                        {/* Header */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-72">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar tarifa..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nueva Tarifa</span> {/* CORREGIDO */}
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Tipo de Baño</th>
                                        <th className="px-6 py-4">Precio (Bs.)</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredPrices.length > 0 ? (
                                        filteredPrices.map((Price) => (
                                            <tr
                                                key={Price.id}
                                                className={`transition-colors hover:bg-gray-50 ${!Price.is_active ? 'bg-gray-50' : ''}`}
                                            >
                                                <td className="px-6 py-4 font-bold">
                                                    {Price.id}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <Tag className="h-4 w-4 text-gray-400" />
                                                        {Price.bathroom_type}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-green-700">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {Price.amount}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            Price.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {Price.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => toggleStatus(Price)}
                                                            title={Price.is_active ? 'Desactivar' : 'Activar'}
                                                            className={`transition ${
                                                                Price.is_active
                                                                    ? 'text-green-600 hover:text-green-800'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => openEditModal(Price)}
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => openDeleteModal(Price.id)}
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
                                                colSpan={5}
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

                <PriceModal
                    show={isPriceModalOpen}
                    onClose={() => setIsPriceModalOpen(false)}
                    PriceToEdit={editingPrice}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    // CORRECCIÓN: 'priceId' en minúscula, coincidiendo con deleteModal.tsx
                    priceId={deletingPriceId} 
                />
            </div>
        </AuthenticatedLayout>
    );
}