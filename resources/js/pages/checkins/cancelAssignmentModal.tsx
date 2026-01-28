import { useForm } from '@inertiajs/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface CancelModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void; // <--- ESTO ES CRUCIAL PARA CERRAR EL OTRO MODAL
    checkinId: number | null;
}

export default function CancelAssignmentModal({ show, onClose, onConfirm, checkinId }: CancelModalProps) {
    const { delete: destroy, processing } = useForm();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (checkinId) {
            destroy(`/checks/${checkinId}/cancel-assignment`, {
                onSuccess: () => {
                    onClose();   // Cierra esta alerta
                    onConfirm(); // Cierra el formulario principal
                },
            });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        ¿Cancelar Asignación?
                    </h3>
                    <p className="text-sm text-gray-500">
                        La habitación quedará <strong>LIBRE</strong> inmediatamente y no se generará cobro.
                        <br />
                        <span className="mt-2 block text-xs bg-red-50 text-red-600 py-1 px-2 rounded">
                            Acción irreversible (Solo primeros 10 min)
                        </span>
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
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Cancelando...' : <><Trash2 className="h-4 w-4" /> Confirmar</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}