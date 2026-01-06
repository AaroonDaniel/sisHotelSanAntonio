import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BedDouble,
    Brush,
    CheckCircle2,
    Construction,
    FileEdit,
    Home,
    Loader2, // Icono de carga
    LogOut,
    Search,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react'; // Agregamos useEffect para depuración si es necesario
import CheckinModal, {
    CheckinData,
    Guest as ModalGuest,
    Room as ModalRoom,
} from '../checkins/checkinModal';

// --- SOLUCIÓN AL ERROR "route is not defined" ---
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
}

interface Guest extends ModalGuest {
    profile_status?: string;
}

interface Room extends ModalRoom {
    room_type?: RoomType;
    checkins?: CheckinData[];
}

interface Props {
    auth: { user: User };
    Rooms: Room[];
    Guests: Guest[];
}

export default function RoomsStatus({ auth, Rooms, Guests }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Estado para la habitación seleccionada para acción global
    const [selectedForAction, setSelectedForAction] = useState<number | null>(
        null,
    );

    // Modal State (Detalles / Edición)
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [checkinToEdit, setCheckinToEdit] = useState<CheckinData | null>(
        null,
    );

    // --- NUEVO ESTADO PARA MODAL DE CONFIRMACIÓN (CHECKOUT) ---
    const [confirmCheckoutId, setConfirmCheckoutId] = useState<number | null>(
        null,
    );

    // --- LÓGICA DE ESTADO (CORREGIDA Y REFORZADA) ---
    const getDisplayStatus = (room: Room) => {
        const dbStatus = room.status ? room.status.toLowerCase().trim() : '';

        // Prioridad 1: Verificar si está ocupada
        if (['occupied', 'ocupado', 'ocupada'].includes(dbStatus)) {
            // Verificamos si hay un checkin activo
            const activeCheckin =
                room.checkins && room.checkins.length > 0
                    ? room.checkins[0]
                    : null;

            if (activeCheckin) {
                const guest = activeCheckin.guest as Guest | undefined;

                // CRUCIAL: Si el guest existe y su estado es INCOMPLETE, forzamos el estado visual a 'incomplete'
                if (guest && guest.profile_status === 'INCOMPLETE') {
                    return 'incomplete'; // Devolverá estado Amarillo
                }
            }
            // Si tiene datos completos, devolvemos ocupado (Rojo)
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

    // --- MANEJO DE CLIC EN HABITACIÓN ---
    const handleRoomClick = (room: Room) => {
        const status = getDisplayStatus(room);

        // Lógica para estado OCUPADO (Rojo - Datos completos)
        if (status === 'occupied') {
            if (selectedForAction === room.id) {
                setSelectedForAction(null); // Deseleccionar
            } else {
                setSelectedForAction(room.id); // Seleccionar para acción global
            }
            return;
        }

        // Si hago click en cualquier otro estado, limpio la selección global
        setSelectedForAction(null);

        // Lógica para estado DISPONIBLE (Verde - Crear nuevo)
        if (status === 'available') {
            setCheckinToEdit(null);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
        }
        // Lógica para estado INCOMPLETO (Amarillo - Completar datos)
        else if (status === 'incomplete') {
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
    };

    // --- ABRIR MODAL DE CONFIRMACIÓN (GLOBAL) ---
    const handleTopCheckoutTrigger = () => {
        if (!selectedForAction) return;
        const room = Rooms.find((r) => r.id === selectedForAction);
        const activeCheckin = room?.checkins?.[0];

        if (activeCheckin) {
            setConfirmCheckoutId(activeCheckin.id);
        }
    };

    // --- ABRIR MODAL DE CONFIRMACIÓN (DIRECTO DESDE TARJETA) ---
    const handleDirectCheckoutTrigger = (checkinId: number) => {
        setConfirmCheckoutId(checkinId);
    };

    // --- ABRIR DETALLES SIN SELECCIONAR (PARA BOTÓN "DETALLES") ---
    const handleOpenDetails = (room: Room) => {
        const activeCheckin =
            room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;
        if (activeCheckin) {
            setCheckinToEdit(activeCheckin);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
            setSelectedForAction(null); // Aseguramos que no quede seleccionado
        }
    };

    // --- FILTRADO Y ORDENAMIENTO ---
    const filteredRooms = Rooms.filter((room) => {
        const matchesSearch =
            room.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (room.room_type?.name || '')
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

        const currentStatus = getDisplayStatus(room);
        const matchesStatus =
            filterStatus === 'all' || currentStatus === filterStatus;

        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        // Ordenamiento Alfanumérico Natural (Ej: 1, 2, 10, 10A, 10B)
        return a.number.localeCompare(b.number, undefined, {
            numeric: true,
            sensitivity: 'base',
        });
    });

    const getOccupantName = (room: Room) => {
        if (room.checkins && room.checkins.length > 0) {
            const guest = room.checkins[0].guest as Guest | undefined;
            if (guest) {
                if (guest.profile_status === 'INCOMPLETE') {
                    return `${guest.full_name} (Faltan Datos)`;
                }
                const originText = guest.origin ? ` (${guest.origin})` : '';
                return `${guest.full_name}${originText}`;
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
                    info: 'Libre',
                    actionLabel: 'Asignar',
                };
            case 'occupied':
                return {
                    colorClass: 'bg-red-600 hover:bg-red-500 cursor-pointer',
                    borderColor: 'border-red-700',
                    label: 'Ocupado',
                    icon: <UserIcon className="h-10 w-10 text-red-200/50" />,
                    info: getOccupantName(room),
                    actionLabel: 'Ver / Editar',
                };
            case 'incomplete':
                return {
                    colorClass:
                        'bg-amber-500 hover:bg-amber-400 cursor-pointer ring-2 ring-amber-300 ring-offset-2 ring-offset-gray-900',
                    borderColor: 'border-amber-600',
                    label: 'Completar Datos', // Etiqueta clara
                    icon: (
                        <AlertTriangle className="h-10 w-10 animate-pulse text-amber-100" />
                    ),
                    info: getOccupantName(room),
                    actionLabel: 'Actualizar Info',
                };
            case 'cleaning':
                return {
                    colorClass: 'bg-blue-500',
                    borderColor: 'border-blue-600',
                    label: 'Limpieza',
                    icon: <Brush className="h-10 w-10 text-blue-200/50" />,
                    info: 'Limpieza',
                    actionLabel: '-',
                };
            case 'maintenance':
                return {
                    colorClass: 'bg-gray-600',
                    borderColor: 'border-gray-700',
                    label: 'Mantenimiento',
                    icon: (
                        <Construction className="h-10 w-10 text-gray-300/50" />
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

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Estado de Habitaciones" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* --- HEADER SUPERIOR --- */}
                <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    {/* TÍTULO Y BOTÓN VOLVER */}
                    <div>
                        <button
                            onClick={() => window.history.back()}
                            className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold text-white">
                                Panel de Habitaciones
                            </h2>

                            {/* BOTÓN SUPERIOR */}
                            <button
                                onClick={handleTopCheckoutTrigger}
                                disabled={!selectedForAction}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold uppercase transition-all ${
                                    selectedForAction
                                        ? 'animate-bounce bg-red-600 text-white shadow-lg hover:scale-105 hover:bg-red-500'
                                        : 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
                                }`}
                            >
                                <LogOut className="h-4 w-4" />
                                Finalizar Estadía
                                {selectedForAction && (
                                    <span className="ml-1 rounded-full bg-white px-1.5 text-xs text-red-600">
                                        !
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* FILTROS Y BUSCADOR */}
                    <div className="flex flex-col items-end gap-4">
                        <div className="relative w-full max-w-xs">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full rounded-xl border-gray-700 bg-gray-800 py-2 pl-9 text-sm text-white placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                                placeholder="Buscar habitación..."
                            />
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
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

                {/* --- GRILLA DE HABITACIONES --- */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredRooms.map((room) => {
                        const config = getStatusConfig(room);
                        const displayStatus = getDisplayStatus(room);

                        const isActionable = displayStatus === 'incomplete'; // ¿Es amarillo?
                        const isOccupied = displayStatus === 'occupied'; // ¿Es rojo?

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
                                        {!isSelected && (
                                            <div className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
                                                <BedDouble className="h-5 w-5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* LÓGICA DE BOTONES SEGÚN ESTADO */}

                                {isActionable ? (
                                    // ESTADO INCOMPLETO (Amarillo) -> Botón "Completar Datos"
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRoomClick(room);
                                        }}
                                        className="z-20 flex w-full items-center justify-center gap-2 border-t border-amber-600 bg-amber-700 py-2 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-amber-800"
                                    >
                                        <FileEdit className="h-3 w-3" />
                                        Completar Datos
                                    </button>
                                ) : isOccupied && activeCheckin ? (
                                    // ESTADO OCUPADO (Rojo) -> Botones Detalles y Finalizar
                                    <div className="z-20 flex border-t border-red-800">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenDetails(room);
                                            }}
                                            className="flex flex-1 items-center justify-center gap-1 border-r border-red-800 bg-red-700 py-2 text-[10px] font-bold text-white uppercase transition-colors hover:bg-red-800"
                                        >
                                            <UserIcon className="h-3 w-3" />
                                            Detalles
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
                                            <LogOut className="h-3 w-3" />
                                            Finalizar
                                        </button>
                                    </div>
                                ) : (
                                    // OTROS ESTADOS (Verde, Azul, Gris) -> Barra normal
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

            {/* MODAL DE EDICIÓN / DETALLES */}
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

            {/* MODAL DE CONFIRMACIÓN (FLOAT con VISTA PREVIA) */}
            {confirmCheckoutId && (
                <CheckoutConfirmationModal
                    checkinId={confirmCheckoutId}
                    onClose={() => {
                        setConfirmCheckoutId(null);
                        setSelectedForAction(null); // <--- CORRECCIÓN: Limpia la selección al cerrar/confirmar
                    }}
                />
            )}
        </AuthenticatedLayout>
    );
}

// --- COMPONENTE MODAL DE CONFIRMACIÓN (MEJORADO CON PREVIEW PDF Y SCROLL) ---
function CheckoutConfirmationModal({
    checkinId,
    onClose,
}: {
    checkinId: number;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);
    const [iframeLoading, setIframeLoading] = useState(true);

    // URL para obtener el recibo.
    // Asegúrate de que tu backend tenga esta ruta habilitada en 'web.php'
    const receiptUrl = `/checks/${checkinId}/checkout-receipt`;

    const handleConfirm = () => {
        setProcessing(true);
        // Enviamos la petición PUT para cambiar el estado y cerrar la cuenta
        router.put(
            `/checks/${checkinId}/checkout`,
            {},
            {
                onSuccess: () => {
                    onClose();
                    // Opcional: Descomentar si quieres abrir el PDF en una pestaña nueva tras confirmar automáticamente
                    // window.open(receiptUrl, '_blank');
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        // Contenedor del Modal (Fondo oscuro y desenfoque)
        <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200 fade-in">
            {/* Contenedor Principal (Tarjeta Grande Dividida) 
                h-[85vh] fija la altura para que el PDF tenga espacio para scroll dentro de este contenedor */}
            <div className="flex h-[85vh] w-full max-w-6xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* --- PANEL COMPLETO (ANTES COLUMNA IZQUIERDA) --- */}
                <div className="flex w-full flex-col border-b border-gray-200 bg-gray-50">
                    {/* Header */}
                    <div className="border-b border-gray-200 bg-white p-6">
                        <div className="mb-2 flex items-center gap-3 text-red-600">
                            <div className="rounded-lg bg-red-100 p-2">
                                <LogOut className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">
                                Finalizar Estadía
                            </h3>
                        </div>

                        <p className="text-sm text-gray-500">
                            Por favor, revise el recibo antes de procesar la
                            salida definitiva del huésped.
                        </p>
                    </div>

                    {/* --- SECCIÓN PDF (ANTES COLUMNA DERECHA) --- */}
                    <div className="relative w-full bg-gray-500 h-[52vh]    ">
                        {/* Loader */}
                        {iframeLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-600 text-white">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="h-10 w-10 animate-spin text-white/50" />
                                    <span className="text-sm font-medium text-white/80">
                                        Generando Vista Previa...
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Iframe PDF */}
                        <iframe
                            src={receiptUrl}
                            className="h-full w-full border-none bg-gray-200"
                            title="Vista Previa del Recibo"
                            onLoad={() => setIframeLoading(false)}
                        />
                    </div>

                    {/* Footer - Botones */}
                    <div className="space-y-3 border-t border-gray-200 bg-white p-6">
                        <button
                            onClick={handleConfirm}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-red-700 disabled:opacity-50 disabled:hover:scale-100"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <LogOut className="h-4 w-4" />
                                    Confirmar Salida
                                </>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                            disabled={processing}
                        >
                            Cancelar
                        </button>
                    </div>
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