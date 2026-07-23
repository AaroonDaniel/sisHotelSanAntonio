import ApprovePaymentModal from '@/components/approvePaymentModal';
import CancelModal from '@/components/cancelModal';
import { Operator } from '@/components/OperatorSelector';
import RejectPaymentModal from '@/components/rejectPaymentModal';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    BedDouble,
    Calendar,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    Clock,
    ExternalLink,
    FileImage,
    Globe,
    Pencil,
    Plus,
    Search,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AssignRoomsModal from './AssignRoomsModal';
import ReservationModal from './reservationModal';

interface Props {
    auth: { user: User };
    reservations: any[];
    guests: any[];
    rooms: any[];
    operators?: Operator[];
}

export default function ViewReservationModal({
    auth,
    reservations,
    guests,
    rooms,
    operators = [],
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    // 🚀 REDISEÑO (matchmaking): reemplaza assigningReservation +
    // confirmingStayRes -- un solo modal (AssignRoomsModal) con dos
    // modos. "Asignar Habitación" (Tabla 1/2) = mode 'assign'.
    // "Confirmar Reserva/Check-in" / "Registrar Llegada" = mode
    // 'confirm' (si ya viene asignada, el modal salta directo a pedir
    // precio; si no, hace el matchmaking primero).
    const [matchmakingTarget, setMatchmakingTarget] = useState<{
        reservation: any;
        mode: 'assign' | 'confirm';
    } | null>(null);
    const [editingReservation, setEditingReservation] = useState<any>(null);

    // 👇 Estado para la vista de Verificación de Pago Online 👇
    const [verifyingOnlineRes, setVerifyingOnlineRes] = useState<any>(null);
    const [approvingResId, setApprovingResId] = useState<number | null>(null);
    const [rejectingResId, setRejectingResId] = useState<number | null>(null);
    // Estados para tu CancelModal
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelingReservationId, setCancelingReservationId] = useState<
        number | null
    >(null);

    useEffect(() => {
        // Consultamos a Laravel cada 10 segundos
        const interval = setInterval(() => {
            router.reload({
                only: ['reservations'], // 👈 Solo pedimos las reservas nuevas
            });
        }, 10000);

        // Limpiamos el temporizador cuando cerramos esta pantalla
        return () => clearInterval(interval);
    }, []);

    const filteredReservations = useMemo(() => {
        return reservations.filter(
            (res) =>
                res.guest?.full_name
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                res.guest?.identification_number?.includes(searchTerm),
        );
    }, [reservations, searchTerm]);

    // ==========================================
    // 🧮 FILTROS DE TABLAS
    // ==========================================

    // 1. NUEVO: Reservas Online Pendientes de Verificar el Pago
    const pendingOnlineVerification = useMemo(() => {
        return filteredReservations.filter((res) =>
            res.payments?.some(
                (p: any) => p.status === 'PENDIENTE_VERIFICACION',
            ),
        );
    }, [filteredReservations]);

    // 2. Pendientes de asignar habitación (Excluimos las que aún no verifican su pago)
    const pendingAssignment = useMemo(() => {
        return filteredReservations.filter(
            (res) =>
                res.details.some((d: any) => d.room_id === null) &&
                res.status === 'pendiente' &&
                // 👇 ESTE ES EL ESCUDO: Ignora por completo las reservas web que no han sido verificadas 👇
                !res.payments?.some(
                    (p: any) => p.status === 'PENDIENTE_VERIFICACION',
                ),
        );
    }, [filteredReservations]);

    // 3. Listos para Confirmar (Excluimos las que aún no verifican su pago)
    const readyForCheckin = useMemo(
        () =>
            filteredReservations.filter(
                (res) =>
                    res.details.every((d: any) => d.room_id !== null) &&
                    res.status === 'pendiente' &&
                    !res.payments?.some(
                        (p: any) => p.status === 'PENDIENTE_VERIFICACION',
                    ),
            ),
        [filteredReservations],
    );

    // ==========================================
    // 💻 VISTA PANTALLA COMPLETA: VERIFICACIÓN ONLINE
    // ==========================================
    if (verifyingOnlineRes) {
        const payment = verifyingOnlineRes.payments?.find(
            (p: any) => p.status === 'PENDIENTE_VERIFICACION',
        );

        return (
            <AuthenticatedLayout user={auth.user}>
                <Head title="Verificar Pago Online" />
                <div className="min-h-screen animate-in p-8 pt-2 duration-500 slide-in-from-right-10 fade-in lg:pt-2">
                    <button
                        onClick={() => setVerifyingOnlineRes(null)}
                        className="mb-6 flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
                    >
                        <ChevronLeft className="h-5 w-5" /> Volver al listado
                    </button>

                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 lg:grid-cols-3">
                        {/* Datos del Cliente y Reserva */}
                        <div className="space-y-6 lg:col-span-1">
                            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                                    <Globe className="h-8 w-8" />
                                </div>
                                <h2 className="text-2xl leading-tight font-black text-gray-900 uppercase">
                                    {verifyingOnlineRes.guest?.full_name}
                                </h2>
                                <p className="text-sm font-bold text-gray-400">
                                    CI:{' '}
                                    {
                                        verifyingOnlineRes.guest
                                            ?.identification_number
                                    }
                                </p>
                                <p className="text-sm font-bold text-gray-400">
                                    Telf: {verifyingOnlineRes.guest?.phone}
                                </p>

                                <div className="mt-8 space-y-4 border-t pt-6">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">
                                            Llegada
                                        </span>
                                        <span className="font-bold text-gray-800">
                                            {verifyingOnlineRes.arrival_date}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">
                                            Noches
                                        </span>
                                        <span className="font-bold text-gray-800">
                                            {verifyingOnlineRes.duration_days}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">
                                            Monto Reportado
                                        </span>
                                        <span className="font-bold text-blue-600">
                                            Bs. {payment?.amount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visor del Comprobante y Acciones */}
                        <div className="space-y-6 lg:col-span-2">
                            <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
                                <h3 className="mb-4 flex items-center gap-2 border-b pb-4 text-xl font-black text-gray-800">
                                    <FileImage className="h-6 w-6 text-blue-500" />{' '}
                                    Comprobante Adjuntado
                                </h3>

                                <div className="group relative flex min-h-[400px] flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 p-2">
                                    {/* 👇 CAMBIAR reference_number POR voucher_path 👇 */}
                                    {payment?.voucher_path ? (
                                        <>
                                            <img
                                                // 👇 Y CAMBIAR TAMBIÉN AQUÍ 👇
                                                src={`/storage/${payment.voucher_path}`}
                                                alt="Comprobante"
                                                className="max-h-[500px] w-full rounded object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.onerror =
                                                        null; // 👈 corta el bucle
                                                    e.currentTarget.style.display =
                                                        'none';
                                                }}
                                            />
                                            <a
                                                // 👇 Y CAMBIAR AQUÍ TAMBIÉN 👇
                                                href={`/storage/${payment.voucher_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 flex items-center justify-center bg-black/50 font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                                            >
                                                <ExternalLink className="mr-2 h-6 w-6" />{' '}
                                                Ampliar Imagen
                                            </a>
                                        </>
                                    ) : (
                                        <p className="font-medium text-gray-400 italic">
                                            No se encontró la imagen del
                                            comprobante.
                                        </p>
                                    )}
                                </div>

                                <div className="mt-8 flex gap-4">
                                    <button
                                        onClick={() =>
                                            setRejectingResId(
                                                verifyingOnlineRes.id,
                                            )
                                        }
                                        className="w-1/2 rounded-2xl border-2 border-red-100 bg-white py-4 text-sm font-black tracking-wider text-red-600 uppercase shadow-sm transition-all hover:border-red-200 hover:bg-red-50 active:scale-95"
                                    >
                                        ❌ Rechazar (Falso/Inválido)
                                    </button>
                                    <button
                                        onClick={() =>
                                            setApprovingResId(
                                                verifyingOnlineRes.id,
                                            )
                                        }
                                        className="w-1/2 rounded-2xl bg-blue-600 py-4 text-sm font-black tracking-wider text-white uppercase shadow-lg transition-all hover:bg-blue-500 active:scale-95"
                                    >
                                        ✓ Aprobar Comprobante
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ApprovePaymentModal
                    show={approvingResId !== null}
                    reservationId={approvingResId}
                    onClose={() => setApprovingResId(null)}
                    onSuccess={() => setVerifyingOnlineRes(null)}
                />
                <RejectPaymentModal
                    show={rejectingResId !== null}
                    reservationId={rejectingResId}
                    onClose={() => setRejectingResId(null)}
                    onSuccess={() => setVerifyingOnlineRes(null)}
                />
            </AuthenticatedLayout>
        );
    }

    // 🚀 REDISEÑO: la vista de pantalla completa "Confirmar Estancia" se
    // eliminó -- no pedía precio (ya no tiene sentido con
    // reservation_details.price eliminado) y llamaba a update() sin
    // `assignments`, que ahora es obligatorio. Reemplazada por
    // AssignRoomsModal en mode="confirm" (ver más abajo), que si la
    // reserva ya viene asignada salta directo a pedir precio por
    // habitación.

    // ==========================================
    // 📋 VISTA PRINCIPAL: LISTADO DE TABLAS
    // ==========================================
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Reservas" />

            <div className="mx-auto max-w-[1500px] space-y-6 px-4 pt-6 pb-12 sm:px-8 lg:px-16 xl:px-20">
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-1 text-base font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-black text-white">
                            <Calendar className="h-8 w-8 text-green-500" />{' '}
                            Reservas del Hotel
                        </h1>
                        <p className="mt-1 font-medium text-gray-300">
                            Organiza la llegada de tus huéspedes y asigna sus
                            espacios.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="group relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-green-500" />
                            <input
                                type="text"
                                placeholder="Buscar huésped o CI..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-64 rounded-2xl border-gray-700 bg-gray-800 py-3 pr-4 pl-10 text-white placeholder-gray-400 shadow-lg transition-all focus:border-green-500 focus:ring-green-500 lg:w-80"
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 rounded-2xl bg-green-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-green-500 active:scale-95"
                        >
                            <Plus className="h-5 w-5" /> Nueva Reserva
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-5">
                    {/* TABLA 1: RESERVAS REGISTRADAS (sin habitación asignada todavía) */}
                    <section className="flex h-full flex-col xl:col-span-2">
                        <div className="flex h-full min-h-[450px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-5">
                                <h2 className="flex items-center gap-2 text-sm font-black tracking-widest text-orange-500 uppercase">
                                    <Clock className="h-5 w-5" /> 1. Reservas
                                    Registradas ({pendingAssignment.length})
                                </h2>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-white">
                                {pendingAssignment.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center p-20 text-gray-400">
                                        <CheckCircle2 className="mb-4 h-12 w-12 opacity-20" />
                                        <p className="text-sm font-bold tracking-wider uppercase">
                                            No hay pendientes de cupo
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-white">
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">
                                                    Huésped / Llegada
                                                </th>
                                                <th className="w-28 px-6 py-3 text-center text-[10px] font-black whitespace-nowrap text-gray-400 uppercase">
                                                    Req.
                                                </th>
                                                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                        <tbody className="divide-y divide-gray-50">
                                            {pendingAssignment.map((res) => (
                                                    <tr
                                                        key={res.id}
                                                        className="group transition-colors hover:bg-orange-50/30"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-black text-gray-800 uppercase">
                                                                {
                                                                    res.guest
                                                                        ?.full_name
                                                                }
                                                            </div>
                                                            <div className="mt-1 flex w-fit items-center gap-1.5 rounded-md border border-orange-100 bg-orange-50 px-2 py-0.5 text-orange-600">
                                                                <CalendarDays className="h-3.5 w-3.5" />
                                                                <span className="text-xs font-bold tracking-wide">
                                                                    {
                                                                        res.arrival_date
                                                                    }
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                                            <span className="inline-block rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-[11px] font-black whitespace-nowrap text-orange-700 shadow-sm">
                                                                {res.guest_count}{' '}
                                                                pers.
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    {/* Editar y Cancelar: más visibles (texto + color, no solo ícono gris) */}
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditingReservation(
                                                                                res,
                                                                            )
                                                                        }
                                                                        className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-100"
                                                                        title="Editar Datos de Reserva"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />{' '}
                                                                        Editar
                                                                    </button>

                                                                    {res.status !==
                                                                        'cancelado' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setCancelingReservationId(
                                                                                    res.id,
                                                                                );
                                                                                setIsCancelModalOpen(
                                                                                    true,
                                                                                );
                                                                            }}
                                                                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-100"
                                                                            title="Cancelar"
                                                                        >
                                                                            <XCircle className="h-3.5 w-3.5" />{' '}
                                                                            Cancelar
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            setMatchmakingTarget(
                                                                                {
                                                                                    reservation:
                                                                                        res,
                                                                                    mode: 'assign',
                                                                                },
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white uppercase shadow-md transition-all hover:bg-orange-700 active:scale-95"
                                                                    >
                                                                        <BedDouble className="h-3.5 w-3.5" />{' '}
                                                                        Asignar
                                                                        Habitación
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            setMatchmakingTarget(
                                                                                {
                                                                                    reservation:
                                                                                        res,
                                                                                    mode: 'confirm',
                                                                                },
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-black text-white uppercase shadow-md transition-all hover:bg-green-700 active:scale-95"
                                                                    >
                                                                        <UserCheck className="h-3.5 w-3.5" />{' '}
                                                                        Confirmar
                                                                        Reserva
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* TABLA 2: RESERVAS ASIGNADAS (ya con habitaciones bloqueadas) */}
                    <section className="flex h-full flex-col xl:col-span-3">
                        <div className="flex h-full min-h-[450px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-5">
                                <h2 className="flex items-center gap-2 text-sm font-black tracking-widest text-green-600 uppercase">
                                    <UserCheck className="h-5 w-5" /> 2. Reservas
                                    Asignadas ({readyForCheckin.length})
                                </h2>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-white">
                                {readyForCheckin.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center p-20 text-center text-gray-400">
                                        <AlertCircle className="mb-4 h-12 w-12 opacity-20" />
                                        <p className="text-sm font-bold tracking-wider uppercase">
                                            Sin reservas para confirmar llegada
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-white">
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">
                                                    Huésped / Llegada
                                                </th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">
                                                    Habitaciones
                                                </th>
                                                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {readyForCheckin.map((res) => (
                                                <tr
                                                    key={res.id}
                                                    className="transition-colors hover:bg-green-50/30"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-black text-gray-800 uppercase">
                                                            {
                                                                res.guest
                                                                    ?.full_name
                                                            }
                                                        </div>
                                                        <div className="mt-1 flex w-fit items-center gap-1.5 rounded-md border border-green-200 bg-green-100 px-2 py-0.5 text-green-700">
                                                            <CalendarDays className="h-3.5 w-3.5" />
                                                            <span className="text-xs font-bold tracking-wide">
                                                                {
                                                                    res.arrival_date
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {res.details.map(
                                                                (
                                                                    d: any,
                                                                    idx: number,
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="rounded border border-green-200 bg-green-100 px-1.5 py-0.5 text-[15px] font-black text-green-700"
                                                                    >
                                                                        {
                                                                            d
                                                                                .room
                                                                                ?.number
                                                                        }
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-2">
                                                            <div className="flex items-center gap-1.5">
                                                                {/* Editar asignación: más visible (texto + color) */}
                                                                <button
                                                                    onClick={() =>
                                                                        setMatchmakingTarget(
                                                                            {
                                                                                reservation:
                                                                                    res,
                                                                                mode: 'assign',
                                                                            },
                                                                        )
                                                                    }
                                                                    className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-100"
                                                                    title="Cambiar Habitaciones Asignadas"
                                                                >
                                                                    <BedDouble className="h-3.5 w-3.5" />{' '}
                                                                    Editar
                                                                    asignación
                                                                </button>

                                                                {res.status !==
                                                                    'cancelado' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setCancelingReservationId(
                                                                                res.id,
                                                                            );
                                                                            setIsCancelModalOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                        className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-100"
                                                                        title="Cancelar"
                                                                    >
                                                                        <XCircle className="h-3.5 w-3.5" />{' '}
                                                                        Cancelar
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <button
                                                                onClick={() =>
                                                                    setMatchmakingTarget(
                                                                        {
                                                                            reservation:
                                                                                res,
                                                                            mode: 'confirm',
                                                                        },
                                                                    )
                                                                }
                                                                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-black text-white uppercase shadow-md transition-all hover:bg-green-700 active:scale-95"
                                                            >
                                                                <UserCheck className="h-4 w-4" />{' '}
                                                                Registrar
                                                                Llegada
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* ========================================== */}
                {/* 👇 TABLA 3: RESERVAS ONLINE POR VERIFICAR 👇 */}
                {/* ========================================== */}
                {/*}
                <section className="mt-8 flex flex-col">
                    <div className="flex min-h-[350px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-blue-50/50 px-6 py-5">
                            <div>
                                <h2 className="flex items-center gap-2 text-sm font-black tracking-widest text-blue-600 uppercase">
                                    <Globe className="h-5 w-5" /> 3. Reservas
                                    Online (Por Verificar Pago)
                                </h2>
                                <p className="mt-1 text-xs font-medium text-gray-500">
                                    Revisa el comprobante subido por el cliente
                                    para confirmar su reserva oficial.
                                </p>
                            </div>
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                                {pendingOnlineVerification.length} Pendiente(s)
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white">
                            {pendingOnlineVerification.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center p-12 text-center text-gray-400">
                                    <FileImage className="mb-4 h-12 w-12 opacity-20" />
                                    <p className="text-sm font-bold tracking-wider uppercase">
                                        No hay reservas web por verificar
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="border-b border-gray-100 bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">
                                                Titular
                                            </th>
                                            <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">
                                                Llegada
                                            </th>
                                            <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase">
                                                Habitaciones Req.
                                            </th>
                                            <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase">
                                                Acción
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pendingOnlineVerification.map(
                                            (res) => (
                                                <tr
                                                    key={res.id}
                                                    className="transition-colors hover:bg-blue-50/30"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-black text-gray-800 uppercase">
                                                            {
                                                                res.guest
                                                                    ?.full_name
                                                            }
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-gray-400">
                                                            Telf:{' '}
                                                            {res.guest?.phone}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex w-fit items-center gap-1.5 rounded-md border border-blue-200 bg-blue-100 px-2 py-0.5 text-blue-700">
                                                            <CalendarDays className="h-3.5 w-3.5" />
                                                            <span className="text-xs font-bold tracking-wide">
                                                                {
                                                                    res.arrival_date
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-700">
                                                            {res.details.length}{' '}
                                                            Hab.
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() =>
                                                                setVerifyingOnlineRes(
                                                                    res,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-600 px-4 py-2 text-xs font-black text-blue-600 uppercase shadow-sm transition-all hover:bg-blue-600 hover:text-white active:scale-95"
                                                        >
                                                            <FileImage className="h-3.5 w-3.5" />{' '}
                                                            Verificar Pago
                                                        </button>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </section>
                {*/}
            </div>

            {/* MODALES AUXILIARES */}
            <CancelModal
                show={isCancelModalOpen}
                onClose={() => {
                    setIsCancelModalOpen(false);
                    setCancelingReservationId(null);
                }}
                actionUrl={
                    cancelingReservationId
                        ? `/reservas/${cancelingReservationId}`
                        : null
                }
                operators={operators}
                hasAdvance={
                    (reservations.find(
                        (r) => r.id === cancelingReservationId,
                    )?.advance_payment ?? 0) > 0
                }
                advanceAmount={
                    reservations.find(
                        (r) => r.id === cancelingReservationId,
                    )?.advance_payment ?? 0
                }
            />

            {/* Modal para NUEVA reserva */}
            <ReservationModal
                show={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                guests={guests}
                operators={operators}
            />

            {/* Modal para EDITAR reserva */}
            <ReservationModal
                show={!!editingReservation}
                onClose={() => setEditingReservation(null)}
                reservationToEdit={editingReservation}
                guests={guests}
                operators={operators}
            />

            {/* Modal de MATCHMAKING: asignar habitaciones o confirmar/check-in */}
            {matchmakingTarget && (
                <AssignRoomsModal
                    show={!!matchmakingTarget}
                    onClose={() => setMatchmakingTarget(null)}
                    reservation={matchmakingTarget.reservation}
                    mode={matchmakingTarget.mode}
                    availableRooms={(rooms || []).filter(
                        (r) =>
                            r.status?.toUpperCase() !== 'MANTENIMIENTO' &&
                            r.status?.toUpperCase() !== 'INHABILITADO',
                    )}
                />
            )}
        </AuthenticatedLayout>
    );
}

