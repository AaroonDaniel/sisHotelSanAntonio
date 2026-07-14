import CheckinPaymentHistoryModal, {
    CheckinPaymentDetail,
} from '@/components/CheckinPaymentHistoryModal';
import RestoreCheckinModal from '@/components/RestoreCheckinModal';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Calendar,
    History,
    ReceiptText,
    Undo2,
    Users,
} from 'lucide-react';
import { useState } from 'react';

interface RoomOption {
    id: number;
    number: string;
    room_type_name: string | null;
}

interface CheckinHistoryRow {
    id: number;
    guest_name: string;
    room_number: string;
    check_in_date: string | null;
    check_out_date: string | null;
    duration_days: number;
    agreed_price: number;
    total_services: number;
    total_charged: number;
    status: string;
    checkin_operator_name: string | null;
    checkout_operator_name: string | null;
    payments: CheckinPaymentDetail[];
}

interface Props {
    auth: { user: User };
    Rooms: RoomOption[];
    SelectedRoom: RoomOption | null;
    Checkins: CheckinHistoryRow[];
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);

const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const STATUS_STYLES: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-700',
    finalizado: 'bg-gray-200 text-gray-700',
    transferido: 'bg-amber-100 text-amber-700',
    cancelado: 'bg-red-100 text-red-700',
};

export default function RoomHistoryIndex({
    auth,
    Rooms,
    SelectedRoom,
    Checkins,
}: Props) {
    const [restoreTarget, setRestoreTarget] =
        useState<CheckinHistoryRow | null>(null);
    const [paymentHistoryTarget, setPaymentHistoryTarget] =
        useState<CheckinHistoryRow | null>(null);

    const handleRoomChange = (roomId: string) => {
        router.get('/room-history', roomId ? { room_id: roomId } : {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const totalCharged = Checkins.reduce((acc, c) => acc + c.total_charged, 0);
    const totalNights = Checkins.reduce((acc, c) => acc + c.duration_days, 0);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Historial de Habitaciones" />

            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-lg bg-red-100 p-2 text-red-600">
                        <History className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-write text-2xl font-bold">
                            Historial de Habitaciones
                        </h1>
                    </div>
                </div>
                {/* SELECTOR DE HABITACIÓN */}
                <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-500 uppercase">
                        Habitación
                    </label>
                    <select
                        value={SelectedRoom?.id ?? ''}
                        onChange={(e) => handleRoomChange(e.target.value)}
                        className="w-full max-w-xs rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold text-gray-800 focus:border-red-500 focus:ring-red-500"
                    >
                        <option value="">Seleccione una habitación...</option>
                        {Rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                                Hab. {room.number}
                                {room.room_type_name
                                    ? ` — ${room.room_type_name}`
                                    : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {!SelectedRoom ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                        <BedDouble className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                        <p className="font-medium text-gray-500">
                            Seleccione una habitación para ver su historial de
                            estadías.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* RESUMEN */}
                        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                    <BedDouble className="h-3.5 w-3.5" />
                                    Habitación
                                </p>
                                <p className="mt-1 text-xl font-black text-gray-800">
                                    {SelectedRoom.number}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {SelectedRoom.room_type_name ?? '—'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                    <Users className="h-3.5 w-3.5" />
                                    Estadías Registradas
                                </p>
                                <p className="mt-1 text-xl font-black text-gray-800">
                                    {Checkins.length}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {totalNights} noche(s) en total
                                </p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Total Cobrado (histórico)
                                </p>
                                <p className="mt-1 text-xl font-black text-emerald-600">
                                    {formatCurrency(totalCharged)}
                                </p>
                            </div>
                        </div>

                        {/* TABLA DE ESTADÍAS */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3">
                                                Huésped
                                            </th>
                                            <th className="px-4 py-3">
                                                Check-in
                                            </th>
                                            <th className="px-4 py-3">
                                                Check-out
                                            </th>
                                            <th className="px-4 py-3 text-center">
                                                Noches
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Tarifa
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Servicios
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Total Cobrado
                                            </th>
                                            <th className="px-4 py-3">
                                                Operadores
                                            </th>
                                            <th className="px-4 py-3">
                                                Estado
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Checkins.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={10}
                                                    className="px-4 py-10 text-center text-gray-400 italic"
                                                >
                                                    Esta habitación todavía no
                                                    tiene estadías registradas.
                                                </td>
                                            </tr>
                                        )}
                                        {Checkins.map((c) => (
                                            <tr
                                                key={c.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-3 font-bold text-gray-800">
                                                    {c.guest_name}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {formatDateTime(
                                                        c.check_in_date,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {formatDateTime(
                                                        c.check_out_date,
                                                    )}
                                                </td>
                                                <td className="text-bold px-4 py-3 text-center text-gray-600">
                                                    {c.duration_days}
                                                </td>
                                                <td className="text-bold px-4 py-3 text-right text-gray-600">
                                                    {formatCurrency(
                                                        c.agreed_price,
                                                    )}
                                                </td>
                                                <td className="text-bold px-4 py-3 text-right text-gray-600">
                                                    {formatCurrency(
                                                        c.total_services,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                    {formatCurrency(
                                                        c.total_charged,
                                                    )}
                                                </td>
                                                <td className="text-bold px-4 py-3 text-xs text-gray-800">
                                                    <div>
                                                        In:{' '}
                                                        {c.checkin_operator_name ??
                                                            '—'}
                                                    </div>
                                                    <div>
                                                        Out:{' '}
                                                        {c.checkout_operator_name ??
                                                            '—'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide uppercase ${
                                                            STATUS_STYLES[
                                                                c.status
                                                            ] ??
                                                            'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {c.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPaymentHistoryTarget(
                                                                    c,
                                                                )
                                                            }
                                                            title="Ver Historial de Pagos"
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                                                        >
                                                            <ReceiptText className="h-3.5 w-3.5" />
                                                            Pagos
                                                        </button>
                                                        {c.status ===
                                                            'finalizado' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setRestoreTarget(
                                                                        c,
                                                                    )
                                                                }
                                                                title="Restaurar Asignación (Undo Checkout)"
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                                                            >
                                                                <Undo2 className="h-3.5 w-3.5" />
                                                                Restaurar
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <RestoreCheckinModal
                show={!!restoreTarget}
                checkinId={restoreTarget?.id ?? null}
                guestName={restoreTarget?.guest_name ?? null}
                onClose={() => setRestoreTarget(null)}
            />

            <CheckinPaymentHistoryModal
                show={!!paymentHistoryTarget}
                onClose={() => setPaymentHistoryTarget(null)}
                guestName={paymentHistoryTarget?.guest_name ?? null}
                roomNumber={paymentHistoryTarget?.room_number ?? null}
                payments={paymentHistoryTarget?.payments ?? []}
            />
        </AuthenticatedLayout>
    );
}
