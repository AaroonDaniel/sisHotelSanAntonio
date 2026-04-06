import { useForm } from '@inertiajs/react';
import { Wrench, CheckCircle, X } from 'lucide-react';
import { FormEventHandler } from 'react';

interface FinishMaintenanceModalProps {
    show: boolean;
    onClose: () => void;
    room: any;
}

export default function FinishMaintenanceModal({ show, onClose, room }: FinishMaintenanceModalProps) {
    const { put, processing } = useForm();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (room) {
            put(`/rooms/${room.id}/finish-maintenance`, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    };

    if (!show || !room) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-red-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-red-800">
                        <div className="rounded-lg bg-red-200 p-1.5 text-red-700">
                            <Wrench className="h-5 w-5" />
                        </div>
                        Finalizar Reparación
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-center">
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        ¿Habitación {room.number} reparada?
                    </h3>
                    <p className="text-base text-gray-800 leading-relaxed">
                        
                        La habitación pasará a estado de <b className="text-gray-700">Limpieza</b>
                    </p>

                    <form onSubmit={submit} className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-4">
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
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><CheckCircle className="h-4 w-4" /> Confirmar Reparación</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}