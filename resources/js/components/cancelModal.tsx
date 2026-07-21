import OperatorSelector, {
    Operator as SharedOperator,
} from '@/components/OperatorSelector';
import { useForm } from '@inertiajs/react';
import { CheckCircle, XCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

interface CancelModalProps {
    show: boolean;
    onClose: () => void;
    actionUrl: string | null;
    onSuccess?: () => void; // Nueva prop para manejar el éxito de la acción
    // 🚀 Devolución de adelanto al cancelar: estos campos solo se piden
    // (y solo se muestran) cuando la reserva realmente tiene un adelanto
    // que devolver. Si no hay adelanto, cancela exactamente igual que antes.
    operators?: SharedOperator[];
    hasAdvance?: boolean;
    advanceAmount?: number;
}

const BANCOS = [
    { id: 'YAPE', img: '/images/bancos/yape.png' },
    { id: 'FIE', img: '/images/bancos/fie.png' },
    { id: 'BNB', img: '/images/bancos/bnb.png' },
    { id: 'ECO', img: '/images/bancos/eco.png' },
];

export default function CancelModal({
    show,
    onClose,
    actionUrl,
    onSuccess,
    operators = [],
    hasAdvance = false,
    advanceAmount = 0,
}: CancelModalProps) {
    // Enviamos el estado como 'cancelado'. operator_id/refund_method/
    // refund_bank_name solo se leen en el backend si hay adelanto que
    // devolver (ver ReservationController::update()).
    const { data, setData, put, processing, errors, reset } = useForm({
        status: 'cancelado',
        operator_id: '',
        refund_method: 'EFECTIVO',
        refund_bank_name: '',
    });

    const isFormValid =
        !hasAdvance ||
        (!!data.operator_id &&
            (data.refund_method === 'EFECTIVO' || !!data.refund_bank_name));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!actionUrl || !isFormValid) return;
        put(actionUrl, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
                if (onSuccess) {
                    onSuccess();
                }
            },
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-red-600">
                        <XCircle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">¿Cancelar reserva?</h3>
                    <p className="text-gray-500">
                        Esta acción liberará las habitaciones asignadas inmediatamente.
                        {hasAdvance &&
                            ` Esta reserva tiene un adelanto de ${advanceAmount.toFixed(2)} Bs que se devolverá.`}
                        {' '}¿Estás seguro de continuar?
                    </p>

                    <form onSubmit={submit} className="mt-6 text-left">
                        {hasAdvance && (
                            <div className="mb-6 space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <div>
                                    <p
                                        className={`mb-2 text-center text-[10px] font-bold uppercase ${
                                            data.operator_id
                                                ? 'text-green-700'
                                                : 'text-red-700'
                                        }`}
                                    >
                                        {data.operator_id
                                            ? 'Operador seleccionado'
                                            : '¿Quién devuelve el adelanto?'}
                                    </p>
                                    <OperatorSelector
                                        operators={operators}
                                        value={data.operator_id}
                                        onChange={(id) =>
                                            setData('operator_id', id)
                                        }
                                        error={errors.operator_id}
                                        compact
                                        size="sm"
                                        label=""
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[10px] font-bold text-gray-600 uppercase">
                                        Método de devolución
                                    </label>
                                    <div className="flex rounded-lg bg-white p-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setData((prev) => ({
                                                    ...prev,
                                                    refund_method: 'EFECTIVO',
                                                    refund_bank_name: '',
                                                }))
                                            }
                                            className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${data.refund_method === 'EFECTIVO' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            EFECTIVO
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setData(
                                                    'refund_method',
                                                    'QR',
                                                )
                                            }
                                            className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${data.refund_method === 'QR' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            QR BANCARIO
                                        </button>
                                    </div>

                                    {data.refund_method === 'QR' && (
                                        <div className="mt-1.5 grid animate-in grid-cols-4 gap-1.5 fade-in slide-in-from-top-1">
                                            {BANCOS.map((banco) => (
                                                <button
                                                    key={banco.id}
                                                    type="button"
                                                    title={banco.id}
                                                    onClick={() =>
                                                        setData(
                                                            'refund_bank_name',
                                                            banco.id,
                                                        )
                                                    }
                                                    className={`relative flex h-10 w-full items-center justify-center rounded-lg border p-1 transition-all duration-200 ${
                                                        data.refund_bank_name ===
                                                        banco.id
                                                            ? 'z-10 scale-105 border-red-500 bg-red-50 shadow-sm'
                                                            : 'border-gray-200 bg-white opacity-70 grayscale-[30%] hover:border-gray-300 hover:bg-gray-50 hover:opacity-100 hover:grayscale-0'
                                                    }`}
                                                >
                                                    <img
                                                        src={banco.img}
                                                        alt={banco.id}
                                                        className="h-full w-full object-contain"
                                                    />
                                                    {data.refund_bank_name ===
                                                        banco.id && (
                                                        <div className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 text-white shadow-sm">
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    reset();
                                    onClose();
                                }}
                                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                            >
                                Volver
                            </button>
                            <button
                                type="submit"
                                disabled={processing || !isFormValid}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-500 active:scale-95 transition disabled:opacity-50"
                            >
                                {processing ? 'Cancelando...' : <><XCircle className="h-4 w-4" /> Sí, cancelar</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
