import { useForm } from '@inertiajs/react';
import { X, Save, Key, Quote } from 'lucide-react';
import { useEffect, FormEventHandler } from 'react';

interface PermissionModalProps {
    show: boolean;
    onClose: () => void;
    PermissionToEdit?: any | null;
}

export default function PermissionModal({ show, onClose, PermissionToEdit }: PermissionModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
    });

    useEffect(() => {
        if (show) {
            if (PermissionToEdit) {
                setData({
                    name: PermissionToEdit.name,
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, PermissionToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            }
        };

        if (PermissionToEdit) {
            put(`/permisos/${PermissionToEdit.id}`, options);
        } else {
            post('/permisos', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-amber-100 p-1.5 text-amber-600">
                            <Key className="h-5 w-5" />
                        </div>
                        {PermissionToEdit ? 'Editar Permiso' : 'Nuevo Permiso'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Nombre de la Regla / Acción
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Quote className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value.toLowerCase())}
                                    className="w-full rounded-xl border border-gray-400 py-2 pr-3 pl-10 text-base text-black lowercase focus:border-amber-500 focus:ring-0"
                                    placeholder="ej: borrar_gastos"
                                    required
                                    autoFocus
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-xs text-red-500 font-bold">{errors.name}</p>}
                            <p className="text-[11px] text-gray-500 mt-2 font-medium">Los espacios se convertirán automáticamente en guiones bajos (_).</p>
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
                            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-amber-400 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}