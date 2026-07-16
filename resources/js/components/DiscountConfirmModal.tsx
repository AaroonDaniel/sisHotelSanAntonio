import { AlertTriangle } from 'lucide-react';

interface DiscountConfirmModalProps {
    show: boolean;
    discountAmount: number;
    subtotal: number;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function DiscountConfirmModal({
    show,
    discountAmount,
    subtotal,
    onCancel,
    onConfirm,
}: DiscountConfirmModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl bg-white shadow-2xl zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        Confirmar Descuento
                    </h3>
                    <p className="text-sm leading-relaxed text-gray-500">
                        Atención: el descuento es de{' '}
                        <span className="font-bold text-gray-800">
                            {discountAmount.toFixed(2)} Bs
                        </span>{' '}
                        sobre un subtotal de{' '}
                        <span className="font-bold text-gray-800">
                            {subtotal.toFixed(2)} Bs
                        </span>
                        .
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">
                        ¿Estás seguro de que quiere aplicar el descuento?
                    </p>

                    <div className="mt-8 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-500 active:scale-95"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
