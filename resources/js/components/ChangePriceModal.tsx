import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { router } from '@inertiajs/react';
import { DollarSign } from 'lucide-react';
import { FormEventHandler, useMemo, useState } from 'react';
import OperatorSelector, { Operator } from './OperatorSelector';

interface ChangePriceModalProps {
    show: boolean;
    onClose: () => void;
    checkinId: number;
    currentPrice: number;
    // price_effective_since ?? check_in_date: desde cuándo rige la tarifa
    // ACTUAL (mismo ancla que usa el backend en calculateBillableDays()).
    anchorDate: string;
    existingCarriedBalance: number;
    servicesCost: number;
    operators: Operator[];
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);

const toDateInputValue = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Días de calendario entre dos fechas (solo la parte de fecha, sin hora),
// con el mismo mínimo de 1 noche que usa calculateBillableDays() en el
// backend cuando la diferencia da 0 (mismo día se cobra al menos 1 noche).
const diffDaysMinOne = (from: Date, to: Date) => {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    return diff <= 0 ? 1 : diff;
};

export default function ChangePriceModal({
    show,
    onClose,
    checkinId,
    currentPrice,
    anchorDate,
    existingCarriedBalance,
    servicesCost,
    operators,
}: ChangePriceModalProps) {
    const [newPrice, setNewPrice] = useState<string>('');
    const [effectiveDate, setEffectiveDate] = useState<string>(
        toDateInputValue(new Date()),
    );
    const [operatorId, setOperatorId] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const preview = useMemo(() => {
        const nuevoPrecio = parseFloat(newPrice);
        if (isNaN(nuevoPrecio) || !effectiveDate) return null;

        const anchor = new Date(anchorDate);
        const efectiva = new Date(effectiveDate + 'T00:00:00');
        const hoy = new Date();

        const diasCongelados = diffDaysMinOne(anchor, efectiva);
        const deudaCongelada = diasCongelados * currentPrice;

        const diasNuevaTarifaHastaHoy = diffDaysMinOne(efectiva, hoy);
        const montoNuevaTarifaHastaHoy = diasNuevaTarifaHastaHoy * nuevoPrecio;

        const totalEstimadoHoy =
            existingCarriedBalance +
            deudaCongelada +
            montoNuevaTarifaHastaHoy +
            servicesCost;

        return {
            diasCongelados,
            deudaCongelada,
            diasNuevaTarifaHastaHoy,
            montoNuevaTarifaHastaHoy,
            totalEstimadoHoy,
        };
    }, [
        newPrice,
        effectiveDate,
        anchorDate,
        currentPrice,
        existingCarriedBalance,
        servicesCost,
    ]);

    const canSubmit =
        !!operatorId &&
        newPrice !== '' &&
        !isNaN(parseFloat(newPrice)) &&
        parseFloat(newPrice) >= 0 &&
        Math.abs(parseFloat(newPrice) - currentPrice) >= 0.01 &&
        !!effectiveDate;

    const handleClose = () => {
        setNewPrice('');
        setEffectiveDate(toDateInputValue(new Date()));
        setOperatorId('');
        setError(null);
        onClose();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setProcessing(true);
        setError(null);

        router.post(
            `/checkins/${checkinId}/change-price`,
            {
                new_price: parseFloat(newPrice),
                effective_date: effectiveDate,
                operator_id: operatorId,
            },
            {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onError: (errors) => {
                    setError(
                        Object.values(errors)[0] ||
                            'No se pudo cambiar la tarifa.',
                    );
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog
            open={show}
            onOpenChange={(open) => {
                if (!open) handleClose();
            }}
        >
            <DialogContent className="rounded-2xl border-none bg-white p-0 shadow-2xl sm:max-w-md">
                <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-800">
                        <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
                            <DollarSign className="h-4 w-4" />
                        </div>
                        Cambiar Tarifa
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Cambiar la tarifa por noche a partir de una fecha,
                        conservando el cobro de las noches ya transcurridas a la
                        tarifa anterior.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4 p-5">
                    <p className="text-xs text-gray-500">
                        Tarifa actual:{' '}
                        <span className="font-bold text-gray-700">
                            {formatCurrency(currentPrice)} / noche
                        </span>
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-600">
                                Nuevo Precio / Noche
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                placeholder="Ej: 100"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:ring-emerald-500"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-600">
                                Aplicar a partir de
                            </label>
                            <input
                                type="date"
                                value={effectiveDate}
                                max={toDateInputValue(new Date())}
                                onChange={(e) =>
                                    setEffectiveDate(e.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {preview && (
                        <div className="space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900">
                            <p>
                                🔒 <strong>{preview.diasCongelados}</strong>{' '}
                                noche(s) ya transcurridas se mantienen a{' '}
                                <strong>{formatCurrency(currentPrice)}</strong>{' '}
                                = {formatCurrency(preview.deudaCongelada)}
                            </p>
                            <p>
                                🆕 Desde esa fecha, cada noche se cobra a{' '}
                                <strong>
                                    {formatCurrency(parseFloat(newPrice) || 0)}
                                </strong>{' '}
                                / noche.
                            </p>
                            <div className="my-1 border-t border-dashed border-emerald-200" />
                            <p className="text-sm font-bold">
                                Total estimado hoy:{' '}
                                {formatCurrency(preview.totalEstimadoHoy)}
                            </p>
                        </div>
                    )}

                    <div>
                        <OperatorSelector
                            operators={operators}
                            value={operatorId}
                            onChange={setOperatorId}
                            label="¿Quién autoriza este cambio de tarifa?"
                            compact
                            size="sm"
                        />
                        {!operatorId && (
                            <p className="mt-1.5 text-[11px] font-semibold text-amber-600">
                                Seleccione un operador para poder confirmar.
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-xs font-semibold text-red-500">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit || processing}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : 'Confirmar Cambio'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
