import { router } from '@inertiajs/react';
import { AlertTriangle, Calculator, Save, X } from 'lucide-react';
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

export default function CheckinAuditModal({
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

// Misma clase para todas las casillas editables de esta vista -- look de
// "recibo claro" (blanco/rojo), igual que CheckoutConfirmationModal
// (rooms/status.tsx), NO el panel oscuro de auditoría genérica.
const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-red-500 focus:ring-red-500';
const inputClassSm =
    'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-red-500 focus:ring-red-500';

function CheckinAuditForm({
    checkin,
    operators,
    cashRegisters,
    onClose,
}: CheckinAuditFormProps) {
    // "Total Hospedaje" es un campo de conveniencia de la UI: el admin
    // conoce el TOTAL que debió cobrarse por las noches, y este formulario
    // deriva el costo/noche (lo que realmente se guarda en la columna
    // agreed_price, que en toda la app es una tarifa POR NOCHE, no un
    // total).
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

    // Candado de seguridad: obliga a revisar el resumen (con los números ya
    // recalculados) antes de habilitar el botón final. Se reinicia cada vez
    // que el admin toca un campo que afecta el cálculo, para que no pueda
    // guardar cambios que nunca llegó a ver reflejados.
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

    // --- RESUMEN / VISTA PREVIA (cálculo en tiempo real, sin efectos) ---
    const nights = computeNights(
        form.check_in_date,
        form.check_out_date,
        checkin.duration_days,
    );
    const totalHospedaje = Number(form.total_a_pagar) || 0;
    const costPerNight = nights > 0 ? totalHospedaje / nights : 0;

    const serviciosTotal = checkin.checkin_details.reduce(
        (sum, d) => sum + d.quantity * d.selling_price,
        0,
    );
    const totalEstadia = totalHospedaje + serviciosTotal;
    const totalPagado = Object.values(paymentForms).reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
    );
    const saldoPendiente = Math.max(0, totalEstadia - totalPagado);

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
        totalHospedaje >= 0 && nights > 0 && !!form.check_in_date;
    const canSave = isConsistent && previewAcknowledged;

    // El check-in YA estaba finalizado al abrir el modal (dato original,
    // no lo que el admin seleccionó ahora en el <select> de estado).
    const wasOriginallyFinalizado = checkin.status === 'finalizado';
    const willBeFinalizado = form.status === 'finalizado';

    const saveCheckin = () => {
        setIsSavingCheckin(true);
        router.put(
            `/admin/cocina/audit/checkins/${checkin.id}`,
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
            `/admin/cocina/audit/payments/${paymentId}`,
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* HEADER — mismo estilo que CheckoutConfirmationModal
                    (rooms/status.tsx): barra roja, título "Finalizar
                    Estadía". */}
                <div className="flex flex-none items-center justify-between border-b border-red-100 bg-red-50 px-4 py-2">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-red-700">
                        <AlertTriangle className="h-6 w-6" />
                        Finalizar Estadía
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4">
                    {/* --- RESUMEN / IDENTIDAD (igual que la caja roja del
                        checkout de operador: habitación + huésped, no
                        editable, es dato de identidad) --- */}
                    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-base shadow-inner">
                        <div className="mb-3 text-center">
                            <span className="block text-[20px] font-bold text-red-600 uppercase">
                                Habitación {checkin.room_number}
                            </span>
                            <span className="mt-1 block text-[13px] font-bold text-black uppercase">
                                {checkin.guest_name}
                            </span>
                        </div>

                        {/* RECIBO RESUMEN: mismos 3 tiles que el checkout de
                            operador, pero recalculados en vivo a partir de
                            las casillas editables de abajo. */}
                        <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-white/70 p-2 text-center shadow-inner">
                            <div>
                                <p className="text-[9px] font-bold tracking-wide text-gray-500 uppercase">
                                    Total Estadía
                                </p>
                                <p className="text-base font-black text-gray-800">
                                    {totalEstadia.toFixed(2)} Bs
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold tracking-wide text-gray-500 uppercase">
                                    Total Pagado
                                </p>
                                <p className="text-base font-black text-emerald-600">
                                    {totalPagado.toFixed(2)} Bs
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold tracking-wide text-gray-500 uppercase">
                                    Saldo Pendiente
                                </p>
                                <p
                                    className={`text-base font-black ${saldoPendiente <= 0 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                    {saldoPendiente.toFixed(2)} Bs
                                </p>
                            </div>
                        </div>

                        {/* --- CASILLAS EDITABLES: cada campo que el
                            checkout de operador muestra, acá es una caja de
                            texto con el valor original, lista para
                            corregir. --- */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">
                                    Ingreso
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
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">
                                    Salida
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
                                    className={inputClass}
                                />
                                {hasDateWarning && (
                                    <p className="mt-1 text-[11px] font-semibold text-red-600">
                                        La salida es anterior (o igual) a la
                                        llegada. Se forzará 1 noche mínimo.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="my-3 border-t border-dashed border-gray-300" />

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm text-gray-800 sm:col-span-2">
                                <span className="font-bold">
                                    Permanencia (calculada de las fechas):
                                </span>
                                <span className="font-black">
                                    {nights} noche(s)
                                </span>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">
                                    Total Hospedaje (Bs)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.total_a_pagar}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        if (
                                            val !== '' &&
                                            val.length > 1 &&
                                            val.startsWith('0') &&
                                            !val.startsWith('0.')
                                        ) {
                                            val = val.replace(/^0+/, '');
                                        }
                                        setForm((prev) => ({
                                            ...prev,
                                            total_a_pagar: val,
                                        }));
                                        invalidatePreview();
                                    }}
                                    className={inputClass}
                                />
                                <p className="mt-1 text-[11px] text-gray-500">
                                    Costo/noche resultante: Bs{' '}
                                    {costPerNight.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">
                                    Estado
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
                                    className={inputClass}
                                >
                                    {CHECKIN_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {serviciosTotal > 0 && (
                            <div className="mt-3 rounded-lg bg-white/70 p-2 text-sm text-gray-800">
                                <span className="font-bold">
                                    Servicios consumidos:
                                </span>
                                <div className="mt-1 space-y-0.5 text-xs">
                                    {checkin.checkin_details.map((d) => (
                                        <div
                                            key={d.id}
                                            className="flex justify-between"
                                        >
                                            <span>
                                                {d.service_name} x{' '}
                                                {d.quantity}
                                            </span>
                                            <span>
                                                {(
                                                    d.quantity *
                                                    d.selling_price
                                                ).toFixed(2)}{' '}
                                                Bs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-600">
                                    Operador de check-in
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
                                    className={inputClass}
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
                                <label className="mb-1 block text-xs font-bold text-gray-600">
                                    Operador de checkout
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
                                    className={inputClass}
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
                    </div>

                    {/* --- PAGOS: cada pago registrado también es editable
                        (monto + caja), mismo look claro. --- */}
                    {checkin.payments.length > 0 && (
                        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
                                <Calculator className="h-4 w-4" />
                                Pagos registrados
                            </h3>
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
                                            className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-5"
                                        >
                                            <div className="text-xs text-gray-500">
                                                <span className="block">
                                                    Pago #{p.id}
                                                </span>
                                                <span className="font-semibold text-gray-700">
                                                    {p.type} · {p.method}
                                                </span>
                                                <span className="block">
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
                                                    onFocus={(e) =>
                                                        e.target.select()
                                                    }
                                                    onChange={(e) => {
                                                        let val =
                                                            e.target.value;
                                                        if (
                                                            val !== '' &&
                                                            val.length > 1 &&
                                                            val.startsWith(
                                                                '0',
                                                            ) &&
                                                            !val.startsWith(
                                                                '0.',
                                                            )
                                                        ) {
                                                            val =
                                                                val.replace(
                                                                    /^0+/,
                                                                    '',
                                                                );
                                                        }
                                                        setPaymentForms(
                                                            (prev) => ({
                                                                ...prev,
                                                                [p.id]: {
                                                                    ...pf,
                                                                    amount: val,
                                                                },
                                                            }),
                                                        );
                                                    }}
                                                    className={inputClassSm}
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="mb-1 block text-xs font-semibold text-gray-500">
                                                    Caja
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
                                                    className={inputClassSm}
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
                        </div>
                    )}

                    {/* --- CANDADO DE CONFIRMACIÓN --- */}
                    <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                        <input
                            type="checkbox"
                            checked={previewAcknowledged}
                            onChange={(e) =>
                                setPreviewAcknowledged(e.target.checked)
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>
                            Revisé el resumen de arriba (noches, total y saldo)
                            y confirmo que estos datos son correctos antes de
                            guardar.
                        </span>
                    </label>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={saveCheckin}
                            disabled={isSavingCheckin || !canSave}
                            title={
                                !canSave
                                    ? 'Marca la casilla de confirmación para habilitar el guardado'
                                    : undefined
                            }
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Save className="h-4 w-4" />
                            {isSavingCheckin
                                ? 'Guardando...'
                                : willBeFinalizado && !wasOriginallyFinalizado
                                  ? 'Finalizar Estadía'
                                  : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
