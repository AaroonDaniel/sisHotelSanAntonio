import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { User } from '@/layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { Receipt, PlusCircle, AlertCircle, Clock, Wallet, ArrowLeft, Pencil, Trash2, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Expense {
    id: number;
    description: string;
    amount: string | number;
    created_at: string;
}

interface Props {
    auth: { user: User };
    activeRegister: any | null;
    gastos: Expense[];
}

export default function Gastos({ auth, activeRegister, gastos }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);

    // Formulario unificado para Crear/Editar
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        description: '',
        amount: '',
    });

    // Manejador del formulario (Sabe si está creando o editando)
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        if (editingId) {
            // Modo Edición
            put(`/gastos/${editingId}`, {
                onSuccess: () => cancelEdit(),
            });
        } else {
            // Modo Creación
            post('/gastos', {
                onSuccess: () => reset(),
            });
        }
    };

    // Funciones para Editar
    const startEdit = (gasto: Expense) => {
        clearErrors();
        setEditingId(gasto.id);
        setData({
            description: gasto.description,
            amount: String(gasto.amount),
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        reset();
        clearErrors();
    };

    // Función para Eliminar
    const confirmDelete = (id: number) => {
        setDeletingExpenseId(id);
        setIsDeleteModalOpen(true);
    };

    // Calculamos el total gastado en el turno actual
    const totalGastado = gastos.reduce((sum, gasto) => sum + parseFloat(String(gasto.amount)), 0);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Control de Gastos" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
                
                {/* Cabecera */}
                <div className="mb-8">
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Receipt className="h-8 w-8 text-orange-400" />
                        Control de Gastos
                    </h2>
                </div>

                {!activeRegister ? (
                    /* ALERTA: Si no tiene caja abierta */
                    <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-8 text-center backdrop-blur-sm animate-in fade-in">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">¡Caja Cerrada!</h3>
                        <p className="text-red-200">
                            No puedes registrar gastos porque actualmente no tienes un turno ni una caja abierta.
                            Ve a la pantalla principal para iniciar tu turno.
                        </p>
                    </div>
                ) : (
                    /* CONTENIDO: Formulario y Tabla */
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                        
                        {/* ================================================== */}
                        {/* COLUMNA IZQUIERDA: Formulario Dinámico (Crear/Editar) */}
                        {/* ================================================== */}
                        <div className="xl:col-span-1 flex flex-col gap-6">
                            
                            {/* Tarjeta de Resumen */}
                            <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 shadow-lg text-white">
                                <div className="flex items-center gap-3 opacity-80 mb-2">
                                    <Wallet className="h-5 w-5" />
                                    <h4 className="font-bold uppercase tracking-wider text-sm">Total Gastado Hoy</h4>
                                </div>
                                <p className="text-4xl font-black">{totalGastado.toFixed(2)} Bs</p>
                            </div>

                            {/* Tarjeta de Formulario (Cambia de color si está editando) */}
                            <div className={`rounded-2xl border shadow-xl overflow-hidden transition-colors ${editingId ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-800 border-gray-700'}`}>
                                <div className={`border-b px-6 py-4 flex justify-between items-center ${editingId ? 'border-blue-500/30 bg-blue-900/40' : 'border-gray-700 bg-gray-900/50'}`}>
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        {editingId ? (
                                            <><Pencil className="h-5 w-5 text-blue-400" /> Editando Gasto</>
                                        ) : (
                                            <><PlusCircle className="h-5 w-5 text-orange-400" /> Nuevo Gasto</>
                                        )}
                                    </h3>
                                    {editingId && (
                                        <button onClick={cancelEdit} className="text-gray-400 hover:text-white" title="Cancelar edición">
                                            <X className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                                
                                <form onSubmit={submit} className="p-6 space-y-5">
                                    {(errors as any).error && (
                                        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                                            {(errors as any).error}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                            Descripción / Concepto
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            className={`w-full rounded-xl border bg-gray-700 px-4 py-2.5 text-white placeholder-gray-400 focus:ring-2 ${editingId ? 'border-blue-500/50 focus:border-blue-500 focus:ring-blue-500/50' : 'border-gray-600 focus:border-orange-500 focus:ring-orange-500/50'}`}
                                            placeholder="Ej: Compra de lavandina..."
                                        />
                                        {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                            Monto a retirar (Bs)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 font-bold">Bs.</span>
                                            <input
                                                type="number"
                                                required
                                                step="0.10"
                                                min="0.10"
                                                value={data.amount}
                                                onChange={(e) => setData('amount', e.target.value)}
                                                className={`w-full rounded-xl border bg-gray-700 py-2.5 pl-12 pr-4 text-lg font-bold text-white focus:ring-2 ${editingId ? 'border-blue-500/50 focus:border-blue-500 focus:ring-blue-500/50' : 'border-gray-600 focus:border-orange-500 focus:ring-orange-500/50'}`}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount}</p>}
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        {editingId && (
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                className="w-1/3 rounded-xl bg-gray-600 px-4 py-3 font-bold text-white shadow-md hover:bg-gray-500 active:scale-95 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${editingId ? 'w-2/3 bg-blue-600 hover:bg-blue-500' : 'w-full bg-orange-600 hover:bg-orange-500'}`}
                                        >
                                            {processing ? 'Guardando...' : (editingId ? 'Actualizar Gasto' : 'Registrar Gasto')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* ================================================== */}
                        {/* COLUMNA DERECHA: Tabla Estilo Blanco (Tipo Tarifas)  */}
                        {/* ================================================== */}
                        <div className="xl:col-span-2">
                            <div className="mx-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                                
                                {/* Header de la Tabla */}
                                <div className="border-b border-gray-200 bg-white px-6 py-4 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-gray-500" />
                                        Historial de Gastos del Turno
                                    </h3>
                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 border border-orange-200">
                                        {gastos.length} registros
                                    </span>
                                </div>

                                {/* Tabla Blanca */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Hora</th>
                                                <th className="px-6 py-4 font-bold">Descripción</th>
                                                <th className="px-6 py-4 font-bold">Monto</th>
                                                <th className="px-6 py-4 font-bold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {gastos.length > 0 ? (
                                                gastos.map((gasto) => (
                                                    <tr 
                                                        key={gasto.id} 
                                                        className={`transition-colors hover:bg-gray-50 ${editingId === gasto.id ? 'bg-blue-50' : ''}`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                            {new Date(gasto.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {gasto.description}
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-orange-600 whitespace-nowrap">
                                                             {parseFloat(String(gasto.amount)).toFixed(2)} Bs
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {/* Botón Editar */}
                                                                <button
                                                                    onClick={() => startEdit(gasto)}
                                                                    className="text-gray-400 transition hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50"
                                                                    title="Editar Gasto"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </button>
                                                                {/* Botón Eliminar */}
                                                                <button
                                                                    onClick={() => confirmDelete(gasto.id)}
                                                                    className="text-gray-400 transition hover:text-red-600 p-1.5 rounded-md hover:bg-red-50"
                                                                    title="Eliminar Gasto"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                        No has registrado ningún gasto en este turno.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            

        </AuthenticatedLayout>
    );
}