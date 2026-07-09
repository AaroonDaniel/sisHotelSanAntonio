import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    Calculator,
    Save,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useState } from 'react';

export interface CheckinPaymentAudit {
    id: number;
    amount: number;
    method: string;
    type: string;
    cash_register_id: number | null;
    payment_date: string | null;
}

export interface CheckinDetailAudit {
    id: number;
    service_name: string;
    quantity: number;
    selling_price: number;
}

export interface CheckinAudit {
    id: number;
    guest_name: string;
    room_number: string;
    status: string;
    check_in_date: string | null;
    actual_arrival_date: string | null;
    check_out_date: string | null;
    duration_days: number;
    agreed_price: number;
    checkin_operator_id: number | null;
    checkin_operator_name: string | null;
    checkout_operator_id: number | null;
    checkout_operator_name: string | null;
    user_id: number | null;
    user_name: string;
    payments: CheckinPaymentAudit[];
    checkin_details: CheckinDetailAudit[];
}

export interface OperatorOption {
    id: number;
    full_name: string;
    nickname: string;
}

export interface CashRegisterOption {
    id: number;
    label: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    checkin: CheckinAudit | null;
    operators: OperatorOption[];
    cashRegisters: CashRegisterOption[];
}

const CHECKIN_STATUSES = ['activo', 'finalizado', 'transferido', 'cancelado'];

// La app entera trabaja en hora de La Paz (config/app.php: America/La_Paz).
const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date
        .toLocaleString('sv-SE', { timeZone: 'America/La_Paz' })
        .replace(' ', 'T')
        .slice(0, 16);
};

// Mismo criterio que CheckinController::calculateBillableDays(): diferencia
// en días de CALENDARIO (no horas exactas) y mínimo 1 noche siempre.
const diffInCalendarDays = (from: Date, to: Date): number => {
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffMs = startOf(to).getTime() - startOf(from).getTime();
    return Math.round(diffMs / 86400000);
};

const computeNights = (
    arrivalStr: string,
    departureStr: string,
    fallback: number,
): number => {
    if (!arrivalStr || !departureStr) return Math.max(1, fallback || 1);

    const arrival = new Date(arrivalStr);
    const departure = new Date(departureStr);
    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
        return Math.max(1, fallback || 1);
    }

    const diff = diffInCalendarDays(arrival, departure);
    return diff <= 0 ? 1 : diff;
};

export default function GodModeCheckinModal({
    show,
    onClose,
    checkin,
    operators,
    cashRegisters,
}: Props) {
    if (!show || !checkin) return null;

    return (
        // key={checkin.id}: al cambiar de check-in queremos que el
        // formulario reinicie su estado desde cero. En vez de sincronizar
        // props -> state con un useEffect (causa renders en cascada),
        // dejamos que React remonte el componente y lo inicialice limpio.
        <CheckinAuditForm
            key={checkin.id}
            checkin={checkin}
            operators={operators}
            cashRegisters={cashRegisters}
            onClose={onClose}
        />
    );
}

interface CheckinAuditFormProps {
    checkin: CheckinAudit;
    operators: OperatorOption[];
    cashRegisters: CashRegisterOption[];
    onClose: () => void;
}

