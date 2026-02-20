import { useForm } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

interface ConfirmModalProps {
    show: boolean;
    onClose: () => void;
    actionUrl: string | null;
}

export default function ConfirmModal({ show, onClose, actionUrl }: ConfirmModalProps) {
    // Enviamos el estado como 'confirmado'
    const { put, processing } = useForm({ status: 'confirmado' });

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
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">¿Confirmar reserva?</h3>
                    <p className="text-gray-500">
                        La llegada del huésped será confirmada y las habitaciones pasarán a estar ocupadas.
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
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Confirmando...' : <><CheckCircle className="h-4 w-4" /> Sí, confirmar</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}