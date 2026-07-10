import { useForm } from '@inertiajs/react';
import { Undo2 } from 'lucide-react';
import { FormEventHandler } from 'react';

interface RestoreCheckinModalProps {
    show: boolean;
    checkinId: number | null;
    guestName?: string | null;
    onClose: () => void;
}

/**
 * Confirmación para "Restaurar Asignación" (Undo Checkout). No toca
 * payments/expenses — el backend solo reabre la estadía y la habitación.
 */
export default function RestoreCheckinModal({
    show,
    checkinId,
    guestName,
    onClose,
}: RestoreCheckinModalProps) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!checkinId) return;

        post(`/checkins/${checkinId}/restore`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <Undo2 className="h-8 w-8" />
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        ¿Restaurar Asignación?
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">
                        {guestName ? (
                            <>
                                Se reabrirá la estadía de{' '}
                                <strong className="text-gray-700">
                                    {guestName}
                                </strong>
                                .{' '}
                            </>
                        ) : (
                            'Se reabrirá esta estadía. '
                        )}
                        La habitación volverá a figurar como{' '}
                        <strong className="text-gray-700">Ocupada</strong>. Los
                        pagos y gastos ya registrados no se modifican.
                    </p>

                    <form
                        onSubmit={submit}
                        className="mt-6 flex justify-center gap-3"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                'Restaurando...'
                            ) : (
                                <>
                                    <Undo2 className="h-4 w-4" /> Sí, restaurar
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
