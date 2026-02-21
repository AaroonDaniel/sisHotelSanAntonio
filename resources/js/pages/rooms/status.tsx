import ToleranceModal from '@/components/ToleranceModal';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios'; // Importante para la petición del PDF sin recarga
import {
    AlertTriangle,
    ArrowLeft,
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
    Search,
    ShoppingCart,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import DetailModal from '../checkindetails/detailModal';
import CheckinModal, {
    CheckinData,
    Guest as ModalGuest,
    Room as ModalRoom,
} from '../checkins/checkinModal';
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

    // Detalles para la tolerancia
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [checkinForTransfer, setCheckinForTransfer] = useState<any>(null);

    const { flash } = usePage<any>().props;
    useEffect(() => {
        if (flash.auto_open_checkins && Array.isArray(flash.auto_open_checkins) && flash.auto_open_checkins.length > 0) {
            sessionStorage.setItem('pendingCheckinsQueue', JSON.stringify(flash.auto_open_checkins));
        }
    }, [flash.auto_open_checkins]);


    useEffect(() => {
        const queueStr = sessionStorage.getItem('pendingCheckinsQueue');
        if (queueStr && !isCheckinModalOpen) {
            let queue: number[] = JSON.parse(queueStr);
            let openedModal = false;

            // 🚀 BUCLE: Avanza instantáneamente ignorando las habitaciones ya completadas
            while (queue.length > 0 && !openedModal) {
                const nextCheckinId = queue[0];
                
                const roomWithCheckin = Rooms.find(r => 
                    r.checkins && r.checkins.some(c => c.id === nextCheckinId)
                );
                
                if (roomWithCheckin) {
                    const checkin = roomWithCheckin.checkins!.find(c => c.id === nextCheckinId);
                    if (checkin) {
                        const isTitularIncomplete = checkin.guest?.profile_status === 'INCOMPLETE';
                        const isOriginMissing = !checkin.origin || checkin.origin.trim() === '';
                        
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
                sessionStorage.setItem('pendingCheckinsQueue', JSON.stringify(queue));
            } else {
                sessionStorage.removeItem('pendingCheckinsQueue');
            }
        }
    }, [Rooms, isCheckinModalOpen]);

    // --- LÓGICA DE ESTADO ---
    const getDisplayStatus = (room: Room) => {
        const dbStatus = room.status ? room.status.toLowerCase().trim() : '';

        if (['occupied', 'ocupado', 'ocupada'].includes(dbStatus)) {
            const activeCheckin =
                room.checkins && room.checkins.length > 0
                    ? room.checkins[0]
                    : null;

            // =========================================================
            // 🔍 CONSOLE.LOGS DE DEPURACIÓN PARA ENCONTRAR EL ERROR
            // =========================================================
            console.log(`\n================================`);
            console.log(`[DEBUG] Evaluando Habitación: ${room.number}`);
            console.log(`[DEBUG] Status en Base de Datos: ${dbStatus}`);
            console.log(`[DEBUG] Checkin Activo Encontrado:`, activeCheckin);

            if (activeCheckin) {
                const guest = activeCheckin.guest as Guest | undefined;
                const isTitularIncomplete = guest?.profile_status === 'INCOMPLETE';
                const companions = activeCheckin.companions as Guest[] | undefined;
                const isAnyCompanionIncomplete = companions?.some(
                    (c) => c.profile_status === 'INCOMPLETE',
                );

                const isOriginMissing = !activeCheckin.origin || activeCheckin.origin.trim() === '';

                console.log(`[DEBUG] -> ¿Titular Incompleto?: ${isTitularIncomplete} (Profile Status: ${guest?.profile_status})`);
                console.log(`[DEBUG] -> ¿Origin Faltante?: ${isOriginMissing} (Valor actual: "${activeCheckin.origin}")`);
                console.log(`[DEBUG] -> ¿Acompañante Incompleto?: ${isAnyCompanionIncomplete}`);

                if (isTitularIncomplete || isAnyCompanionIncomplete || isOriginMissing) {
                    console.log(`[DEBUG] 🎯 RESULTADO PARA HAB ${room.number} -> INCOMPLETE (Debería ser Ámbar)`);
                    return 'incomplete';
                }
            } else {
                console.log(`[DEBUG] ⚠️ ADVERTENCIA: La habitación está en OCUPADO en BD, pero NO TIENE array de 'checkins' asociado en la respuesta del servidor.`);
            }

            console.log(`[DEBUG] 🟢 RESULTADO PARA HAB ${room.number} -> OCCUPIED (Pasa directo a Cian)`);
            return 'occupied';
            // =========================================================
        }

        if (['reserved', 'reservado', 'reservada'].includes(dbStatus)) {
            return 'reserved';
        }
        if (['available', 'disponible', 'libre'].includes(dbStatus))
            return 'available';
        if (['cleaning', 'limpieza', 'sucio'].includes(dbStatus))
            return 'cleaning';
        if (['maintenance', 'mantenimiento', 'reparacion'].includes(dbStatus))
            return 'maintenance';
        return 'unknown';
    };

    const handleRoomClick = (room: Room) => {
        const status = getDisplayStatus(room);

        // --- NUEVO: Lógica para Ocupado (Vista de Resumen) ---
        if (status === 'occupied') {
            // Buscamos el checkin con todos sus detalles en la lista global
            const fullCheckinData = Checkins.find(
                (c) => c.room_id === room.id && c.status === 'activo',
            );

            if (fullCheckinData) {
                setOccupiedCheckinData({ ...fullCheckinData, room });
                setIsOccupiedModalOpen(true);
            } else {
                // Fallback si no está en la lista global
                const localCheckin = room.checkins?.[0];
                if (localCheckin) {
                    setOccupiedCheckinData({ ...localCheckin, room });
                    setIsOccupiedModalOpen(true);
                }
            }
            return;
        }

        // --- ESTRUCTURA ORIGINAL MANTENIDA ---
        setSelectedForAction(null);
        if (status === 'available') {
            setCheckinToEdit(null);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
        } else if (status === 'incomplete') {
            const activeCheckin =
                room.checkins && room.checkins.length > 0
                    ? room.checkins[0]
                    : null;
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
                    info: 'Habitacion Reservada',
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
                        <button
                            onClick={() => window.history.back()}
                            className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </button>
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
                    <div className="flex flex-col items-end gap-4">
                        <div className="flex flex-row items-center justify-end gap-2">
                            {/* EL BOTÓN ANIMADO DE RESERVAS */}

                            <button
                                onClick={() => setIsPendingModalOpen(true)}
                                className={`flex items-center gap-2 rounded-lg px-3 py-1 text-sm font-bold uppercase transition-all ${
                                    PendingReservationsModal.length > 0
                                        ? 'animate-bounce bg-gray-800 text-white shadow-lg hover:scale-105 hover:bg-gray-700'
                                        : 'border border-gray-700 bg-gray-800 text-white hover:bg-gray-500'
                                }`}
                            >
                                <CalendarClock className="h-4 w-4" /> Reservas
                                {PendingReservationsModal.length > 0 && (
                                    <span className="ml-1 rounded-full bg-white px-1.5 text-xs text-purple-600">
                                        {PendingReservationsModal.length}
                                    </span>
                                )}
                            </button>
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
                    !(checkinToEdit.companions && checkinToEdit.companions.some((c: any) => c.profile_status === 'INCOMPLETE'))
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
                        onClose={() => {
                            setConfirmCheckoutId(null);
                            setSelectedForAction(null);
                        }}
                    />
                )}

            {/* INTEGRACIÓN DEL NUEVO MODAL */}
            <OccupiedRoomModal
                show={isOccupiedModalOpen}
                onClose={() => setIsOccupiedModalOpen(false)}
                checkin={occupiedCheckinData}
                onTransfer={() => handleOpenTransfer(occupiedCheckinData)}
            />

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
                        onClose={() => {
                            setConfirmCheckoutId(null);
                            setSelectedForAction(null);
                        }}
                    />
                )}

            {/* MODAL DE RESERVAS PENDIENTES*/}
            <PendingReservationsModal
                show={isPendingModalOpen}
                onClose={() => setIsPendingModalOpen(false)}
                reservations={reservations} // <-- Pásale la variable en minúsculas
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
}: {
    checkin: any;
    room: any;
    onClose: () => void;
    schedules?: any[];
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

    // Estado unificado para los datos (del servidor o calculados localmente)
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
    } | null>(null);

    // --- EFECTO DE CARGA ROBUSTO (PLAN A + PLAN B) ---
    
    useEffect(() => {
        setLoadingDetails(true);

        // 1. Obtener servicios
        const fetchServices = axios
            .get('/guests/view-detail', {
                params: { guest_id: checkin.guest_id },
            })
            .then((res) =>
                res.data.status === 'success' ? res.data.data.servicios : [],
            )
            .catch(() => []);

        // 2. Obtener cálculo del servidor (Enviando si hay tolerancia o no)
        const fetchServerCalc = axios
            .get(`/checks/${checkin.id}/checkout-details`, {
                params: { waive_penalty: waivePenalty ? 1 : 0 }, // <--- IMPORTANTE: Le decimos al server si aplicamos tolerancia
            })
            .then((res) => res.data)
            .catch(() => null);

        Promise.all([fetchServices, fetchServerCalc])
            .then(([servicios, serverResponse]) => {
                // Suma total de servicios
                const servicesTotal = servicios.reduce(
                    (acc: number, item: any) =>
                        acc + (parseFloat(item.subtotal) || 0),
                    0,
                );

                if (serverResponse) {
                    // OPCIÓN A: El servidor respondió bien (Ideal)
                    setDisplayData({
                        ...serverResponse,
                        servicios: servicios,
                        services_total:
                            serverResponse.services_total ?? servicesTotal,
                        guest: checkin.guest,
                    });
                } else {
                    // OPCIÓN B: Cálculo Local (Si falla el servidor o es muy rápido)
                    // -------------------------------------------------------------
                    const ingreso = new Date(checkin.check_in_date);
                    let salida = new Date(); // Por defecto: AHORA MISMO

                    // --- MAGIA AQUÍ: SI HAY TOLERANCIA, MODIFICAMOS LA HORA ---
                    if (waivePenalty && exitToleranceStatus.officialTime) {
                        const [hours, minutes] =
                            exitToleranceStatus.officialTime
                                .split(':')
                                .map(Number);
                        salida.setHours(hours, minutes, 0, 0); // Ajustamos la salida a la hora oficial
                    }
                    // -----------------------------------------------------------

                    const diffTime = Math.abs(
                        salida.getTime() - ingreso.getTime(),
                    );
                    // Redondear hacia arriba para cobrar días completos
                    const diffDays =
                        Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

                    const price = parseFloat(room.price?.amount || 0);
                    const accomTotal = diffDays * price;
                    const grandTotal = accomTotal + servicesTotal;
                    const advance = parseFloat(checkin.advance_payment || 0);

                    setDisplayData({
                        duration_days: diffDays,
                        accommodation_total: accomTotal,
                        services_total: servicesTotal,
                        grand_total: grandTotal,
                        balance: grandTotal - advance,
                        check_out_date: new Date().toISOString(),
                        check_in_date: checkin.check_in_date,
                        servicios: servicios,
                        guest: checkin.guest,
                    });
                }
            })
            .finally(() => setLoadingDetails(false));
    }, [checkin.id, waivePenalty]); // <--- ¡ESTO ES LO QUE FALTABA! (Escuchar cambios en el botón)
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
            await axios.put(`/checks/${checkin.id}/checkout`, {
                tipo_documento: tipoDocumento,
                check_out_date: displayData.check_out_date,
                waive_penalty: waivePenalty,
            });

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
            console.error(error);
            alert('Error al procesar la salida.');
        } finally {
            setProcessing(false);
        }
    };

    const getExitToleranceStatus = () => {
        if (!checkin)
            return { isValid: false, message: 'No data', limitTime: '' };

        const safeSchedules = schedules || [];

        // 1. Intento A: Buscar el horario asignado al checkin
        let schedule = safeSchedules.find(
            (s: any) => String(s.id) === String(checkin.schedule_id),
        );

        // 2. Intento B (FALLBACK): Si no tiene (es antiguo), usar el ACTIVO
        if (!schedule) {
            schedule = safeSchedules.find(
                (s: any) => s.is_active === true || s.is_active === 1,
            );
        }

        // Si aún así no hay horario, fallamos
        if (!schedule) {
            return {
                isValid: false,
                message: 'Sin Horario',
                limitTime: '',
            };
        }

        const now = new Date(); // Hora actual

        // 3. Obtener hora de salida oficial
        const [hours, minutes] = schedule.check_out_time.split(':').map(Number);
        const exitDeadline = new Date();
        exitDeadline.setHours(hours, minutes, 0, 0);

        // 4. Calcular Límite Máximo (+ Minutos de tolerancia)
        const toleranceLimit = new Date(
            exitDeadline.getTime() + schedule.exit_tolerance_minutes * 60000,
        );

        // 5. Comparación: ¿Estamos dentro del tiempo extra permitido?
        // (now <= toleranceLimit)
        const isWithinTolerance = now <= toleranceLimit;

        return {
            isValid: isWithinTolerance,
            limitTime: toleranceLimit.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
            }),
            officialTime: schedule.check_out_time.substring(0, 5),
        };
    };
    const exitToleranceStatus = getExitToleranceStatus();

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
            <div
                className={`flex w-full animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 zoom-in-95 ${pdfUrl ? 'h-[80vh] max-w-[450px]' : 'max-h-[85vh] max-w-sm'}`}
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
                        <div className="p-3">
                            {loadingDetails || !displayData ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                <>
                                    <div
                                        className={`rounded-xl border p-4 text-sm shadow-inner transition-colors ${waivePenalty ? 'border-amber-200 bg-amber-50' : 'border-red-100 bg-red-50/50'}`}
                                    >
                                        <div className="mb-3 text-center">
                                            <span className="block text-[20px] font-bold text-red-600 uppercase">
                                                Habitación {room.number}
                                            </span>
                                            <span className="text-[13px] font-bold text-black uppercase">
                                                {displayData.guest?.full_name}
                                            </span>
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
                                                    ).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hourCycle: 'h23',
                                                    })}
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
                                                    ).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hourCycle: 'h23',
                                                    })}
                                                </span>
                                            </div>

                                            <div className="col-span-2 my-1 border-t border-dashed border-gray-300"></div>

                                            <div>
                                                <span className="font-bold">
                                                    Permanencia:
                                                </span>{' '}
                                                {displayData.duration_days} días
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

                                            {displayData.services_total > 0 && (
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

                                            {Number(checkin.advance_payment) >
                                                0 && (
                                                <>
                                                    <div className="font-bold text-green-600">
                                                        Adelanto:
                                                    </div>
                                                    <div className="text-right font-bold text-green-600">
                                                        -
                                                        {Number(
                                                            checkin.advance_payment,
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
                                            Obs: {checkin.notes || 'Sin obs.'}
                                        </div>

                                        {/* Lista servicios */}
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
                                                                    {item.count}{' '}
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

                                    {/* Botón Tolerancia Dinámico */}
                                    {/* Solo se muestra si es VÁLIDO (Tiempo) Y si la estadía es > 1 DÍA */}
                                    {/* Botón Tolerancia Dinámico */}
                                    {/* Solo se muestra si: 1. Tiempo es válido | 2. Datos existen | 3. Estancia > 1 noche */}
                                    {exitToleranceStatus.isValid &&
                                        displayData &&
                                        displayData.duration_days > 1 && (
                                            <div className="mt-4 flex animate-in justify-center duration-300 fade-in zoom-in">
                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleApplyTolerance
                                                    }
                                                    className={`group flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase shadow-sm transition-all active:scale-95 ${
                                                        waivePenalty
                                                            ? 'border-emerald-600 bg-emerald-200 text-emerald-800 hover:bg-emerald-300'
                                                            : 'animate-pulse border-emerald-500 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                    }`}
                                                    title={
                                                        waivePenalty
                                                            ? 'La tolerancia ya ha sido aplicada.'
                                                            : `Clic para perdonar penalización (Válido hasta ${exitToleranceStatus.limitTime})`
                                                    }
                                                >
                                                    {/* Iconos */}
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

                                    {/* Botones Selección */}
                                    <div className="mt-4 text-center">
                                        <h4 className="text-xl font-bold text-gray-800">
                                            ¿Confirmar salida?
                                        </h4>
                                        <div className="mt-4 flex justify-center gap-4">
                                            <button
                                                onClick={() =>
                                                    setTipoDocumento('recibo')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 transition-all ${tipoDocumento === 'recibo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
                                            >
                                                <div
                                                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${tipoDocumento === 'recibo' ? 'border-emerald-600' : 'border-gray-300'}`}
                                                >
                                                    {tipoDocumento ===
                                                        'recibo' && (
                                                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold uppercase">
                                                    Sin Factura
                                                </span>
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setTipoDocumento('factura')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 transition-all ${tipoDocumento === 'factura' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
                                            >
                                                <div
                                                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${tipoDocumento === 'factura' ? 'border-blue-600' : 'border-gray-300'}`}
                                                >
                                                    {tipoDocumento ===
                                                        'factura' && (
                                                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                                                    )}
                                                </div>
                                                <span className="text-sm font-bold uppercase">
                                                    Con Factura
                                                </span>
                                            </button>
                                        </div>
                                        <p className="mt-4 text-[11px] text-gray-400 italic">
                                            Pasará a <strong>LIMPIEZA</strong>.
                                        </p>
                                    </div>
                                </>
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
                                    processing || !tipoDocumento || !displayData
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
