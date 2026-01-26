import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios'; // Importante para la petición del PDF sin recarga
import {
    AlertTriangle,
    ArrowLeft,
    Bed,
    BedDouble,
    Brush,
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
import DetailModal from '../checkindetails/detailModal';
import CheckinModal, {
    CheckinData,
    Guest as ModalGuest,
    Room as ModalRoom,
} from '../checkins/checkinModal';

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
}

export default function RoomsStatus({
    auth,
    Rooms,
    Guests,
    services,
    Blocks,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

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

    // --- LÓGICA DE ESTADO ---
    const getDisplayStatus = (room: Room) => {
        const dbStatus = room.status ? room.status.toLowerCase().trim() : '';

        if (['occupied', 'ocupado', 'ocupada'].includes(dbStatus)) {
            const activeCheckin =
                room.checkins && room.checkins.length > 0
                    ? room.checkins[0]
                    : null;
            if (activeCheckin) {
                const guest = activeCheckin.guest as Guest | undefined;
                const isTitularIncomplete = guest?.profile_status === 'INCOMPLETE';
                const companions = activeCheckin.companions as Guest[] | undefined;
                const isAnyCompanionIncomplete = companions?.some(
                    (c) => c.profile_status === 'INCOMPLETE'
                )
                if (isTitularIncomplete || isAnyCompanionIncomplete) {
                    return 'incomplete';
                }
            }
            return 'occupied';
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
        if (status === 'occupied') {
            handleOpenDetails(room);
            return;
        }
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
        return (
            matchesSearch && matchesStatus && matchesBlock && matchesBathroom
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
                    text += " (Faltan Datos)";
                } 
                // 2. Agregar procedencia si existe
                else if (guest.origin) {
                    text += ` (${guest.origin})`;
                }

                // 3. --- AGREGAR ACOMPAÑANTES (NUEVO) ---
                // Verificamos si el array companions existe y tiene datos
                if (checkin.companions && checkin.companions.length > 0) {
                    // Mapeamos para obtener los nombres. 
                    // .split(' ')[0] toma solo el primer nombre para ahorrar espacio.
                    // Si prefieres el nombre completo, quita el .split
                    const companionNames = checkin.companions
                        .map(c => c.full_name.split(' ')[0]) 
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
            room: room, // <--- ESTO ES LO QUE FALTABA
            guest: checkin.guest || { full_name: 'Desconocido' }, // Aseguramos que guest exista
        })),
    );

    //Detalles de nota previa de asignacion

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
                                label="Libres"
                                color="bg-emerald-600"
                                onClick={() => setFilterStatus('available')}
                                active={filterStatus === 'available'}
                            />
                            <Badge
                                count={countStatus('occupied')}
                                label="Ocupadas"
                                color="bg-red-600"
                                onClick={() => setFilterStatus('occupied')}
                                active={filterStatus === 'occupied'}
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
                                color="bg-blue-500"
                                onClick={() => setFilterStatus('cleaning')}
                                active={filterStatus === 'cleaning'}
                            />
                            <Badge
                                count={countStatus('maintenance')}
                                label="Mant."
                                color="bg-gray-600"
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
                                            title='Datos del usuario'
                                            className="flex flex-1 items-center justify-center gap-1 border-r border-cyan-700 bg-cyan-600 py-2 text-[10px] font-bold text-white uppercase transition-colors hover:bg-cyan-500 cursor-pointer"
                                        >
                                            <UserIcon className="h-3 w-3" />{' '}
                                        </button>
                                        <button
                                        >

                                        </button>
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
                onClose={() => {
                    setIsCheckinModalOpen(false);
                    setSelectedRoomId(null);
                    setCheckinToEdit(null);
                    setSelectedForAction(null);
                }}
                checkinToEdit={checkinToEdit}
                guests={Guests}
                rooms={Rooms}
                initialRoomId={selectedRoomId}
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
                        onClose={() => {
                            setConfirmCheckoutId(null);
                            setSelectedForAction(null);
                        }}
                    />
                )}
        </AuthenticatedLayout>
    );
}

