import { useForm } from '@inertiajs/react';
import { Bath, BedDouble, DollarSign, Save, Tag, X } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

// 1. Definimos la interfaz para los Tipos de Habitación
interface RoomType {
    id: number;
    name: string;
}

interface Price {
    id?: number;
    room_type_id: number;
    bathroom_type: string;
    amount: number;
    is_active?: boolean;
}

interface PriceModalProps {
    show: boolean;
    onClose: () => void;
    PriceToEdit?: Price | null;
    roomTypes: RoomType[]; // <--- Recibimos la lista de tipos
}

export default function PriceModal({
    show,
    onClose,
    PriceToEdit,
    roomTypes,
}: PriceModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            room_type_id: '', // Inicializamos vacío
            bathroom_type: '',
            amount: '',
            is_active: true,
        });

    useEffect(() => {
        if (show) {
            if (PriceToEdit) {
                setData({
                    room_type_id: PriceToEdit.room_type_id.toString(), // Cargamos el ID existente
                    bathroom_type: PriceToEdit.bathroom_type,
                    amount: PriceToEdit.amount.toString(),
                    is_active: PriceToEdit.is_active ?? true,
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, PriceToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true, // <--- AGREGAR ESTO SIEMPRE
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (PriceToEdit) {
            put(`/precios/${PriceToEdit.id}`, options);
        } else {
            post('/precios', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Tag className="h-5 w-5" />
                        </div>
                        {PriceToEdit ? 'Editar Tarifa' : 'Nueva Tarifa'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        {/* --- NUEVO CAMPO: SELECCIÓN DE TIPO DE HABITACIÓN --- */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Tipo de Habitación
                            </label>

                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <BedDouble className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={data.room_type_id}
                                    onChange={(e) =>
                                        setData('room_type_id', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                >
                                    <option value="" disabled>
                                        Seleccionar tipo...
                                    </option>
                                    {roomTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.room_type_id && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.room_type_id}
                                </p>
                            )}
                        </div>

                        {/* Campo Tipo de Baño */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Tipo de Baño
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Bath className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={data.bathroom_type}
                                    onChange={(e) =>
                                        setData('bathroom_type', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                >
                                    <option value="" disabled>
                                        Seleccionar...
                                    </option>
                                    <option value="Privado">PRIVADO</option>
                                    <option value="Compartido">
                                        COMPARTIDO
                                    </option>
                                </select>
                            </div>
                            {errors.bathroom_type && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.bathroom_type}
                                </p>
                            )}
                        </div>

                        {/* Campo Precio */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Precio (Bs.)
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={data.amount}
                                    onChange={(e) =>
                                        setData('amount', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="Ej: 50.00"
                                />
                            </div>
                            {errors.amount && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.amount}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                'Guardando...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4" /> Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
