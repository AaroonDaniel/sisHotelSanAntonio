import { useForm } from '@inertiajs/react';
import { X, Save, Tag, Bath, DollarSign } from 'lucide-react'; // Iconos adecuados
import { useEffect, FormEventHandler } from 'react';

interface Price {
    id?: number;
    bathroom_type: string;
    amount: number;
    is_active?: boolean;
}

interface PriceModalProps {
    show: boolean;
    onClose: () => void;
    PriceToEdit?: Price | null;
} 

export default function PriceModal({ show, onClose, PriceToEdit }: PriceModalProps) {
    // 1. Inicializamos los campos correctos para PRECIOS
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        bathroom_type: '',
        amount: '', // Inicializamos como string vacío para el input
        is_active: true,
    });

    useEffect(() => {
        if (show) {
            if (PriceToEdit) {
                // 2. Cargar datos si es edición
                setData({
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

        const onSuccess = () => {
            reset();
            onClose();
        };

        if (PriceToEdit) {
            put(`/precios/${PriceToEdit.id}`, { onSuccess });
        } else {
            post('/precios', { onSuccess });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Tag className="h-5 w-5" />
                        </div>
                        {PriceToEdit ? 'Editar Tarifa' : 'Nueva Tarifa'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        
                        {/* CAMPO 1: Tipo de Baño (Select) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Tipo de Baño
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Bath className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={data.bathroom_type}
                                    onChange={(e) => setData('bathroom_type', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500 bg-white"
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    <option value="Privado">Privado</option>
                                    <option value="Compartido">Compartido</option>
                                </select>
                            </div>
                            {errors.bathroom_type && <p className="mt-1 text-xs text-red-500 font-bold">{errors.bathroom_type}</p>}
                        </div>

                        {/* CAMPO 2: Monto (Input Number) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Precio (Bs.)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    step="0.01" // Permitir decimales
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ej: 50.00"
                                />
                            </div>
                            {errors.amount && <p className="mt-1 text-xs text-red-500 font-bold">{errors.amount}</p>}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}