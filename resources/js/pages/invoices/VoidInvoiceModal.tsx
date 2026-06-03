import { useForm } from '@inertiajs/react';
import { Ban, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: number | null;
    invoiceNumber: string | null;
}

export default function VoidInvoiceModal({
    isOpen,
    onClose,
    invoiceId,
    invoiceNumber,
}: Props) {
    const { data, setData, post, processing, reset, errors, clearErrors } =
        useForm({
            void_reason_code: 1, // Por defecto: 1 = Factura mal emitida
        });

    // false = formulario | true = factura anulada (vista de éxito)
    const [succeeded, setSucceeded] = useState(false);

    // Guardamos el timer para poder cancelarlo si el modal se cierra antes
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Al abrir el modal para una factura, reiniciamos todo
    useEffect(() => {
        if (isOpen) {
            setSucceeded(false);
            clearErrors();
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, invoiceId]);

    // Limpieza del timer si el componente se desmonta
    useEffect(() => {
        return () => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
        };
    }, []);

    const handleClose = () => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        reset();
        clearErrors();
        setSucceeded(false);
        onClose();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!invoiceId) return;

        post(`/facturacion/${invoiceId}/anular`, {
            // preserveScroll: la página no salta al refrescar la tabla.
            // preserveState: conserva el estado local del modal (succeeded)
            //                para mostrar "Anulada" mientras Inertia actualiza
            //                las props (la fila ya pasa a "Anulada" de fondo).
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSucceeded(true);
                // Mostrar "Anulada" 2 segundos y cerrar automáticamente
                closeTimer.current = setTimeout(() => {
                    handleClose();
                }, 2000);
            },
            // Si el SIAT rechaza o falta CUFD, se queda en el formulario
            // y se muestra errors.error más abajo.
        });
    };

    // El backend devuelve el error con withErrors(['error' => ...]).
    // useForm tipa los errores según los datos (void_reason_code), por eso
    // leemos 'error' con un cast para que TypeScript no se queje.
    const backendError = (errors as Record<string, string>).error;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl bg-white shadow-2xl fade-in zoom-in-95">
                {/* ============ ENCABEZADO ============ */}
                <div
                    className={`flex items-center justify-between border-b px-6 py-4 ${
                        succeeded
                            ? 'border-green-100 bg-green-50'
                            : 'border-gray-100 bg-gray-50'
                    }`}
                >
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        {succeeded ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                            <Ban className="h-5 w-5 text-red-500" />
                        )}
                        {succeeded
                            ? `Factura #${invoiceNumber} anulada`
                            : `Anular Factura #${invoiceNumber}`}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 transition-colors hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* ============ VISTA DE ÉXITO (2 seg) ============ */}
                {succeeded ? (
                    <div className="flex flex-col items-center px-6 py-10 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-9 w-9 text-green-600" />
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                            Factura anulada correctamente
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            <Ban className="h-3 w-3" />
                            Anulada
                        </span>
                    </div>
                ) : (
                    /* ============ FORMULARIO ============ */
                    <form onSubmit={submit} className="p-6">
                        <div className="mb-6 rounded-r-lg border-l-4 border-red-500 bg-red-50 p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
                                <p className="text-sm text-red-800">
                                    <strong>Atención:</strong> Esta acción es
                                    irreversible. La factura será anulada en los
                                    servidores de Impuestos Nacionales (SIAT).
                                </p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                Motivo de Anulación (Catálogo SIAT)
                            </label>
                            <select
                                value={data.void_reason_code}
                                onChange={(e) =>
                                    setData(
                                        'void_reason_code',
                                        Number(e.target.value),
                                    )
                                }
                                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                                disabled={processing}
                            >
                                <option value={1}>1 - Factura mal emitida</option>
                                <option value={2}>
                                    2 - Nota de Crédito-Débito mal emitida
                                </option>
                                <option value={3}>
                                    3 - Datos de emisión incorrectos
                                </option>
                                <option value={4}>
                                    4 - Factura devuelta (Cancelación de Huésped)
                                </option>
                            </select>
                            {errors.void_reason_code && (
                                <p className="mt-2 text-sm text-red-600">
                                    {errors.void_reason_code}
                                </p>
                            )}
                        </div>

                        {/* Error devuelto por el backend (SIAT rechazó, sin CUFD, etc.) */}
                        {backendError && (
                            <div className="mb-4 rounded-r-lg border-l-4 border-red-500 bg-red-50 p-3">
                                <p className="text-sm font-medium text-red-700">
                                    {backendError}
                                </p>
                            </div>
                        )}

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                disabled={processing}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                                {processing
                                    ? 'Anulando en SIAT...'
                                    : 'Confirmar Anulación'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}