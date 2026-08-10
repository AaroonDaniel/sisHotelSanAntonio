import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    LogOut,
    Pencil,
    Power,
    Settings,
    Sparkles,
    Vault,
    Wallet,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import CheckinModal, {
    CheckinData,
    GroupAccount,
    Guest,
    Operator,
    Room as BaseRoom,
} from '../checkins/checkinModal';
import { CheckoutConfirmationModal } from '../rooms/status';
import RoomPaymentsModal from './RoomPaymentsModal';

// El tipo Room de checkinModal.tsx no declara is_active (no lo necesita
// para asignar) -- acá sí hace falta para el botón Habilitar/Deshabilitar.
type Room = BaseRoom & { is_active: boolean };

interface Schedule {
    id: number;
    name: string;
    check_in_time: string;
    check_out_time: string;
    entry_tolerance_minutes: number;
    exit_tolerance_minutes: number;
    is_active?: boolean | number;
}

interface Props {
    auth: { user: User };
    Rooms: Room[];
    Guests: Guest[];
    Schedules: Schedule[];
    Operators: Operator[];
    GroupAccounts: GroupAccount[];
    services: any[];
}

// Mismos colores sólidos que ya usa rooms/status.tsx (getStatusConfig)
// para el tablero real de habitaciones -- no una paleta nueva. RESERVADO
// se trata igual que LIBRE ahí ("Libre (Con Reserva)"), y OCUPADO es
// cyan (no violeta -- ese color es solo para salones, que Cocina no
// necesita distinguir).
const STATUS_STYLES: Record<string, { card: string; label: string }> = {
    LIBRE: {
        card: 'bg-emerald-600 hover:bg-emerald-500',
        label: 'Libre',
    },
    RESERVADO: {
        card: 'bg-emerald-600 hover:bg-emerald-500',
        label: 'Libre (Con Reserva)',
    },
    OCUPADO: {
        card: 'bg-cyan-600 hover:bg-cyan-500',
        label: 'Ocupada',
    },
    LIMPIEZA: {
        card: 'bg-gray-500 hover:bg-gray-400',
        label: 'Limpieza',
    },
    MANTENIMIENTO: {
        card: 'bg-red-600 hover:bg-red-500',
        label: 'Mantenimiento',
    },
    INHABILITADO: {
        card: 'bg-slate-600 hover:bg-slate-500',
        label: 'Inhabilitada',
    },
};

// Estado "Completar Datos" -- misma condición que
// rooms/status.tsx::getDisplayStatus() (rama 'incomplete'), portada tal
// cual para no reinventar el criterio: check-in temporal con titular o
// acompañante con perfil incompleto, procedencia vacía, o cupo de la
// habitación sin llenar (salvo que el precio ya esté ajustado a mano).
const INCOMPLETE_STYLE = {
    card: 'bg-amber-500 hover:bg-amber-400 ring-2 ring-amber-300 ring-offset-2 ring-offset-gray-900',
    label: 'Completar Datos',
};

function isCheckinIncomplete(room: Room, checkin: CheckinData): boolean {
    const isSalon = room.room_type?.name?.toUpperCase().includes('SALON');
    if (isSalon) return false;
    if (!checkin.is_temporary) return false;

    const isTitularIncomplete = checkin.guest?.profile_status === 'INCOMPLETE';

    const companions = checkin.companions as
        | { profile_status?: string }[]
        | undefined;
    const isAnyCompanionIncomplete = companions?.some(
        (c) => c.profile_status === 'INCOMPLETE',
    );

    const isOriginMissing = !checkin.origin || checkin.origin.trim() === '';

    const roomCapacity = room.room_type?.capacity || 1;
    const totalGuests = 1 + (companions?.length || 0);
    const originalRoomPrice = room.price?.amount || 0;

    const isPriceAdjusted =
        checkin.special_agreement?.type === 'AJUSTE DE PRECIO' ||
        (originalRoomPrice > 0 && checkin.agreed_price < originalRoomPrice);

    const isCapacityMissing = totalGuests < roomCapacity && !isPriceAdjusted;

    return (
        isTitularIncomplete ||
        isAnyCompanionIncomplete ||
        isOriginMissing ||
        isCapacityMissing
    );
}

const ALL_STATUSES = [
    'LIBRE',
    'OCUPADO',
    'RESERVADO',
    'LIMPIEZA',
    'MANTENIMIENTO',
    'INHABILITADO',
] as const;

