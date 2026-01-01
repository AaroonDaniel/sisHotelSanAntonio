import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Brush,
    Construction,
    Home,
    Search,
    User as UserIcon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import CheckinModal, { Room as ModalRoom, Guest, CheckinData } from '../checkins/checkinModal';

// --- INTERFACES ---
interface User {
    id: number;
    name: string;
    email: string;
    nickname: string;  // <--- Agregado
    full_name: string; // <--- Agregado
}

interface RoomType {
    id: number;
    name: string;
}

// Extendemos la interfaz para incluir checkins y que sea compatible
interface Room extends ModalRoom {
    room_type?: RoomType;
    checkins?: CheckinData[]; //
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
    const [checkinToEdit, setCheckinToEdit] = useState<CheckinData | null>(null); //

    const getNormalizedStatus = (status: string) => {
        const s = status ? status.toLowerCase().trim() : '';
        if (['available', 'disponible', 'libre'].includes(s)) return 'available';
        if (['occupied', 'ocupado', 'ocupada'].includes(s)) return 'occupied';
        if (['cleaning', 'limpieza', 'sucio'].includes(s)) return 'cleaning';
        if (['maintenance', 'mantenimiento', 'reparacion'].includes(s)) return 'maintenance';
        return 'unknown';
    };

    // --- MANEJO DE CLIC EN HABITACIÓN ---
    const handleRoomClick = (room: Room) => {
        const status = getNormalizedStatus(room.status);
        
        if (status === 'available') {
            // MODO CREAR
            setCheckinToEdit(null);
            setSelectedRoomId(room.id);
            setIsCheckinModalOpen(true);
        } else if (status === 'occupied') {
            //
            // Asumimos que el backend envía los checkins ordenados, el [0] es el más reciente.
            const activeCheckin = room.checkins && room.checkins.length > 0 ? room.checkins[0] : null;
            
            if (activeCheckin) {
                setCheckinToEdit(activeCheckin);
                setSelectedRoomId(room.id); // Opcional, el modal usa checkinToEdit
                setIsCheckinModalOpen(true);
            }
        }
    };

    const filteredRooms = Rooms.filter((room) => {
        const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              room.room_type?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const currentStatus = getNormalizedStatus(room.status);
        const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Helper para obtener datos del ocupante
    const getOccupantName = (room: Room) => {
        if (room.checkins && room.checkins.length > 0) {
            const guest = room.checkins[0].guest;
            if (guest) {
                // Si tiene origen, lo mostramos entre paréntesis o guión
                const originText = guest.origin ? ` (${guest.origin})` : '';
                return `${guest.full_name}${originText}`;
            }
        }
        return 'Huésped';
    };

    const getStatusConfig = (room: Room) => {
        const status = getNormalizedStatus(room.status);
        switch (status) {
            case 'available':
                return {
                    colorClass: 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer',
                    borderColor: 'border-emerald-700',
                    label: 'Disponible',
                    icon: <BedDouble className="h-10 w-10 text-emerald-200/50" />,
                    info: 'Libre'
                };
            case 'occupied':
                return {
                    colorClass: 'bg-red-600 hover:bg-red-500 cursor-pointer', //
                    borderColor: 'border-red-700',
                    label: 'Ocupado',
                    icon: <UserIcon className="h-10 w-10 text-red-200/50" />,
                    info: getOccupantName(room) //
                };
            case 'cleaning':
                return {
                    colorClass: 'bg-blue-500',
                    borderColor: 'border-blue-600',
                    label: 'Limpieza',
                    icon: <Brush className="h-10 w-10 text-blue-200/50" />,
                    info: 'Limpieza'
                };
            case 'maintenance':
                return {
                    colorClass: 'bg-gray-600',
                    borderColor: 'border-gray-700',
                    label: 'Mantenimiento',
                    icon: <Construction className="h-10 w-10 text-gray-300/50" />,
                    info: 'En Reparación'
                };
            default:
                return {
                    colorClass: 'bg-slate-500',
                    borderColor: 'border-slate-600',
                    label: room.status || 'Desc.',
                    icon: <Home className="h-10 w-10 text-white/50" />,
                    info: '-'
                };
        }
    };

    const countStatus = (targetStatus: string) => Rooms.filter(r => getNormalizedStatus(r.status) === targetStatus).length;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Estado de Habitaciones" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Header y Filtros (Igual que antes) */}
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <button onClick={() => window.history.back()} className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </button>
                        <h2 className="text-3xl font-bold text-white">Panel de Habitaciones</h2>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <Badge count={countStatus('available')} label="Libres" color="bg-emerald-600" onClick={() => setFilterStatus('available')} active={filterStatus === 'available'} />
                        <Badge count={countStatus('occupied')} label="Ocupadas" color="bg-red-600" onClick={() => setFilterStatus('occupied')} active={filterStatus === 'occupied'} />
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
                            placeholder="Buscar..."
                        />
                    </div>
                </div>

                {/* Grilla */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredRooms.map((room) => {
                        const config = getStatusConfig(room);
                        
                        return (
                            <div 
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                className={`relative flex h-32 flex-col justify-between overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105 ${config.colorClass}`}
                            >
                                <div className="absolute -right-2 -top-2 opacity-30 rotate-12 transform">
                                    {config.icon}
                                </div>

                                <div className="relative z-10 p-4 text-white">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-2xl font-extrabold tracking-tight">{room.number}</h3>
                                            <p className="mt-1 text-xs font-medium text-white/90 line-clamp-1" title={config.info}>
                                                {config.info}
                                            </p>
                                        </div>
                                        <div className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
                                            <BedDouble className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between border-t ${config.borderColor} bg-black/10 px-4 py-1.5`}>
                                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                                        {config.label}
                                    </span>
                                    <div className={`h-2 w-2 rounded-full bg-white shadow-sm ${config.label !== 'Disponible' ? 'animate-pulse' : ''}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL */}
            <CheckinModal 
                show={isCheckinModalOpen}
                onClose={() => {
                    setIsCheckinModalOpen(false);
                    setSelectedRoomId(null);
                    setCheckinToEdit(null);
                }}
                checkinToEdit={checkinToEdit} //
                guests={Guests}
                rooms={Rooms}
                initialRoomId={selectedRoomId}
            />
        </AuthenticatedLayout>
    );
}

function Badge({ count, label, color, onClick, active }: any) {
    return (
        <button onClick={onClick} className={`flex min-w-[100px] flex-col items-center justify-center rounded-xl border p-2 transition-all ${active ? `border-white/50 ${color} shadow-md scale-105` : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}>
            <span className="text-xl font-bold text-white">{count}</span>
            <span className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        </button>
    );
}