import { useForm } from '@inertiajs/react';
import { XCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

interface CancelModalProps {
    show: boolean;
    onClose: () => void;
    actionUrl: string | null;
}

export default function CancelModal({ show, onClose, actionUrl }: CancelModalProps) {
    // Enviamos el estado como 'cancelado'
    const { put, processing } = useForm({ status: 'cancelado' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (actionUrl) {
            put(actionUrl, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                        <XCircle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">¿Cancelar reserva?</h3>
                    <p className="text-gray-500">
                        Esta acción liberará las habitaciones asignadas inmediatamente. ¿Estás seguro de continuar?
                    </p>
                    
                    <form onSubmit={submit} className="mt-8 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            Volver
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-orange-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Cancelando...' : <><XCircle className="h-4 w-4" /> Sí, cancelar</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}