export default function CocinaIndex({
    auth,
    Rooms,
    Guests,
    Schedules,
    Operators,
    GroupAccounts,
    services,
}: Props) {
    // Modal placeholder para estados que todavía no tienen acción
    // conectada (se van cableando en las próximas etapas: factura en la 5,
    // caja en la 6, eliminar pago en la 7).
    const [infoRoom, setInfoRoom] = useState<Room | null>(null);

    // Modal real de asignación (etapa 3) — mismo componente que usa
    // rooms/status.tsx, solo para habitaciones LIBRE.
    const [assignRoomId, setAssignRoomId] = useState<number | null>(null);

    // Etapa 4: selector rápido para habitaciones OCUPADO (Editar /
    // Finalizar), y los dos modales reales que dispara cada opción.
    const [occupiedChooser, setOccupiedChooser] = useState<{
        room: Room;
        checkin: CheckinData;
    } | null>(null);
    const [editingCheckin, setEditingCheckin] = useState<CheckinData | null>(
        null,
    );
    const [checkoutTarget, setCheckoutTarget] = useState<{
        room: Room;
        checkin: CheckinData;
    } | null>(null);

    // Etapa 6: historial de pagos de la habitación (todas sus estancias).
    const [paymentsRoom, setPaymentsRoom] = useState<Room | null>(null);

    const handleRoomClick = (room: Room) => {
        if (room.status === 'LIBRE') {
            setAssignRoomId(room.id);
            return;
        }

        if (room.status === 'OCUPADO') {
            const checkin = room.checkins?.[0];
            if (checkin) {
                setOccupiedChooser({ room, checkin });
                return;
            }
        }

        setInfoRoom(room);
    };

    // Cambio de estado manual y directo: un click, sin formulario. Vale
    // para cualquier habitación (pedido explícito: "también poder cambiar
    // el estado de cada habitación"), no solo las que ya tienen su acción
    // principal cableada.
    const handleChangeStatus = (room: Room, status: string) => {
        if (status === room.status) return;

        if (
            room.status === 'OCUPADO' &&
            !confirm(
                `La habitación ${room.number} tiene un huésped activo. ` +
                    `Forzar el estado a "${STATUS_STYLES[status]?.label ?? status}" NO cierra su estadía (el check-in sigue activo). ` +
                    `¿Continuar de todas formas?`,
            )
        ) {
            return;
        }

        router.patch(
            `/admin/cocina/rooms/${room.id}/status`,
            { status },
            { preserveScroll: true },
        );
        setInfoRoom(null);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cocina" />

            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white">
                            Cocina
                        </h1>
                        <p className="text-sm text-gray-400">
                            Centro de mando — click en una habitación para
                            gestionarla.
                        </p>
                    </div>

                    <Link
                        href="/admin/cocina/turnos"
                        className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                        <Vault className="h-4 w-4" />
                        Ver Turnos
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {Rooms.map((room) => {
                        const checkin = room.checkins?.[0];
                        const incomplete =
                            room.status === 'OCUPADO' &&
                            checkin &&
                            isCheckinIncomplete(room, checkin);
                        const style = incomplete
                            ? INCOMPLETE_STYLE
                            : (STATUS_STYLES[room.status] ??
                              STATUS_STYLES.LIBRE);
                        const guestName = checkin?.guest?.full_name ?? null;

                        return (
                            <div
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                className={`relative flex h-36 cursor-pointer flex-col justify-between rounded-lg p-4 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl ${style.card}`}
                            >
                                <div className="flex items-start justify-between">
                                    <span className="text-2xl font-black">
                                        {room.number}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setInfoRoom(room);
                                        }}
                                        title="Cambiar estado / habilitar-deshabilitar"
                                        className="rounded-full bg-white/20 p-1 hover:bg-white/30"
                                    >
                                        <Settings className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div>
                                    <p className="text-xs font-bold tracking-wide uppercase opacity-90">
                                        {style.label}
                                    </p>
                                    {room.room_type?.name && (
                                        <p className="text-[11px] opacity-70 uppercase">
                                            {room.room_type.name}
                                        </p>
                                    )}
                                    {guestName && (
                                        <p className="mt-1 truncate text-xs font-bold">
                                            {guestName}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Asignar (LIBRE, etapa 3) y Editar (OCUPADO, etapa 4) comparten
                el mismo CheckinModal -- son mutuamente excluyentes, nunca
                hay un assignRoomId Y un editingCheckin activos a la vez. */}
            <CheckinModal
                show={assignRoomId !== null || editingCheckin !== null}
                isReceptionView={true}
                onClose={() => {
                    setAssignRoomId(null);
                    setEditingCheckin(null);
                }}
                guests={Guests}
                rooms={Rooms}
                schedules={Schedules}
                operators={Operators}
                groupAccounts={GroupAccounts}
                availableServices={services}
                initialRoomId={assignRoomId}
                checkinToEdit={editingCheckin}
            />

            {/* Finalizar (checkout) — mismo componente que rooms/status.tsx,
                etapa 4. */}
            {checkoutTarget && (
                <CheckoutConfirmationModal
                    checkin={checkoutTarget.checkin}
                    room={checkoutTarget.room}
                    schedules={Schedules}
                    guests={Guests}
                    operators={Operators}
                    onClose={() => setCheckoutTarget(null)}
                />
            )}

            {/* Selector rápido para OCUPADO: Editar o Finalizar, etapa 4. */}
            {occupiedChooser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setOccupiedChooser(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-black text-gray-900">
                            Habitación {occupiedChooser.room.number}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Huésped:{' '}
                            {occupiedChooser.checkin.guest?.full_name ??
                                'N/D'}
                        </p>

                        <div className="mt-5 flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setEditingCheckin(occupiedChooser.checkin);
                                    setOccupiedChooser(null);
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500"
                            >
                                <Pencil className="h-4 w-4" />
                                Editar hospedaje
                            </button>
                            <button
                                onClick={() => {
                                    setCheckoutTarget({
                                        room: occupiedChooser.room,
                                        checkin: occupiedChooser.checkin,
                                    });
                                    setOccupiedChooser(null);
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500"
                            >
                                <LogOut className="h-4 w-4" />
                                Finalizar estadía
                            </button>
                            <button
                                onClick={() => {
                                    setPaymentsRoom(occupiedChooser.room);
                                    setOccupiedChooser(null);
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                                <Wallet className="h-4 w-4" />
                                Gestionar pagos
                            </button>
                        </div>

                        <button
                            onClick={() => setOccupiedChooser(null)}
                            className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Acciones rápidas para LIMPIEZA / MANTENIMIENTO / RESERVADO /
                INHABILITADO: un click, sin formularios. Reutiliza los
                endpoints que ya existen en RoomController (clean,
                finish-maintenance, toggle) -- nada nuevo del lado backend.
                Lo que falta (factura en la 5, caja en la 6, eliminar pago
                en la 7) sigue pendiente. */}
            {infoRoom && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setInfoRoom(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-black text-gray-900">
                            Habitación {infoRoom.number}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Estado:{' '}
                            {STATUS_STYLES[infoRoom.status]?.label ??
                                infoRoom.status}
                        </p>

                        <div className="mt-5 flex flex-col gap-2">
                            {infoRoom.status === 'LIMPIEZA' && (
                                <button
                                    onClick={() => {
                                        router.put(
                                            `/rooms/${infoRoom.id}/clean`,
                                            {},
                                            { preserveScroll: true },
                                        );
                                        setInfoRoom(null);
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Marcar como limpia
                                </button>
                            )}

                            {infoRoom.status === 'MANTENIMIENTO' && (
                                <button
                                    onClick={() => {
                                        router.put(
                                            `/rooms/${infoRoom.id}/finish-maintenance`,
                                            {},
                                            { preserveScroll: true },
                                        );
                                        setInfoRoom(null);
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-500"
                                >
                                    <Wrench className="h-4 w-4" />
                                    Finalizar mantenimiento
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    router.patch(
                                        `/admin/cocina/rooms/${infoRoom.id}/toggle-active`,
                                        {},
                                        { preserveScroll: true },
                                    );
                                    setInfoRoom(null);
                                }}
                                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ${
                                    infoRoom.is_active
                                        ? 'bg-gray-700 hover:bg-gray-600'
                                        : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                            >
                                <Power className="h-4 w-4" />
                                {infoRoom.is_active
                                    ? 'Deshabilitar habitación'
                                    : 'Habilitar habitación'}
                            </button>

                            <button
                                onClick={() => {
                                    setPaymentsRoom(infoRoom);
                                    setInfoRoom(null);
                                }}
                                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                                <Wallet className="h-4 w-4" />
                                Gestionar pagos
                            </button>
                        </div>

                        <div className="mt-5 border-t border-gray-100 pt-4">
                            <p className="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
                                Cambiar estado manualmente
                            </p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {ALL_STATUSES.map((status) => {
                                    const isCurrent =
                                        status === infoRoom.status;
                                    return (
                                        <button
                                            key={status}
                                            disabled={isCurrent}
                                            onClick={() =>
                                                handleChangeStatus(
                                                    infoRoom,
                                                    status,
                                                )
                                            }
                                            className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold uppercase transition-colors ${
                                                isCurrent
                                                    ? 'cursor-default border-gray-300 bg-gray-100 text-gray-400'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                                            }`}
                                        >
                                            {STATUS_STYLES[status]?.label ??
                                                status}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            onClick={() => setInfoRoom(null)}
                            className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Historial de pagos de la habitación (todas sus estancias),
                etapa 6. */}
            {paymentsRoom && (
                <RoomPaymentsModal
                    show
                    onClose={() => setPaymentsRoom(null)}
                    roomId={paymentsRoom.id}
                    roomNumber={paymentsRoom.number}
                    roomStatusLabel={
                        STATUS_STYLES[paymentsRoom.status]?.label ??
                        paymentsRoom.status
                    }
                    operators={Operators}
                />
            )}
        </AuthenticatedLayout>
    );
}
