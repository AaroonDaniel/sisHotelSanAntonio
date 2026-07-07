import { router } from '@inertiajs/react';
import { Banknote, Building2, Plus, Save, X } from 'lucide-react';
import { useState } from 'react';
import { AvailableCheckin, CashRegisterOption } from './CreateMasterAccountModal';

export interface CorporateAccountRoomBalance {
    checkin_id: number;
    room_number: string | null;
    daily_rate: number;
    share_ratio: number;
    allocated_paid: number;
    owed_so_far: number;
    balance: number;
    is_in_mora: boolean;
}

export interface CorporateAccount {
    id: number;
    company_name: string;
    payment_frequency_days: number;
    starts_at: string | null;
    total_daily_rate: number;
    total_balance: number;
    is_in_mora: boolean;
    is_due: boolean;
    rooms: CorporateAccountRoomBalance[];
}

interface Props {
    show: boolean;
    onClose: () => void;
    account: CorporateAccount | null;
    availableCheckins: AvailableCheckin[];
    cashRegisters: CashRegisterOption[];
}

const PAYMENT_METHODS = ['EFECTIVO', 'QR', 'TARJETA', 'TRANSFERENCIA'];

export default function AccountDetailModal({
    show,
    onClose,
    account,
    availableCheckins,
    cashRegisters,
}: Props) {
    // --- Formulario de pago ---
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [paymentBank, setPaymentBank] = useState('');
    const [paymentCashRegister, setPaymentCashRegister] = useState('');
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    // --- Agregar habitaciones ---
    const [showAttach, setShowAttach] = useState(false);
    const [attachIds, setAttachIds] = useState<number[]>([]);
    const [isSavingAttach, setIsSavingAttach] = useState(false);

    if (!show || !account) return null;

    const registerPayment = () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) return;
        setIsSavingPayment(true);
        router.post(
            `/corporate-accounts/${account.id}/payments`,
            {
                amount: paymentAmount,
                method: paymentMethod,
                bank_name: paymentMethod === 'EFECTIVO' ? null : paymentBank,
                cash_register_id: paymentCashRegister || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPaymentAmount('');
                    setPaymentBank('');
                },
                onFinish: () => setIsSavingPayment(false),
            },
        );
    };

    const toggleAttach = (id: number) => {
        setAttachIds((prev) =>
            prev.includes(id)
                ? prev.filter((c) => c !== id)
                : [...prev, id],
        );
    };

    const attachRooms = () => {
        if (attachIds.length === 0) return;
        setIsSavingAttach(true);
        router.post(
            `/corporate-accounts/${account.id}/attach`,
            { checkin_ids: attachIds },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAttachIds([]);
                    setShowAttach(false);
                },
                onFinish: () => setIsSavingAttach(false),
            },
        );
    };

    const cuotaEstimada =
        account.total_daily_rate * account.payment_frequency_days;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            <Building2 className="h-5 w-5 text-emerald-600" />
                            {account.company_name}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Cuota cada {account.payment_frequency_days}{' '}
                            día(s) · Convenio #{account.id}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    {/* Resumen */}
                    <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
                        <div>
                            <span className="block text-xs text-gray-500">
                                Habitaciones
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                                {account.rooms.length}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">
                                Tarifa diaria (grupo)
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                                Bs {account.total_daily_rate.toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">
                                Cuota estimada
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                                Bs {cuotaEstimada.toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-xs text-gray-500">
                                Saldo del grupo
                            </span>
                            <span
                                className={`text-lg font-bold ${
                                    account.total_balance < 0
                                        ? 'text-red-600'
                                        : 'text-emerald-600'
                                }`}
                            >
                                Bs {account.total_balance.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Tabla de habitaciones */}
                    <div className="mb-5 overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Habitación</th>
                                    <th className="px-4 py-3">Tarifa/día</th>
                                    <th className="px-4 py-3">
                                        % del grupo
                                    </th>
                                    <th className="px-4 py-3">
                                        Asignado del pago
                                    </th>
                                    <th className="px-4 py-3">Consumido</th>
                                    <th className="px-4 py-3">Saldo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {account.rooms.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-6 text-center text-gray-500"
                                        >
                                            Esta cuenta no tiene
                                            habitaciones activas.
                                        </td>
                                    </tr>
                                )}
                                {account.rooms.map((r) => (
                                    <tr
                                        key={r.checkin_id}
                                        className={
                                            r.is_in_mora ? 'bg-red-50' : ''
                                        }
                                    >
                                        <td className="px-4 py-3 font-semibold text-gray-800">
                                            Hab. {r.room_number ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            Bs {r.daily_rate.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {(r.share_ratio * 100).toFixed(
                                                1,
                                            )}
                                            %
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            Bs {r.allocated_paid.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            Bs {r.owed_so_far.toFixed(2)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 font-bold ${
                                                r.is_in_mora
                                                    ? 'text-red-600'
                                                    : 'text-emerald-600'
                                            }`}
                                        >
                                            Bs {r.balance.toFixed(2)}
                                            {r.is_in_mora && ' (mora)'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Registrar pago */}
                    <div className="mb-5 rounded-xl border border-gray-200 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                            <Banknote className="h-4 w-4 text-emerald-600" />
                            Registrar pago de la empresa
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="Monto"
                                value={paymentAmount}
                                onChange={(e) =>
                                    setPaymentAmount(e.target.value)
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            <select
                                value={paymentMethod}
                                onChange={(e) =>
                                    setPaymentMethod(e.target.value)
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                            >
                                {PAYMENT_METHODS.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                            {paymentMethod !== 'EFECTIVO' && (
                                <input
                                    type="text"
                                    placeholder="Banco"
                                    value={paymentBank}
                                    onChange={(e) =>
                                        setPaymentBank(e.target.value)
                                    }
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            )}
                            <select
                                value={paymentCashRegister}
                                onChange={(e) =>
                                    setPaymentCashRegister(e.target.value)
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                            >
                                <option value="">(Sin caja)</option>
                                {cashRegisters.map((cr) => (
                                    <option
                                        key={cr.id}
                                        value={String(cr.id)}
                                    >
                                        {cr.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={registerPayment}
                                disabled={
                                    isSavingPayment ||
                                    !paymentAmount ||
                                    Number(paymentAmount) <= 0
                                }
                                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {isSavingPayment
                                    ? 'Guardando...'
                                    : 'Registrar pago'}
                            </button>
                        </div>
                    </div>

                    {/* Agregar habitaciones */}
                    <div className="rounded-xl border border-gray-200 p-4">
                        <button
                            onClick={() => setShowAttach((v) => !v)}
                            className="flex items-center gap-2 text-sm font-bold text-gray-800"
                        >
                            <Plus className="h-4 w-4 text-emerald-600" />
                            Agregar más habitaciones a esta cuenta
                        </button>
                        {showAttach && (
                            <div className="mt-3">
                                {availableCheckins.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        No hay habitaciones activas sin
                                        convenio disponibles.
                                    </p>
                                ) : (
                                    <>
                                        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                                            {availableCheckins.map((c) => (
                                                <label
                                                    key={c.id}
                                                    className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-gray-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={attachIds.includes(
                                                            c.id,
                                                        )}
                                                        onChange={() =>
                                                            toggleAttach(c.id)
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className="font-semibold text-gray-800">
                                                        Hab.{' '}
                                                        {c.room_number}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {c.guest_name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={attachRooms}
                                                disabled={
                                                    isSavingAttach ||
                                                    attachIds.length === 0
                                                }
                                                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Save className="h-4 w-4" />
                                                {isSavingAttach
                                                    ? 'Agregando...'
                                                    : `Agregar ${attachIds.length} habitación(es)`}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