function CheckinAuditForm({
    checkin,
    operators,
    cashRegisters,
    onClose,
}: CheckinAuditFormProps) {
    // "Total a pagar" es un campo de conveniencia de la UI: el admin
    // conoce el TOTAL que debió cobrarse, y este formulario deriva el
    // costo/noche (lo que realmente se guarda en la columna agreed_price,
    // que en toda la app es una tarifa POR NOCHE, no un total).
    const initialNights = Math.max(1, Number(checkin.duration_days) || 1);
    const initialTotal = (Number(checkin.agreed_price) || 0) * initialNights;

    const [form, setForm] = useState({
        check_in_date: formatDateForInput(checkin.check_in_date),
        check_out_date: formatDateForInput(checkin.check_out_date),
        status: checkin.status,
        total_a_pagar: String(initialTotal),
        checkin_operator_id: checkin.checkin_operator_id
            ? String(checkin.checkin_operator_id)
            : '',
        checkout_operator_id: checkin.checkout_operator_id
            ? String(checkin.checkout_operator_id)
            : '',
    });
    const [isSavingCheckin, setIsSavingCheckin] = useState(false);

    // Candado de seguridad: obliga a revisar la Vista Previa (con los
    // números ya recalculados) antes de habilitar "Guardar". Se reinicia
    // cada vez que el admin toca un campo que afecta el cálculo, para que
    // no pueda guardar cambios que nunca llegó a ver reflejados.
    const [previewAcknowledged, setPreviewAcknowledged] = useState(false);
    const invalidatePreview = () => setPreviewAcknowledged(false);

    // Estado local (editable) de cada pago, indexado por payment.id
    const [paymentForms, setPaymentForms] = useState<
        Record<number, { amount: string; cash_register_id: string }>
    >(() => {
        const initial: Record<
            number,
            { amount: string; cash_register_id: string }
        > = {};
        checkin.payments.forEach((p) => {
            initial[p.id] = {
                amount: String(p.amount),
                cash_register_id: p.cash_register_id
                    ? String(p.cash_register_id)
                    : '',
            };
        });
        return initial;
    });
    const [savingPaymentId, setSavingPaymentId] = useState<number | null>(
        null,
    );

    // --- VISTA PREVIA (cálculo en tiempo real, sin efectos) ---
    const nights = computeNights(
        form.check_in_date,
        form.check_out_date,
        checkin.duration_days,
    );
    const totalAPagar = Number(form.total_a_pagar) || 0;
    const costPerNight = nights > 0 ? totalAPagar / nights : 0;

    const arrivalDate = form.check_in_date
        ? new Date(form.check_in_date)
        : null;
    const departureDate = form.check_out_date
        ? new Date(form.check_out_date)
        : null;
    const hasDateWarning = !!(
        arrivalDate &&
        departureDate &&
        departureDate <= arrivalDate
    );

    const isConsistent =
        totalAPagar >= 0 && nights > 0 && !!form.check_in_date;
    const canSave = isConsistent && previewAcknowledged;

    // El check-in YA estaba finalizado al abrir el modal (dato original,
    // no lo que el admin seleccionó ahora en el <select> de estado).
    const wasOriginallyFinalizado = checkin.status === 'finalizado';
    const willBeFinalizado = form.status === 'finalizado';

    const lastPayment =
        checkin.payments.length > 0
            ? checkin.payments[checkin.payments.length - 1]
            : null;

    // Caja de la referencia ORIGINAL (tal cual estaba guardada al abrir).
    const originalClosingCashRegisterLabel = lastPayment?.cash_register_id
        ? (cashRegisters.find((cr) => cr.id === lastPayment.cash_register_id)
              ?.label ?? `#${lastPayment.cash_register_id}`)
        : '(sin caja vinculada)';

    // Caja PROYECTADA: si el admin ya editó el pago de cierre en la sección
    // de Pagos (más abajo), reflejamos ese cambio aquí también.
    const projectedCashRegisterId = lastPayment
        ? Number(
              paymentForms[lastPayment.id]?.cash_register_id ||
                  lastPayment.cash_register_id ||
                  0,
          ) || null
        : null;
    const projectedClosingCashRegisterLabel = projectedCashRegisterId
        ? (cashRegisters.find((cr) => cr.id === projectedCashRegisterId)
              ?.label ?? `#${projectedCashRegisterId}`)
        : '(sin caja vinculada)';

    const projectedCheckinOperatorLabel =
        operators.find((op) => String(op.id) === form.checkin_operator_id)
            ?.full_name ?? '(sin operador asignado)';
    const projectedCheckoutOperatorLabel =
        operators.find((op) => String(op.id) === form.checkout_operator_id)
            ?.full_name ?? '(sin operador asignado)';

    const saveCheckin = () => {
        setIsSavingCheckin(true);
        router.put(
            `/admin/god-mode/checkins/${checkin.id}`,
            {
                check_in_date: form.check_in_date,
                check_out_date: form.check_out_date || null,
                status: form.status,
                agreed_price: costPerNight.toFixed(2),
                duration_days: nights,
                checkin_operator_id: form.checkin_operator_id || null,
                checkout_operator_id: form.checkout_operator_id || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setPreviewAcknowledged(false),
                onFinish: () => setIsSavingCheckin(false),
            },
        );
    };

    const savePayment = (paymentId: number) => {
        const p = paymentForms[paymentId];
        if (!p) return;

        setSavingPaymentId(paymentId);
        router.put(
            `/admin/god-mode/payments/${paymentId}`,
            {
                amount: p.amount,
                cash_register_id: p.cash_register_id || null,
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingPaymentId(null),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-red-900/60 bg-gray-950 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-red-900/50 bg-red-950/30 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                        <ShieldAlert className="h-5 w-5 text-red-400" />
                        God Mode · Check-in #{checkin.id}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    {/* Advertencia */}
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-amber-300">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-xs leading-relaxed">
                            <strong>Edición directa de base de datos.</strong>{' '}
                            Estos cambios se escriben crudos (bypass de
                            validaciones de negocio, mutadores y
                            observers). No hay guardianes de duplicados,
                            capacidad ni conflictos de huésped. Verifica los
                            datos antes de guardar.
                        </p>
                    </div>

                    <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300 sm:grid-cols-4">
                        <div>
                            <span className="block text-xs text-gray-500">
                                Huésped
                            </span>
                            <span className="font-semibold text-white">
                                {checkin.guest_name}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">
                                Habitación
                            </span>
                            <span className="font-semibold text-white">
                                {checkin.room_number}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">
                                Creado por
                            </span>
                            <span className="font-semibold text-white">
                                {checkin.user_name}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">
                                Check-in original
                            </span>
                            <span className="font-semibold text-white">
                                {checkin.check_in_date
                                    ? new Date(
                                          checkin.check_in_date,
                                      ).toLocaleString('es-BO')
                                    : '—'}
                            </span>
                        </div>
                    </div>

                    {/* --- DATOS DE CIERRE ORIGINALES (solo si ya estaba finalizado) --- */}
                    {wasOriginallyFinalizado && (
                        <div className="mb-5 rounded-xl border border-sky-800/60 bg-sky-950/20 p-4">
                            <h3 className="mb-2 text-sm font-bold text-sky-300">
                                Esta estadía ya estaba Finalizada — datos de
                                cierre originales
                            </h3>
                            <div className="grid grid-cols-1 gap-3 text-xs text-sky-200/80 sm:grid-cols-3">
                                <div>
                                    <span className="block text-sky-400/70">
                                        Fecha de cierre registrada
                                    </span>
                                    <span className="font-semibold text-sky-100">
                                        {checkin.check_out_date
                                            ? new Date(
                                                  checkin.check_out_date,
                                              ).toLocaleString('es-BO')
                                            : '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-sky-400/70">
                                        Operador de cierre registrado
                                    </span>
                                    <span className="font-semibold text-sky-100">
                                        {checkin.checkout_operator_name ??
                                            '(sin operador asignado)'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-sky-400/70">
                                        Caja del último pago
                                    </span>
                                    <span className="font-semibold text-sky-100">
                                        {originalClosingCashRegisterLabel}
                                    </span>
                                </div>
                            </div>
                            <p className="mt-2 text-[11px] text-sky-300/60">
                                Puedes corregir estos valores abajo (fecha de
                                salida, operador) y en la sección de Pagos
                                (caja del pago de cierre).
                            </p>
                        </div>
                    )}

                    {/* --- FORM CHECKIN --- */}
                    <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-4">
                        <h3 className="mb-3 text-sm font-bold text-gray-200">
                            Datos de la estadía
                        </h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-400">
                                    Fecha de Check-in (check_in_date)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={form.check_in_date}
                                    onChange={(e) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            check_in_date: e.target.value,
                                        }));
                                        invalidatePreview();
                                    }}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-400">
                                    Fecha de finalización / salida
                                    (check_out_date)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={form.check_out_date}
                                    onChange={(e) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            check_out_date: e.target.value,
                                        }));
                                        invalidatePreview();
                                    }}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                />
                                {hasDateWarning && (
                                    <p className="mt-1 text-[11px] font-semibold text-red-400">
                                        La salida es anterior (o igual) a la
                                        llegada. Se forzará 1 noche mínimo,
                                        pero revisa las fechas.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-400">
                                    Estado (status)
                                </label>
                                <select
                                    value={form.status}
                                    onChange={(e) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            status: e.target.value,
                                        }));
                                        invalidatePreview();
                                    }}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                >
                                    {CHECKIN_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-400">
                                    Nuevo total a pagar (Bs)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.total_a_pagar}
                                    onChange={(e) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            total_a_pagar: e.target.value,
                                        }));
                                        invalidatePreview();
                                    }}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                />
                                <p className="mt-1 text-[11px] text-gray-500">
                                    Total real que debió cobrarse por toda la
                                    estadía. El sistema calcula el costo/noche
                                    resultante (columna agreed_price) en la
                                    Vista Previa de abajo.
                                </p>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-400">
                                    Operador de check-in
                                    (checkin_operator_id)
                                </label>
                                <select
                                    value={form.checkin_operator_id}
                                    onChange={(e) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            checkin_operator_id:
                                                e.target.value,
                                        }));
                                        invalidatePreview();
                                    }}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                >
                                    <option value="">
                                        (Sin operador asignado)
                                    </option>
                                    {operators.map((op) => (
                                        <option
                                            key={op.id}
                                            value={String(op.id)}
                                        >
                                            {op.full_name || op.nickname}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-400">
                                    Operador de checkout
                                    (checkout_operator_id)
                                </label>
                                <select
                                    value={form.checkout_operator_id}
                                    onChange={(e) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            checkout_operator_id:
                                                e.target.value,
                                        }));
                                        invalidatePreview();
                                    }}
                                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                >
                                    <option value="">
                                        (Sin operador asignado)
                                    </option>
                                    {operators.map((op) => (
                                        <option
                                            key={op.id}
                                            value={String(op.id)}
                                        >
                                            {op.full_name || op.nickname}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* --- VISTA PREVIA DE RESULTADOS --- */}
                        <div className="mt-5 rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4">
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
                                <Calculator className="h-4 w-4" />
                                Vista Previa de Resultados
                            </h4>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div>
                                    <span className="block text-xs text-emerald-400/70">
                                        Días totales de estadía
                                    </span>
                                    <span className="text-lg font-bold text-white">
                                        {nights}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-emerald-400/70">
                                        Nuevo total a pagar
                                    </span>
                                    <span className="text-lg font-bold text-white">
                                        Bs {totalAPagar.toFixed(2)}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-emerald-400/70">
                                        Costo resultante por noche
                                    </span>
                                    <span className="text-lg font-bold text-white">
                                        Bs {costPerNight.toFixed(2)}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-emerald-400/70">
                                        Estado final proyectado
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {form.status.toUpperCase()}
                                    </span>
                                    {willBeFinalizado && (
                                        <span className="mt-0.5 block text-[11px] font-medium text-emerald-300/80">
                                            Cierre:{' '}
                                            {departureDate
                                                ? departureDate.toLocaleString(
                                                      'es-BO',
                                                  )
                                                : '—'}{' '}
                                            · {projectedCheckoutOperatorLabel}{' '}
                                            ·{' '}
                                            {projectedClosingCashRegisterLabel}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- CANDADO DE CONFIRMACIÓN --- */}
                        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-gray-800 bg-gray-950 p-3 text-xs text-gray-300">
                            <input
                                type="checkbox"
                                checked={previewAcknowledged}
                                onChange={(e) =>
                                    setPreviewAcknowledged(e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span>
                                Revisé la Vista Previa de Resultados de
                                arriba y confirmo que estos cálculos (días,
                                total y costo por noche) son correctos antes
                                de guardar.
                            </span>
                        </label>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={saveCheckin}
                                disabled={isSavingCheckin || !canSave}
                                title={
                                    !canSave
                                        ? 'Marca la casilla de confirmación de la Vista Previa para habilitar el guardado'
                                        : undefined
                                }
                                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Save className="h-4 w-4" />
                                {isSavingCheckin
                                    ? 'Guardando...'
                                    : 'Sobrescribir Check-in'}
                            </button>
                        </div>
                    </div>

                    {/* --- PAGOS --- */}
                    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                        <h3 className="mb-3 text-sm font-bold text-gray-200">
                            Pagos asociados
                        </h3>

                        {checkin.payments.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                Este check-in no tiene pagos registrados.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {checkin.payments.map((p) => {
                                    const pf = paymentForms[p.id] ?? {
                                        amount: String(p.amount),
                                        cash_register_id: p.cash_register_id
                                            ? String(p.cash_register_id)
                                            : '',
                                    };
                                    return (
                                        <div
                                            key={p.id}
                                            className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3 sm:grid-cols-5"
                                        >
                                            <div className="text-xs text-gray-400">
                                                <span className="block text-gray-500">
                                                    Pago #{p.id}
                                                </span>
                                                <span className="font-semibold text-gray-300">
                                                    {p.type} · {p.method}
                                                </span>
                                                <span className="block text-gray-500">
                                                    {p.payment_date
                                                        ? new Date(
                                                              p.payment_date,
                                                          ).toLocaleString(
                                                              'es-BO',
                                                          )
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="sm:col-span-1">
                                                <label className="mb-1 block text-xs font-semibold text-gray-500">
                                                    Monto
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={pf.amount}
                                                    onChange={(e) =>
                                                        setPaymentForms(
                                                            (prev) => ({
                                                                ...prev,
                                                                [p.id]: {
                                                                    ...pf,
                                                                    amount: e
                                                                        .target
                                                                        .value,
                                                                },
                                                            }),
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="mb-1 block text-xs font-semibold text-gray-500">
                                                    Caja (cash_register_id)
                                                </label>
                                                <select
                                                    value={
                                                        pf.cash_register_id
                                                    }
                                                    onChange={(e) =>
                                                        setPaymentForms(
                                                            (prev) => ({
                                                                ...prev,
                                                                [p.id]: {
                                                                    ...pf,
                                                                    cash_register_id:
                                                                        e
                                                                            .target
                                                                            .value,
                                                                },
                                                            }),
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                                >
                                                    <option value="">
                                                        (Sin caja)
                                                    </option>
                                                    {cashRegisters.map(
                                                        (cr) => (
                                                            <option
                                                                key={cr.id}
                                                                value={String(
                                                                    cr.id,
                                                                )}
                                                            >
                                                                {cr.label}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                            <div>
                                                <button
                                                    onClick={() =>
                                                        savePayment(p.id)
                                                    }
                                                    disabled={
                                                        savingPaymentId ===
                                                        p.id
                                                    }
                                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                                >
                                                    <Save className="h-3.5 w-3.5" />
                                                    Guardar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
