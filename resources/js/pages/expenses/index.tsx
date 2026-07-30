import BackButton from '@/components/BackButton';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useCan } from '@/hooks/use-can';
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Pencil,
    Plus,
    Receipt,
    Search,
    Trash2,
    User as UserIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import DeleteModal from './deleteModal'; 
import ExpenseModal from './expenseModal'; 

interface Expense {
    id: number;
    description: string;
    amount: string | number;
    created_at: string;
    user?: {
        id: number;
        name: string;
    };
}

interface Props {
    auth: { user: User };
    gastos: Expense[];
}

export default function ExpensesIndex({ auth, gastos }: Props) {
    const { hasRole } = useCan();
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);

    // Filtro: Busca por concepto, monto o usuario
    const filteredGastos = gastos.filter(
        (gasto) =>
            gasto.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            gasto.amount.toString().includes(searchTerm) ||
            (gasto.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 🚀 Paginación en cliente, igual que Huéspedes.
    const GASTOS_PER_PAGE = 15;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(
        1,
        Math.ceil(filteredGastos.length / GASTOS_PER_PAGE),
    );
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);
    const paginatedGastos = filteredGastos.slice(
        (currentPage - 1) * GASTOS_PER_PAGE,
        currentPage * GASTOS_PER_PAGE,
    );

    // Funciones de apertura de modales
    const openCreateModal = () => {
        setEditingExpense(null);
        setIsExpenseModalOpen(true);
    };

    const openEditModal = (gasto: Expense) => {
        setEditingExpense(gasto);
        setIsExpenseModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingExpenseId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Historial de Gastos" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Cabecera */}
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        Historial General de Gastos
                    </h2>
                    <BackButton />
                </div>

                <div className="py-12">
                    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        
                        {/* Header: Buscador y Botón Nuevo (Estilo verde como Tarifas) */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-80">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar gasto, monto o cajero..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Gasto</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Fecha y Hora</th>
                                        <th className="px-6 py-4">Cajero / Usuario</th>
                                        <th className="px-6 py-4">Descripción del Gasto</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedGastos.length > 0 ? (
                                        paginatedGastos.map((gasto) => (
                                            <tr
                                                key={gasto.id}
                                                className="transition-colors hover:bg-gray-50"
                                            >
                                                {/* Columna: Fecha */}
                                                <td className="px-6 py-4 text-gray-500">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4" />
                                                        {new Date(gasto.created_at).toLocaleDateString('es-BO')} - {new Date(gasto.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </div>
                                                </td>

                                                {/* Columna: Usuario */}
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <UserIcon className="h-4 w-4 text-blue-500" />
                                                        {gasto.user?.name || 'Desconocido'}
                                                    </div>
                                                </td>

                                                {/* Columna: Descripción */}
                                                <td className="px-6 py-4 text-gray-800">
                                                    {gasto.description}
                                                </td>

                                                {/* Columna: Monto (Estilo verde como Precios) */}
                                                <td className="px-6 py-4 font-bold text-green-700">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {parseFloat(String(gasto.amount)).toFixed(2)}
                                                    </div>
                                                </td>

                                                {/* Columna: Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(gasto)}
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                            title="Editar Gasto"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
{hasRole('administrador') && (
                                                        <button
                                                            onClick={() => openDeleteModal(gasto.id)}
                                                            className="text-gray-400 transition hover:text-red-600"
                                                            title="Eliminar Gasto"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
)}
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
                                                    ? 'No se encontraron resultados para tu búsqueda.'
                                                    : 'No hay gastos registrados en el sistema.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
                                <span className="text-xs text-gray-500">
                                    Página {currentPage} de {totalPages} (
                                    {filteredGastos.length} gastos)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Anterior
                                    </button>
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Siguiente
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MODALES CONECTADOS --- */}
                <ExpenseModal
                    show={isExpenseModalOpen}
                    onClose={() => setIsExpenseModalOpen(false)}
                    expenseToEdit={editingExpense}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    expenseId={deletingExpenseId}
                />
            </div>
        </AuthenticatedLayout>
    );
}
