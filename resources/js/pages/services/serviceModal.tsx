import { useForm } from '@inertiajs/react';
// 1. AGREGADO: Importamos 'Package'
import { X, Save, FileText, Tag, DollarSign, Briefcase, Package } from 'lucide-react';
import { useEffect, FormEventHandler } from 'react';

interface Service {
    id?: number;
    name: string;
    status: string;
    price: number;
    description: string | null;
    quantity?: number; 
}

interface ServiceModalProps {
    show: boolean;
    onClose: () => void;
    ServiceToEdit?: Service | null;
}

export default function ServiceModal({ show, onClose, ServiceToEdit }: ServiceModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        price: '',
        description: '',
        quantity: '', // 2. CORREGIDO: Inicializamos quantity (como string vacío para evitar ceros molestos)
    });

    useEffect(() => {
        if (show) {
            if (ServiceToEdit) {
                setData({
                    name: ServiceToEdit.name,
                    price: ServiceToEdit.price.toString(),
                    description: ServiceToEdit.description || '',
                    // 3. CORREGIDO: Cargamos la cantidad al editar
                    quantity: ServiceToEdit.quantity ? ServiceToEdit.quantity.toString() : '',
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, ServiceToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const onSuccess = () => {
            reset();
            onClose();
        };

        if (ServiceToEdit) {
            put(`/servicios/${ServiceToEdit.id}`, { onSuccess });
        } else {
            post('/servicios', { onSuccess });
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
                            <Briefcase className="h-5 w-5" />
                        </div>
                        {ServiceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        
                        {/* Nombre del Servicio */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nombre del Servicio</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Tag className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text" 
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value.toUpperCase())}
                                    className="UpperCase block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ej: Lavandería"
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-xs text-red-500 font-bold">{errors.name}</p>}
                        </div>

                        {/* Grid para Precio y Cantidad */}
                        <div className="flex gap-4">
                            {/* Precio */}
                            <div className="w-1/2">
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Precio (Bs.)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <DollarSign className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.price}
                                        onChange={(e) => setData('price', e.target.value)}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                {errors.price && <p className="mt-1 text-xs text-red-500 font-bold">{errors.price}</p>}
                            </div>

                            {/* Cantidad (Stock) */}
                            <div className="w-1/2">
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Cantidad</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Package className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        value={data.quantity}
                                        onChange={(e) => setData('quantity', e.target.value)}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                        placeholder="Ej: 1"
                                    />
                                </div>
                                {/** Nota: Si 'quantity' no es validado en backend, este error no aparecerá, pero lo dejo por si acaso */}
                                {errors.quantity && <p className="mt-1 text-xs text-red-500 font-bold">{errors.quantity}</p>}
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Descripción</label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 pointer-events-none">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                </div>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value.toUpperCase())}
                                    rows={3}
                                    className="UpperCase block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Detalles del servicio..."
                                />
                            </div>
                            {errors.description && <p className="mt-1 text-xs text-red-500 font-bold">{errors.description}</p>}
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