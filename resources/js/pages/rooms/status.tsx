import ToleranceModal from '@/components/ToleranceModal';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowRightCircle,
    BedDouble,
    Brush,
    CalendarClock,
    CheckCircle2,
    Construction,
    FileEdit,
    Home,
    Loader2,
    LogOut,
    Plus,
    Search,
    ShoppingCart,
    User,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import DetailModal from '../checkindetails/detailModal';
import CheckinModal, {
    CheckinData,
    Guest as ModalGuest,
    Room as ModalRoom,
} from '../checkins/checkinModal';
import ReservationModal from '../reservations/reservationModal';
import OccupiedRoomModal from './occupiedRoomModal'; //
import PendingReservationsModal from './pendingReservationsModal';
import TransferModal from './transferModal';
// Evitar errores de TS con Ziggy
declare var route: any;

// --- INTERFACES ---
interface User {
    id: number;
    name: string;
    email: string;
    nickname: string;
    full_name: string;
}

interface RoomType {
    id: number;
    name: string;
    capacity: number;
}

interface Guest extends ModalGuest {
    profile_status?: string;
}

interface Block {
    id: number;
    code: string;
    description: string;
}

interface Price {
    id: number;
    bathroom_type: string;
    room_type: number;
}

interface Room extends ModalRoom {
    room_type?: RoomType;
    checkins?: CheckinData[];
    price?: { amount: number; bathroom_type: string };
    block?: Block;
    block_id?: number;
}

interface Props {
    auth: { user: User };
    Rooms: Room[];
    Guests: Guest[];
    services: any[];
    Blocks: Block[];
    RoomTypes: RoomType[];
    Checkins: any[];
    Schedules: any[];
    reservations: any[];
}

