import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    Brush,
    CheckCircle,
    Construction,
    Home,
    Search,
    User as UserIcon
} from 'lucide-react';
import { useState } from 'react';

// --- INTERFACES ---
interface RoomType {
    id: number;
    name: string;
}

interface Room {
    id: number;
    number: string;
    status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
    room_type?: RoomType;
}

interface Props {
    auth: { user: User };
    Rooms: Room[];
}

export default function RoomsStatus({ auth, Rooms }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // --- LÓGICA DE FILTRADO ---
    const filteredRooms = Rooms.filter((room) => {
        const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              room.room_type?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
        
        return matchesSearch && matchesStatus;
    });

    // --- HELPER: COLORES Y TEXTOS SEGÚN ESTADO ---
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'available':
                return {
                    colorClass: 'bg-emerald-600', // Verde fuerte
                    borderColor: 'border-emerald-700',
                    label: 'Disponible',
                    icon: <BedDouble className="h-10 w-10 text-emerald-200/50" />
                };
            case 'occupied':
                return {
                    colorClass: 'bg-red-600', // Rojo fuerte
                    borderColor: 'border-red-700',
                    label: 'Ocupado',
                    icon: <UserIcon className="h-10 w-10 text-red-200/50" />
                };
            case 'cleaning':
                return {
                    colorClass: 'bg-blue-500', // Azul
                    borderColor: 'border-blue-600',
                    label: 'Limpieza',
                    icon: <Brush className="h-10 w-10 text-blue-200/50" />
                };
            case 'maintenance':
                return {
                    colorClass: 'bg-gray-600', // Gris
                    borderColor: 'border-gray-700',
                    label: 'Mantenimiento',
                    icon: <Construction className="h-10 w-10 text-gray-300/50" />
                };
            default:
                return {
                    colorClass: 'bg-gray-400',
                    borderColor: 'border-gray-500',
                    label: 'Desconocido',
                    icon: <Home className="h-10 w-10 text-white/50" />
                };
        }
    };

    // --- HELPER: CONTADORES ---
    const countStatus = (status: string) => Rooms.filter(r => r.status === status).length;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Estado de Habitaciones" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                
                {/* 1. HEADER Y NAVEGACIÓN */}
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <button
                            onClick={() => window.history.back()}
                            className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4" /> Volver
                        </button>
                        <h2 className="text-3xl font-bold text-white">Panel de Habitaciones</h2>
                    </div>

                    {/* Resumen Rápido (Legend) */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <Badge count={countStatus('available')} label="Libres" color="bg-emerald-600" onClick={() => setFilterStatus('available')} active={filterStatus === 'available'} />
                        <Badge count={countStatus('occupied')} label="Ocupadas" color="bg-red-600" onClick={() => setFilterStatus('occupied')} active={filterStatus === 'occupied'} />
                        <Badge count={countStatus('cleaning')} label="Limpieza" color="bg-blue-500" onClick={() => setFilterStatus('cleaning')} active={filterStatus === 'cleaning'} />
                        <Badge count={countStatus('maintenance')} label="Mant." color="bg-gray-600" onClick={() => setFilterStatus('maintenance')} active={filterStatus === 'maintenance'} />
                        <Badge count={Rooms.length} label="Todas" color="bg-slate-700" onClick={() => setFilterStatus('all')} active={filterStatus === 'all'} />
                    </div>
                </div>

                {/* 2. BARRA DE BÚSQUEDA */}
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
                            placeholder="Buscar habitación por número o tipo..."
                        />
                    </div>
                </div>

                {/* 3. GRILLA DE HABITACIONES (EL DISEÑO SOLICITADO) */}
                {filteredRooms.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {filteredRooms.map((room) => {
                            const config = getStatusConfig(room.status);
                            
                            return (
                                <div 
                                    key={room.id}
                                    className={`relative flex h-32 flex-col justify-between overflow-hidden rounded-lg shadow-lg transition-transform hover:scale-105 ${config.colorClass}`}
                                >
                                    {/* Fondo decorativo del icono grande */}
                                    <div className="absolute -right-2 -top-2 opacity-30 rotate-12 transform">
                                        {config.icon}
                                    </div>

                                    {/* Contenido Principal */}
                                    <div className="relative z-10 p-4 text-white">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-2xl font-extrabold tracking-tight">
                                                    Nro: {room.number}
                                                </h3>
                                                <p className="mt-1 text-xs font-medium text-white/90 line-clamp-1" title={room.room_type?.name}>
                                                    {room.room_type?.name || 'Estándar'}
                                                </p>
                                            </div>
                                            {/* Icono pequeño visual */}
                                            <div className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm">
                                                <BedDouble className="h-5 w-5 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra Inferior de Estado */}
                                    <div className={`flex items-center justify-between border-t ${config.borderColor} bg-black/10 px-4 py-1.5`}>
                                        <span className="text-xs font-bold uppercase tracking-wider text-white">
                                            {config.label}
                                        </span>
                                        <div className="h-2 w-2 rounded-full bg-white shadow-sm animate-pulse"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="rounded-full bg-gray-800 p-4">
                            <Search className="h-8 w-8" />
                        </div>
                        <p className="mt-4 text-lg">No se encontraron habitaciones.</p>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

// Componente pequeño para los botones de filtro (Legend)
function Badge({ count, label, color, onClick, active }: { count: number, label: string, color: string, onClick: () => void, active: boolean }) {
    return (
        <button 
            onClick={onClick}
            className={`flex min-w-[100px] flex-col items-center justify-center rounded-xl border p-2 transition-all ${
                active 
                ? `border-white/50 ${color} shadow-md scale-105` 
                : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
            }`}
        >
            <span className="text-xl font-bold text-white">{count}</span>
            <span className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        </button>
    );
}