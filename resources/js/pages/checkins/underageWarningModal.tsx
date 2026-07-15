import { AlertTriangle } from 'lucide-react';

interface UnderageWarningModalProps {
    show: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function UnderageWarningModal({
    show,
    onCancel,
    onConfirm,
}: UnderageWarningModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl bg-white shadow-2xl zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        Atención: Huésped Menor de Edad
                    </h3>
                    <p className="text-sm text-gray-500">
                        La fecha de nacimiento indica que este huésped es
                        menor de edad. ¿Desea continuar y registrarlo de
                        todas formas?
                    </p>

                    <div className="mt-8 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                        >
                            Volver
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 active:scale-95"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
