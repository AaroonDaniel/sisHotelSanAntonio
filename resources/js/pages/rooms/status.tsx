import ActionModal from '@/components/actionModal';
import CleanConfirmModal from '@/components/cleanConfirmModal';
import FinishMaintenanceModal from '@/components/finishMaintenanceModal';
import ToleranceModal from '@/components/ToleranceModal';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRightCircle,
    Banknote,
    BedDouble,
    Brush,
    Calendar,
    CheckCircle2,
    Clock,
    Construction,
    FileEdit,
    FileText,
    History,
    Home,
    Loader2,
    LogOut,
    Presentation,
    Search,
    ShoppingCart,
    SplitSquareHorizontal,
    User,
    User as UserIcon,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import DetailModal from '../checkindetails/detailModal';
import CheckinModal, {
    CheckinData,
    Guest as ModalGuest,
    Room as ModalRoom,
} from '../checkins/checkinModal';
import EventCheckinModal from '../checkins/EventCheckinModal';
import MultiCheckoutModal from '../checkins/multiCheckoutModal';
import ReservationModal from '../reservations/reservationModal';
import EventOccupiedModal from './EventOccupiedModal';
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
    availableRooms: any[];
    occupiedRooms: any[];
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
    availableRooms,
    occupiedRooms,
}: Props) {
    // Reservas donde la fecha aun no llego
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Campo para el salon
    const [isEventCheckinModalOpen, setIsEventCheckinModalOpen] =
        useState(false);
    const [isEventOccupiedModalOpen, setIsEventOccupiedModalOpen] =
        useState(false);
    // Controlador Seleccion multiple
    const [isMultiCheckoutMode, setIsMultiCheckoutMode] = useState(false);
    // guarda los ids de las habitaciones que han sido seleccionadas
    const [selectedRoomsForCheckout, setSelectedRoomsForCheckout] = useState<
        number[]
    >([]);
    // Consola si el modal de facturacion Consolida esta abierto
    const [showMultiCheckoutModal, setShowMultiCheckoutModal] = useState(false);

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

    // Vista previa de reporte de cierre de caja
    const [quickPreviewUrl, setQuickPreviewUrl] = useState<string | null>(null);

    const handleOpenQuickPreview = () => {
        const today = new Date().toISOString().split('T')[0];
        const params = new URLSearchParams({
            start_date: today,
            end_date: today,
            user_id: auth.user.id.toString(),
            record_type: 'ambos',
        });
        setQuickPreviewUrl(
            `/reports/financial/pdf?${params.toString()}&t=${Date.now()}`,
        );
    };

    // Detalles de una nueva vista para los datos del usuario
    const [isOccupiedModalOpen, setIsOccupiedModalOpen] = useState(false);
    const [occupiedCheckinData, setOccupiedCheckinData] = useState<any>(null);

    // Cambio de estado para confirmar limpieza
    const [isCleanConfirmModalOpen, setIsCleanConfirmModalOpen] =
        useState(false);
    const [roomToClean, setRoomToClean] = useState<Room | null>(null);

    //cambio de estado para finalizar mantenimiento
    const [isFinishMaintenanceModalOpen, setIsFinishMaintenanceModalOpen] =
        useState(false);
    const [roomToFinishMaintenance, setRoomToFinishMaintenance] =
        useState<Room | null>(null);

    // Detslles de historial de adelantos y pagos realizados
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyCheckinData, setHistoryCheckinData] = useState<any>(null);

    const handleOpenHistory = (checkin: any, room: any) => {
        setHistoryCheckinData({ ...checkin, room: room });
        setIsHistoryModalOpen(true);
    };

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
                        const isSalon = room.room_type?.name
                            ?.toUpperCase()
                            .includes('SALON');
                        if (isSalon) return false; // NUNCA INCOMPLETOS

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
    // =========================================================
    // 1. LÓGICA DE ESTADO (Corregida para no afectar salones)
    // =========================================================
    const getDisplayStatus = (room: Room) => {
        const dbStatus = room.status ? room.status.toLowerCase().trim() : '';
        const activeCheckin =
            room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;

        const isSalon = room.room_type?.name?.toUpperCase().includes('SALON');

        // 🛑 1. EVALUAR CHECK-IN PRIMERO:
        if (activeCheckin) {
            // 🚀 PROTECCIÓN ABSOLUTA PARA SALONES: Nunca están incompletos
            if (isSalon) {
                return 'occupied';
            }

            const guest = activeCheckin.guest as Guest | undefined;
            const isTitularIncomplete = guest?.profile_status === 'INCOMPLETE';

            const companions = activeCheckin.companions as Guest[] | undefined;
            const isAnyCompanionIncomplete = companions?.some(
                (c) => c.profile_status === 'INCOMPLETE',
            );

            // Origin missing = Falta de datos
            const isOriginMissing =
                !activeCheckin.origin || activeCheckin.origin.trim() === '';

            // --- VERIFICAR CAPACIDAD O AUTO-AJUSTE ---
            const roomCapacity = room.room_type?.capacity || 1;
            const totalGuests = 1 + (companions?.length || 0);

            // Verificamos si el precio acordado es MENOR al precio original normal.
            const originalRoomPrice = room.price?.amount || 0;

            // ¿Se presionó el botón de reajuste en el backend?
            const isPriceAdjusted =
                originalRoomPrice > 0 &&
                activeCheckin.agreed_price < originalRoomPrice;

            // Faltan personas SOLO SI: hay camas vacías Y NO se ha reajustado el precio.
            const isCapacityMissing =
                totalGuests < roomCapacity && !isPriceAdjusted;

            // Si falta algún dato O faltan personas (sin ajuste), forzamos INCOMPLETO (Naranja)
            if (
                isTitularIncomplete ||
                isAnyCompanionIncomplete ||
                isOriginMissing ||
                isCapacityMissing
            ) {
                return 'incomplete';
            }

            // Si está completo o fue ajustado, es OCUPADO seguro (Rojo)
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
        const isSalon = room.room_type?.name?.toUpperCase().includes('SALON');

        console.log(
            `[Interacción] Clic en Habitación ${room.number}. Estado actual: ${status}`,
        );
        if (isMultiCheckoutMode) {
            if (status === 'occupied') {
                setSelectedRoomsForCheckout((prev) =>
                    prev.includes(room.id)
                        ? prev.filter((id) => id !== room.id)
                        : [...prev, room.id],
                );
            }
            return;
        }

        if (status === 'occupied') {
            const activeCheckin =
                Checkins?.find(
                    (c) => c.room_id === room.id && c.status === 'activo',
                ) || room.checkins?.[0];
            if (activeCheckin) {
                if (isSalon) {
                    setOccupiedCheckinData({ ...activeCheckin, room });
                    setIsEventOccupiedModalOpen(true);
                } else {
                    if (activeCheckin.is_temporary) {
                        setCheckinToEdit(activeCheckin);
                        setSelectedRoomId(room.id);
                        setIsCheckinModalOpen(true);
                    } else {
                        setOccupiedCheckinData({ ...activeCheckin, room });
                        setIsOccupiedModalOpen(true);
                    }
                }
            }
            return;
        }

        // 🚨 MAGIA: 'available' y 'reserved' ahora abren el check-in normal al tocar el fondo verde
        if (status === 'available' || status === 'reserved') {
            setCheckinToEdit(null);
            setSelectedRoomId(room.id);
            if (isSalon) setIsEventCheckinModalOpen(true);
            else setIsCheckinModalOpen(true);
            return;
        }

        if (status === 'incomplete') {
            const activeCheckin = room.checkins?.[0];

            console.log(`⚠️ Habitación ${room.number} está Incompleta.`);
            console.log('Datos del Check-in pendiente:', activeCheckin);
            if (activeCheckin) {
                setCheckinToEdit(activeCheckin);
                setSelectedRoomId(room.id);
                setIsCheckinModalOpen(true);
                console.log(
                    '-> Abriendo modal de Check-in para completar datos.',
                );
            }
            return;
        }

        if (status === 'cleaning') {
            setRoomToClean(room);
            setIsCleanConfirmModalOpen(true);
            return;
        }

        if (status === 'maintenance') {
            setRoomToFinishMaintenance(room);
            setIsFinishMaintenanceModalOpen(true);
            return;
        }
    };

    const handleTopCheckoutTrigger = () => {
        if (!isMultiCheckoutMode) {
            // 1. Activar el modo de selección múltiple
            setIsMultiCheckoutMode(true);
            setSelectedRoomsForCheckout([]); // Limpiamos por si había algo antes
            setSelectedForAction(null); // Limpiamos la selección individual anterior
        } else {
            // 2. Si ya estamos en modo selección y seleccionó al menos una
            if (selectedRoomsForCheckout.length > 0) {
                setShowMultiCheckoutModal(true); // Aquí abriremos el Modal en el Paso 4
                console.log(
                    'Habitaciones seleccionadas para cobrar:',
                    selectedRoomsForCheckout,
                );
            } else {
                // 3. Si presionó el botón pero no seleccionó nada, cancelamos el modo
                setIsMultiCheckoutMode(false);
            }
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
    const [selectedBathroom, setSelectedBathroom] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    const filteredRooms = Rooms.filter((room) => {
        const matchesSearch =
            room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (room.room_type?.name || '')
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
        const currentStatus = getDisplayStatus(room);
        const matchesStatus =
            filterStatus === 'all' || currentStatus === filterStatus;

        const matchesBathroom = selectedBathroom
            ? room.price?.bathroom_type === selectedBathroom
            : true;
        const matchesRoomType = selectedRoomType
            ? room.room_type?.id.toString() === selectedRoomType
            : true;

        let matchesDate = true;
        if (selectedDate) {
            const activeCheckin =
                room.checkins && room.checkins.length > 0
                    ? room.checkins[0]
                    : null;

            // Si está libre (sin checkin), la ocultamos
            if (!activeCheckin || !activeCheckin.check_in_date) {
                matchesDate = false;
            } else {
                // BD: "2026-03-08 15:30:00" -> Extraemos "2026-03-08" (Desde la posición 0 hasta la 10)
                const checkinDateOnly = String(
                    activeCheckin.check_in_date,
                ).substring(0, 10);

                // Input: "2026-03-08" -> Extraemos "2026-03-08"
                const selectedDateOnly = String(selectedDate).substring(0, 10);

                matchesDate = checkinDateOnly === selectedDateOnly;
            }
        }
        return (
            matchesSearch &&
            matchesStatus &&
            matchesBathroom &&
            matchesRoomType &&
            matchesDate
        );
    }).sort((a, b) => {
        return a.number.localeCompare(b.number, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
    });

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
        return 'Reserva no encontrada';
    };

    const getStatusConfig = (room: Room) => {
        const status = getDisplayStatus(room);

        // 🚀 Detectamos si esta "habitación" es un salón
        const isSalon = room.room_type?.name?.toUpperCase().includes('SALON');

        switch (status) {
            case 'available':
            case 'reserved': // 🚀 TRUCO: Tratamos "Reservado" exactamente igual que "Libre" físicamente
                return {
                    colorClass: isSalon
                        ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer'
                        : 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer',
                    borderColor: isSalon
                        ? 'border-indigo-700'
                        : 'border-emerald-700',
                    label:
                        status === 'reserved'
                            ? 'Libre (Con Reserva)'
                            : 'Disponible',
                    icon: isSalon ? (
                        <Presentation className="h-10 w-10 text-indigo-200/50" />
                    ) : (
                        <BedDouble className="h-10 w-10 text-emerald-200/50" />
                    ),
                    info: room.room_type?.name || 'Libre',
                    des: isSalon
                        ? 'Eventos / Reuniones'
                        : room.price?.bathroom_type === 'private' ||
                            room.price?.bathroom_type === 'privado'
                          ? 'Privado'
                          : room.price?.bathroom_type === 'shared' ||
                              room.price?.bathroom_type === 'compartido'
                            ? 'Compartido'
                            : 'Tipo de baño no definido',
                    actionLabel: 'Asignar',
                };

            case 'occupied':
                return {
                    colorClass: isSalon
                        ? 'bg-violet-700 hover:bg-violet-600 cursor-pointer'
                        : 'bg-cyan-600 hover:bg-cyan-500 cursor-pointer',
                    borderColor: isSalon
                        ? 'border-violet-800'
                        : 'border-cyan-700',
                    label: 'Ocupado',
                    icon: isSalon ? (
                        <Users className="h-10 w-10 text-violet-200/50" />
                    ) : (
                        <UserIcon className="h-10 w-10 text-cyan-200/50" />
                    ),
                    info: getOccupantName(room),
                    actionLabel: isSalon ? 'Ver / Finalizar' : 'Ver / Editar',
                };

            case 'incomplete':
                // 🚀 SI ES SALÓN: Forzamos a que se vea como OCUPADO
                if (isSalon) {
                    return {
                        colorClass:
                            'bg-violet-700 hover:bg-violet-600 cursor-pointer',
                        borderColor: 'border-violet-800',
                        label: 'Ocupado',
                        icon: (
                            <Users className="h-10 w-10 text-violet-200/50" />
                        ),
                        info: getOccupantName(room),
                        actionLabel: 'Ver / Finalizar',
                    };
                }
                // Si es habitación normal, sigue siendo naranja
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
                return {
                    colorClass: 'bg-gray-500 hover:bg-gray-400 cursor-pointer',
                    borderColor: 'border-gray-600',
                    label: 'Limpieza',
                    icon: <Brush className="h-10 w-10 text-gray-200/50" />,
                    info: 'Clic para Habilitar',
                    actionLabel: 'Habilitar',
                };

            case 'maintenance':
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

            // NOTA: Eliminamos completamente el "case 'reserved':" antiguo porque
            // ahora lo manejamos arriba junto con 'available'.

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
    // ==========================================
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Estado de Habitaciones" />

            <div className="mx-auto max-w-7xl px-4 py-1 sm:px-6 lg:px-8">
                {/* HEADER Y FILTROS */}
                <div className="mb-8 flex w-full flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    {/* --- LADO IZQUIERDO: Título y Botones --- */}
                    <div className="shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold text-white">
                                Habitaciones
                            </h2>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleTopCheckoutTrigger}
                                    disabled={
                                        isMultiCheckoutMode &&
                                        selectedRoomsForCheckout.length === 0
                                    }
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold uppercase transition-all ${
                                        isMultiCheckoutMode
                                            ? selectedRoomsForCheckout.length >
                                              0
                                                ? 'animate-bounce bg-green-600 text-white shadow-lg hover:scale-105 hover:bg-green-500'
                                                : 'animate-pulse bg-yellow-500 text-white'
                                            : 'bg-red-600 text-white shadow-lg hover:scale-105 hover:bg-red-500'
                                    }`}
                                >
                                    <LogOut className="h-4 w-4" />
                                    {isMultiCheckoutMode
                                        ? selectedRoomsForCheckout.length > 0
                                            ? `Cobrar ${selectedRoomsForCheckout.length} Hab.`
                                            : 'Seleccione Habitaciones...'
                                        : 'Finalizar Estadía'}

                                    {!isMultiCheckoutMode &&
                                        selectedForAction && (
                                            <span className="ml-1 rounded-full bg-white px-1.5 text-xs text-red-600">
                                                !
                                            </span>
                                        )}
                                </button>

                                {isMultiCheckoutMode && (
                                    <button
                                        onClick={() => {
                                            setIsMultiCheckoutMode(false);
                                            setSelectedRoomsForCheckout([]);
                                        }}
                                        className="flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-4.5 text-sm font-bold text-white uppercase shadow-lg transition-all hover:scale-105 hover:bg-gray-500"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- LADO DERECHO: Filtros --- */}
                    <div className="flex w-full min-w-0 flex-1 flex-col items-end gap-3">
                        {/* PRIMERA FILA: Controles de Filtros */}
                        {/* Eliminamos 'justify-end' para evitar el corte izquierdo, usamos 'xl:ml-auto' en el primer botón */}
                        <div className="flex w-full flex-nowrap items-center justify-start gap-2 overflow-x-auto pb-2">
                            {(auth as any).active_register && (
                                <button
                                    onClick={handleOpenQuickPreview}
                                    // MAGIA AQUÍ: w-auto y xl:ml-auto empujan toda la fila a la derecha sin cortarla
                                    className="flex w-auto shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/20 px-4 py-2.5 text-sm font-bold whitespace-nowrap text-blue-200 shadow-sm transition-all hover:bg-blue-500/40 hover:text-white active:scale-95 xl:ml-auto"
                                    title="Ver resumen visual del dinero cobrado"
                                >
                                    <FileText className="h-5 w-5" />
                                    Vista Previa
                                </button>
                            )}

                            {/* Selector de Tipo de Habitación (Reducido a w-32) */}
                            <div
                                className={`relative shrink-0 ${(auth as any).active_register ? '' : 'xl:ml-auto'}`}
                            >
                                <select
                                    value={selectedRoomType}
                                    onChange={(e) =>
                                        setSelectedRoomType(e.target.value)
                                    }
                                    className="block w-32 cursor-pointer rounded-xl border-gray-700 bg-gray-800 py-2 pr-8 pl-3 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">TODOS</option>
                                    {RoomTypes?.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selector de Tipo de Baño (Reducido a w-36) */}
                            <div className="relative shrink-0">
                                <select
                                    value={selectedBathroom}
                                    onChange={(e) =>
                                        setSelectedBathroom(e.target.value)
                                    }
                                    className="block w-36 cursor-pointer rounded-xl border-gray-700 bg-gray-800 py-2 pr-8 pl-3 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">TIPO BAÑO</option>
                                    <option value="private">PRIVADO</option>
                                    <option value="shared">COMPARTIDO</option>
                                </select>
                            </div>

                            {/* Barra de Búsqueda (Flexible) */}
                            <div className="relative max-w-[350px] min-w-[150px] flex-1">
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
                                    placeholder="BUSCAR..."
                                />
                            </div>

                            {/* Campo de Fecha (Ajustado) */}
                            <div className="relative flex shrink-0 items-center gap-2">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) =>
                                        setSelectedDate(e.target.value)
                                    }
                                    className="block w-36 cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-white shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    style={{ colorScheme: 'dark' }}
                                    title="Filtrar por fecha exacta de ingreso"
                                />

                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate('')}
                                        className="flex shrink-0 items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold whitespace-nowrap text-white uppercase shadow-md transition-colors hover:bg-red-500 active:scale-95"
                                        title="Borrar filtro de fecha"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SEGUNDA FILA: Badges de Estado */}
                        <div className="flex w-full flex-wrap justify-end gap-2">
                            <Badge
                                count={countStatus('available')}
                                label="Libre"
                                color="bg-emerald-600"
                                onClick={() => setFilterStatus('available')}
                                active={filterStatus === 'available'}
                            />
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
                            <Badge
                                count={countStatus('cleaning')}
                                label="Limpieza"
                                color="bg-gray-500"
                                onClick={() => setFilterStatus('cleaning')}
                                active={filterStatus === 'cleaning'}
                            />
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
                        const isMultiSelected =
                            selectedRoomsForCheckout.includes(room.id);
                        const isEligibleForMulti =
                            isMultiCheckoutMode && isOccupied;

                        // 🌟 SEMÁFORO FINANCIERO (CORPORATIVO / DELEGACIÓN) 🌟

                        // 1. Leemos el convenio desde la relación (usamos "as any" para que TypeScript no moleste)
                        const convenio = (activeCheckin as any)
                            ?.special_agreement;

                        // 2. Verificamos el tipo directamente en el convenio
                        const isSpecialGroup =
                            convenio?.type === 'corporativo' ||
                            convenio?.type === 'delegacion';

                        // 🚀 ESTA ES LA PRUEBA EN CONSOLA (Para ver si Laravel manda el convenio)
                        /*if (activeCheckin) {
                            console.log(
                                `[PRUEBA] Habitación ${room.number} | Grupo Especial: ${isSpecialGroup}`,
                            );
                            console.log(`➡️ Datos del Convenio:`, convenio);
                        }*/

                        let corpState: any = null;

                        // 👇 CAMBIO AQUÍ: Ahora solo evalúa si es ESTRICTAMENTE CORPORATIVO 👇
                        if (activeCheckin && isSpecialGroup) {
                            // 1. Sumamos todo lo que ha pagado (Adelantos + Pagos posteriores)
                            // 1. Sumamos todo lo que ha pagado (Adelantos + Pagos posteriores)
                            let totalPaid = 0;
                            if (
                                activeCheckin.payments &&
                                activeCheckin.payments.length > 0
                            ) {
                                // Si hay un historial en la tabla de pagos, nos fiamos 100% de eso
                                totalPaid = activeCheckin.payments.reduce(
                                    (acc: number, p: any) =>
                                        p.type === 'DEVOLUCION'
                                            ? acc - (parseFloat(p.amount) || 0)
                                            : acc + (parseFloat(p.amount) || 0),
                                    0,
                                );
                            } else {
                                // Si la tabla de pagos viene vacía, usamos el adelanto original
                                totalPaid =
                                    parseFloat(
                                        String(activeCheckin.advance_payment),
                                    ) || 0;
                            }

                            // 2. Precio acordado por noche (El backend ya lo sincroniza en el checkin)
                            const agreedPrice =
                                parseFloat(
                                    String(activeCheckin.agreed_price),
                                ) || 0;

                            // 3. ¿Para cuántos días le alcanza el dinero que dio?
                            const daysPaid =
                                agreedPrice > 0
                                    ? Math.floor(totalPaid / agreedPrice)
                                    : 0;

                            // 4. Calculamos la fecha límite estricta (Fecha de Check-in + Días Pagados)
                            const realDateString =
                                activeCheckin.actual_arrival_date ||
                                activeCheckin.check_in_date;
                            const limitDate = new Date(realDateString);
                            limitDate.setHours(0, 0, 0, 0);
                            limitDate.setDate(limitDate.getDate() + daysPaid);

                            // 5. Comparamos con HOY
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const daysRemaining = Math.ceil(
                                (limitDate.getTime() - today.getTime()) /
                                    (1000 * 60 * 60 * 24),
                            );

                            // 6. Colores del Semáforo
                            if (daysRemaining > 1) {
                                corpState = {
                                    badge: 'bg-emerald-500 text-white shadow-sm border border-emerald-600',
                                    text: `PAGADO: ${daysRemaining} días`,
                                };
                            } else if (daysRemaining === 1) {
                                corpState = {
                                    badge: 'bg-yellow-400 text-yellow-900 shadow-sm border border-yellow-500',
                                    text: `COBRAR MAÑANA`,
                                };
                            } else if (daysRemaining === 0) {
                                corpState = {
                                    badge: 'bg-orange-500 text-white animate-pulse shadow-md border border-orange-600',
                                    text: `COBRAR HOY`,
                                };
                            } else {
                                corpState = {
                                    badge: 'bg-red-600 text-white animate-bounce shadow-lg border-2 border-red-800 font-black tracking-widest',
                                    text: `MOROSO (${Math.abs(daysRemaining)}d)`,
                                };
                            }
                        }

                        // 🔍 LÓGICA DE RESERVAS ORDENADAS
                        let sortedReservations: any[] = [];
                        let firstRes: any = null;
                        let isToday = false;
                        if ((room as any).future_reservations?.length > 0) {
                            sortedReservations = [
                                ...(room as any).future_reservations,
                            ].sort(
                                (a: any, b: any) =>
                                    new Date(a.date + 'T00:00:00').getTime() -
                                    new Date(b.date + 'T00:00:00').getTime(),
                            );
                            firstRes = sortedReservations[0];
                            const t = new Date();
                            const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                            isToday = firstRes.date === todayStr;
                        }

                        return (
                            <div
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                // 🚨 Tarjeta SIN overflow-hidden para que el hover no se corte
                                className={`relative flex h-36 flex-col justify-between rounded-lg shadow-lg transition-all ${config.colorClass} ${isSelected ? 'z-10 scale-105 shadow-2xl ring-4 ring-white' : 'hover:scale-105 hover:shadow-xl'} ${isEligibleForMulti && !isMultiSelected ? 'z-10 animate-pulse ring-4 ring-red-500 ring-offset-2 ring-offset-gray-900' : ''} ${isMultiSelected ? 'z-20 scale-105 shadow-2xl ring-4 ring-green-500 brightness-110' : ''}`}
                            >
                                {/* 🚦 CONTROLES SUPERIOR DERECHA */}
                                <div className="absolute top-0 right-0 z-50 flex rounded-tr-lg rounded-bl-xl bg-white/90 shadow-md backdrop-blur-sm">
                                    {sortedReservations.length > 0 && (
                                        <div className="group relative flex">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log(
                                                        '=== EJECUTANDO ASIGNACIÓN ===',
                                                    );
                                                    console.log(
                                                        'Agarrando a:',
                                                        firstRes.guest,
                                                        'ID:',
                                                        firstRes.id,
                                                    );
                                                    if (isToday) {
                                                        setPreselectedReservationId(
                                                            firstRes.id,
                                                        );
                                                        setIsPendingModalOpen(
                                                            true,
                                                        );
                                                    } else {
                                                        setSelectedItem(
                                                            firstRes,
                                                        );
                                                        setIsActionModalOpen(
                                                            true,
                                                        );
                                                    }
                                                }}
                                                className={`flex w-9 cursor-pointer items-center justify-start overflow-hidden px-2.5 py-1.5 transition-all duration-300 ease-in-out group-hover:w-[150px] ${isToday ? 'bg-purple-600 text-white shadow-md hover:bg-purple-700' : 'bg-purple-200 text-purple-900 hover:bg-purple-300'} ${!activeCheckin && !corpState ? 'rounded-tr-lg rounded-bl-xl' : 'rounded-bl-xl border-r border-purple-300/50'}`}
                                            >
                                                <Calendar
                                                    className={`h-4 w-4 shrink-0 ${isToday ? 'animate-pulse text-white' : 'text-purple-800'}`}
                                                />
                                                <div className="ml-2 flex items-center whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                                    <span
                                                        className={`text-[10px] font-black tracking-tighter uppercase italic ${isToday ? 'text-white' : 'text-purple-900'}`}
                                                    >
                                                        {isToday
                                                            ? '¡Asignar Hoy!'
                                                            : `Res. ${firstRes.date}`}
                                                    </span>
                                                </div>
                                            </button>

                                            {/* 📝 PANTALLITA FLOTANTE (Popover) */}
                                            <div className="pointer-events-none absolute top-full right-0 z-50 mt-1 hidden w-56 animate-in cursor-default rounded-xl border border-purple-200 bg-white p-3 text-left shadow-2xl zoom-in-95 fade-in group-hover:block">
                                                <p className="pointer-events-none mb-2 flex items-center justify-between border-b border-purple-100 pb-1 text-[10px] font-black text-purple-600 uppercase">
                                                    <span>
                                                        <Clock className="mr-1 inline h-3 w-3" />{' '}
                                                        Entradas
                                                    </span>
                                                    <span className="rounded-full bg-purple-100 px-1.5 text-purple-800">
                                                        {
                                                            sortedReservations.length
                                                        }
                                                    </span>
                                                </p>
                                                <div className="pointer-events-none max-h-32 space-y-2 overflow-y-auto">
                                                    {sortedReservations.map(
                                                        (
                                                            res: any,
                                                            idx: number,
                                                        ) => (
                                                            <div
                                                                key={idx}
                                                                className="flex flex-col border-l-2 border-purple-400 pl-2"
                                                            >
                                                                <span
                                                                    className={`text-[9px] font-bold ${idx === 0 && isToday ? 'animate-pulse text-red-500' : 'text-gray-500'}`}
                                                                >
                                                                    {res.date}
                                                                </span>
                                                                <span className="truncate text-[10px] leading-tight font-black text-gray-800 uppercase">
                                                                    {res.guest}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeCheckin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenHistory(
                                                    activeCheckin,
                                                    room,
                                                );
                                            }}
                                            className={`flex items-center justify-center bg-yellow-400 px-2.5 py-1.5 text-yellow-900 transition-colors hover:bg-yellow-300 ${!sortedReservations.length ? 'rounded-bl-xl' : ''} ${!corpState ? 'rounded-tr-lg' : 'border-r border-yellow-500/30'}`}
                                            title="Historial Financiero"
                                        >
                                            <History className="h-4 w-4 shadow-sm" />
                                        </button>
                                    )}

                                    {corpState && (
                                        <div
                                            className={`flex items-center rounded-tr-lg px-3 py-1.5 text-[10px] font-black tracking-wider uppercase ${!activeCheckin && !sortedReservations.length ? 'rounded-bl-xl' : ''} ${corpState.badge}`}
                                        >
                                            {corpState.text}
                                        </div>
                                    )}
                                </div>

                                {isSelected && (
                                    <div
                                        className={`absolute right-2 z-20 animate-in rounded-full bg-white p-1 text-red-600 zoom-in ${corpState ? 'top-8' : 'top-2'}`}
                                    >
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                )}
                                {isMultiSelected && (
                                    <div
                                        className={`absolute right-2 z-20 animate-in rounded-full bg-green-500 p-1 text-white shadow-lg zoom-in ${corpState ? 'top-8' : 'top-2'}`}
                                    >
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                )}

                                <div className="pointer-events-none absolute -top-2 -right-2 rotate-12 transform opacity-30">
                                    {config.icon}
                                </div>
                                <div className="pointer-events-none relative z-10 p-4 text-white">
                                    <h3 className="text-2xl font-extrabold tracking-tight">
                                        {room.number}
                                    </h3>
                                    <p className="mt-1 line-clamp-2 text-xs font-bold text-white/90">
                                        {config.info}
                                    </p>
                                    {config.des && (
                                        <div className="mt-2 flex w-full">
                                            <span
                                                className={`inline-block rounded px-3 py-0.5 text-[11px] font-bold uppercase shadow-sm backdrop-blur-md ${config.des === 'Privado' ? 'bg-sky-50/90 text-sky-700' : config.des === 'Compartido' ? 'bg-amber-50/90 text-amber-700' : 'bg-gray-50/90 text-gray-700'}`}
                                            >
                                                {config.des}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* BOTONES INFERIORES con rounded-b-lg para mantener la forma */}
                                {isActionable ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRoomClick(room);
                                        }}
                                        className="z-20 flex w-full items-center justify-center gap-2 rounded-b-lg border-t border-amber-600 bg-amber-700 py-2 text-xs font-bold text-white uppercase hover:bg-amber-800"
                                    >
                                        <FileEdit className="h-3 w-3" />{' '}
                                        Completar Datos
                                    </button>
                                ) : isOccupied && activeCheckin ? (
                                    <div className="z-20 flex overflow-hidden rounded-b-lg border-t border-cyan-700">
                                        {!room.room_type?.name
                                            ?.toUpperCase()
                                            .includes('SALON') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenDetails(room);
                                                }}
                                                className="flex flex-1 items-center justify-center border-r border-cyan-700 bg-cyan-600 py-2 text-white hover:bg-cyan-500"
                                            >
                                                <UserIcon className="h-3 w-3" />
                                            </button>
                                        )}
                                        {!room.room_type?.name
                                            ?.toUpperCase()
                                            .includes('SALON') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShowCheckinDetails(
                                                        activeCheckin,
                                                        room,
                                                    );
                                                }}
                                                className="flex flex-1 items-center justify-center border-r border-red-800 bg-blue-600 py-2 text-white hover:bg-blue-700"
                                            >
                                                <ShoppingCart className="h-3 w-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDirectCheckoutTrigger(
                                                    activeCheckin.id,
                                                );
                                            }}
                                            className="flex flex-1 items-center justify-center bg-gray-900 py-2 text-white hover:bg-black"
                                        >
                                            <LogOut className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className={`flex items-center justify-between border-t ${config.borderColor} rounded-b-lg bg-black/10 px-4 py-2`}
                                    >
                                        <span className="text-xs font-bold text-white uppercase">
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
                    ) &&
                    1 + (checkinToEdit.companions?.length || 0) >=
                        (Rooms.find((r) => r.id === checkinToEdit.room_id)
                            ?.room_type?.capacity || 1)
                }
            />

            <EventCheckinModal
                show={isEventCheckinModalOpen}
                onClose={(isSuccess) => {
                    setIsEventCheckinModalOpen(false);
                    setSelectedRoomId(null);
                    // Opcional: si quieres recargar los datos al guardar
                    if (isSuccess) {
                        router.reload({
                            only: ['Rooms', 'Checkins', 'Guests'],
                        });
                    }
                }}
                guests={Guests || []}
                rooms={Rooms || []}
                initialRoomId={selectedRoomId}
            />
            <EventOccupiedModal
                show={isEventOccupiedModalOpen}
                onClose={(reload) => {
                    setIsEventOccupiedModalOpen(false);
                    if (reload) {
                        router.reload({
                            only: ['Rooms', 'Checkins', 'Guests'],
                        });
                    }
                }}
                checkinData={occupiedCheckinData}
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
                occupiedRooms={occupiedRooms}
                blocks={Blocks}
                roomTypes={RoomTypes}
            />

            {/* MODAL DE ALERTA FALTA DE TODAVIA NO SE PUEDE ASIGNAR LA RESERVA*/}
            <ActionModal
                show={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                item={selectedItem}
            />

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
            <MultiCheckoutModal
                show={showMultiCheckoutModal}
                selectedRoomIds={selectedRoomsForCheckout}
                rooms={Rooms}
                guests={Guests}
                onClose={() => setShowMultiCheckoutModal(false)}
            />
            <FinancialHistoryModal
                show={isHistoryModalOpen}
                onClose={() => {
                    setIsHistoryModalOpen(false);
                    setHistoryCheckinData(null);
                }}
                checkin={historyCheckinData}
            />
            <CleanConfirmModal
                show={isCleanConfirmModalOpen}
                onClose={() => {
                    setIsCleanConfirmModalOpen(false);
                    setRoomToClean(null);
                }}
                room={roomToClean}
            />
            <FinishMaintenanceModal
                show={isFinishMaintenanceModalOpen}
                onClose={() => {
                    setIsFinishMaintenanceModalOpen(false);
                    setRoomToFinishMaintenance(null);
                }}
                room={roomToFinishMaintenance}
            />
            <EventCheckinModal
                show={isEventCheckinModalOpen}
                onClose={(isSuccess) => {
                    setIsEventCheckinModalOpen(false);
                    setSelectedRoomId(null);
                    setCheckinToEdit(null); // 🚀 Limpiamos la variable al cerrar
                    if (isSuccess) {
                        // reload de inertia si es necesario
                    }
                }}
                guests={Guests || []}
                rooms={Rooms || []}
                initialRoomId={selectedRoomId}
                checkinToEdit={checkinToEdit} // 🚀 AÑADIDO: Le mandamos los datos
            />
            <ActionModal
                show={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                item={selectedItem}
            />
            {quickPreviewUrl && (
                <div className="fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm fade-in">
                    <div className="flex h-[85vh] w-full max-w-4xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                Caja (Informativo)
                            </h3>
                            <button
                                onClick={() => setQuickPreviewUrl(null)}
                                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Visor PDF */}
                        <div className="flex-1 bg-gray-300/50 p-2">
                            <iframe
                                src={quickPreviewUrl}
                                className="h-full w-full rounded border border-gray-300 bg-white shadow-inner"
                                title="Vista Previa PDF"
                            />
                        </div>

                        {/* Footer de Acciones */}
                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                            <button
                                onClick={() => setQuickPreviewUrl(null)}
                                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

// --- COMPONENTE MODAL MODIFICADO ---

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

    // =========================================================================
    // 🚀 NUEVOS ESTADOS DE PAGO (ACTUALIZADOS PARA SOPORTAR 'ambos')
    // =========================================================================
    const [metodoPago, setMetodoPago] = useState<string | null>(null); // Antes era 'efectivo' | 'qr' | null
    const [qrBank, setQrBank] = useState<string | null>(null);
    const [bancoMixto, setBancoMixto] = useState<string | null>(null);
    const [montoEfectivo, setMontoEfectivo] = useState<string>('');
    const [montoQR, setMontoQR] = useState<string>('');

    const [rebaja, setRebaja] = useState('');
    const [mostrarDescuento, setMostrarDescuento] = useState<boolean>(false);
    const [rebajaConfirmada, setRebajaConfirmada] = useState<number | null>(
        null,
    );

    const handleConfirmarRebaja = () => {
        const val = parseFloat(rebaja);

        if (isNaN(val) || val < 0) {
            alert('Ingrese un monto valido');
            return;
        }
        if (displayData) {
            const limiteAdvertencia = displayData.accommodation_total * 0.3;
            if (val < limiteAdvertencia) {
                const confirmar = window.confirm(
                    `Atención: El monto es de (${val} Bs).\n\n¿Estás seguro de que quiere aplicar el descuento?`,
                );
                if (!confirmar) return;
            }
        }
        setRebajaConfirmada(val);
    };

    const handleMontoEfectivoChange = (val: string) => {
        setMontoEfectivo(val); // Guardamos lo que el usuario teclea
        const efe = parseFloat(val) || 0; // Convertimos a número
        const qrCalculado = Math.max(0, saldoPagar - efe); // Calculamos el resto
        setMontoQR(qrCalculado.toFixed(2)); // Llenamos el QR automáticamente
    };

    const handleMontoQRChange = (val: string) => {
        setMontoQR(val); // Guardamos lo que el usuario teclea
        const qrVal = parseFloat(val) || 0; // Convertimos a número
        const efeCalculado = Math.max(0, saldoPagar - qrVal); // Calculamos el resto
        setMontoEfectivo(efeCalculado.toFixed(2)); // Llenamos el Efectivo automáticamente
    };
    // =========================================================================

    const [nombreFactura, setNombreFactura] = useState(
        checkin?.guest?.full_name || '',
    );
    const [nitFactura, setNitFactura] = useState(
        checkin?.guest?.identification_number || '',
    );
    const [isLinked, setIsLinked] = useState(!!checkin?.guest?.id);
    const [filteredGuests, setFilteredGuests] = useState<any[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
        total_pagado?: number;
        is_late?: boolean; // <-- Añadido por si usas la lógica del backend para ocultar botón
    } | null>(null);

    // =========================================================================
    // 🚀 CONSTANTES MATEMÁTICAS PARA EL PAGO MIXTO
    // (Deben ir DESPUÉS de declarar displayData para que puedan leer 'balance')
    // =========================================================================

    // 1. Creamos una variable 100% segura para los días
    const diasEstadia = displayData?.duration_days || 1;

    const hospedajeFinal =
        rebajaConfirmada !== null
            ? rebajaConfirmada
            : displayData?.accommodation_total || 0;

    // 2. Usamos la variable segura (sin signos de exclamación)
    const precioUnitarioFinal =
        diasEstadia > 0 ? hospedajeFinal / diasEstadia : 0;

    const consumoFinal = displayData?.services_total || 0;
    const adelantoFinal = (displayData as any)?.total_pagado || 0;

    const saldoPagar = Math.max(
        0,
        hospedajeFinal + consumoFinal - adelantoFinal,
    );

    const totalIngresado =
        (parseFloat(montoEfectivo) || 0) + (parseFloat(montoQR) || 0);
    const restanteMixto = Math.max(0, saldoPagar - totalIngresado);
    const estaCubierto = totalIngresado >= saldoPagar;
    // =========================================================================

    // [DOC] Manejadores de formulario (handleNameChange, handleSelectGuest)
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
        setNombreFactura(guest.full_name);
        setNitFactura(guest.identification_number || '');
        setIsLinked(true);
        setIsDropdownOpen(false);
    };

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

        if (rebaja && rebajaConfirmada === null) {
            alert(
                "Por favor, haz clic en el botón 'Confirmar' al lado de la rebaja antes de continuar.",
            );
            return;
        }

        if (rebaja && parseFloat(rebaja) > 0) {
            const limiteAdvertencia = displayData.accommodation_total * 0.3;
            if (parseFloat(rebaja) < limiteAdvertencia) {
                const confirmar = window.confirm(
                    `ATENCIÓN: ¿Esta seguro del monto de descuento?(${rebaja} Bs) Total es  ${displayData.accommodation_total.toFixed(2)} Bs).\n\n`,
                );
                if (!confirmar) return;
            }
        }
        setProcessing(true);

        try {
            // 1. Guardamos la salida y los datos de facturación/pago
            await axios.put(`/checks/${checkin.id}/checkout`, {
                // Datos base
                check_out_date: displayData.check_out_date,
                waive_penalty: waivePenalty,
                tipo_documento: tipoDocumento,

                //  NUEVOS DATOS: Facturación (solo si es factura)
                nombre_factura:
                    tipoDocumento === 'factura' ? nombreFactura : null,
                nit_factura: tipoDocumento === 'factura' ? nitFactura : null,

                //  NUEVO DATO: Método de Pago
                metodo_pago: metodoPago,
                banco_qr:
                    metodoPago === 'ambos'
                        ? bancoMixto
                        : metodoPago === 'qr'
                          ? qrBank
                          : null,
                monto_efectivo: parseFloat(montoEfectivo) || 0,
                monto_qr: parseFloat(montoQR) || 0,
                discount: rebajaConfirmada !== null ? rebajaConfirmada : null,
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
                          : 'max-h-[80vh] max-w-sm'
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
                                            className={`rounded-xl border p-4 text-base shadow-inner transition-colors ${waivePenalty ? 'border-amber-200 bg-amber-50' : 'border-red-100 bg-red-50/50'}`}
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

                                            <div className="mb-2 grid grid-cols-2 gap-2 text-sm text-gray-800">
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

                                                <div className="col-span-2 my-1 border-t border-dashed border-gray-700"></div>

                                                <div className="whitespace-nowrap">
                                                    <span className="font-bold">
                                                        Permanencia:
                                                    </span>{' '}
                                                    {displayData.duration_days}{' '}
                                                    noche(s)
                                                </div>
                                                <div></div>

                                                <div>
                                                    <span className="font-bold">
                                                        Hospedaje:
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    {rebajaConfirmada !==
                                                    null ? (
                                                        <span className="font-bold text-green-600">
                                                            {hospedajeFinal.toFixed(
                                                                2,
                                                            )}{' '}
                                                            Bs (Rebajado)
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            {hospedajeFinal.toFixed(
                                                                2,
                                                            )}{' '}
                                                            Bs
                                                        </span>
                                                    )}
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
                                                        {saldoPagar.toFixed(2)}{' '}
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
                                                        // Solo ejecuta la función si no se ha aplicado la tolerancia
                                                        onClick={
                                                            !waivePenalty
                                                                ? handleApplyTolerance
                                                                : undefined
                                                        }
                                                        // Deshabilitamos el botón nativamente en HTML
                                                        disabled={waivePenalty}
                                                        className={`group flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase shadow-sm transition-all active:scale-95 ${
                                                            waivePenalty
                                                                ? // Clases cuando YA SE APLICÓ (Desactivado/Gris)
                                                                  'cursor-not-allowed border-gray-400 bg-gray-200 text-gray-500 opacity-70'
                                                                : // Clases cuando está ACTIVO (Verde, pulsante, clickeable)
                                                                  'animate-pulse cursor-pointer border-green-500 bg-emerald-100 text-green-700 hover:bg-emerald-200'
                                                        }`}
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

                                        {/* BLOQUE REBAJA */}
                                        <div className="mt-4 flex w-full justify-end">
                                            {!mostrarDescuento ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setMostrarDescuento(
                                                            true,
                                                        )
                                                    }
                                                    className="text-bold text-sm font-bold text-red-600 transition-colors hover:text-red-500 hover:underline"
                                                >
                                                    + Aplicar descuento
                                                </button>
                                            ) : (
                                                <div className="relative w-full rounded-xl border border-red-200 bg-red-50/80 p-3 shadow-inner">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMostrarDescuento(
                                                                false,
                                                            );
                                                            setRebaja('');
                                                            setRebajaConfirmada(
                                                                null,
                                                            );
                                                        }}
                                                        className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-red-500 uppercase hover:text-red-600"
                                                    >
                                                        Cancelar x
                                                    </button>

                                                    <label className="mb-1 block text-[11px] font-bold tracking-wider text-red-600 uppercase">
                                                        Nuevo Total de Hospedaje
                                                        (Bs)
                                                    </label>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={rebaja}
                                                            onChange={(e) => {
                                                                setRebaja(
                                                                    e.target
                                                                        .value,
                                                                );
                                                                setRebajaConfirmada(
                                                                    null,
                                                                ); // Borra confirmación si vuelve a escribir
                                                            }}
                                                            disabled={
                                                                rebajaConfirmada !==
                                                                null
                                                            }
                                                            className="w-full [appearance:textfield] rounded-lg border-red-300 px-3 py-2 text-sm font-bold text-gray-800 shadow-sm focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                        />

                                                        {rebajaConfirmada ===
                                                        null ? (
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleConfirmarRebaja
                                                                }
                                                                disabled={
                                                                    !rebaja
                                                                }
                                                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                Confirmar
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setRebajaConfirmada(
                                                                        null,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-red-600"
                                                            >
                                                                Editar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

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
                                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${tipoDocumento === 'recibo' ? 'border-green-500 bg-emerald-50 text-green-500 shadow-sm ring-1 ring-green-500' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    <div
                                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${tipoDocumento === 'recibo' ? 'border-green-500' : 'border-gray-300'}`}
                                                    >
                                                        {tipoDocumento ===
                                                            'recibo' && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
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
                                                    className={`flex hidden flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${tipoDocumento === 'factura' ? 'border-green-600 bg-blue-50 text-green-700 shadow-sm ring-1 ring-green-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    <div
                                                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${tipoDocumento === 'factura' ? 'border-green-600' : 'border-gray-300'}`}
                                                    >
                                                        {tipoDocumento ===
                                                            'factura' && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
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
                                            <div className="mt-5 flex-1 animate-in text-center duration-300 fade-in slide-in-from-top-2">
                                                <h4 className="mb-3 flex items-center justify-center gap-1 text-sm font-bold tracking-widest text-gray-800 uppercase">
                                                    <Banknote className="h-4 w-4 text-gray-400" />{' '}
                                                    2. Tipo de Pago
                                                </h4>

                                                {/* CUADRÍCULA PRINCIPAL (TODO EN UNO) */}
                                                {metodoPago !== 'ambos' && (
                                                    <div className="mb-4 grid animate-in grid-cols-3 gap-2 zoom-in-95 fade-in">
                                                        {/* 1. EFECTIVO */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setMetodoPago(
                                                                    'efectivo',
                                                                )
                                                            }
                                                            className={`flex flex-col items-center justify-center rounded-xl border py-3 transition-all ${
                                                                metodoPago ===
                                                                'efectivo'
                                                                    ? 'border-green-500 bg-green-50 shadow-md ring-2 ring-green-500'
                                                                    : 'border-gray-300 bg-white hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <Banknote
                                                                className={`mb-1 h-6 w-6 ${metodoPago === 'efectivo' ? 'text-green-500' : 'text-gray-500'}`}
                                                            />
                                                            <span
                                                                className={`text-[10px] font-black uppercase ${metodoPago === 'efectivo' ? 'text-green-500' : 'text-gray-600'}`}
                                                            >
                                                                Efectivo
                                                            </span>
                                                        </button>

                                                        {/* 2 AL 5. BANCOS (QR DIRECTO) */}
                                                        {[
                                                            'YAPE',
                                                            'BNB',
                                                            'FIE',
                                                            'ECO',
                                                        ].map((banco) => {
                                                            const isSelected =
                                                                metodoPago ===
                                                                banco.toLowerCase();
                                                            return (
                                                                <button
                                                                    key={banco}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setMetodoPago(
                                                                            banco.toLowerCase(),
                                                                        )
                                                                    }
                                                                    className={`flex flex-col items-center justify-center rounded-xl border py-3 transition-all ${
                                                                        isSelected
                                                                            ? 'border-green-500 bg-purple-50 shadow-md ring-2 ring-green-500'
                                                                            : 'border-gray-300 bg-white hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    <img
                                                                        src={`/images/bancos/${banco.toLowerCase()}.png`}
                                                                        alt={
                                                                            banco
                                                                        }
                                                                        className={`mb-1 h-6 object-contain transition-all ${!isSelected && 'opacity-70 grayscale'}`}
                                                                    />
                                                                    <span
                                                                        className={`text-[11px] font-black uppercase ${isSelected ? 'text-green-800' : 'text-gray-600'}`}
                                                                    >
                                                                        {banco}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}

                                                        {/* 6. AMBOS (MIXTO) */}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setMetodoPago(
                                                                    'ambos',
                                                                )
                                                            }
                                                            className="flex flex-col items-center justify-center rounded-xl border border-gray-300 bg-white py-3 shadow-sm transition-all hover:bg-gray-100"
                                                        >
                                                            <SplitSquareHorizontal className="mb-1 h-6 w-6 text-gray-500" />
                                                            <span className="text-[10px] font-black text-gray-600 uppercase">
                                                                Ambos (Mixto)
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* MODO "AMBOS" (MIXTO) */}
                                                {metodoPago === 'ambos' && (
                                                    <div className="mt-2 animate-in rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm fade-in slide-in-from-right-4">
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setMetodoPago(
                                                                        null,
                                                                    )
                                                                }
                                                                className="mb-3 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-black text-gray-600 uppercase shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900"
                                                            >
                                                                <ArrowLeft className="h-3 w-3" />{' '}
                                                                Volver
                                                            </button>
                                                        </div>

                                                        <div
                                                            className={`mb-4 rounded-xl border-2 p-3 text-center transition-all duration-300 ${estaCubierto ? 'border-green-500 bg-green-50 text-green-800 shadow-inner' : 'border-red-300 bg-white text-gray-800 shadow-md'}`}
                                                        >
                                                            <span
                                                                className={`mb-1 block text-[10px] font-black tracking-widest uppercase ${estaCubierto ? 'text-green-700' : 'text-red-500'}`}
                                                            >
                                                                {estaCubierto
                                                                    ? '¡Monto Completado!'
                                                                    : 'Monto Restante por Cubrir'}
                                                            </span>
                                                            <div className="flex items-center justify-center gap-2">
                                                                {estaCubierto && (
                                                                    <CheckCircle2 className="h-6 w-6 animate-in text-green-600 zoom-in" />
                                                                )}
                                                                <span
                                                                    className={`text-2xl font-black ${estaCubierto ? 'text-green-700' : 'text-gray-900'}`}
                                                                >
                                                                    {restanteMixto.toFixed(
                                                                        2,
                                                                    )}{' '}
                                                                    Bs
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-4">
                                                            {/* INPUT EFECTIVO */}
                                                            <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm">
                                                                <label className="mb-2 flex items-center justify-center gap-1 text-[10px] font-black text-gray-500 uppercase">
                                                                    <Banknote className="h-4 w-4 text-gray-400" />{' '}
                                                                    Efectivo
                                                                    (Bs)
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="0.00"
                                                                    value={
                                                                        montoEfectivo
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleMontoEfectivoChange(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-full rounded-lg border-gray-400 text-center text-lg font-black text-gray-800 focus:border-green-500 focus:ring-green-500"
                                                                />
                                                            </div>
                                                            {/* INPUT QR */}
                                                            <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm">
                                                                <label className="mb-2 flex items-center justify-center gap-1 text-[10px] font-black text-gray-500 uppercase">
                                                                    <SplitSquareHorizontal className="h-4 w-4 text-gray-400" />{' '}
                                                                    Banco / QR
                                                                    (Bs)
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="0.00"
                                                                    value={
                                                                        montoQR
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        handleMontoQRChange(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="w-full rounded-lg border-gray-400 text-center text-lg font-black text-gray-800 focus:border-purple-500 focus:ring-purple-500"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* SELECCIÓN DE BANCO PARA EL QR MIXTO */}
                                                        <div className="pt-3">
                                                            <label className="mb-3 block text-center text-[10px] font-black text-gray-700 uppercase">
                                                                Seleccione el
                                                                Banco del QR:
                                                            </label>
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {[
                                                                    'YAPE',
                                                                    'BNB',
                                                                    'FIE',
                                                                    'ECO',
                                                                ].map(
                                                                    (banco) => (
                                                                        <button
                                                                            key={
                                                                                banco
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setBancoMixto(
                                                                                    banco.toLowerCase(),
                                                                                )
                                                                            }
                                                                            className={`flex flex-col items-center justify-center rounded-lg border-2 py-2 transition-all ${
                                                                                bancoMixto ===
                                                                                banco.toLowerCase()
                                                                                    ? 'scale-105 border-purple-500 bg-purple-50 shadow-md ring-1 ring-purple-500'
                                                                                    : 'border-gray-300 bg-white hover:bg-gray-100'
                                                                            }`}
                                                                        >
                                                                            <img
                                                                                src={`/images/bancos/${banco.toLowerCase()}.png`}
                                                                                alt={
                                                                                    banco
                                                                                }
                                                                                className={`h-6 object-contain transition-all ${bancoMixto !== banco.toLowerCase() && 'opacity-70 grayscale'}`}
                                                                            />
                                                                        </button>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                                                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                                                    <h4 className="text-xs font-bold tracking-wider text-red-600 uppercase">
                                                        Detalle de la Factura
                                                    </h4>
                                                    {loadingDetails && (
                                                        <span className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                                                            <Loader2 className="h-3 w-3 animate-spin" />{' '}
                                                            Extras...
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="w-full text-sm">
                                                    {/* CABECERA GRID */}
                                                    <div className="mb-2 grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-b border-gray-100 pb-2 text-[10px] font-bold text-gray-500 uppercase">
                                                        <div className="text-left">
                                                            Descripción
                                                        </div>
                                                        <div className="text-center">
                                                            Cant.
                                                        </div>
                                                        <div className="text-right">
                                                            P. Unitario
                                                        </div>
                                                        <div className="text-right">
                                                            Total
                                                        </div>
                                                        <div></div>
                                                    </div>

                                                    {/* DETALLE ÚNICO DE LA HABITACIÓN */}
                                                    <div className="mb-2 border-b border-gray-100 pb-2">
                                                        {/* 1. HABITACIÓN (Header Principal) */}
                                                        <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center rounded-lg bg-gray-50/50 px-2 py-1.5">
                                                            <div className="text-[13px] font-bold text-gray-800 uppercase">
                                                                Habitación{' '}
                                                                {room.number} -{' '}
                                                                {room.room_type
                                                                    ?.name ||
                                                                    'ESTÁNDAR'}{' '}
                                                                -{' '}
                                                                {room.price?.bathroom_type?.toLowerCase() ===
                                                                'shared'
                                                                    ? 'BAÑO COMPARTIDO'
                                                                    : 'BAÑO PRIVADO'}
                                                            </div>
                                                            <div className="text-center font-bold text-gray-400">
                                                                -
                                                            </div>
                                                            <div className="text-right font-bold text-gray-400">
                                                                -
                                                            </div>
                                                            <div className="text-right text-[13px] font-bold text-gray-800">
                                                                {displayData.balance.toFixed(
                                                                    2,
                                                                )}
                                                            </div>
                                                            <div></div>
                                                        </div>

                                                        {/* CONTENIDO DEL DETALLE */}
                                                        <div className="mt-1">
                                                            {/* 2. TARIFA */}
                                                            <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-start border-b border-gray-50 px-2 py-1.5">
                                                                <div className="pl-4">
                                                                    <div className="mb-1 text-[12px] font-bold text-gray-600">
                                                                        Tarifa
                                                                    </div>
                                                                    <div className="space-y-0.5 pl-2 text-[11px] text-gray-500">
                                                                        <div>
                                                                            Número
                                                                            de
                                                                            personas:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {1 +
                                                                                    (checkin
                                                                                        .companions
                                                                                        ?.length ||
                                                                                        0)}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            Ingreso:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {new Date(
                                                                                    displayData.check_in_date,
                                                                                ).toLocaleDateString(
                                                                                    'es-BO',
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            Salida:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {new Date(
                                                                                    displayData.check_out_date,
                                                                                ).toLocaleDateString(
                                                                                    'es-BO',
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            Total
                                                                            de
                                                                            días:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {
                                                                                    displayData.duration_days
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="pt-0.5 text-center text-xs font-medium text-gray-800">
                                                                    {
                                                                        displayData.duration_days
                                                                    }
                                                                </div>
                                                                <div className="pt-0.5 text-right text-xs font-medium text-gray-800">
                                                                    {precioUnitarioFinal.toFixed(
                                                                        2,
                                                                    )}
                                                                </div>
                                                                <div className="pt-0.5 text-right text-xs font-bold text-gray-800">
                                                                    {hospedajeFinal.toFixed(
                                                                        2,
                                                                    )}
                                                                </div>
                                                                <div></div>
                                                            </div>

                                                            {/* 3. CONSUMO */}
                                                            <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-b border-gray-50 px-2 py-1.5">
                                                                <div className="pl-4 text-[12px] font-bold text-gray-600">
                                                                    Consumo
                                                                </div>
                                                                <div className="text-center text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-xs font-bold text-gray-800">
                                                                    {displayData.services_total.toFixed(
                                                                        2,
                                                                    )}
                                                                </div>
                                                                <div></div>
                                                            </div>

                                                            {/* DETALLE CONSUMOS */}
                                                            {serviceGrouped.length >
                                                                0 && (
                                                                <div className="mb-1">
                                                                    {serviceGrouped.map(
                                                                        (
                                                                            srv: any,
                                                                            idx: number,
                                                                        ) => {
                                                                            const unitPrice =
                                                                                srv.count >
                                                                                0
                                                                                    ? (
                                                                                          srv.subtotal /
                                                                                          srv.count
                                                                                      ).toFixed(
                                                                                          2,
                                                                                      )
                                                                                    : '0.00';
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-b border-gray-50 px-2 py-1"
                                                                                >
                                                                                    <div className="pl-8 text-[11px] text-gray-600 uppercase">
                                                                                        {srv.service ||
                                                                                            srv.name ||
                                                                                            srv.description}
                                                                                    </div>
                                                                                    <div className="text-center text-[11px] font-medium text-gray-800">
                                                                                        {
                                                                                            srv.count
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-right text-[11px] font-medium text-gray-800">
                                                                                        {
                                                                                            unitPrice
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-right text-[11px] font-bold text-gray-800">
                                                                                        {srv.subtotal.toFixed(
                                                                                            2,
                                                                                        )}
                                                                                    </div>
                                                                                    <div></div>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* 4. OTROS */}
                                                            <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center px-2 py-1.5">
                                                                <div className="pl-4 text-[12px] font-bold text-gray-600">
                                                                    Otros
                                                                </div>
                                                                <div className="text-center text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-xs font-bold text-gray-800">
                                                                    0.00
                                                                </div>
                                                                <div></div>
                                                            </div>

                                                            {/* 5. ADELANTOS */}
                                                            {(
                                                                displayData as any
                                                            )?.total_pagado >
                                                                0 && (
                                                                <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-t border-dashed border-gray-200 bg-green-50/50 px-2 py-1.5 font-bold text-green-600">
                                                                    <div className="pl-4 text-[11px]">
                                                                        Adelantos/Pagos
                                                                        previos
                                                                    </div>
                                                                    <div className="text-center text-green-300">
                                                                        -
                                                                    </div>
                                                                    <div className="text-right text-green-300">
                                                                        -
                                                                    </div>
                                                                    <div className="text-right text-xs">
                                                                        -
                                                                        {(
                                                                            displayData as any
                                                                        )?.total_pagado.toFixed(
                                                                            2,
                                                                        )}
                                                                    </div>
                                                                    <div></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* [DOC] TOTAL FINAL CORREGIDO (BALANCE EN LUGAR DE GRAND_TOTAL) */}
                                            <div className="mt-5 flex items-center justify-between rounded-xl bg-red-500 p-5 text-white shadow-lg">
                                                <div className="text-write col-span-4 text-right text-sm font-bold uppercase">
                                                    Saldo Pendiente de Cobro
                                                </div>
                                                <div className="text-write text-right text-lg font-black">
                                                    {saldoPagar.toFixed(2)} Bs
                                                </div>
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
                                    (metodoPago === 'qr' && !qrBank) ||
                                    (metodoPago === 'ambos' &&
                                        (!bancoMixto || !estaCubierto))
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

function FinancialHistoryModal({
    show,
    onClose,
    checkin,
}: {
    show: boolean;
    onClose: () => void;
    checkin: any;
}) {
    if (!show || !checkin) return null;

    // 🛠️ Función mágica para reparar fechas de Laravel
    const parseLaravelDate = (dateString: string) => {
        if (!dateString) return new Date();
        return new Date(dateString.replace(' ', 'T'));
    };

    const room = checkin.room;
    const normalPrice = parseFloat(room?.price?.amount || 0);
    const agreedPrice = parseFloat(checkin.agreed_price || 0);
    const isCorporate =
        checkin.is_corporate && agreedPrice > 0 && agreedPrice < normalPrice;

    // Calcular el total de pagos reales
    const payments = checkin.payments || [];
    const totalPaid = payments.reduce((acc: number, p: any) => {
        const amount = parseFloat(p.amount) || 0;
        return p.type === 'DEVOLUCION' ? acc - amount : acc + amount;
    }, 0);

    // Lógica inteligente de Tarifas Corporativas
    let corporateMessage = null;
    if (isCorporate) {
        const frequency = parseInt(String(checkin.payment_frequency)) || 1;
        const daysPaid = Math.floor(totalPaid / agreedPrice);

        // 🚀 AQUÍ APLICAMOS LA FUNCIÓN REPARADORA
        const checkinDate = parseLaravelDate(checkin.check_in_date);
        checkinDate.setHours(0, 0, 0, 0);

        const limitDate = new Date(checkinDate);
        limitDate.setDate(limitDate.getDate() + daysPaid + frequency);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (today > limitDate) {
            corporateMessage = (
                <div className="mb-4 rounded-r-xl border-l-4 border-red-600 bg-red-50 p-4 shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-black tracking-wider text-red-800 uppercase">
                        <AlertTriangle className="h-5 w-5" /> Acuerdo Vencido
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-red-700">
                        El huésped cubrió la tarifa corporativa (
                        <b>Bs. {agreedPrice}</b>) hasta el{' '}
                        <b className="text-red-900">
                            {limitDate.toLocaleDateString()}
                        </b>
                        . A partir de esa fecha, el sistema aplicará la tarifa
                        normal de{' '}
                        <b className="border-b border-red-300 pb-0.5 text-red-900">
                            Bs. {normalPrice}
                        </b>{' '}
                        por cada día extra de mora.
                    </p>
                </div>
            );
        } else {
            corporateMessage = (
                <div className="mb-4 rounded-r-xl border-l-4 border-emerald-500 bg-emerald-50 p-4 shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-black tracking-wider text-emerald-800 uppercase">
                        <CheckCircle2 className="h-5 w-5" /> Acuerdo Activo
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-emerald-700">
                        El huésped está al día con sus pagos. La tarifa
                        corporativa de <b>Bs. {agreedPrice}</b> está asegurada
                        hasta el{' '}
                        <b className="text-emerald-900">
                            {limitDate.toLocaleDateString()}
                        </b>
                        .
                        <br />
                        <span className="mt-1 block text-xs opacity-70">
                            (Tarifa normal sin acuerdo: Bs. {normalPrice})
                        </span>
                    </p>
                </div>
            );
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-yellow-100 p-1.5 text-yellow-600 shadow-inner">
                            <History className="h-5 w-5" />
                        </div>
                        Historial Financiero
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
                    <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
                        <div>
                            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                                Titular de la Habitación
                            </p>
                            <p className="mt-0.5 text-base font-black text-gray-800">
                                {checkin.guest?.full_name || 'Desconocido'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                                Total Adelantos
                            </p>
                            <p className="mt-0.5 text-2xl font-black text-emerald-600">
                                Bs. {totalPaid.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {corporateMessage}

                    <h4 className="mb-3 flex items-center gap-2 text-sm font-black tracking-wider text-gray-700 uppercase">
                        <Banknote className="h-4 w-4 text-gray-400" /> Detalle
                        de Pagos
                    </h4>

                    {payments.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-200 bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-bold tracking-wider text-gray-600 uppercase">
                                            Fecha y Hora
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-bold tracking-wider text-gray-600 uppercase">
                                            Método
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-bold tracking-wider text-gray-600 uppercase">
                                            Monto
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {payments.map((p: any) => (
                                        <tr
                                            key={p.id}
                                            className="transition-colors hover:bg-gray-50"
                                        >
                                            {/* 🚀 AQUÍ TAMBIÉN APLICAMOS LA FUNCIÓN REPARADORA */}
                                            <td className="px-4 py-3 font-medium text-gray-600">
                                                {parseLaravelDate(
                                                    p.created_at,
                                                ).toLocaleString('es-BO', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true,
                                                })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`rounded-md px-2.5 py-1 text-[10px] font-black tracking-wider uppercase shadow-sm ${
                                                        p.method?.toLowerCase() ===
                                                        'qr'
                                                            ? 'border border-indigo-200 bg-indigo-100 text-indigo-700'
                                                            : p.method?.toLowerCase() ===
                                                                'efectivo'
                                                              ? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
                                                              : 'border border-gray-200 bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    {p.method || p.type}
                                                </span>
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right font-black ${p.type === 'DEVOLUCION' ? 'text-red-500' : 'text-gray-800'}`}
                                            >
                                                {p.type === 'DEVOLUCION'
                                                    ? '-'
                                                    : '+'}{' '}
                                                Bs.{' '}
                                                {parseFloat(p.amount).toFixed(
                                                    2,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                            <Banknote className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                            <p className="font-medium text-gray-500">
                                No hay pagos registrados aún.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 p-4">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100 active:scale-95"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
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
