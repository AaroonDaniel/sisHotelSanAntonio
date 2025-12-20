import { useForm } from '@inertiajs/react';
import { X, Save, Building, Hash, FileText } from 'lucide-react';
import { useEffect, FormEventHandler } from 'react';

// YA NO NECESITAS declarar route ni importar nada extra.

interface CreateModalProps {
    show: boolean;
    onClose: () => void;
}

export default function CreateModal({ show, onClose }: CreateModalProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        code: '',         // El formulario envía 'code'
        description: '',
    });

    useEffect(() => {
        if (!show) {
            reset();
            clearErrors();
        }
    }, [show]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        // CORRECCIÓN:
        // 1. Usamos la URL manual '/bloques' (Coincide con Route::post('/bloques'...))
        // 2. Quitamos route() para evitar errores de undefined.
        post('/bloques', {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Building className="h-5 w-5" />
                        </div>
                        Nuevo Bloque
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        {/* Código */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Código</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ej: B-101"
                                />
                            </div>
                            {errors.code && <p className="mt-1 text-xs text-red-500 font-bold">{errors.code}</p>}
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
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Detalles del sector..."
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