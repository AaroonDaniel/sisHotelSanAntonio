import { router, useForm } from '@inertiajs/react';
import { Brush, CheckCircle, Wrench } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface CleanConfirmModalProps {
    show: boolean;
    onClose: () => void;
    room: any;
}

export default function CleanConfirmModal({ show, onClose, room }: CleanConfirmModalProps) {
    const { put, processing } = useForm();
    const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);

    // Camino Feliz: Todo está limpio
    const submitClean: FormEventHandler = (e) => {
        e.preventDefault();
        if (room) {
            put(`/rooms/${room.id}/clean`, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    };

    // Camino de Daño: Enviar a mantenimiento
    const sendToMaintenance = () => {
        if (room) {
            setIsMaintenanceLoading(true);
            router.put(`/rooms/${room.id}/maintenance`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsMaintenanceLoading(false);
                    onClose();
                },
                onError: () => setIsMaintenanceLoading(false)
            });
        }
    };

    if (!show || !room) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
                        <Brush className="h-7 w-7" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        ¿Habitación {room.number} lista?
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        Selecciona el estado actual de la habitación tras la revisión del personal de limpieza.
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        {/* Botón Principal: Habilitar */}
                        <button
                            onClick={submitClean}
                            disabled={processing || isMaintenanceLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? 'Habilitando...' : <><CheckCircle className="h-5 w-5" /> Sí, está limpia y disponible</>}
                        </button>

                        {/* Botón Secundario: Mantenimiento */}
                        <button
                            type="button"
                            onClick={sendToMaintenance}
                            disabled={processing || isMaintenanceLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100 hover:text-red-700 active:scale-95 disabled:opacity-50"
                        >
                            {isMaintenanceLoading ? 'Enviando...' : <><Wrench className="h-4 w-4" /> Reportar daño (Mantenimiento)</>}
                        </button>

                        {/* Botón Cancelar */}
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing || isMaintenanceLoading}
                            className="mt-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Cancelar y cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}