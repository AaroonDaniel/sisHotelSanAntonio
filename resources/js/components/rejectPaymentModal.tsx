import { router } from '@inertiajs/react';
import { XCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface RejectPaymentModalProps {
    show: boolean;
    onClose: () => void;
    reservationId: number | null;
    onSuccess?: () => void;
}

export default function RejectPaymentModal({
    show,
    onClose,
    reservationId,
    onSuccess,
}: RejectPaymentModalProps) {
    const [processing, setProcessing] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!reservationId) return;
        setProcessing(true);
        router.post(
            `/admin/reservas/${reservationId}/rechazar-pago`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    onClose();
                    onSuccess?.();
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <XCircle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">¿Rechazar comprobante?</h3>
                    <p className="text-gray-500">
                        La reserva será <strong>cancelada</strong> y las habitaciones quedarán liberadas inmediatamente. Esta acción no se puede deshacer.
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
                            {processing ? 'Rechazando...' : <><XCircle className="h-4 w-4" /> Sí, rechazar</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
