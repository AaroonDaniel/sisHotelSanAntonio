import { router } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface ConfirmCompleteModalProps {
    show: boolean;
    onClose: () => void;
    checkin: {
        id: number;
        room_id: number;
        duration_days: number;
        check_in_date: string;
        origin?: string | null;
        roomNumber?: string | number;
    } | null;
}

export default function ConfirmCompleteModal({
    show,
    onClose,
    checkin,
}: ConfirmCompleteModalProps) {
    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!checkin) return;

        setProcessing(true);
        setErrorMsg(null);

        router.put(
            `/checks/${checkin.id}`,
            {
                room_id: checkin.room_id,
                duration_days: Math.max(1, checkin.duration_days || 1),
                check_in_date: checkin.check_in_date,
                origin: checkin.origin || 'NO ESPECIFICADO',
                force_complete: true,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setProcessing(false);
                    onClose();
                },
                onError: (errors) => {
                    setProcessing(false);
                    console.error('Error al forzar completitud', errors);
                    setErrorMsg(
                        "El sistema detectó que faltan datos obligatorios del Titular (Ej. CI). Usa el botón 'Completar' primero.",
                    );
                },
            },
        );
    };

    if (!show || !checkin) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        ¿Confirmar Hab. {checkin.roomNumber} como completa?
                    </h3>
                    <p className="text-gray-500">
                        Se marcará como Ocupada y se mantendrá el precio
                        original, sin necesidad de agregar más huéspedes.
                    </p>

                    {errorMsg && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm font-medium text-red-700">
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    <form
                        onSubmit={submit}
                        className="mt-8 flex justify-center gap-3"
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                'Confirmando...'
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4" /> Sí,
                                    confirmar
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}