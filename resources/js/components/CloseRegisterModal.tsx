import { router, useForm } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

interface CloseRegisterModalProps {
    show: boolean;
    operatorId: number | string;
    operatorName?: string;
    onClose: () => void;
}

export default function CloseRegisterModal({
    show,
    operatorId,
    operatorName,
    onClose,
}: CloseRegisterModalProps) {
    // Usamos useForm para manejar el estado de carga (processing)
    const { data, setData, post, processing } = useForm({
        operator_id: operatorId,
    });

    // El modal se queda montado (controlado por `show`), así que si el
    // operador seleccionado en la página cambia, hay que reflejarlo aquí.
    useEffect(() => {
        setData('operator_id', operatorId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operatorId]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post('/cash-registers/close', {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
                // Terminal Compartida: cerrar el turno de un operador ya NO
                // cierra la sesión de 'recepcion' (es compartida). Tras
                // cerrar, se vuelve directo al panel de habitaciones.
                router.visit('/status');
            },
        });
    };
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="p-6 text-center">
                    {/* Ícono Rojo */}
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <Lock className="h-8 w-8" />
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        ¿Cerrar Caja y Finalizar Turno?
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">
                        ¿Estás seguro de que todo está en orden? Se cerrará el
                        turno de{' '}
                        <strong className="text-gray-700">
                            {operatorName ?? 'este operador'}
                        </strong>
                        . Volverás al panel de habitaciones.
                    </p>

                    {/* Formulario / Botones */}
                    <form
                        onSubmit={submit}
                        className="mt-8 flex justify-center gap-3"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            Volver
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.operator_id}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                'Cerrando caja...'
                            ) : (
                                <>
                                    <Lock className="h-4 w-4" /> Sí, cerrar caja
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
