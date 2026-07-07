import { useForm } from '@inertiajs/react';
import { Building2, Calculator, Save, X } from 'lucide-react';
import { useState } from 'react';

export interface AvailableCheckin {
    id: number;
    room_number: string;
    guest_name: string;
    agreed_price: number;
    duration_days: number;
}

export interface CashRegisterOption {
    id: number;
    label: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    availableCheckins: AvailableCheckin[];
}

export default function CreateMasterAccountModal({
    show,
    onClose,
    availableCheckins,
}: Props) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            company_name: '',
            payment_frequency_days: '15',
            checkin_ids: [] as number[],
        });

    const [search, setSearch] = useState('');

    if (!show) return null;

    const toggleCheckin = (id: number) => {
        setData(
            'checkin_ids',
            data.checkin_ids.includes(id)
                ? data.checkin_ids.filter((c) => c !== id)
                : [...data.checkin_ids, id],
        );
    };

    const filteredCheckins = availableCheckins.filter(
        (c) =>
            c.room_number.toLowerCase().includes(search.toLowerCase()) ||
            c.guest_name.toLowerCase().includes(search.toLowerCase()),
    );

    const selectedCheckins = availableCheckins.filter((c) =>
        data.checkin_ids.includes(c.id),
    );
    const totalDailyRate = selectedCheckins.reduce(
        (sum, c) => sum + (Number(c.agreed_price) || 0),
        0,
    );
    const cycleDays = Number(data.payment_frequency_days) || 0;
    const cycleAmount = totalDailyRate * cycleDays;

    const handleClose = () => {
        reset();
        clearErrors();
        setSearch('');
        onClose();
    };

    const submit = () => {
        post('/corporate-accounts', {
            preserveScroll: true,
            onSuccess: handleClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
                            <Building2 className="h-5 w-5" />
                        </div>
                        Nueva Cuenta Maestra
                    </h2>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">
                                Nombre de la empresa
                            </label>
                            <input
                                type="text"
                                value={data.company_name}
                                onChange={(e) =>
                                    setData('company_name', e.target.value)
                                }
                                placeholder="EMPRESA XYZ SRL"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            {errors.company_name && (
                                <p className="mt-1 text-xs font-semibold text-red-500">
                                    {errors.company_name}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase">
                                Cuota cada (días)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={data.payment_frequency_days}
                                onChange={(e) =>
                                    setData(
                                        'payment_frequency_days',
                                        e.target.value,
                                    )
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            {errors.payment_frequency_days && (
                                <p className="mt-1 text-xs font-semibold text-red-500">
                                    {errors.payment_frequency_days}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-5">
                        <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase">
                            Habitaciones a incluir ({data.checkin_ids.length}{' '}
                            seleccionada
                            {data.checkin_ids.length === 1 ? '' : 's'})
                        </label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por habitación o huésped..."
                            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-emerald-500"
                        />

                        {availableCheckins.length === 0 ? (
                            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                                No hay habitaciones activas sin convenio para
                                agrupar.
                            </p>
                        ) : (
                            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                                {filteredCheckins.map((c) => (
                                    <label
                                        key={c.id}
                                        className="flex cursor-pointer items-center justify-between rounded-lg p-2 text-sm hover:bg-gray-50"
                                    >
                                        <span className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={data.checkin_ids.includes(
                                                    c.id,
                                                )}
                                                onChange={() =>
                                                    toggleCheckin(c.id)
                                                }
                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="font-semibold text-gray-800">
                                                Hab. {c.room_number}
                                            </span>
                                            <span className="text-gray-500">
                                                {c.guest_name}
                                            </span>
                                        </span>
                                        <span className="font-semibold text-gray-600">
                                            Bs {c.agreed_price.toFixed(2)}/día
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {errors.checkin_ids && (
                            <p className="mt-1 text-xs font-semibold text-red-500">
                                {errors.checkin_ids}
                            </p>
                        )}
                    </div>

                    {data.checkin_ids.length > 0 && (
                        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800">
                                <Calculator className="h-4 w-4" />
                                Vista previa de la cuota
                            </h4>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <span className="block text-xs text-emerald-700/70">
                                        Tarifa diaria del grupo
                                    </span>
                                    <span className="font-bold text-emerald-900">
                                        Bs {totalDailyRate.toFixed(2)}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-emerald-700/70">
                                        Ciclo
                                    </span>
                                    <span className="font-bold text-emerald-900">
                                        {cycleDays} día(s)
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-emerald-700/70">
                                        Monto por cuota
                                    </span>
                                    <span className="font-bold text-emerald-900">
                                        Bs {cycleAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <button
                        onClick={handleClose}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={submit}
                        disabled={
                            processing ||
                            !data.company_name.trim() ||
                            data.checkin_ids.length === 0
                        }
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {processing ? 'Creando...' : 'Crear Cuenta Maestra'}
                    </button>
                </div>
            </div>
        </div>
    );
}
