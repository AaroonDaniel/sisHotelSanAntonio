import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Filter,
    Pencil,
    Plus,
    Search,
    Trash2,
    XCircle,
    CalendarRange,
    LayoutGrid,
    Table as TableIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ReservationModal, { Guest, Reservation, Room } from './reservationModal';
// 1. IMPORTAMOS LOS MODALES COMPARTIDOS
import CancelModal from '@/components/cancelModal'; // Importamos el de cancelar
import ConfirmModal from '@/components/confirmModal'; // Importamos el de confirmar
import DeleteModal from './deleteModal';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// =====================================================================
// TIPOS E INTERFACES EXTRAS PARA EL CALENDARIO Y EL USUARIO
// =====================================================================
interface User {
    id: number;
    name: string;
    nickname: string;
    full_name: string;
}

interface Props {
    auth: { user: User };
    Reservations: Reservation[];
    Guests: Guest[];
    Rooms: Room[];
}

type ViewMode = 'table' | 'calendar';

const statusStyles: Record<string, string> = {
    pendiente: 'bg-violet-100 text-violet-700 border border-violet-200',
    confirmado: 'bg-green-100 text-green-700 border border-green-200',
    cancelado: 'bg-red-50 text-red-600 border border-red-100 opacity-70',
    finalizado: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const statusLabels: Record<string, string> = {
    pendiente: 'RESERVADO',
    confirmado: 'CONFIRMADO',
    cancelado: 'CANCELADO',
    finalizado: 'FINALIZADO',
};

// =====================================================================
// HELPERS DEL CALENDARIO
// =====================================================================
const DAYS_WINDOW = 15;

const stripTime = (d: Date): Date =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

const parseLocalDate = (str?: string | null): Date => {
    if (!str) return new Date();
    const [y, m, d] = str.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
};

const daysBetween = (a: Date, b: Date): number =>
    Math.round((stripTime(b).getTime() - stripTime(a).getTime()) / 86400000);

const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);

const CALENDAR_STATUS_STYLES: Record<string, { block: string; dot: string; label: string }> = {
    pendiente: {
        block: 'bg-blue-500 hover:bg-blue-600 border-blue-600',
        dot: 'bg-blue-500',
        label: 'Reservado',
    },
    confirmado: {
        block: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600',
        dot: 'bg-emerald-500',
        label: 'Confirmado/Ocupado',
    },
};

const getCalendarStatusStyle = (status: string) =>
    CALENDAR_STATUS_STYLES[status?.toLowerCase()] ?? {
        block: 'bg-slate-400 hover:bg-slate-500 border-slate-500',
        dot: 'bg-slate-400',
        label: status || 'Otro',
    };


