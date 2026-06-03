import { router } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface ApprovePaymentModalProps {
    show: boolean;
    onClose: () => void;
    reservationId: number | null;
    onSuccess?: () => void;
}

export default function ApprovePaymentModal({
    show,
    onClose,
    reservationId,
    onSuccess,
}: ApprovePaymentModalProps) {
    const [processing, setProcessing] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!reservationId) return;
        setProcessing(true);
        router.post(
            `/admin/reservas/${reservationId}/aprobar-pago`,
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
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">¿Aprobar pago?</h3>
                    <p className="text-gray-500">
                        La reserva pasará a <strong>Pendientes de Habitación</strong> y podrás asignar los cuartos cuando el huésped llegue.
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
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Aprobando...' : <><CheckCircle className="h-4 w-4" /> Sí, aprobar</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}