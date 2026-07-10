import { useForm } from '@inertiajs/react';
import { Wallet, X } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

interface OpenShiftModalProps {
    show: boolean;
    operatorId: number | string | null;
    operatorName: string | null;
    onClose: () => void;
    /** Se dispara después de abrir el turno con éxito. El formulario
     * original NO se reintenta automáticamente: el operador simplemente
     * vuelve a presionar "Guardar" (patrón elegido a propósito, más simple
     * y predecible que un reintento silencioso). */
    onOpened?: () => void;
}

/**
 * Terminal Compartida (Kiosk Mode) — Apertura de turno "bajo demanda".
 *
 * Se dispara cuando el backend responde que el operador elegido en el
 * OperatorSelector no tiene un turno (CashRegister) abierto para la acción
 * que se intentó (check-in, adelanto, devolución, checkout, gasto...).
 * Reutilizable: cada formulario solo necesita pasarle el operator_id/nombre
 * detectado en su propio manejo de error.
 */
export default function OpenShiftModal({
    show,
    operatorId,
    operatorName,
    onClose,
    onOpened,
}: OpenShiftModalProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        operator_id: '',
        opening_amount: '',
    });

    useEffect(() => {
        if (show && operatorId) {
            setData('operator_id', String(operatorId));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, operatorId]);

    if (!show) return null;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/cash-registers/open', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpened?.();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="relative w-full max-w-md animate-in rounded-2xl bg-white p-8 shadow-2xl zoom-in-95">
                <button
                    onClick={onClose}
                    type="button"
                    className="absolute top-4 right-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Cancelar"
                >
                    <X className="h-6 w-6" />
                </button>

                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 rounded-full bg-amber-50 p-5 shadow-inner">
                        <Wallet className="h-10 w-10 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
                        Apertura de Caja Requerida
                    </h2>
                    <p className="mt-2 text-base text-gray-700">
                        <b className="text-amber-700">
                            {operatorName ?? 'Este operador'}
                        </b>{' '}
                        no tiene un turno abierto. Declara el efectivo inicial
                        para iniciar su turno y luego vuelve a intentar la
                        acción.
                    </p>
                </div>

                <form onSubmit={submit}>
                    <div className="mb-6">
                        <label className="mb-2 block text-xs font-bold tracking-wider text-gray-800 uppercase">
                            Monto Inicial en Caja
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-4 flex items-center font-black text-gray-500">
                                Bs
                            </span>
                            <input
                                type="number"
                                step="0.50"
                                min="0"
                                required
                                autoFocus
                                value={data.opening_amount}
                                onChange={(e) =>
                                    setData('opening_amount', e.target.value)
                                }
                                className="block w-full [appearance:textfield] rounded-xl border-2 border-gray-200 py-3 pr-4 pl-12 text-xl font-black text-gray-800 transition-colors focus:border-amber-500 focus:ring-amber-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                placeholder="0.00"
                            />
                        </div>
                        {errors.opening_amount && (
                            <p className="mt-2 text-xs font-bold text-red-500">
                                {errors.opening_amount}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !data.opening_amount}
                        className="w-full rounded-xl bg-amber-600 py-4 text-base font-black tracking-widest text-white shadow-md transition-all hover:bg-amber-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {processing
                            ? 'ABRIENDO TURNO...'
                            : 'INICIAR TURNO Y CONTINUAR'}
                    </button>
                    <p className="mt-3 text-center text-[11px] text-gray-400">
                        Después de abrir el turno, presiona nuevamente "Guardar"
                        para completar tu acción.
                    </p>
                </form>
            </div>
        </div>
    );
}
