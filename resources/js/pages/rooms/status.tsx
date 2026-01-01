import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Brush,
    Construction,
    Home,
    Search,
    User as UserIcon,
    AlertTriangle,
    FileEdit,
    LogOut,
    CheckCircle2,
    X // Importamos X para cerrar el modal
} from 'lucide-react';
import { useState } from 'react';
import CheckinModal, { Room as ModalRoom, Guest as ModalGuest, CheckinData } from '../checkins/checkinModal';

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
    const [selectedForAction, setSelectedForAction] = useState<number | null>(null);

    // Modal State (Detalles / Edición)
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [checkinToEdit, setCheckinToEdit] = useState<CheckinData | null>(null);

    // --- NUEVO ESTADO PARA MODAL DE CONFIRMACIÓN (CHECKOUT) ---
    const [confirmCheckoutId, setConfirmCheckoutId] = useState<number | null>(null);

    // --- LÓGICA DE ESTADO ---
    const getDisplayStatus = (room: Room) => {
        const dbStatus = room.status ? room.status.toLowerCase().trim() : '';
        
        if (['occupied', 'ocupado', 'ocupada'].includes(dbStatus)) {
            const activeCheckin = room.checkins?.[0];
            const guest = activeCheckin?.guest as Guest | undefined;
            if (guest?.profile_status === 'INCOMPLETE') {
                return 'incomplete';
            }
            return 'occupied';
        }

        if (['available', 'disponible', 'libre'].includes(dbStatus)) return 'available';
        if (['cleaning', 'limpieza', 'sucio'].includes(dbStatus)) return 'cleaning';
        if (['maintenance', 'mantenimiento', 'reparacion'].includes(dbStatus)) return 'maintenance';
        
        return 'unknown';
    };

    // --- MANEJO DE CLIC EN HABITACIÓN ---
    const handleRoomClick = (room: Room) => {
        const status = getDisplayStatus(room);
        
        if (status === 'occupied') {
            if (selectedForAction === room.id) {
                // Deseleccionar si ya estaba seleccionado
                setSelectedForAction(null);
            } else {
                // Seleccionar para acción global
                setSelectedForAction(room.id);
            }
            return;
        }

        setSelectedForAction(null);

        if (status === 'available') {
            setCheckinToEdit(null);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
        } else if (status === 'incomplete') {
            const activeCheckin = room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;
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
        const room = Rooms.find(r => r.id === selectedForAction);
        const activeCheckin = room?.checkins?.[0];
        
        if (activeCheckin) {
            setConfirmCheckoutId(activeCheckin.id); // <--- ESTO ABRE EL MODAL
        }
    };

    // --- ABRIR MODAL DE CONFIRMACIÓN (DIRECTO DESDE TARJETA) ---
    const handleDirectCheckoutTrigger = (checkinId: number) => {
        setConfirmCheckoutId(checkinId); // <--- ESTO ABRE EL MODAL
    };

    const filteredRooms = Rooms.filter((room) => {
        const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (room.room_type?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const currentStatus = getDisplayStatus(room);
        const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;
        return matchesSearch && matchesStatus;
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
                    colorClass: 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer',
                    borderColor: 'border-emerald-700',
                    label: 'Disponible',
                    icon: <BedDouble className="h-10 w-10 text-emerald-200/50" />,
                    info: 'Libre',
                    actionLabel: 'Asignar'
                };
            case 'occupied':
                return {
                    colorClass: 'bg-red-600 hover:bg-red-500 cursor-pointer',
                    borderColor: 'border-red-700',
                    label: 'Ocupado',
                    icon: <UserIcon className="h-10 w-10 text-red-200/50" />,
                    info: getOccupantName(room),
                    actionLabel: 'Ver / Editar'
                };
            case 'incomplete':
                return {
                    colorClass: 'bg-amber-500 hover:bg-amber-400 cursor-pointer ring-2 ring-amber-300 ring-offset-2 ring-offset-gray-900',
                    borderColor: 'border-amber-600',
                    label: 'Completar Datos',
                    icon: <AlertTriangle className="h-10 w-10 text-amber-100 animate-pulse" />,
                    info: getOccupantName(room),
                    actionLabel: 'Actualizar Info'
                };
            case 'cleaning':
                return {
                    colorClass: 'bg-blue-500',
                    borderColor: 'border-blue-600',
                    label: 'Limpieza',
                    icon: <Brush className="h-10 w-10 text-blue-200/50" />,
                    info: 'Limpieza',
                    actionLabel: '-'
                };
            case 'maintenance':
                return {
                    colorClass: 'bg-gray-600',
                    borderColor: 'border-gray-700',
                    label: 'Mantenimiento',
                    icon: <Construction className="h-10 w-10 text-gray-300/50" />,
                    info: 'En Reparación',
                    actionLabel: '-'
                };
            default:
                return {
                    colorClass: 'bg-slate-500',
                    borderColor: 'border-slate-600',
                    label: room.status || 'Desc.',
                    icon: <Home className="h-10 w-10 text-white/50" />,
                    info: '-',
                    actionLabel: '-'
                };
        }
    };

    const countStatus = (targetStatus: string) => Rooms.filter(r => getDisplayStatus(r) === targetStatus).length;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Estado de Habitaciones" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                
                {/* --- HEADER SUPERIOR --- */}
                <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    
                    {/* TÍTULO Y BOTÓN VOLVER */}
                    <div>
                        <button onClick={() => window.history.back()} className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </button>
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold text-white">Panel de Habitaciones</h2>
                            
                            {/* BOTÓN SUPERIOR: AHORA ABRE EL MODAL DE CONFIRMACIÓN */}
                            <button
                                onClick={handleTopCheckoutTrigger}
                                disabled={!selectedForAction}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold uppercase transition-all
                                    ${selectedForAction 
                                        ? 'bg-red-600 text-white shadow-lg hover:bg-red-500 hover:scale-105 animate-bounce' 
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                    }`}
                            >
                                <LogOut className="h-4 w-4" />
                                Finalizar Estadía
                                {selectedForAction && <span className="ml-1 bg-white text-red-600 px-1.5 rounded-full text-xs">!</span>}
                            </button>
                        </div>
                    </div>

                    {/* FILTROS Y BUSCADOR */}
                    <div className="flex flex-col gap-4 items-end">
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
                            <Badge count={countStatus('available')} label="Libres" color="bg-emerald-600" onClick={() => setFilterStatus('available')} active={filterStatus === 'available'} />
                            <Badge count={countStatus('occupied')} label="Ocupadas" color="bg-red-600" onClick={() => setFilterStatus('occupied')} active={filterStatus === 'occupied'} />
                            <Badge count={countStatus('incomplete')} label="Pendientes" color="bg-amber-500 text-black" onClick={() => setFilterStatus('incomplete')} active={filterStatus === 'incomplete'} />
                            <Badge count={countStatus('cleaning')} label="Limpieza" color="bg-blue-500" onClick={() => setFilterStatus('cleaning')} active={filterStatus === 'cleaning'} />
                            <Badge count={countStatus('maintenance')} label="Mant." color="bg-gray-600" onClick={() => setFilterStatus('maintenance')} active={filterStatus === 'maintenance'} />
                            <Badge count={Rooms.length} label="Todas" color="bg-slate-700" onClick={() => setFilterStatus('all')} active={filterStatus === 'all'} />
                        </div>
                    </div>
                </div>

                {/* --- GRILLA DE HABITACIONES --- */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredRooms.map((room) => {
                        const config = getStatusConfig(room);
                        const isActionable = getDisplayStatus(room) === 'incomplete';
                        const isOccupied = getDisplayStatus(room) === 'occupied';
                        const activeCheckin = room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;
                        const isSelected = selectedForAction === room.id;
                        
                        return (
                            <div 
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                className={`relative flex h-36 flex-col justify-between overflow-hidden rounded-lg shadow-lg transition-all 
                                    ${config.colorClass}
                                    ${isSelected ? 'ring-4 ring-white scale-105 z-10 shadow-2xl' : 'hover:scale-105 hover:shadow-xl'}
                                `}
                            >
                                {isSelected && (
                                    <div className="absolute top-2 right-2 z-20 bg-white rounded-full p-1 text-red-600 animate-in zoom-in">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                )}

                                <div className="absolute -right-2 -top-2 opacity-30 rotate-12 transform">
                                    {config.icon}
                                </div>

                                <div className="relative z-10 p-4 text-white">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-2xl font-extrabold tracking-tight">{room.number}</h3>
                                            <p className="mt-1 text-xs font-bold text-white/90 line-clamp-2" title={String(config.info)}>
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

                                {isActionable ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRoomClick(room);
                                        }}
                                        className="flex w-full items-center justify-center gap-2 border-t border-amber-600 bg-amber-700 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-800 z-20"
                                    >
                                        <FileEdit className="h-3 w-3" />
                                        Completar Datos
                                    </button>
                                ) : isOccupied && activeCheckin ? (
                                    <div className="flex border-t border-red-800 z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRoomClick(room);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1 bg-red-700 hover:bg-red-800 py-2 text-[10px] font-bold uppercase text-white border-r border-red-800 transition-colors"
                                        >
                                            <UserIcon className="h-3 w-3" />
                                            Detalles
                                        </button>
                                        {/* BOTÓN TARJETA: ABRE MODAL CONFIRMACIÓN */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDirectCheckoutTrigger(activeCheckin.id);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1 bg-gray-900 hover:bg-black py-2 text-[10px] font-bold uppercase text-white transition-colors"
                                        >
                                            <LogOut className="h-3 w-3" />
                                            Finalizar
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`flex items-center justify-between border-t ${config.borderColor} bg-black/10 px-4 py-2`}>
                                        <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-white">
                                            {config.label}
                                        </span>
                                        <div className={`h-2.5 w-2.5 rounded-full bg-white shadow-sm ${config.label !== 'Disponible' ? 'animate-pulse' : ''}`}></div>
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

            {/* --- NUEVO MODAL DE CONFIRMACIÓN (FLOAT) --- */}
            {confirmCheckoutId && (
                <CheckoutConfirmationModal 
                    checkinId={confirmCheckoutId}
                    onClose={() => setConfirmCheckoutId(null)}
                />
            )}

        </AuthenticatedLayout>
    );
}

// --- COMPONENTE MODAL DE CONFIRMACIÓN ---
// Diseño similar a "DeleteModal" pero para Finalizar Estadía
function CheckoutConfirmationModal({ checkinId, onClose }: { checkinId: number, onClose: () => void }) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = () => {
        setProcessing(true);
        // Usamos la URL directa sin Ziggy para evitar problemas
        router.put(`/checks/${checkinId}/checkout`, {}, {
            onSuccess: () => {
                onClose();
                // Abrimos el recibo
                window.open(`/checks/${checkinId}/checkout-receipt`, '_blank');
            },
            onFinish: () => setProcessing(false)
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 bg-red-50 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-red-700">
                        <AlertTriangle className="h-6 w-6" />
                        Finalizar Estadía
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                        <LogOut className="h-8 w-8 text-red-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-800">¿Confirmar salida?</h4>
                    <p className="mt-2 text-sm text-gray-500">
                        La habitación pasará a estado <strong>LIMPIEZA</strong> y se generará automáticamente el recibo de cobro final.
                        <br/><br/>
                        Esta acción cerrará la cuenta actual.
                    </p>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <button 
                        onClick={onClose} 
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                        disabled={processing}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-red-700 transition disabled:opacity-50"
                        disabled={processing}
                    >
                        {processing ? 'Procesando...' : 'Sí, Finalizar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Badge({ count, label, color, onClick, active }: any) {
    return (
        <button onClick={onClick} className={`flex min-w-[90px] flex-col items-center justify-center rounded-xl border p-2 transition-all ${active ? `border-white/50 ${color} shadow-md scale-105 brightness-110` : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}>
            <span className="text-xl font-bold text-white">{count}</span>
            <span className={`text-[10px] uppercase font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        </button>
    );
}