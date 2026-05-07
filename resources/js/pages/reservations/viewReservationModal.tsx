import CancelModal from '@/components/cancelModal';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Banknote,
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
}

export default function ViewReservationModal({
    auth,
    reservations,
    guests,
    rooms,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [assigningReservation, setAssigningReservation] = useState<any>(null);
    const [confirmingStayRes, setConfirmingStayRes] = useState<any>(null);
    const [editingReservation, setEditingReservation] = useState<any>(null);

    // 👇 Estado para la vista de Verificación de Pago Online 👇
    const [verifyingOnlineRes, setVerifyingOnlineRes] = useState<any>(null);

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

                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
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
                                    {payment?.reference_number ? (
                                        <>
                                            <img
                                                src={`/storage/${payment.reference_number}`}
                                                alt="Comprobante"
                                                className="max-h-[500px] w-full rounded object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        '/images/placeholder.png';
                                                }}
                                            />
                                            <a
                                                href={`/storage/${payment.reference_number}`}
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
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    '¿Rechazar comprobante? La reserva será cancelada y las habitaciones liberadas.',
                                                )
                                            ) {
                                                router.post(
                                                    `/admin/reservas/${verifyingOnlineRes.id}/rechazar-pago`,
                                                    {},
                                                    {
                                                        onSuccess: () =>
                                                            setVerifyingOnlineRes(
                                                                null,
                                                            ),
                                                    },
                                                );
                                            }
                                        }}
                                        className="w-1/2 rounded-2xl border-2 border-red-100 bg-white py-4 text-sm font-black tracking-wider text-red-600 uppercase shadow-sm transition-all hover:border-red-200 hover:bg-red-50 active:scale-95"
                                    >
                                        ❌ Rechazar (Falso/Inválido)
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    "¿Aprobar pago? La reserva pasará a 'Pendientes de Habitación'.",
                                                )
                                            ) {
                                                router.post(
                                                    `/admin/reservas/${verifyingOnlineRes.id}/aprobar-pago`,
                                                    {},
                                                    {
                                                        onSuccess: () =>
                                                            setVerifyingOnlineRes(
                                                                null,
                                                            ),
                                                    },
                                                );
                                            }
                                        }}
                                        className="w-1/2 rounded-2xl bg-blue-600 py-4 text-sm font-black tracking-wider text-white uppercase shadow-lg transition-all hover:bg-blue-500 active:scale-95"
                                    >
                                        ✓ Aprobar Comprobante
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    // ==========================================
    // 🛏️ VISTA PANTALLA COMPLETA DE CONFIRMACIÓN DE CHECK-IN
    // ==========================================
    if (confirmingStayRes) {
        return (
            <AuthenticatedLayout user={auth.user}>
                <Head title="Confirmar Estancia" />
                <div className="min-h-screen animate-in p-8 pt-2 duration-500 slide-in-from-right-10 fade-in lg:pt-2">
                    <button
                        onClick={() => setConfirmingStayRes(null)}
                        className="mb-6 flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
                    >
                        <ChevronLeft className="h-5 w-5" /> Volver al listado
                    </button>

                    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-1">
                            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                                    <UserCheck className="h-8 w-8" />
                                </div>
                                <h2 className="text-2xl leading-tight font-black text-gray-900 uppercase">
                                    {confirmingStayRes.guest?.full_name}
                                </h2>
                                <p className="text-sm font-bold text-gray-400">
                                    CI:{' '}
                                    {
                                        confirmingStayRes.guest
                                            ?.identification_number
                                    }
                                </p>

                                <div className="mt-8 space-y-4 border-t pt-6">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">
                                            Llegada
                                        </span>
                                        <span className="font-bold text-gray-800">
                                            {confirmingStayRes.arrival_date}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">
                                            Noches
                                        </span>
                                        <span className="font-bold text-gray-800">
                                            {confirmingStayRes.duration_days}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-400">
                                            Personas
                                        </span>
                                        <span className="font-bold text-gray-800">
                                            {confirmingStayRes.guest_count}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl bg-indigo-900 p-6 text-white shadow-lg">
                                <h3 className="mb-2 text-xs font-bold tracking-widest text-indigo-200 uppercase">
                                    Finanzas
                                </h3>
                                <div className="text-3xl font-black">
                                    {confirmingStayRes.advance_payment} Bs
                                </div>
                                <p className="mt-1 text-xs text-indigo-300">
                                    Adelanto recibido (
                                    {confirmingStayRes.payment_type})
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6 lg:col-span-2">
                            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
                                <h3 className="mb-6 flex items-center gap-2 text-xl font-black text-gray-800">
                                    <BedDouble className="h-6 w-6 text-green-500" />{' '}
                                    Habitaciones Preparadas
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {confirmingStayRes.details.map(
                                        (det: any, i: number) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between rounded-2xl border-2 border-green-50 bg-green-50/30 p-4"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-xs font-black text-green-700 uppercase">
                                                            Habitación{' '}
                                                            {det.room?.number}
                                                        </div>
                                                        {/* Badge del tipo de baño para Delegaciones */}
                                                        {confirmingStayRes.is_delegation && (
                                                            <span
                                                                className={`rounded border px-1.5 py-0.5 text-[9px] font-black ${
                                                                    det.requested_bathroom ===
                                                                    'private'
                                                                        ? 'border-blue-200 bg-blue-100 text-blue-700'
                                                                        : 'border-orange-200 bg-orange-100 text-orange-700'
                                                                }`}
                                                            >
                                                                {det.requested_bathroom ===
                                                                'private'
                                                                    ? '🚿 PRIVADO'
                                                                    : det.requested_bathroom ===
                                                                        'compartido_sindesayuno'
                                                                      ? '🚽 COMP. S/D'
                                                                      : '🚽 COMP. C/D'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-800">
                                                        {det.room_type?.name}
                                                    </div>

                                                    {/* Visualización del precio acordado por esta habitación */}
                                                    <div className="mt-1 flex items-center gap-1 text-sm font-black text-indigo-600">
                                                        <Banknote className="h-3.5 w-3.5" />
                                                        {det.price} Bs.
                                                    </div>
                                                </div>
                                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                            </div>
                                        ),
                                    )}
                                </div>

                                <div className="mt-12 rounded-3xl border-2 border-dashed border-gray-200 p-8 text-center">
                                    <p className="mx-auto mb-6 max-w-sm font-medium text-gray-500">
                                        Al confirmar, las habitaciones pasarán a
                                        estado "Ocupadas" y se generará el
                                        registro oficial de Check-in.
                                    </p>
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            router.put(
                                                `/reservas/${confirmingStayRes.id}`,
                                                { status: 'confirmada' },
                                                {
                                                    onSuccess: () =>
                                                        setConfirmingStayRes(
                                                            null,
                                                        ),
                                                },
                                            );
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className="w-full rounded-2xl bg-black py-5 text-lg font-black tracking-widest text-white uppercase shadow-xl shadow-gray-200 transition-all hover:bg-gray-800 active:scale-95"
                                        >
                                            ✓ Confirmar Entrada del Huésped
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    // ==========================================
    // 📋 VISTA PRINCIPAL: LISTADO DE TABLAS
    // ==========================================
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Reservas" />

            <div className="mx-auto max-w-[1500px] space-y-4 p-4 pt-2 lg:p-2 lg:pt-0.5">
                <button
                    onClick={() => window.history.back()}
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
                    {/* TABLA 1: PENDIENTES DE HABITACIÓN */}
                    <section className="flex h-full flex-col xl:col-span-2">
                        <div className="flex h-full min-h-[450px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-5">
                                <h2 className="flex items-center gap-2 text-sm font-black tracking-widest text-orange-500 uppercase">
                                    <Clock className="h-5 w-5" /> 1. Pendientes
                                    de Habitación ({pendingAssignment.length})
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
                                                <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase">
                                                    Req.
                                                </th>
                                                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {pendingAssignment.map((res) => {
                                                const assignedCount =
                                                    res.details.filter(
                                                        (d: any) => d.room_id,
                                                    ).length;
                                                const buttonText =
                                                    assignedCount > 0
                                                        ? 'Asignar / Editar'
                                                        : 'Asignar';

                                                return (
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
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-700">
                                                                {
                                                                    res.details
                                                                        .length
                                                                }{' '}
                                                                Hab.
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {/* Lápiz para editar reserva general */}
                                                                <button
                                                                    onClick={() =>
                                                                        setEditingReservation(
                                                                            res,
                                                                        )
                                                                    }
                                                                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                                                    title="Editar Datos de Reserva"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </button>

                                                                {/* BOTÓN CANCELAR -> Dispara cancelModal */}
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
                                                                        className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                                                                        title="Cancelar"
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() =>
                                                                        setAssigningReservation(
                                                                            res,
                                                                        )
                                                                    }
                                                                    className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white uppercase shadow-md transition-all hover:bg-orange-700 active:scale-95"
                                                                >
                                                                    {buttonText}{' '}
                                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* TABLA 2: LISTAS PARA CONFIRMAR */}
                    <section className="flex h-full flex-col xl:col-span-3">
                        <div className="flex h-full min-h-[450px] flex-col overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-5">
                                <h2 className="flex items-center gap-2 text-sm font-black tracking-widest text-green-600 uppercase">
                                    <UserCheck className="h-5 w-5" /> 2. Listas
                                    para Confirmar ({readyForCheckin.length})
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
                                                        <div className="flex items-center justify-end gap-2">
                                                            {/* BOTÓN PARA RE-ASIGNAR O CAMBIAR HABITACIONES */}
                                                            <button
                                                                onClick={() =>
                                                                    setAssigningReservation(
                                                                        res,
                                                                    )
                                                                }
                                                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                                                title="Cambiar Habitaciones Asignadas"
                                                            >
                                                                <BedDouble className="h-4 w-4" />
                                                            </button>

                                                            {/* BOTÓN CANCELAR -> Dispara cancelModal */}
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
                                                                    className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                                                                    title="Cancelar"
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() =>
                                                                    setConfirmingStayRes(
                                                                        res,
                                                                    )
                                                                }
                                                                className="ml-2 rounded-xl bg-green-600 px-5 py-2 text-xs font-black text-white uppercase shadow-md transition-all hover:bg-green-700 active:scale-95"
                                                            >
                                                                Confirmar
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
            />

            {/* Modal para NUEVA reserva */}
            <ReservationModal
                show={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                guests={guests}
                rooms={rooms}
            />

            {/* Modal para EDITAR reserva */}
            <ReservationModal
                show={!!editingReservation}
                onClose={() => setEditingReservation(null)}
                reservationToEdit={editingReservation}
                guests={guests}
                rooms={rooms}
            />

            {/* Modal para ASIGNAR / REASIGNAR HABITACIONES */}
            {assigningReservation && (
                <AssignRoomsModal
                    show={!!assigningReservation}
                    onClose={() => setAssigningReservation(null)}
                    reservation={assigningReservation}
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
