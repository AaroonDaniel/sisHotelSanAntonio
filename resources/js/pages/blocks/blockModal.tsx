import { useForm } from '@inertiajs/react';
import { Building, FileText, Hash, Save, X } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

interface Block {
    id?: number;
    code: string;
    description: string | null;
}

interface BlockModalProps {
    show: boolean;
    onClose: () => void;
    blockToEdit?: Block | null; // Opcional: Si viene, estamos editando
}

export default function BlockModal({
    show,
    onClose,
    blockToEdit,
}: BlockModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            code: '',
            description: '',
        });

    // Cargar datos si estamos editando, o limpiar si es nuevo
    useEffect(() => {
        if (show) {
            if (blockToEdit) {
                setData({
                    code: blockToEdit.code,
                    description: blockToEdit.description || '',
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, blockToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true, // <--- AGREGAR ESTO SIEMPRE
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (blockToEdit) {
            // EDITAR (PUT)
            // Usamos ruta manual: /bloques/{id}
            put(`/bloques/${blockToEdit.id}`, options);
        } else {
            // CREAR (POST)
            post('/bloques', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Building className="h-5 w-5" />
                        </div>
                        {blockToEdit ? 'Editar Bloque' : 'Nuevo Bloque'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        {/* Código */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Código
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.code}
                                    onChange={(e) =>
                                        setData(
                                            'code',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="Ej: B-101"
                                />
                            </div>
                            {errors.code && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.code}
                                </p>
                            )}
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Descripción
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute top-3 left-3">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                </div>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData(
                                            'description',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="Detalles del sector..."
                                />
                            </div>
                            {errors.description && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
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
