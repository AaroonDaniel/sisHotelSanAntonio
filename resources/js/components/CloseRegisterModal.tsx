import { useForm } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { FormEventHandler } from 'react';

interface CloseRegisterModalProps {
    show: boolean;
    onClose: () => void;
}

export default function CloseRegisterModal({ show, onClose }: CloseRegisterModalProps) {
    // Usamos useForm para manejar el estado de carga (processing)
    const { post, processing } = useForm();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // Hacemos el POST a tu ruta de cierre
        post('/cash-registers/close', {
            preserveScroll: true,
            onSuccess: () => {
                // Al tener éxito, cerramos el modal
                onClose();
                // Nota: Como tu backend cerrará la sesión, Inertia automáticamente
                // redirigirá al usuario al Login tras esta petición.
            },
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    
                    {/* Ícono Rojo */}
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <Lock className="h-8 w-8" />
                    </div>
                    
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        ¿Cerrar Caja y Finalizar Turno?
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">
                        ¿Estás seguro de que todo está en orden? Al confirmar, se <strong>cerrará tu caja</strong> y el sistema <strong>cerrará tu sesión</strong> por seguridad. ¡Buen descanso!
                    </p>
                    
                    {/* Formulario / Botones */}
                    <form onSubmit={submit} className="mt-8 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            Volver
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? 'Cerrando caja...' : <><Lock className="h-4 w-4" /> Sí, cerrar caja</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}