import { useForm } from '@inertiajs/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface DeleteModalProps {
    show: boolean;
    onClose: () => void;
    guestId: number | null;
}

export default function DeleteModal({ show, onClose, guestId }: DeleteModalProps) {
    const { delete: destroy, processing } = useForm();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (guestId) {
            // CORRECCIÓN: Cambiar ruta de /bloques a /huespedes
            destroy(`/invitados/${guestId}`, {
                onSuccess: () => onClose(),
            });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    {/* CORRECCIÓN: Cambiar texto a 'huesped' */}
                    <h3 className="mb-2 text-xl font-bold text-gray-800">¿Eliminar huesped?</h3>
                    <p className="text-gray-500">
                        Esta acción no se puede deshacer. El huesped será eliminado permanentemente del sistema.
                    </p>
                    
                    <form onSubmit={submit} className="mt-8 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Eliminando...' : <><Trash2 className="h-4 w-4" /> Sí, eliminar</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}