export default function RoomsStatus({
    auth,
    Rooms,
    Guests,
    services,
    Blocks,
    RoomTypes,
    Checkins,
    Schedules,
    reservations,
}: Props) {
    //Estado para el modal de reserva
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isNewReservationModalOpen, setIsNewReservationModalOpen] =
        useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [preselectedReservationId, setPreselectedReservationId] = useState<
        number | null
    >(null);

    // Modal de alerta Tolerancia
    const [tolModal, setTolModal] = useState<{
        show: boolean;
        type: 'allowed' | 'denied';
        time: string;
        minutes: number;
    }>({ show: false, type: 'allowed', time: '', minutes: 0 });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedRoomType, setSelectedRoomType] = useState('');

    const [selectedForAction, setSelectedForAction] = useState<number | null>(
        null,
    );
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [checkinToEdit, setCheckinToEdit] = useState<CheckinData | null>(
        null,
    );
    const [confirmCheckoutId, setConfirmCheckoutId] = useState<number | null>(
        null,
    );

    // Detalles de asignacion
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [checkinForDetails, setCheckinForDetails] = useState<any>(null);

    // Detalles de una nueva vista para los datos del usuario
    const [isOccupiedModalOpen, setIsOccupiedModalOpen] = useState(false);
    const [occupiedCheckinData, setOccupiedCheckinData] = useState<any>(null);

    // [DOC] SINCRONIZADOR MAESTRO DE DATOS (Actualiza TODOS los modales al hacer pagos)
    useEffect(() => {
        const findFreshCheckin = (targetId: number) => {
            for (const room of Rooms) {
                if (room.checkins && room.checkins.length > 0) {
                    const found = room.checkins.find(
                        (c: any) => c.id === targetId,
                    );
                    if (found) return found;
                }
            }
            return null;
        };

        // 1. Sincronizar Modal de Habitación Ocupada
        if (occupiedCheckinData) {
            const fresh = findFreshCheckin(occupiedCheckinData.id);
            if (fresh) setOccupiedCheckinData(fresh);
        }

        // 2. Sincronizar Modal de Finalizar/Editar Estadía
        // [DOC] Cambiamos 'checkinToCheckout' por 'checkinToEdit' que es el que parece que usas
        if (checkinToEdit) {
            const freshCheckout = findFreshCheckin(checkinToEdit.id);
            if (freshCheckout) {
                console.log(
                    '🔄 Sync: Actualizando datos del checkout con nuevos pagos',
                );
                setCheckinToEdit(freshCheckout);
            }
        }
    }, [Rooms]);
    // Detalles para la tolerancia
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [checkinForTransfer, setCheckinForTransfer] = useState<any>(null);

    const incompleteCheckins =
        Rooms?.flatMap(
            (room: any) =>
                room.checkins
                    ?.filter((c: any) => {
                        const isTitularIncomplete =
                            c.guest?.profile_status === 'INCOMPLETE';
                        const isOriginMissing =
                            !c.origin || c.origin.trim() === '';
                        return (
                            c.status === 'activo' &&
                            (isTitularIncomplete || isOriginMissing)
                        );
                    })
                    .map((c: any) => ({ ...c, room })) || [],
        ) || [];

    const handleCompleteCheckin = (room: any) => {
        const activeCheckin = room.checkins?.find(
            (c: any) => c.status === 'activo',
        );
        if (activeCheckin) {
            setCheckinToEdit(activeCheckin);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
        }
    };

    const { flash } = usePage<any>().props;
    useEffect(() => {
        // Usamos un bloque try-catch para asegurar que esto ocurra en segundo plano
        // y si algo falla (ej. almacenamiento lleno o bloqueado), no rompa la pantalla.
        try {
            if (
                flash?.auto_open_checkins &&
                Array.isArray(flash.auto_open_checkins) &&
                flash.auto_open_checkins.length > 0
            ) {
                sessionStorage.setItem(
                    'pendingCheckinsQueue',
                    JSON.stringify(flash.auto_open_checkins),
                );
                setIsPendingModalOpen(false);

                // Opcional: Imprimir en consola solo para confirmar que se guardó bien
                console.log(
                    'Cola de check-ins guardada para procesamiento:',
                    flash.auto_open_checkins,
                );
            }
        } catch (error) {
            console.error(
                'Error silencioso al guardar la cola en sessionStorage:',
                error,
            );
        }
    }, [flash?.auto_open_checkins]);
    useEffect(() => {
        const queueStr = sessionStorage.getItem('pendingCheckinsQueue');
        if (queueStr && !isCheckinModalOpen) {
            let queue: number[] = JSON.parse(queueStr);
            let openedModal = false;

            // 🚀 BUCLE: Avanza instantáneamente ignorando las habitaciones ya completadas
            while (queue.length > 0 && !openedModal) {
                const nextCheckinId = queue[0];

                const roomWithCheckin = Rooms.find(
                    (r) =>
                        r.checkins &&
                        r.checkins.some((c) => c.id === nextCheckinId),
                );

                if (roomWithCheckin) {
                    const checkin = roomWithCheckin.checkins!.find(
                        (c) => c.id === nextCheckinId,
                    );
                    if (checkin) {
                        const isTitularIncomplete =
                            checkin.guest?.profile_status === 'INCOMPLETE';
                        const isOriginMissing =
                            !checkin.origin || checkin.origin.trim() === '';

                        if (isTitularIncomplete || isOriginMissing) {
                            // FALTAN DATOS: Nos detenemos aquí y abrimos el modal
                            setCheckinToEdit(checkin);
                            setSelectedRoomId(roomWithCheckin.id);
                            setIsCheckinModalOpen(true);
                            openedModal = true;
                        } else {
                            // ESTÁ COMPLETA: La sacamos de la lista y el bucle revisa la siguiente al instante
                            queue.shift();
                        }
                    } else {
                        queue.shift();
                    }
                } else {
                    queue.shift();
                }
            }

            // Actualizamos la memoria
            if (queue.length > 0) {
                sessionStorage.setItem(
                    'pendingCheckinsQueue',
                    JSON.stringify(queue),
                );
            } else {
                sessionStorage.removeItem('pendingCheckinsQueue');
            }
        }
    }, [Rooms, isCheckinModalOpen]);

    // --- LÓGICA DE ESTADO ---
    // =========================================================
    // 1. LÓGICA DE ESTADO (Corregida para detectar libres con checkin)
    // =========================================================
    const getDisplayStatus = (room: Room) => {
        const dbStatus = room.status ? room.status.toLowerCase().trim() : '';
        const activeCheckin =
            room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;

        // 🛑 1. EVALUAR CHECK-IN PRIMERO:
        // Si hay un huésped asignado, revisamos si completó sus datos
        if (activeCheckin) {
            const guest = activeCheckin.guest as Guest | undefined;
            const isTitularIncomplete = guest?.profile_status === 'INCOMPLETE';

            const companions = activeCheckin.companions as Guest[] | undefined;
            const isAnyCompanionIncomplete = companions?.some(
                (c) => c.profile_status === 'INCOMPLETE',
            );

            // Origin missing = Falta de datos (Lo que creamos al confirmar la reserva)
            const isOriginMissing =
                !activeCheckin.origin || activeCheckin.origin.trim() === '';

            // Si falta algo, forzamos el estado a INCOMPLETO (Amarillo)
            if (
                isTitularIncomplete ||
                isAnyCompanionIncomplete ||
                isOriginMissing
            ) {
                return 'incomplete';
            }

            // Si tiene checkin y no le falta nada, es OCUPADO seguro (Azul)
            return 'occupied';
        }

        // 🛑 2. SI NO HAY CHECK-IN ACTIVO:
        // Mostramos el estado tal cual viene de la base de datos
        if (['occupied', 'ocupado', 'ocupada'].includes(dbStatus))
            return 'occupied';
        if (['available', 'disponible', 'libre'].includes(dbStatus))
            return 'available';
        if (['reserved', 'reservado', 'reservada'].includes(dbStatus))
            return 'reserved';
        if (['cleaning', 'limpieza', 'sucio'].includes(dbStatus))
            return 'cleaning';
        if (['maintenance', 'mantenimiento', 'reparacion'].includes(dbStatus))
            return 'maintenance';

        return 'unknown';
    };
    // =========================================================
    // 2. LÓGICA DE CLICK (Se mantiene igual a la tuya)
    // =========================================================
    const handleRoomClick = (room: Room) => {
        const status = getDisplayStatus(room);

        if (status === 'occupied') {
            const fullCheckinData = Checkins?.find(
                (c) => c.room_id === room.id && c.status === 'activo',
            );

            if (fullCheckinData) {
                setOccupiedCheckinData({ ...fullCheckinData, room });
                setIsOccupiedModalOpen(true);
            } else {
                const localCheckin = room.checkins?.[0];
                if (localCheckin) {
                    setOccupiedCheckinData({ ...localCheckin, room });
                    setIsOccupiedModalOpen(true);
                }
            }
            return;
        }
        if (status === 'reserved') {
            const matchinReservation = reservations?.find((res) =>
                res.details?.some(
                    (d: any) => String(d.room_id) === String(room.id),
                ),
            );
            if (matchinReservation) {
                setPreselectedReservationId(matchinReservation.id);
            } else {
                setPreselectedReservationId(null);
            }
            setIsPendingModalOpen(true);
            return;
        }

        setSelectedForAction(null);

        if (status === 'available') {
            setCheckinToEdit(null);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
        } else if (status === 'incomplete') {
            const activeCheckin = room.checkins?.[0];
            if (activeCheckin) {
                setCheckinToEdit(activeCheckin);
                setSelectedRoomId(room.id);
                setIsCheckinModalOpen(true);
            }
        }

        if (status === 'cleaning') {
            getCleanRoom(room);
            return;
        }
    };

    const handleTopCheckoutTrigger = () => {
        if (!selectedForAction) return;
        const room = Rooms.find((r) => r.id === selectedForAction);
        const activeCheckin = room?.checkins?.[0];
        if (activeCheckin) {
            setConfirmCheckoutId(activeCheckin.id);
        }
    };

    const handleDirectCheckoutTrigger = (checkinId: number) => {
        setConfirmCheckoutId(checkinId);
    };

    const handleOpenDetails = (room: Room) => {
        const activeCheckin =
            room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;
        if (activeCheckin) {
            setCheckinToEdit(activeCheckin);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
            setSelectedForAction(null);
        }
    };

    const handleShowCheckinDetails = (checkin: any, room: any) => {
        if (checkin) {
            // 2. Aquí combinamos ambos datos
            setCheckinForDetails({ ...checkin, room: room });
            setIsDetailsModalOpen(true);
        }
    };

    const [selectedBlock, setSelectedBlock] = useState('');
    const [selectedBathroom, setSelectedBathroom] = useState('');

    const filteredRooms = Rooms.filter((room) => {
        const matchesSearch =
            room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (room.room_type?.name || '')
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
        const currentStatus = getDisplayStatus(room);
        const matchesStatus =
            filterStatus === 'all' || currentStatus === filterStatus;
        const matchesBlock = selectedBlock
            ? room.block_id?.toString() === selectedBlock
            : true;
        const matchesBathroom = selectedBathroom
            ? room.price?.bathroom_type === selectedBathroom
            : true;
        const matchesRoomType = selectedRoomType
            ? room.room_type?.id.toString() === selectedRoomType
            : true;
        return (
            matchesSearch &&
            matchesStatus &&
            matchesBlock &&
            matchesBathroom &&
            matchesRoomType
        );
    }).sort((a, b) => {
        return a.number.localeCompare(b.number, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
    });

    //cambio de estado de la habitacion de limpieza a libre
    const getCleanRoom = (room: Room) => {
        if (getDisplayStatus(room) === 'cleaning') {
            router.put(
                `/rooms/${room.id}/clean`,
                {},
                {
                    onSuccess: () => {
                        // Opcional: mostrar alerta o simplemente dejar que se refresque
                    },
                },
            );
        }
    };

    const getOccupantName = (room: Room) => {
        if (room.checkins && room.checkins.length > 0) {
            // Tomamos el checkin activo (el primero)
            const checkin = room.checkins[0];
            const guest = checkin.guest as Guest | undefined;

            if (guest) {
                let text = guest.full_name;

                // 1. Verificar perfil incompleto del titular
                if (guest.profile_status === 'INCOMPLETE') {
                    text += ' (Faltan Datos)';
                }
                // 2. Agregar procedencia si existe
                else if (checkin.origin) {
                    text += ` (${checkin.origin})`;
                }

                // 3. --- AGREGAR ACOMPAÑANTES (NUEVO) ---
                // Verificamos si el array companions existe y tiene datos
                if (checkin.companions && checkin.companions.length > 0) {
                    // Mapeamos para obtener los nombres.
                    // .split(' ')[0] toma solo el primer nombre para ahorrar espacio.
                    // Si prefieres el nombre completo, quita el .split
                    const companionNames = checkin.companions
                        .map((c) => c.full_name.split(' ')[0])
                        .join(', ');

                    text += ` + ${companionNames}`;
                }
                // ----------------------------------------

                return text;
            }
        }
        return 'Huésped';
    };

    const getReservationName = (room: Room) => {
        const matchingReservations = reservations?.find((res) =>
            res.details?.some(
                (d: any) => String(d.room_id) === String(room.id),
            ),
        );
        if (matchingReservations && matchingReservations.guest) {
            const guest = matchingReservations.guest;
            return guest.full_name || 'Reservado';
        }
        return "Reserva no encontrada";
    };

    const getStatusConfig = (room: Room) => {
        const status = getDisplayStatus(room);
        switch (status) {
            case 'available':
                return {
                    colorClass:
                        'bg-emerald-600 hover:bg-emerald-500 cursor-pointer',
                    borderColor: 'border-emerald-700',
                    label: 'Disponible',
                    icon: (
                        <BedDouble className="h-10 w-10 text-emerald-200/50" />
                    ),
                    info: room.room_type?.name || 'Libre',
                    actionLabel: 'Asignar',
                };

            case 'occupied':
                // CAMBIO: CELESTE (Cyan/Sky)
                return {
                    colorClass: 'bg-cyan-600 hover:bg-cyan-500 cursor-pointer',
                    borderColor: 'border-cyan-700',
                    label: 'Ocupado',
                    icon: <UserIcon className="h-10 w-10 text-cyan-200/50" />,
                    info: getOccupantName(room),
                    actionLabel: 'Ver / Editar',
                };

            case 'incomplete':
                return {
                    colorClass:
                        'bg-amber-500 hover:bg-amber-400 cursor-pointer ring-2 ring-amber-300 ring-offset-2 ring-offset-gray-900',
                    borderColor: 'border-amber-600',
                    label: 'Completar Datos',
                    icon: (
                        <AlertTriangle className="h-10 w-10 animate-pulse text-amber-100" />
                    ),
                    info: getOccupantName(room),
                    actionLabel: 'Actualizar Info',
                };

            case 'cleaning':
                // CAMBIO: PLOMO (Gray)
                return {
                    colorClass: 'bg-gray-500 hover:bg-gray-400 cursor-pointer',
                    borderColor: 'border-gray-600',
                    label: 'Limpieza',
                    icon: <Brush className="h-10 w-10 text-gray-200/50" />,
                    info: 'Clic para Habilitar',
                    actionLabel: 'Habilitar',
                };

            case 'maintenance':
                // CAMBIO: ROJO (Red)
                return {
                    colorClass: 'bg-red-600',
                    borderColor: 'border-red-700',
                    label: 'Mantenimiento',
                    icon: (
                        <Construction className="h-10 w-10 text-red-200/50" />
                    ),
                    info: 'En Reparación',
                    actionLabel: '-',
                };

            case 'reserved':
                return {
                    colorClass:
                        'bg-purple-600 hover:bg-purple-500 cursor-pointer',
                    borderColor: 'border-purple-700',
                    label: 'Reservado',
                    icon: <FileEdit className="h-0 w-10 text-purple-200/50" />,
                    info: getReservationName(room),
                    actionLabel: 'Ver reserva',
                };

            default:
                return {
                    colorClass: 'bg-slate-500',
                    borderColor: 'border-slate-600',
                    label: room.status || 'Desc.',
                    icon: <Home className="h-10 w-10 text-white/50" />,
                    info: '-',
                    actionLabel: '-',
                };
        }
    };

    const countStatus = (targetStatus: string) =>
        Rooms.filter((r) => getDisplayStatus(r) === targetStatus).length;

    const countBlock = (blockId: number) =>
        Rooms.filter((r) => r.block_id === blockId).length;

    const countBathroom = (type: string) =>
        Rooms.filter((r) => r.price?.bathroom_type === type).length;

    // --- HELPER PARA OBTENER EL OBJETO COMPLETO DE CHECKIN Y ROOM ---
    const getCheckoutData = () => {
        if (!confirmCheckoutId) return null;
        // Buscamos la habitación que contiene este checkin activo
        const room = Rooms.find((r) =>
            r.checkins?.some((c) => c.id === confirmCheckoutId),
        );
        // Buscamos el checkin específico dentro de esa habitación
        const checkin = room?.checkins?.find((c) => c.id === confirmCheckoutId);
        return { room, checkin };
    };

    const checkoutData = getCheckoutData();

    const allActiveCheckins = Rooms.flatMap((room) =>
        (room.checkins || []).map((checkin) => ({
            ...checkin,
            room: room,
            guest: checkin.guest || { full_name: 'Desconocido' }, // Aseguramos que guest exista
        })),
    );
    // Detalles de la tolerancia y funcion
    const handleOpenTransfer = (checkin: any) => {
        setCheckinForTransfer(checkin);
        setIsOccupiedModalOpen(false); // Cerramos el detalle
        setIsTransferModalOpen(true); // Abrimos la transferencia
    };

    // Filtramos las disponibles (para mover individual)
    const availableRoomsForTransfer = Rooms.filter((r) =>
        ['available', 'disponible', 'libre'].includes(getDisplayStatus(r)),
    );

    // Filtramos las ocupadas (para unirse a grupo)
    // resources/js/pages/rooms/status.tsx

    // 2. Habitaciones Ocupadas (Para unirse a grupo)
    const occupiedRoomsForTransfer = Rooms.filter((r) => {
        // A. Filtro básico: Debe estar ocupada
        if (!['occupied', 'ocupada', 'ocupado'].includes(getDisplayStatus(r)))
            return false;

        // B. Datos de capacidad
        const capacity = r.room_type?.capacity || 0;

        // C. Si es para 1 persona (Simple), la descartamos directo
        if (capacity <= 1) return false;

        // D. LÓGICA DE AFORO (Check-in Titular + Acompañantes)
        const activeCheckin = r.checkins?.[0];
        if (!activeCheckin) return false;

        // Calculamos ocupantes actuales: 1 (El Titular) + N (Sus Acompañantes)
        const currentOccupants = 1 + (activeCheckin.companions?.length || 0);

        // E. REGLA FINAL: Solo pasa si hay espacio (Ocupantes < Capacidad)
        return currentOccupants < capacity;
    });

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Estado de Habitaciones" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* HEADER Y FILTROS (Mismo código de antes) */}
                <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold text-white">
                                Habitaciones
                            </h2>
                            {/* Boton que se implementara a futuro
                            <button
                                onClick={handleTopCheckoutTrigger}
                                disabled={!selectedForAction}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold uppercase transition-all ${selectedForAction ? 'animate-bounce bg-red-600 text-white shadow-lg hover:scale-105 hover:bg-red-500' : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'}`}
                            >
                                <LogOut className="h-4 w-4" /> Finalizar Estadía
                                {selectedForAction && (
                                    <span className="ml-1 rounded-full bg-white px-1.5 text-xs text-red-600">
                                        !
                                    </span>
                                )}
                            </button>
                            */}
                        </div>
                    </div>

                    {/*Filtros por tipo de estados de la habitacion*/}
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex flex-row items-center justify-end gap-2">
                            {/* EL BOTÓN ANIMADO DE RESERVAS */}

                            <button
                                onClick={() => setIsReservationModalOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-extrabold whitespace-nowrap text-white uppercase shadow transition-colors hover:bg-emerald-500"
                            >
                                <Plus
                                    className="h-4 w-4 shrink-0"
                                    strokeWidth={3}
                                />
                                Nueva reserva
                            </button>

                            {/* BOTÓN DE RESERVAS PENDIENTES */}
                            {(() => {
                                // 1. Filtramos: Solo nos quedamos con reservas donde al menos un detalle NO tenga room_id
                                const pendingReservations = reservations?.filter((res: any) => 
                                    res.details?.some((d: any) => !d.room_id)
                                ) || [];

                                return (
                                    <button
                                        onClick={() => setIsPendingModalOpen(true)}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold uppercase transition-colors ${
                                            pendingReservations.length > 0
                                                ? 'bg-amber-500 text-black shadow-lg hover:bg-amber-400'
                                                : 'border border-gray-700 bg-gray-800 text-white hover:bg-gray-700'
                                        }`}
                                    >
                                        <CalendarClock className="h-4 w-4" /> 
                                        Reservas
                                        
                                        {/* 2. El globito solo mostrará la cantidad de reservas filtradas */}
                                        {pendingReservations.length > 0 && (
                                            <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">
                                                {pendingReservations.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })()}
                            {/* Selector de Tipo de Habitación */}
                            <div className="relative">
                                <select
                                    value={selectedRoomType}
                                    onChange={(e) =>
                                        setSelectedRoomType(e.target.value)
                                    }
                                    className="block min-w-[180px] cursor-pointer rounded-xl border-gray-700 bg-gray-800 py-2 pr-10 pl-3 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">Tipo de habitación</option>
                                    {RoomTypes?.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Selector de Bloques */}
                            <div className="relative">
                                <select
                                    value={selectedBlock}
                                    onChange={(e) =>
                                        setSelectedBlock(e.target.value)
                                    }
                                    className="block min-w-[180px] cursor-pointer rounded-xl border-gray-700 bg-gray-800 py-2 pr-10 pl-3 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">Todos los Bloques</option>
                                    {Blocks?.map((block) => (
                                        <option key={block.id} value={block.id}>
                                            {block.description}{' '}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Barra de Búsqueda */}
                            <div className="relative w-full max-w-xs">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="block w-full rounded-xl border-gray-700 bg-gray-800 py-2 pl-9 text-sm text-white placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="Buscar habitación..."
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                            <Badge
                                count={countBathroom('private')}
                                label="Baño Privado"
                                // Usamos color Teal para características
                                color="bg-emerald-600"
                                active={selectedBathroom === 'private'}
                                onClick={() =>
                                    setSelectedBathroom(
                                        selectedBathroom === 'private'
                                            ? ''
                                            : 'private',
                                    )
                                }
                            />
                            <Badge
                                count={countBathroom('shared')}
                                label="Baño Compartido"
                                color="bg-emerald-600"
                                active={selectedBathroom === 'shared'}
                                onClick={() =>
                                    setSelectedBathroom(
                                        selectedBathroom === 'shared'
                                            ? ''
                                            : 'shared',
                                    )
                                }
                            />

                            <Badge
                                count={countStatus('available')}
                                label="Libre"
                                color="bg-emerald-600"
                                onClick={() => setFilterStatus('available')}
                                active={filterStatus === 'available'}
                            />

                            {/* CAMBIO: De Rojo a Cian para coincidir con la tarjeta */}
                            <Badge
                                count={countStatus('occupied')}
                                label="Ocupadas"
                                color="bg-cyan-600"
                                onClick={() => setFilterStatus('occupied')}
                                active={filterStatus === 'occupied'}
                            />
                            <Badge
                                count={countStatus('reserved')}
                                label="Reservadas"
                                color="bg-purple-700 font-bold"
                                onClick={() => setFilterStatus('reserved')}
                                active={filterStatus === 'reserved'}
                            />

                            <Badge
                                count={countStatus('incomplete')}
                                label="Pendientes"
                                color="bg-amber-500 text-black"
                                onClick={() => setFilterStatus('incomplete')}
                                active={filterStatus === 'incomplete'}
                            />

                            {/* CAMBIO: De Azul a Gris para coincidir con la tarjeta */}
                            <Badge
                                count={countStatus('cleaning')}
                                label="Limpieza"
                                color="bg-gray-500"
                                onClick={() => setFilterStatus('cleaning')}
                                active={filterStatus === 'cleaning'}
                            />

                            {/* CAMBIO: De Gris a Rojo (Semántica de Alerta/Atención) */}
                            <Badge
                                count={countStatus('maintenance')}
                                label="Mant."
                                color="bg-red-600"
                                onClick={() => setFilterStatus('maintenance')}
                                active={filterStatus === 'maintenance'}
                            />

                            <Badge
                                count={Rooms.length}
                                label="Todas"
                                color="bg-slate-700"
                                onClick={() => setFilterStatus('all')}
                                active={filterStatus === 'all'}
                            />
                        </div>
                    </div>
                </div>

                {/* GRILLA DE HABITACIONES */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredRooms.map((room) => {
                        const config = getStatusConfig(room);
                        const displayStatus = getDisplayStatus(room);
                        const isActionable = displayStatus === 'incomplete';
                        const isOccupied = displayStatus === 'occupied';
                        const activeCheckin =
                            room.checkins && room.checkins.length > 0
                                ? room.checkins[0]
                                : null;
                        const isSelected = selectedForAction === room.id;

                        return (
                            <div
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                className={`relative flex h-36 flex-col justify-between overflow-hidden rounded-lg shadow-lg transition-all ${config.colorClass} ${isSelected ? 'z-10 scale-105 shadow-2xl ring-4 ring-white' : 'hover:scale-105 hover:shadow-xl'} `}
                            >
                                {isSelected && (
                                    <div className="absolute top-2 right-2 z-20 animate-in rounded-full bg-white p-1 text-red-600 zoom-in">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="absolute -top-2 -right-2 rotate-12 transform opacity-30">
                                    {config.icon}
                                </div>
                                <div className="relative z-10 p-4 text-white">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-2xl font-extrabold tracking-tight">
                                                {room.number}
                                            </h3>
                                            <p
                                                className="mt-1 line-clamp-2 text-xs font-bold text-white/90"
                                                title={String(config.info)}
                                            >
                                                {config.info}
                                            </p>
                                        </div>
                                        {/*
                                        {!isSelected && (
                                            <div className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
                                                <Bed className="h-5 w-5 text-white" />
                                            </div>
                                        )}
                                        */}
                                    </div>
                                </div>
                                {isActionable ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRoomClick(room);
                                        }}
                                        className="z-20 flex w-full items-center justify-center gap-2 border-t border-amber-600 bg-amber-700 py-2 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-amber-800"
                                    >
                                        <FileEdit className="h-3 w-3" />{' '}
                                        Completar Datos
                                    </button>
                                ) : isOccupied && activeCheckin ? (
                                    <div className="z-20 flex border-t border-cyan-700">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenDetails(room);
                                            }}
                                            title="Datos del usuario"
                                            className="flex flex-1 cursor-pointer items-center justify-center gap-1 border-r border-cyan-700 bg-cyan-600 py-2 text-[10px] font-bold text-white uppercase transition-colors hover:bg-cyan-500"
                                        >
                                            <UserIcon className="h-3 w-3" />{' '}
                                        </button>
                                        <button></button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleShowCheckinDetails(
                                                    activeCheckin,
                                                    room,
                                                );
                                            }}
                                            className="flex flex-1 items-center justify-center gap-1 border-r border-red-800 bg-blue-600 py-2 text-[10px] font-bold text-white uppercase transition-colors hover:bg-blue-700"
                                            title="Ver lista de consumos y detalles"
                                        >
                                            <ShoppingCart className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDirectCheckoutTrigger(
                                                    activeCheckin.id,
                                                );
                                            }}
                                            className="flex flex-1 items-center justify-center gap-1 bg-gray-900 py-2 text-[10px] font-bold text-white uppercase transition-colors hover:bg-black"
                                        >
                                            <LogOut className="h-3 w-3" />{' '}
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className={`flex items-center justify-between border-t ${config.borderColor} bg-black/10 px-4 py-2`}
                                    >
                                        <span className="flex items-center gap-1 text-xs font-bold tracking-wider text-white uppercase">
                                            {config.label}
                                        </span>
                                        <div
                                            className={`h-2.5 w-2.5 rounded-full bg-white shadow-sm ${config.label !== 'Disponible' ? 'animate-pulse' : ''}`}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <CheckinModal
                show={isCheckinModalOpen}
                isReceptionView={true}
                onClose={(isSuccess?: boolean) => {
                    setIsCheckinModalOpen(false);
                    setSelectedRoomId(null);
                    setCheckinToEdit(null);
                    setSelectedForAction(null);
                    if (!isSuccess) {
                        sessionStorage.removeItem('pendingCheckinsQueue');
                    }
                }}
                checkinToEdit={checkinToEdit}
                guests={Guests}
                rooms={Rooms}
                initialRoomId={selectedRoomId}
                schedules={Schedules}
                availableServices={services}
                isReadOnly={
                    !!checkinToEdit &&
                    checkinToEdit.guest?.profile_status === 'COMPLETE' &&
                    checkinToEdit.origin !== null &&
                    checkinToEdit.origin !== 'null' && // 🚀 Blindaje contra la palabra "null"
                    checkinToEdit.origin !== undefined &&
                    checkinToEdit.origin.trim() !== '' &&
                    !(
                        checkinToEdit.companions &&
                        checkinToEdit.companions.some(
                            (c: any) => c.profile_status === 'INCOMPLETE',
                        )
                    )
                }
            />

            <DetailModal
                show={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setCheckinForDetails(null);
                }}
                detailToEdit={null} // Es un consumo nuevo
                checkins={allActiveCheckins} // Lista para el dropdown
                services={services} // Lista de servicios (viene de tus props)
                initialCheckinId={checkinForDetails?.id} // El ID para preseleccionar la habitación
            />

            {/* MODAL DE CONFIRMACIÓN */}
            {confirmCheckoutId &&
                checkoutData &&
                checkoutData.checkin &&
                checkoutData.room && (
                    <CheckoutConfirmationModal
                        checkin={checkoutData.checkin}
                        room={checkoutData.room}
                        schedules={Schedules}
                        guests={Guests}
                        onClose={() => {
                            setConfirmCheckoutId(null);
                            setSelectedForAction(null);
                        }}
                    />
                )}

            {/* MODAL DE TRANSFERENCIA */}
            <TransferModal
                show={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                checkin={checkinForTransfer}
                availableRooms={availableRoomsForTransfer}
                occupiedRooms={occupiedRoomsForTransfer}
                blocks={Blocks}
                roomTypes={RoomTypes}
            />

            {/* --- AQUÍ ESTÁ TU BLOQUE EXACTO --- */}
            {confirmCheckoutId &&
                checkoutData &&
                checkoutData.checkin &&
                checkoutData.room && (
                    <CheckoutConfirmationModal
                        checkin={checkoutData.checkin}
                        room={checkoutData.room}
                        schedules={Schedules}
                        guests={Guests}
                        onClose={() => {
                            setConfirmCheckoutId(null);
                            setSelectedForAction(null);
                        }}
                    />
                )}

            {/* MODAL DE RESERVAS PENDIENTES*/}
            <PendingReservationsModal
                show={isPendingModalOpen}
                onClose={() => {
                    console.log('Cerrando desde el padre...');
                    setIsPendingModalOpen(false);
                }}
                reservations={reservations}
                rooms={Rooms}
                initialReservationId={preselectedReservationId}
                onNewReservation={() => {
                    setIsPendingModalOpen(false);
                    setIsReservationModalOpen(true);
                }}
            />
            {/* MODAL DE NUEVA RESERVA */}
            <ReservationModal
                show={isReservationModalOpen}
                onClose={() => setIsReservationModalOpen(false)}
                reservationToEdit={null} // Ponemos null porque será una reserva nueva
                guests={Guests as any} // Usamos "as any" para evitar errores de TypeScript
                rooms={Rooms as any}
            />
            <OccupiedRoomModal
                show={isOccupiedModalOpen}
                onClose={() => setIsOccupiedModalOpen(false)}
                checkin={occupiedCheckinData}
                services={services} // <--- ESTA ES LA CLAVE
                onTransfer={() => handleOpenTransfer(occupiedCheckinData)}
            />
        </AuthenticatedLayout>
    );
}

// --- COMPONENTE MODAL MODIFICADO ---
// Reemplaza toda la función CheckoutConfirmationModal con esto:
function CheckoutConfirmationModal({
    checkin,
    room,
    onClose,
    schedules,
    guests = [],
}: {
    checkin: any;
    room: any;
    onClose: () => void;
    schedules?: any[];
    guests?: any[];
}) {
    if (!checkin) return null;

    const [tolModal, setTolModal] = useState<{
        show: boolean;
        type: 'allowed' | 'denied';
        time: string;
        minutes: number;
    }>({ show: false, type: 'allowed', time: '', minutes: 0 });
    const [processing, setProcessing] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [waivePenalty, setWaivePenalty] = useState(false);
    const [tipoDocumento, setTipoDocumento] = useState<
        'factura' | 'recibo' | null
    >(null);
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr' | null>(
        null,
    );
    const [nombreFactura, setNombreFactura] = useState(
        checkin?.guest?.full_name || '',
    );
    const [nitFactura, setNitFactura] = useState(
        checkin?.guest?.identification_number || '',
    );
    const [isLinked, setIsLinked] = useState(!!checkin?.guest?.id);
    const [qrBank, setQrBank] = useState<string | null>(null);
    const [filteredGuests, setFilteredGuests] = useState<any[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // [DOC] Manejadores de formulario (handleNameChange, handleSelectGuest)
    // Formulario manejo sobre handleNameChange, hanleSelectGuest
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.toUpperCase();
        const shouldReset = isLinked || newValue === '';
        if (shouldReset) {
            setNitFactura('');
            setIsLinked(false);
        }
        setNombreFactura(newValue);
        if (newValue.length > 1) {
            const results = (guests || [])
                .filter((g) => {
                    const gName = g.full_name ? g.full_name.toUpperCase() : '';
                    const gCi = g.identification_number
                        ? g.identification_number.toString()
                        : '';
                    return gName.includes(newValue) || gCi.includes(newValue);
                })
                .slice(0, 5);
            setFilteredGuests(results);
            setIsDropdownOpen(true);
        } else {
            setFilteredGuests([]);
            setIsDropdownOpen(false);
        }
    };

    const handleSelectGuest = (guest: any) => {
        // 1. Llenamos los campos
        setNombreFactura(guest.full_name);
        setNitFactura(guest.identification_number || ''); // Si es null, ponemos vacío
        // 2. Establecemos el Vínculo (Candado lógico)
        setIsLinked(true);
        // 3. Cerramos buscador
        setIsDropdownOpen(false);
    };

    // Estado principal de datos visuales
    const [displayData, setDisplayData] = useState<{
        duration_days: number;
        accommodation_total: number;
        services_total: number;
        grand_total: number;
        balance: number;
        check_out_date: string;
        check_in_date: string;
        servicios: any[];
        guest: any;
        total_pagado?: number; // [DOC] Nueva propiedad para almacenar lo pagado realmente
    } | null>(null);

    // Logica de tolerancia (getExitToleranceStatus)
    const getExitToleranceStatus = () => {
        if (!checkin)
            return { isValid: false, message: 'No data', limitTime: '' };
        const safeSchedules = schedules || [];
        let schedule = safeSchedules.find(
            (s: any) => String(s.id) === String(checkin.schedule_id),
        );
        if (!schedule)
            schedule = safeSchedules.find(
                (s: any) => s.is_active === true || s.is_active === 1,
            );
        if (!schedule)
            return { isValid: false, message: 'Sin Horario', limitTime: '' };
        const now = new Date();
        const [hours, minutes] = schedule.check_out_time.split(':').map(Number);
        const exitDeadline = new Date();
        exitDeadline.setHours(hours, minutes, 0, 0);
        const toleranceLimit = new Date(
            exitDeadline.getTime() + schedule.exit_tolerance_minutes * 60000,
        );
        return {
            isValid: now <= toleranceLimit,
            limitTime: toleranceLimit.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
            }),
            officialTime: schedule.check_out_time.substring(0, 5),
        };
    };
    const exitToleranceStatus = getExitToleranceStatus();

    // ---           CALCULO DE SALDOS           ---
    useEffect(() => {
        setLoadingDetails(true);

        const fetchServices = axios
            .get('/guests/view-detail', {
                params: { guest_id: checkin.guest_id },
            })
            .then((res) =>
                res.data.status === 'success' ? res.data.data.servicios : [],
            )
            .catch(() => []);

        const fetchServerCalc = axios
            .get(`/checks/${checkin.id}/checkout-details`, {
                params: { waive_penalty: waivePenalty ? 1 : 0 },
            })
            .then((res) => res.data)
            .catch(() => null);

        Promise.all([fetchServices, fetchServerCalc])
            .then(([servicios, serverResponse]) => {
                // [DOC] Calcular total consumos
                const servicesTotal = servicios.reduce(
                    (acc: number, item: any) =>
                        acc + (parseFloat(item.subtotal) || 0),
                    0,
                );

                // [DOC] CALCULO ROBUSTO DE PAGOS: Sumamos todo el historial 'payments'
                let totalPagadoReal = 0;
                if (checkin.payments && checkin.payments.length > 0) {
                    totalPagadoReal = checkin.payments.reduce(
                        (acc: number, p: any) => {
                            const monto = parseFloat(p.amount) || 0;
                            return p.type === 'DEVOLUCION'
                                ? acc - monto
                                : acc + monto;
                        },
                        0,
                    );
                } else {
                    // [DOC] Fallback: Si no hay historial, usamos el adelanto inicial
                    totalPagadoReal = parseFloat(checkin.advance_payment || 0);
                }

                if (serverResponse) {
                    // [DOC] Opción A: Servidor. RECALCULAMOS EL BALANCE para asegurar que reste el totalPagadoReal
                    const serverGrandTotal =
                        parseFloat(serverResponse.grand_total) || 0;
                    const balanceCorregido = serverGrandTotal - totalPagadoReal;

                    setDisplayData({
                        ...serverResponse,
                        balance: balanceCorregido, // [DOC] Sobreescribimos con el saldo correcto
                        servicios: servicios,
                        services_total:
                            serverResponse.services_total ?? servicesTotal,
                        guest: checkin.guest,
                        total_pagado: totalPagadoReal, // [DOC] Guardamos para la vista
                    });
                } else {
                    // [DOC] Opción B: Local. Cálculo manual si falla el servidor
                    const ingreso = new Date(checkin.check_in_date);
                    let salida = new Date();
                    if (waivePenalty && exitToleranceStatus.officialTime) {
                        const [hours, minutes] =
                            exitToleranceStatus.officialTime
                                .split(':')
                                .map(Number);
                        salida.setHours(hours, minutes, 0, 0);
                    }
                    const diffTime = Math.abs(
                        salida.getTime() - ingreso.getTime(),
                    );
                    const diffDays =
                        Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                    const price = parseFloat(room.price?.amount || 0);
                    const accomTotal = diffDays * price;
                    const grandTotal = accomTotal + servicesTotal;

                    // [DOC] Resta final correcta
                    const balanceFinal = grandTotal - totalPagadoReal;

                    setDisplayData({
                        duration_days: diffDays,
                        accommodation_total: accomTotal,
                        services_total: servicesTotal,
                        grand_total: grandTotal,
                        balance: balanceFinal,
                        check_out_date: new Date().toISOString(),
                        check_in_date: checkin.check_in_date,
                        servicios: servicios,
                        guest: checkin.guest,
                        total_pagado: totalPagadoReal,
                    });
                }
            })
            .finally(() => setLoadingDetails(false));
    }, [checkin.id, waivePenalty, checkin.payments]); // [DOC] Importante: reaccionar a cambios en pagos

    // Limpieza PDF
    useEffect(() => {
        return () => {
            if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    // --- ACCIONES ---
    const handleConfirmAndPreview = async () => {
        if (!displayData) return;

        setProcessing(true);

        try {
            // 1. Guardamos la salida y los datos de facturación/pago
            await axios.put(`/checks/${checkin.id}/checkout`, {
                // Datos base
                check_out_date: displayData.check_out_date,
                waive_penalty: waivePenalty,
                tipo_documento: tipoDocumento,

                // 👇 NUEVOS DATOS: Facturación (solo si es factura)
                nombre_factura:
                    tipoDocumento === 'factura' ? nombreFactura : null,
                nit_factura: tipoDocumento === 'factura' ? nitFactura : null,

                // 👇 NUEVO DATO: Método de Pago
                metodo_pago: metodoPago,
                qr_bank: metodoPago === 'qr' ? qrBank : null,
            });

            // 2. Una vez guardado, pedimos el PDF correspondiente
            const endpoint =
                tipoDocumento === 'recibo'
                    ? `/checks/${checkin.id}/checkout-receipt`
                    : `/checks/${checkin.id}/checkout-invoice`;

            const response = await axios.get(endpoint, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' }),
            );

            setPdfUrl(url);
        } catch (error) {
            alert('Error al procesar la salida.');
        } finally {
            setProcessing(false);
        }
    };

    // Nueva función del botón (Reemplaza la anterior handleApplyTolerance)
    const handleApplyTolerance = () => {
        // CASO ROJO: Fuera de rango
        if (!exitToleranceStatus.isValid) {
            setTolModal({
                show: true,
                type: 'denied',
                time: exitToleranceStatus.limitTime, // Muestra la hora límite (ej. 13:40)
                minutes: 0, // No relevante para salida, pero necesario por TS
            });
            return;
        }

        // CASO VERDE: Dentro de rango
        setTolModal({
            show: true,
            type: 'allowed',
            time: exitToleranceStatus.limitTime,
            minutes: 0,
        });

        // Aplicar descuento
        setWaivePenalty(!waivePenalty);
    };
    // =========================================================================

    const handleCloseFinal = () => {
        onClose();
        if (pdfUrl) window.location.reload();
    };

    // Agrupación visual de servicios
    const serviceGrouped = displayData
        ? Object.values(
              displayData.servicios.reduce((acc: any, item: any) => {
                  const key = item.service;
                  if (!acc[key]) acc[key] = { ...item, count: 0, subtotal: 0 };
                  acc[key].count += parseInt(item.count || 0);
                  acc[key].subtotal += parseFloat(item.subtotal || 0);
                  return acc;
              }, {}),
          )
        : [];

    // --- RENDERIZADO ---
    return (
        <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200 fade-in">
            {/* 👇 ESTE ES EL DIV QUE CAMBIA SU TAMAÑO 👇 */}
            <div
                className={`flex w-full animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 zoom-in-95 ${
                    pdfUrl
                        ? 'h-[80vh] max-w-[470px]'
                        : tipoDocumento === 'factura'
                          ? 'max-h-[80vh] max-w-6xl'
                          : 'max-h-[85vh] max-w-sm'
                }`}
            >
                {/* HEADER */}
                <div
                    className={`flex flex-none items-center justify-between border-b px-4 py-2 ${pdfUrl ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}
                >
                    <h3
                        className={`flex items-center gap-2 text-lg font-bold ${pdfUrl ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                        {pdfUrl ? (
                            <>
                                <CheckCircle2 className="h-6 w-6" /> Salida
                                Exitosa
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-6 w-6" /> Finalizar
                                Estadía
                            </>
                        )}
                    </h3>
                    <button
                        onClick={handleCloseFinal}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* CONTENIDO (Con Scroll) */}
                <div className="flex-1 overflow-y-auto">
                    {!pdfUrl ? (
                        <div className="p-4">
                            {loadingDetails || !displayData ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                <div
                                    className={`flex flex-col gap-6 ${tipoDocumento === 'factura' ? 'md:flex-row' : ''}`}
                                >
                                    {/* --- COLUMNA 1: VISTA ORIGINAL --- */}
                                    <div
                                        className={`flex-1 transition-all duration-300 ${tipoDocumento === 'factura' ? 'mx-auto w-full max-w-sm' : ''}`}
                                    >
                                        <div
                                            className={`rounded-xl border p-4 text-sm shadow-inner transition-colors ${waivePenalty ? 'border-amber-200 bg-amber-50' : 'border-red-100 bg-red-50/50'}`}
                                        >
                                            <div className="mb-3 text-center">
                                                <span className="block text-[20px] font-bold text-red-600 uppercase">
                                                    Habitación {room.number}
                                                </span>
                                                {/* Se oculta el titular si es Factura */}
                                                {tipoDocumento !==
                                                    'factura' && (
                                                    <span className="mt-1 block animate-in text-[13px] font-bold text-black uppercase fade-in zoom-in">
                                                        {
                                                            displayData.guest
                                                                ?.full_name
                                                        }
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                <div className="col-span-2 grid grid-cols-[70px_1fr_50px_80px] items-center">
                                                    <span className="font-bold">
                                                        Ingreso:
                                                    </span>
                                                    <span>
                                                        {new Date(
                                                            displayData.check_in_date,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-right font-bold">
                                                        Hora:
                                                    </span>
                                                    <span className="text-right">
                                                        {new Date(
                                                            displayData.check_in_date,
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hourCycle:
                                                                    'h23',
                                                            },
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="col-span-2 grid grid-cols-[70px_1fr_50px_80px] items-center">
                                                    <span className="font-bold">
                                                        Salida:
                                                    </span>
                                                    <span>
                                                        {new Date(
                                                            displayData.check_out_date,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-right font-bold">
                                                        Hora:
                                                    </span>
                                                    <span className="text-right">
                                                        {new Date(
                                                            displayData.check_out_date,
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hourCycle:
                                                                    'h23',
                                                            },
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="col-span-2 my-1 border-t border-dashed border-gray-300"></div>

                                                <div>
                                                    <span className="font-bold">
                                                        Permanencia:
                                                    </span>{' '}
                                                    {displayData.duration_days}{' '}
                                                    días
                                                </div>
                                                <div></div>

                                                <div>
                                                    <span>Hospedaje:</span>
                                                </div>
                                                <div className="text-right">
                                                    {displayData.accommodation_total.toFixed(
                                                        2,
                                                    )}{' '}
                                                    Bs
                                                </div>

                                                {displayData.services_total >
                                                    0 && (
                                                    <>
                                                        <div>
                                                            <span>Extras:</span>
                                                        </div>
                                                        <div className="text-right">
                                                            {displayData.services_total.toFixed(
                                                                2,
                                                            )}{' '}
                                                            Bs
                                                        </div>
                                                    </>
                                                )}

                                                {/* CORRECCIÓN VISUAL: Usar el total_pagado calculado */}
                                                {/* Sección de Adelantos en el HTML */}
                                                {/* MOSTRAR EL TOTAL PAGADO REAL */}
                                                {(displayData as any)
                                                    ?.total_pagado > 0 && (
                                                    <>
                                                        <div className="font-bold text-green-600">
                                                            Adelanto / Pagado:
                                                        </div>
                                                        <div className="text-right font-bold text-green-600">
                                                            -
                                                            {(
                                                                (
                                                                    displayData as any
                                                                )
                                                                    ?.total_pagado ||
                                                                0
                                                            ).toFixed(2)}{' '}
                                                            Bs
                                                        </div>
                                                    </>
                                                )}

                                                <div className="col-span-2 mt-1 flex justify-between border-t border-gray-300 pt-1">
                                                    <span className="font-bold text-gray-700">
                                                        Total General:
                                                    </span>
                                                    <span className="font-bold text-gray-700">
                                                        {displayData.balance.toFixed(
                                                            2,
                                                        )}{' '}
                                                        Bs
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="border-t border-red-200/50 pt-2 text-xs text-gray-500 italic">
                                                Obs:{' '}
                                                {checkin.notes || 'Sin obs.'}
                                            </div>

                                            {serviceGrouped.length > 0 && (
                                                <div className="mt-2 border-t border-red-200/50 pt-2">
                                                    <span className="mb-1 block text-[10px] font-bold text-red-600 uppercase">
                                                        Consumos
                                                    </span>
                                                    <div className="flex max-h-24 flex-col gap-1 overflow-y-auto pr-1 text-xs text-gray-700">
                                                        {serviceGrouped.map(
                                                            (
                                                                item: any,
                                                                idx: number,
                                                            ) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex justify-between border-b border-gray-100 pb-1 last:border-0"
                                                                >
                                                                    <span className="font-medium text-gray-600">
                                                                        {
                                                                            item.count
                                                                        }{' '}
                                                                        x{' '}
                                                                        {
                                                                            item.service
                                                                        }
                                                                    </span>
                                                                    <span className="font-bold text-gray-900">
                                                                        {item.subtotal.toFixed(
                                                                            2,
                                                                        )}{' '}
                                                                        Bs
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {exitToleranceStatus.isValid &&
                                            displayData &&
                                            displayData.duration_days > 1 && (
                                                <div className="mt-4 flex animate-in justify-center duration-300 fade-in zoom-in">
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleApplyTolerance
                                                        }
                                                        className={`group flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase shadow-sm transition-all active:scale-95 ${waivePenalty ? 'border-emerald-600 bg-emerald-200 text-emerald-800 hover:bg-emerald-300' : 'animate-pulse border-emerald-500 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                                        title={
                                                            waivePenalty
                                                                ? 'La tolerancia ya ha sido aplicada.'
                                                                : `Clic para perdonar penalización (Válido hasta ${exitToleranceStatus.limitTime})`
                                                        }
                                                    >
                                                        {waivePenalty ? (
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <ArrowRightCircle className="h-3.5 w-3.5" />
                                                        )}
                                                        <span>
                                                            {waivePenalty
                                                                ? 'Tolerancia Aplicada'
                                                                : 'Aplicar Tolerancia'}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}

                                        {/* SECCIÓN 1: TIPO DE DOCUMENTO */}
                                        <div className="mt-4 text-center">
                                            <h4 className="mb-3 text-sm font-bold tracking-wide text-gray-800 uppercase">
                                                1. Tipo de Documento
                                            </h4>
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() =>
                                                        setTipoDocumento(
                                                            'recibo',
                                                        )
                                                    }
                                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${tipoDocumento === 'recibo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    <div
                                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${tipoDocumento === 'recibo' ? 'border-emerald-600' : 'border-gray-300'}`}
                                                    >
                                                        {tipoDocumento ===
                                                            'recibo' && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold uppercase">
                                                        Sin Factura
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setTipoDocumento(
                                                            'factura',
                                                        )
                                                    }
                                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${tipoDocumento === 'factura' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    <div
                                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${tipoDocumento === 'factura' ? 'border-blue-600' : 'border-gray-300'}`}
                                                    >
                                                        {tipoDocumento ===
                                                            'factura' && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold uppercase">
                                                        Con Factura
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* SECCIÓN 2: MÉTODO DE PAGO */}
                                        {tipoDocumento && (
                                            <div className="mt-5 animate-in text-center duration-300 fade-in slide-in-from-top-2">
                                                <h4 className="mb-3 text-sm font-bold tracking-wide text-gray-800 uppercase">
                                                    2. Método de Pago
                                                </h4>

                                                {/* BOTONES PRINCIPALES: EFECTIVO vs QR */}
                                                <div className="mb-3 flex justify-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setMetodoPago(
                                                                'efectivo',
                                                            );
                                                            setQrBank(null);
                                                        }}
                                                        className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 transition-all ${metodoPago === 'efectivo' ? 'border-green-600 bg-green-50 text-green-800 shadow-md ring-1 ring-green-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="text-[10px] font-bold uppercase">
                                                            Efectivo
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setMetodoPago('qr')
                                                        }
                                                        className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 transition-all ${metodoPago === 'qr' ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-md ring-1 ring-purple-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="text-[10px] font-bold uppercase">
                                                            QR Simple
                                                        </span>
                                                    </button>
                                                </div>

                                                {/* SUB-SECCIÓN: BANCOS QR (Solo visible si metodoPago === 'qr') */}
                                                <div
                                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${metodoPago === 'qr' ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}
                                                >
                                                    <label className="mb-2 block text-[10px] font-bold text-purple-600 uppercase">
                                                        Seleccione Banco (QR)
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-2 px-1">
                                                        {[
                                                            {
                                                                id: 'YAPE',
                                                                logo: '/images/bancos/yape.png',
                                                                ring: 'ring-purple-500',
                                                            },
                                                            {
                                                                id: 'FIE',
                                                                logo: '/images/bancos/fie.png',
                                                                ring: 'ring-orange-500',
                                                            },
                                                            {
                                                                id: 'BNB',
                                                                logo: '/images/bancos/bnb.png',
                                                                ring: 'ring-green-500',
                                                            },
                                                            {
                                                                id: 'ECO',
                                                                logo: '/images/bancos/eco.png',
                                                                ring: 'ring-blue-500',
                                                            },
                                                        ].map((banco) => {
                                                            const isSelected =
                                                                qrBank ===
                                                                banco.id;
                                                            return (
                                                                <button
                                                                    key={
                                                                        banco.id
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setQrBank(
                                                                            banco.id,
                                                                        )
                                                                    }
                                                                    className={`relative h-12 rounded-xl border transition-all duration-200 active:scale-95 ${
                                                                        isSelected
                                                                            ? `ring-2 ${banco.ring} scale-105 border-transparent shadow-md`
                                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    <img
                                                                        src={
                                                                            banco.logo
                                                                        }
                                                                        alt={
                                                                            banco.id
                                                                        }
                                                                        className={`absolute inset-0 h-full w-full object-contain p-1.5 transition-all ${
                                                                            isSelected
                                                                                ? ''
                                                                                : 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0'
                                                                        }`}
                                                                    />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <p className="mt-6 text-center text-[10px] text-gray-400 italic">
                                            Al confirmar, la habitación pasará a
                                            estado <strong>LIMPIEZA</strong>.
                                        </p>
                                    </div>

                                    {/* --- COLUMNA 2: VISTA DE FACTURACIÓN --- */}
                                    {/* --- COLUMNA 2: VISTA DE FACTURACIÓN (CORREGIDA) --- */}
                                    {tipoDocumento === 'factura' && (
                                        <div className="flex h-full flex-1 animate-in flex-col rounded-2xl border border-red-100 bg-red-50/30 p-6 shadow-sm duration-300 fade-in slide-in-from-right-4">
                                            {/* CABECERA: FECHA Y DATOS (Se mantiene igual) */}
                                            <div className="mb-5 border-b border-blue-200 pb-5">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-800 uppercase">
                                                        Fecha:{' '}
                                                        {new Date().toLocaleDateString(
                                                            'es-BO',
                                                        )}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <label className="text-xs font-bold whitespace-nowrap text-gray-500 uppercase">
                                                            NIT / CI
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={nitFactura}
                                                            onChange={(e) =>
                                                                setNitFactura(
                                                                    e.target.value.toUpperCase(),
                                                                )
                                                            }
                                                            className="w-48 rounded-xl border border-gray-400 px-2 py-2 text-sm text-black uppercase shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                            placeholder="0000000"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="smb-4 flex items-center gap-3">
                                                    <label className="mb-1.5 block text-xs font-bold text-gray-800 uppercase">
                                                        Señor(es)
                                                    </label>
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            className="w-full rounded-xl border border-gray-400 py-2 pl-10 text-sm text-black uppercase shadow-sm placeholder:text-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                                            placeholder="ESCRIBE PARA BUSCAR..."
                                                            value={
                                                                nombreFactura
                                                            }
                                                            onChange={
                                                                handleNameChange
                                                            }
                                                            onFocus={() => {
                                                                if (
                                                                    nombreFactura.length >
                                                                    1
                                                                )
                                                                    setIsDropdownOpen(
                                                                        true,
                                                                    );
                                                            }}
                                                            autoComplete="off"
                                                        />
                                                        {isDropdownOpen &&
                                                            filteredGuests.length >
                                                                0 && (
                                                                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                                    {filteredGuests.map(
                                                                        (g) => (
                                                                            <div
                                                                                key={
                                                                                    g.id
                                                                                }
                                                                                onClick={() =>
                                                                                    handleSelectGuest(
                                                                                        g,
                                                                                    )
                                                                                }
                                                                                className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-green-50"
                                                                            >
                                                                                <div className="font-bold text-gray-800">
                                                                                    {
                                                                                        g.full_name
                                                                                    }
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-bold text-gray-600">
                                                                                        CI:{' '}
                                                                                        {g.identification_number ||
                                                                                            'S/N'}
                                                                                    </span>
                                                                                    {g.nationality && (
                                                                                        <span className="text-gray-400">
                                                                                            •{' '}
                                                                                            {
                                                                                                g.nationality
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SECCIÓN DETALLES DE LA FACTURA */}
                                            <div className="flex-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                                <h4 className="mb-4 border-b border-gray-100 pb-2 text-xs font-bold tracking-wider text-red-600 uppercase">
                                                    Detalle de la Factura
                                                </h4>

                                                <div className="w-full text-sm">
                                                    <div className="mb-2 grid grid-cols-[1fr_110px_100px] border-b border-gray-100 pb-2 text-[10px] font-bold text-gray-500 uppercase">
                                                        <div className="text-left">
                                                            Descripción
                                                        </div>
                                                        <div className="text-right">
                                                            Precio Unitario
                                                        </div>
                                                        <div className="text-right">
                                                            Total
                                                        </div>
                                                    </div>

                                                    {/* 1. HABITACIÓN */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] border-b border-gray-50 py-1.5">
                                                        <div className="font-bold text-gray-800">
                                                            Habitación{' '}
                                                            {room.number}
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                        <div className="text-right font-bold text-gray-800">
                                                            {displayData.accommodation_total.toFixed(
                                                                2,
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 2. TARIFA */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] border-b border-gray-50 py-1.5">
                                                        <div className="pl-2 text-xs text-gray-600">
                                                            Tarifa
                                                        </div>
                                                        <div className="text-right text-xs font-medium text-gray-800">
                                                            {parseFloat(
                                                                room.price
                                                                    ?.amount ||
                                                                    0,
                                                            ).toFixed(2)}
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                    </div>

                                                    {/* 3. NÚMERO DE PERSONAS */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] border-b border-gray-50 py-1.5">
                                                        <div className="pl-2 text-xs text-gray-600">
                                                            Número de personas:{' '}
                                                            <span className="font-bold text-gray-800">
                                                                {1 +
                                                                    (checkin
                                                                        .companions
                                                                        ?.length ||
                                                                        0)}
                                                            </span>
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                    </div>

                                                    {/* 4. LLEGADA */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] border-b border-gray-50 py-1.5">
                                                        <div className="pl-2 text-xs text-gray-600">
                                                            Llegada:{' '}
                                                            <span className="font-bold text-gray-800">
                                                                {new Date(
                                                                    displayData.check_in_date,
                                                                ).toLocaleDateString(
                                                                    'es-BO',
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                    </div>

                                                    {/* 5. SALIDA */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] border-b border-gray-50 py-1.5">
                                                        <div className="pl-2 text-xs text-gray-600">
                                                            Salida:{' '}
                                                            <span className="font-bold text-gray-800">
                                                                {new Date(
                                                                    displayData.check_out_date,
                                                                ).toLocaleDateString(
                                                                    'es-BO',
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                    </div>

                                                    {/* 6. TOTAL DE DÍAS */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] border-b border-gray-50 py-1.5">
                                                        <div className="pl-2 text-xs text-gray-600">
                                                            Total de días:{' '}
                                                            <span className="font-bold text-gray-800">
                                                                {
                                                                    displayData.duration_days
                                                                }
                                                            </span>
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                    </div>

                                                    {/* 7. CONSUMO */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] border-b border-gray-50 py-1.5">
                                                        <div className="font-bold text-gray-800">
                                                            Consumo
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                        <div className="text-right font-bold text-gray-800">
                                                            {displayData.services_total.toFixed(
                                                                2,
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 8. OTROS */}
                                                    <div className="grid grid-cols-[1fr_110px_100px] py-1.5">
                                                        <div className="font-bold text-gray-800">
                                                            Otros
                                                        </div>
                                                        <div className="text-right text-gray-400">
                                                            -
                                                        </div>
                                                        <div className="text-right font-bold text-gray-800">
                                                            0.00
                                                        </div>
                                                    </div>

                                                    {/* [DOC] AQUÍ SE AGREGA LA FILA DEL ADELANTO EN VERDE */}
                                                    {(displayData as any)
                                                        ?.total_pagado > 0 && (
                                                        <div className="grid grid-cols-[1fr_110px_100px] border-t border-dashed border-gray-200 bg-green-50/50 py-1.5 font-bold text-green-600">
                                                            <div className="pl-2">
                                                                Adelantos/Pagos
                                                                previos
                                                            </div>
                                                            <div className="text-right">
                                                                -
                                                            </div>
                                                            <div className="text-right">
                                                                -
                                                                {(
                                                                    (
                                                                        displayData as any
                                                                    )
                                                                        ?.total_pagado ||
                                                                    0
                                                                ).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* [DOC] TOTAL FINAL CORREGIDO (BALANCE EN LUGAR DE GRAND_TOTAL) */}
                                            <div className="mt-5 flex items-center justify-between rounded-xl bg-red-500 p-5 text-white shadow-lg">
                                                <span className="text-sm font-bold tracking-wider uppercase">
                                                    Saldo Pendiente de Cobro
                                                </span>
                                                <span className="text-2xl font-black">
                                                    {displayData.balance.toFixed(
                                                        2,
                                                    )}{' '}
                                                    Bs
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-100">
                            <iframe
                                src={pdfUrl}
                                className="h-full w-full border-none"
                                title="Recibo PDF"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-none justify-end gap-3 border-t border-gray-100 bg-white px-4 py-2">
                    {!pdfUrl ? (
                        <>
                            <button
                                onClick={onClose}
                                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                                disabled={processing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmAndPreview}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                                disabled={
                                    processing ||
                                    !tipoDocumento ||
                                    !displayData ||
                                    !metodoPago ||
                                    (metodoPago === 'qr' && !qrBank)
                                }
                            >
                                {processing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Sí, Finalizar'
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleCloseFinal}
                            className="w-full rounded-xl bg-gray-900 px-6 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black md:w-auto"
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
            <ToleranceModal
                show={tolModal.show}
                onClose={() => setTolModal({ ...tolModal, show: false })}
                type={tolModal.type}
                data={{
                    time: tolModal.time,
                    minutes: tolModal.minutes,
                    action: 'exit', // Importante: 'exit' para mensaje de salida
                }}
            />
        </div>
    );
}

function Badge({ count, label, color, onClick, active }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex min-w-[90px] flex-col items-center justify-center rounded-xl border p-2 transition-all ${active ? `border-white/50 ${color} scale-105 shadow-md brightness-110` : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
        >
            <span className="text-xl font-bold text-white">{count}</span>
            <span
                className={`text-[10px] font-bold uppercase ${active ? 'text-white' : 'text-gray-400'}`}
            >
                {label}
            </span>
        </button>
    );
}
