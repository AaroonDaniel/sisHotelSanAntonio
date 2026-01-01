import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Brush,
    Construction,
    Home,
    Search,
    User as UserIcon,
    AlertTriangle,
    FileEdit
} from 'lucide-react';
import { useState } from 'react';
import CheckinModal, { Room as ModalRoom, Guest as ModalGuest, CheckinData } from '../checkins/checkinModal';

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
    
    // Modal State
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [checkinToEdit, setCheckinToEdit] = useState<CheckinData | null>(null);

    // --- LÓGICA DE ESTADO ---
    const getDisplayStatus = (room: Room) => {
        const dbStatus = room.status ? room.status.toLowerCase().trim() : '';
        
        if (['occupied', 'ocupado', 'ocupada'].includes(dbStatus)) {
            const activeCheckin = room.checkins?.[0];
            // Tipado seguro para guest
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

    // --- MANEJO DE CLIC ---
    const handleRoomClick = (room: Room) => {
        const status = getDisplayStatus(room);
        
        if (status === 'available') {
            setCheckinToEdit(null);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
        } else if (status === 'occupied' || status === 'incomplete') {
            const activeCheckin = room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;
            if (activeCheckin) {
                setCheckinToEdit(activeCheckin);
                setSelectedRoomId(room.id);
                setIsCheckinModalOpen(true);
            }
        }
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
                {/* Header y Filtros */}
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <button onClick={() => window.history.back()} className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </button>
                        <h2 className="text-3xl font-bold text-white">Panel de Habitaciones</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 pb-2">
                        <Badge count={countStatus('available')} label="Libres" color="bg-emerald-600" onClick={() => setFilterStatus('available')} active={filterStatus === 'available'} />
                        <Badge count={countStatus('occupied')} label="Ocupadas" color="bg-red-600" onClick={() => setFilterStatus('occupied')} active={filterStatus === 'occupied'} />
                        <Badge count={countStatus('incomplete')} label="Pendientes" color="bg-amber-500 text-black" onClick={() => setFilterStatus('incomplete')} active={filterStatus === 'incomplete'} />
                        <Badge count={countStatus('cleaning')} label="Limpieza" color="bg-blue-500" onClick={() => setFilterStatus('cleaning')} active={filterStatus === 'cleaning'} />
                        <Badge count={countStatus('maintenance')} label="Mant." color="bg-gray-600" onClick={() => setFilterStatus('maintenance')} active={filterStatus === 'maintenance'} />
                        <Badge count={Rooms.length} label="Todas" color="bg-slate-700" onClick={() => setFilterStatus('all')} active={filterStatus === 'all'} />
                    </div>
                </div>

                {/* Buscador */}
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full rounded-xl border-gray-700 bg-gray-800 py-3 pl-10 text-white placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                            placeholder="Buscar por número o tipo..."
                        />
                    </div>
                </div>

                {/* Grilla */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredRooms.map((room) => {
                        const config = getStatusConfig(room);
                        const isActionable = getDisplayStatus(room) === 'incomplete';
                        
                        return (
                            <div 
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                className={`relative flex h-36 flex-col justify-between overflow-hidden rounded-lg shadow-lg transition-all hover:scale-105 hover:shadow-xl ${config.colorClass}`}
                            >
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
                                        <div className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
                                            <BedDouble className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* BOTÓN DE ACCIÓN PARA COMPLETAR */}
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

            <CheckinModal 
                show={isCheckinModalOpen}
                onClose={() => {
                    setIsCheckinModalOpen(false);
                    setSelectedRoomId(null);
                    setCheckinToEdit(null);
                }}
                checkinToEdit={checkinToEdit}
                guests={Guests}
                rooms={Rooms}
                initialRoomId={selectedRoomId}
            />
        </AuthenticatedLayout>
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