// --- COMPONENTE MODAL MODIFICADO ---
function CheckoutConfirmationModal({
    checkin,
    room,
    onClose,
}: {
    checkin: any;
    room: any;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const [extraDetails, setExtraDetails] = useState<{
        servicios: any[];
        total: number;
    }>({
        servicios: [],
        total: 0,
    });

    // CÁLCULOS
    const ingreso = new Date(checkin.check_in_date);
    const salida = new Date(); // Fecha actual
    const diffTime = Math.abs(salida.getTime() - ingreso.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diasCobrar = diffDays === 0 ? 1 : diffDays;

    const precioDia = parseFloat(room.price?.amount || 0);
    const totalHospedaje = diasCobrar * precioDia;
    const adelanto = parseFloat(checkin.advance_payment || 0);
    const totalServicio = extraDetails.total;
    const saldoEstimado = totalHospedaje + totalServicio - adelanto;

    // Limpieza de memoria
    // EFECTO 1: Cargar detalles del huésped
    useEffect(() => {
        // Validación de seguridad: Si no hay ID, no hacemos nada
        if (!checkin || !checkin.guest_id) return;
        //console.log("Consultando detalles para Guest ID:", checkin.guest_id);
        axios
            .get('/guests/view-detail', {
                params: { guest_id: checkin.guest_id },
            })
            .then((response) => {
                if (response.data.status === 'success') {
                    //console.log("Datos encontrados:", response.data.data);
                    setExtraDetails({
                        servicios: response.data.data.servicios,
                        total: response.data.data.total_adicional,
                    });
                }
            })
            .catch((error) => {
                console.error('Error cargando detalles:', error);
                // Opcional: Mostrar alerta si es un error diferente a 404
            });
    }, [checkin.guest_id]); // Solo se ejecuta si cambia el ID del huesped

    // EFECTO 2: Limpieza de memoria del PDF
    useEffect(() => {
        return () => {
            if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    const handleConfirmAndPreview = async () => {
        setProcessing(true);
        try {
            // 1. Usar ruta PUT correcta
            await axios.put(`/checks/${checkin.id}/checkout`);

            // 2. Obtener PDF
            const response = await axios.get(
                `/checks/${checkin.id}/checkout-receipt`,
                {
                    responseType: 'blob',
                },
            );

            const url = window.URL.createObjectURL(
                new Blob([response.data], { type: 'application/pdf' }),
            );
            setPdfUrl(url);
        } catch (error: any) {
            console.error('Error al finalizar:', error);
            if (error.response?.status === 405) {
                alert(
                    'Error 405: El servidor no permitió la solicitud. Asegúrese de haber actualizado CheckinController.php para retornar JSON.',
                );
            } else {
                alert('Hubo un error al procesar la salida.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleCloseFinal = () => {
        onClose();
        router.reload();
    };

    return (
        <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200 fade-in">
            {/* El tamaño cambia: pequeño al confirmar, grande al ver PDF */}
            <div
                className={`w-full animate-in overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 zoom-in-95 ${pdfUrl ? 'h-[80vh] max-w-[450px]' : 'max-w-md'}`}
            >
                {/* Header */}
                <div
                    className={`flex items-center justify-between border-b px-6 py-4 ${pdfUrl ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}
                >
                    <h3
                        className={`flex items-center gap-2 text-lg font-bold ${pdfUrl ? 'text-emerald-700' : 'text-red-700'}`}
                    >
                        {pdfUrl ? (
                            <>
                                <CheckCircle2 className="h-6 w-6" /> Estadía
                                Finalizada
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

                {/* Contenido */}
                <div
                    className={`flex flex-col ${pdfUrl ? 'h-[calc(100%-140px)]' : ''}`}
                >
                    {!pdfUrl ? (
                        // --- ESTADO 1: RESUMEN Y CONFIRMACIÓN ---
                        <div className="p-6">
                            {/* Detalle de Datos */}
                            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm shadow-inner">
                                <div className="mb-3 text-center">
                                    <div>
                                        <span className="block text-[20px] font-bold text-red-600 uppercase">
                                            Habitación {room.number}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <span className="block text-[10px] font-bold text-red-600 uppercase">
                                        Huésped
                                    </span>
                                    <span className="font-bold text-gray-800">
                                        {checkin.guest?.full_name}
                                    </span>
                                </div>

                                <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                                    {/* --- FILA 1: INGRESO --- */}
                                    <div>
                                        <span className="font-bold">
                                            Ingreso:
                                        </span>{' '}
                                        {ingreso.toLocaleDateString()}
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold">Hora:</span>{' '}
                                        {ingreso.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>

                                    {/* --- FILA 2: SALIDA --- */}
                                    <div>
                                        <span className="font-bold">
                                            Salida:
                                        </span>{' '}
                                        {salida.toLocaleDateString()}
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold">Hora:</span>{' '}
                                        {salida.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>

                                    {/* --- FILA 3: PERMANENCIA --- */}
                                    <div>
                                        <span className="font-bold">
                                            Permanencia (días):
                                        </span>{' '}
                                        {diasCobrar}
                                    </div>
                                    <div>
                                        {/* Espacio vacío para llenar la columna derecha de esta fila */}
                                    </div>

                                    {/* --- SEPARADOR (Ocupa las 2 columnas) --- */}
                                    <div className="col-span-2 my-1 border-t border-dashed border-gray-300"></div>

                                    {/* --- FILA 4: HOSPEDAJE --- */}
                                    <div>
                                        <span>Hospedaje:</span>
                                    </div>
                                    <div className="text-right">
                                        {totalHospedaje.toFixed(2)} Bs
                                    </div>

                                    {/* --- FILA 5: EXTRAS (Condicional) --- */}
                                    {extraDetails.total > 0 && (
                                        <>
                                            <div>
                                                <span>Extras:</span>
                                            </div>
                                            <div className="text-right">
                                                {extraDetails.total.toFixed(2)}{' '}
                                                Bs
                                            </div>
                                        </>
                                    )}

                                    {/* --- FILA 6: TOTAL GENERAL --- */}
                                    <div>
                                        <span className="font-bold text-gray-700">
                                            Total General:
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-gray-700">
                                            {(
                                                totalHospedaje +
                                                extraDetails.total
                                            ).toFixed(2)}{' '}
                                            Bs
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-red-200/50 pt-2 text-xs text-gray-500 italic">
                                    Obs: {checkin.notes || 'Sin observaciones'}
                                </div>
                                <div className="border-t border-red-500/50 pt-2 text-xs text-gray-500 italic">
                                    {extraDetails.servicios.length > 0 && (
                                        <div className="mt-2 border-t border-red-200/50 pt-2">
                                            <span className="mb-1 block text-[10px] font-bold text-red-600 uppercase">
                                                Consumos Extra
                                            </span>

                                            {/* Lista con scroll */}
                                            <div className="flex max-h-28 flex-col gap-1 overflow-y-auto pr-1 text-xs text-gray-700">
                                                {extraDetails.servicios.map(
                                                    (item: any) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex justify-between border-b border-gray-100 pb-1 last:border-0"
                                                        >
                                                            <span>
                                                                {item.count} x{' '}
                                                                {item.service}
                                                            </span>
                                                            <span className="font-medium">
                                                                {/* CORRECCIÓN 2: Usamos item.subtotal directo del JSON */}
                                                                {parseFloat(
                                                                    item.subtotal,
                                                                ).toFixed(
                                                                    2,
                                                                )}{' '}
                                                                Bs
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>

                                            {/* Subtotal */}
                                            <div className="mt-1 flex justify-end pt-1">
                                                <span className="text-[10px] font-bold text-gray-600">
                                                    {/* CORRECCIÓN 3: Usamos extraDetails.total */}
                                                    Subtotal Servicios:{' '}
                                                    {extraDetails.total.toFixed(
                                                        2,
                                                    )}{' '}
                                                    Bs
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 mb-6 text-center">
                                <h4 className="text-xl font-bold text-gray-800">
                                    ¿Confirmar salida?
                                </h4>
                                <p className="mt-2 text-sm text-gray-500">
                                    La habitación pasará a estado{' '}
                                    <strong>LIMPIEZA</strong> y se generará
                                    automáticamente el recibo de cobro final.
                                </p>
                            </div>
                        </div>
                    ) : (
                        // --- ESTADO 2: VISTA PREVIA PDF ---
                        <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-100 p-0 md:flex-row">
                            {/* Iframe del PDF */}
                            <div className="relative h-full flex-1 bg-gray-500">
                                <iframe
                                    src={pdfUrl}
                                    className="h-full w-full border-none"
                                    title="Recibo PDF"
                                />
                            </div>
                        </div>
                    )}
                </div>
                {/* Footer de Botones */}
                <div className="flex justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
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
                                disabled={processing}
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
