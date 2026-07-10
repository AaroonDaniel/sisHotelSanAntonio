import { router, useForm } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

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
    const { data, setData, post, processing, reset } = useForm({
        operator_id: operatorId,
        left_amount: '',
    });

    // Sí/No: ¿deja un monto físico en caja para el siguiente operador?
    // Se pide explícitamente en cada cierre (no se asume nada) para que
    // quede registrado en el cuadre, sea la respuesta la que sea.
    const [leavesAmount, setLeavesAmount] = useState<'yes' | 'no' | null>(null);

    // El modal se queda montado (controlado por `show`), así que si el
    // operador seleccionado en la página cambia, hay que reflejarlo aquí.
    useEffect(() => {
        setData('operator_id', operatorId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operatorId]);

    // Cada vez que se abre el modal para un nuevo cierre, se reinicia la
    // pregunta: no debe arrastrar la respuesta del cierre anterior.
    useEffect(() => {
        if (show) {
            setLeavesAmount(null);
            setData('left_amount', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const canSubmit =
        !!data.operator_id &&
        (leavesAmount === 'no' ||
            (leavesAmount === 'yes' && Number(data.left_amount) > 0));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setData('left_amount', leavesAmount === 'no' ? '0' : data.left_amount);

        post('/cash-registers/close', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
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

                    {/* Pregunta: ¿deja monto en caja? */}
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                        <p className="mb-3 text-sm font-bold text-amber-800">
                            ¿Dejas un monto en caja para el siguiente operador?
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setLeavesAmount('yes')}
                                className={`flex-1 rounded-xl border-2 py-2 text-sm font-bold transition ${
                                    leavesAmount === 'yes'
                                        ? 'border-amber-600 bg-amber-100 text-amber-800'
                                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                Sí
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeavesAmount('no')}
                                className={`flex-1 rounded-xl border-2 py-2 text-sm font-bold transition ${
                                    leavesAmount === 'no'
                                        ? 'border-gray-600 bg-gray-100 text-gray-800'
                                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                No
                            </button>
                        </div>

                        {leavesAmount === 'yes' && (
                            <div className="mt-3">
                                <label className="mb-1 block text-xs font-bold tracking-wide text-amber-700 uppercase">
                                    Monto dejado en caja
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center font-black text-gray-400">
                                        Bs
                                    </span>
                                    <input
                                        type="number"
                                        step="0.50"
                                        min="0"
                                        autoFocus
                                        value={data.left_amount}
                                        onChange={(e) =>
                                            setData(
                                                'left_amount',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-lg border-2 border-gray-200 py-2 pr-3 pl-9 text-base font-bold text-gray-800 focus:border-amber-500 focus:ring-amber-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Formulario / Botones */}
                    <form
                        onSubmit={submit}
                        className="mt-6 flex justify-center gap-3"
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
                            disabled={processing || !canSubmit}
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