export default function ReservationsIndex({
    auth,
    Reservations,
    Guests,
    Rooms,
}: Props) {
    const [view, setView] = useState<ViewMode>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

    // Estados para los modales
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingReservationId, setDeletingReservationId] = useState<number | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelingReservationId, setCancelingReservationId] = useState<number | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmingReservationId, setConfirmingReservationId] = useState<number | null>(null);

    useEffect(() => {
        if (editingReservation) {
            const updated = Reservations.find((r) => r.id === editingReservation.id);
            if (updated) setEditingReservation(updated);
        }
    }, [Reservations]);

    const filteredReservations = Reservations.filter((res) => {
        const guestName = res.guest?.full_name || '';
        const searchLower = searchTerm.toLowerCase();

        const matchesSearch =
            guestName.toLowerCase().includes(searchLower) ||
            (res.guest?.identification_number &&
                res.guest.identification_number.includes(searchLower)) ||
            res.id.toString().includes(searchLower);

        const matchesStatus = statusFilter
            ? res.status.toLowerCase() === statusFilter.toLowerCase()
            : true;

        return matchesSearch && matchesStatus;
    });

    const openCreateModal = () => {
        setEditingReservation(null);
        setIsReservationModalOpen(true);
    };

    const openEditModal = (reservation: Reservation) => {
        setEditingReservation(reservation);
        setIsReservationModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingReservationId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reservas" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                <button
                    onClick={() => window.history.back()}
                    className="group mb-6 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver al Panel</span>
                </button>

                {/* CABECERA PRINCIPAL CON BOTONES DE VISTA */}
                <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            Reservas
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Gestiona las reservas y visualiza el calendario de ocupación.
                        </p>
                    </div>

                    <div className="inline-flex rounded-xl border border-gray-700 bg-gray-800 p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setView('table')}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                                view === 'table'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <TableIcon className="h-4 w-4" />
                            Tabla
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('calendar')}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                                view === 'calendar'
                                    ? 'bg-green-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Calendario
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                    
                    {/* BARRA DE BÚSQUEDA Y FILTROS (Solo visible en modo tabla) */}
                    {view === 'table' && (
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-72">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre, CI o ID..."
                                    className="block w-full rounded-xl border-gray-800 bg-white py-2.5 pl-10 text-base text-gray-900 focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <div className="relative w-full sm:w-48">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Filter className="h-4 w-4 text-gray-800" />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="block w-full rounded-xl border-gray-800 bg-white py-2.5 pl-10 text-sm text-gray-950 focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="">Todos los Estados</option>
                                    <option value="pendiente">Reservados</option>
                                    <option value="confirmada">Confirmados</option>
                                    <option value="cancelada">Cancelados</option>
                                </select>
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group ml-auto flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nueva Reserva</span>
                            </button>
                        </div>
                    )}

                    {/* RENDERIZADO CONDICIONAL DE VISTAS */}
                    {view === 'table' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">ID / Huésped</th>
                                        <th className="px-6 py-4">Fechas y Estadía</th>
                                        <th className="px-6 py-4">Habitaciones</th>
                                        <th className="px-6 py-4">Adelanto</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredReservations.length > 0 ? (
                                        filteredReservations.map((res) => (
                                            <tr
                                                key={res.id}
                                                className={`transition-colors hover:bg-gray-50 ${res.status === 'cancelado' ? 'bg-gray-50 opacity-60' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <div className="font-bold text-gray-900">
                                                                {res.guest?.full_name || 'Sin Nombre'}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                CI: {res.guest?.identification_number || 'S/N'}
                                                            </div>
                                                            <div className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 text-[10px] font-bold text-gray-500">
                                                                ID: #{res.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2 text-gray-700">
                                                            <Calendar className="h-4 w-4 text-gray-400" />
                                                            <span className="font-semibold">{res.arrival_date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            <span>{res.arrival_time} • {res.duration_days} Noche(s)</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {res.details && res.details.length > 0 ? (
                                                            res.details.map((d, idx) => (
                                                                <div key={idx} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm">
                                                                    <span className="text-[10px] font-bold text-gray-400">HAB</span>
                                                                    <span className="text-sm font-bold text-gray-800">{d.room?.number || '?'}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Sin asignar</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${res.advance_payment > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                            <DollarSign className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`font-bold ${res.advance_payment > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                                                {res.advance_payment} Bs
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 uppercase">{res.payment_type}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold uppercase shadow-sm ${statusStyles[res.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        {statusLabels[res.status] || res.status}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {res.status === 'pendiente' && (
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmingReservationId(res.id);
                                                                    setIsConfirmModalOpen(true);
                                                                }}
                                                                className="group relative rounded-lg p-2 text-green-500 transition hover:bg-green-50 hover:text-green-700"
                                                                title="Confirmar Llegada / Ocupar"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => openEditModal(res)}
                                                            className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        {res.status !== 'cancelado' && (
                                                            <button
                                                                onClick={() => {
                                                                    setCancelingReservationId(res.id);
                                                                    setIsCancelModalOpen(true);
                                                                }}
                                                                className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                                                                title="Cancelar"
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => openDeleteModal(res.id)}
                                                            className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                                            title="Eliminar permanentemente"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <Calendar className="h-12 w-12 opacity-20" />
                                                    <p className="mt-2 text-sm font-medium">No se encontraron reservas.</p>
                                                    <p className="text-xs">Intenta cambiar los filtros o crea una nueva.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <TapeChart reservations={Reservations} rooms={Rooms} />
                    )}
                </div>

                {/* MODALES COMPARTIDOS */}
                <ReservationModal
                    show={isReservationModalOpen}
                    onClose={() => setIsReservationModalOpen(false)}
                    reservationToEdit={editingReservation}
                    guests={Guests}
                    rooms={Rooms}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    reservationId={deletingReservationId}
                />

                <CancelModal
                    show={isCancelModalOpen}
                    onClose={() => setIsCancelModalOpen(false)}
                    actionUrl={cancelingReservationId ? `/reservas/${cancelingReservationId}` : null}
                />

                <ConfirmModal
                    show={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    actionUrl={confirmingReservationId ? `/reservas/${confirmingReservationId}` : null}
                />
            </div>
        </AuthenticatedLayout>
    );
}

// =====================================================================
// VISTA DE CALENDARIO — TAPE CHART NATIVO (CSS Grid)
// =====================================================================
function TapeChart({
    reservations,
    rooms,
}: {
    reservations: Reservation[];
    rooms: Room[];
}) {
    const today = useMemo<Date>(() => stripTime(new Date()), []);

    const days = useMemo<Date[]>(() => {
        return Array.from({ length: DAYS_WINDOW }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            return d;
        });
    }, [today]);

    const rangeEnd = days[days.length - 1];

    const sortedRooms = useMemo<Room[]>(() => {
        return [...rooms].sort((a, b) =>
            a.number.localeCompare(b.number, undefined, { numeric: true }),
        );
    }, [rooms]);

    // Extrae las fechas reales para el Tape Chart basándose en detalles o checkins
    const mapReservationsToChart = useMemo(() => {
        const map: Record<number, any[]> = {};
        for (const r of reservations) {
            // Usa arrival_date para saber cuándo entran, o calcula la de check out con duration_days
            const startStr = r.arrival_date ? r.arrival_date : new Date().toISOString();
            
            // Calculamos end sumando los días a arrival_date
            const startObj = parseLocalDate(startStr);
            const endObj = new Date(startObj);
            endObj.setDate(startObj.getDate() + (r.duration_days ?? 1));
            const endStr = endObj.toISOString();

            const start = parseLocalDate(startStr);
            const end = parseLocalDate(endStr);
            
            if (end < today || start > rangeEnd) continue;
            
            // Asigna el bloque a CADA habitación de esta reserva
            if (r.details) {
                 r.details.forEach((detail: any) => {
                     const roomId = Number(detail.room_id); // Forzamos a que sea un Número estricto
                     if (roomId) {
                         if (!map[roomId]) map[roomId] = [];
                         map[roomId].push({...r, chartStart: startStr, chartEnd: endStr});
                     }
                 });
            }
        }
        return map;
    }, [reservations, today, rangeEnd]);

    const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const gridTemplate = `160px repeat(${DAYS_WINDOW}, minmax(64px, 1fr))`;

    return (
        <TooltipProvider delayDuration={120}>
            <div className="p-6 space-y-4 bg-gray-50/50">
                {/* LEYENDA */}
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <span className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <CalendarRange className="h-4 w-4 text-green-500" />
                        Próximos {DAYS_WINDOW} días
                    </span>
                    {Object.entries(CALENDAR_STATUS_STYLES).map(([key, s]) => (
                        <span key={key} className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                            <span className={`h-3 w-3 rounded-sm ${s.dot}`} />
                            {s.label}
                        </span>
                    ))}
                </div>

                {/* TAPE CHART */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="min-w-[900px]">
                        <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: gridTemplate }}>
                            <div className="flex items-center px-4 py-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                                Habitación
                            </div>
                            {days.map((d, i) => {
                                const isToday = daysBetween(today, d) === 0;
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                    <div
                                        key={i}
                                        className={`flex flex-col items-center justify-center border-l border-gray-100 py-2 ${
                                            isToday ? 'bg-green-50' : isWeekend ? 'bg-gray-100/60' : ''
                                        }`}
                                    >
                                        <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-green-600' : 'text-gray-400'}`}>
                                            {weekdayLabels[d.getDay()]}
                                        </span>
                                        <span className={`text-sm font-black ${isToday ? 'text-green-700' : 'text-gray-700'}`}>
                                            {d.getDate()}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {sortedRooms.length === 0 ? (
                            <div className="px-4 py-12 text-center text-sm text-gray-400 italic">
                                No hay habitaciones registradas.
                            </div>
                        ) : (
                            sortedRooms.map((room) => (
                                <TapeRow
                                    key={room.id}
                                    room={room}
                                    days={days}
                                    today={today}
                                    rangeEnd={rangeEnd}
                                    gridTemplate={gridTemplate}
                                    reservations={mapReservationsToChart[room.id] ?? []}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

// =====================================================================
// FILA DEL TAPE CHART
// =====================================================================
interface TapeRowProps {
    room: Room;
    days: Date[];
    today: Date;
    rangeEnd: Date;
    gridTemplate: string;
    reservations: any[];
}

function TapeRow({ room, days, today, rangeEnd, gridTemplate, reservations }: TapeRowProps) {
    return (
        <div className="grid border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="flex flex-col justify-center border-r border-gray-200 bg-white px-4 py-3 shadow-sm z-10 relative">
                <span className="text-sm font-black text-gray-800">{room.number}</span>
                <span className="truncate text-[10px] font-medium tracking-wide text-gray-400 uppercase">
                    {room.room_type?.name ?? 'Habitación'}
                </span>
            </div>

            <div className="relative col-span-full grid" style={{ gridColumn: `2 / span ${days.length}`, gridTemplateColumns: `repeat(${days.length}, minmax(64px, 1fr))` }}>
                {days.map((d, i) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = daysBetween(today, d) === 0;
                    return (
                        <div
                            key={i}
                            className={`h-14 border-l border-gray-100 ${isToday ? 'bg-green-50/40' : isWeekend ? 'bg-gray-50' : ''}`}
                        />
                    );
                })}

                {reservations.map((r, idx) => {
                    const start = parseLocalDate(r.chartStart);
                    const end = parseLocalDate(r.chartEnd);
                    const clampedStart = start < today ? today : start;
                    const clampedEnd = end > rangeEnd ? rangeEnd : end;

                    const colStart = daysBetween(today, clampedStart) + 1;
                    const span = Math.max(1, daysBetween(clampedStart, clampedEnd));

                    if (colStart < 1 || colStart > days.length) return null;

                    const style = getCalendarStatusStyle(r.status);
                    const balance = Number(r.advance_payment ?? 0);
                    const guestName = r.guest?.full_name ?? 'Sin Huésped';
                    const overflowLeft = start < today;
                    const overflowRight = end > rangeEnd;

                    return (
                        <Tooltip key={`${r.id}-${idx}`}>
                            <TooltipTrigger asChild>
                                <div
                                    className={`pointer-events-auto z-10 m-1.5 flex cursor-pointer items-center overflow-hidden rounded-lg border px-2 text-white shadow-sm transition-all hover:z-20 hover:scale-[1.02] hover:shadow-md ${style.block} ${overflowLeft ? 'rounded-l-none border-l-0' : ''} ${overflowRight ? 'rounded-r-none border-r-0' : ''}`}
                                    style={{ gridColumn: `${colStart} / span ${span}`, gridRow: 1 }}
                                >
                                    <span className="truncate text-xs font-bold">{guestName}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="rounded-lg border-none bg-gray-900 px-3 py-2 text-white shadow-xl">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-black">{guestName}</p>
                                    <p className="text-[11px] text-gray-300">Hab. {room.number} · {style.label}</p>
                                    <p className="text-[11px] text-gray-300">{r.arrival_date} ({r.duration_days} Noches)</p>
                                    <p className={`text-[11px] font-bold text-green-300`}>Adelanto: {formatCurrency(balance)}</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}