import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { 
    BedDouble, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    Plus, 
    Search, 
    UserCheck, 
    AlertCircle,
    ArrowRight,
    ChevronLeft
} from 'lucide-react';
import { useState, useMemo } from 'react';
import ReservationModal from './reservationModal';
import AssignRoomsModal from './AssignRoomsModal'; // El que creamos en la Fase 2

interface Props {
    reservations: any[];
    guests: any[];
    rooms: any[];
}

export default function viewReservationModal({ reservations, guests, rooms }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [assigningReservation, setAssigningReservation] = useState<any>(null);
    
    // Estado para la vista a pantalla completa de confirmación
    const [confirmingStayRes, setConfirmingStayRes] = useState<any>(null);

    // --- LÓGICA DE FILTRADO Y DIVISIÓN ---
    const filteredReservations = useMemo(() => {
        return reservations.filter(res => 
            res.guest?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            res.guest?.identification_number?.includes(searchTerm)
        );
    }, [reservations, searchTerm]);

    // 1. Reservas sin habitación asignada (Pendientes de Fase 2)
    const pendingAssignment = useMemo(() => 
        filteredReservations.filter(res => res.details.some((d: any) => d.room_id === null) && res.status === 'pendiente'),
    [filteredReservations]);

    // 2. Reservas con habitación ya asignada (Listas para Check-in)
    const readyForCheckin = useMemo(() => 
        filteredReservations.filter(res => res.details.every((d: any) => d.room_id !== null) && res.status === 'pendiente'),
    [filteredReservations]);

    // --- VISTA A PANTALLA COMPLETA (CONFIRMACIÓN) ---
    if (confirmingStayRes) {
        return (
            <AppLayout>
                <Head title="Confirmar Estancia" />
                <div className="min-h-screen bg-gray-50 p-8 animate-in fade-in slide-in-from-right-10 duration-500">
                    <button 
                        onClick={() => setConfirmingStayRes(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" /> Volver al listado
                    </button>

                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Columna Datos Huésped */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-4">
                                    <UserCheck className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase leading-tight">
                                    {confirmingStayRes.guest?.full_name}
                                </h2>
                                <p className="text-gray-400 font-bold text-sm">CI: {confirmingStayRes.guest?.identification_number}</p>
                                
                                <div className="mt-8 space-y-4 border-t pt-6">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Llegada</span>
                                        <span className="font-bold">{confirmingStayRes.arrival_date}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Noches</span>
                                        <span className="font-bold">{confirmingStayRes.duration_days}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 text-sm">Personas</span>
                                        <span className="font-bold">{confirmingStayRes.guest_count}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-900 p-6 rounded-3xl shadow-lg text-white">
                                <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Finanzas</h3>
                                <div className="text-3xl font-black">{confirmingStayRes.advance_payment} Bs</div>
                                <p className="text-indigo-300 text-xs mt-1">Adelanto recibido ({confirmingStayRes.payment_type})</p>
                            </div>
                        </div>

                        {/* Columna Habitaciones y Acción */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                                    <BedDouble className="w-6 h-6 text-green-500" /> Habitaciones Preparadas
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {confirmingStayRes.details.map((det: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl border-2 border-green-50 bg-green-50/30">
                                            <div>
                                                <div className="text-xs font-black text-green-700 uppercase">Habitación {det.room?.number}</div>
                                                <div className="text-lg font-bold text-gray-800">{det.room_type?.name}</div>
                                            </div>
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 p-8 border-2 border-dashed border-gray-200 rounded-3xl text-center">
                                    <p className="text-gray-500 mb-6 max-w-sm mx-auto font-medium">
                                        Al confirmar, las habitaciones pasarán a estado "Ocupadas" y se generará el registro oficial de Check-in.
                                    </p>
                                    <button 
                                        onClick={() => {
                                            router.put(`/reservas/${confirmingStayRes.id}`, { status: 'confirmada' }, {
                                                onSuccess: () => setConfirmingStayRes(null)
                                            });
                                        }}
                                        className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 active:scale-95"
                                    >
                                        ✓ Confirmar Entrada del Huésped
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // --- VISTA PRINCIPAL (LISTADO) ---
    return (
        <AppLayout>
            <Head title="Gestión de Reservas" />

            <div className="p-6 lg:p-10 space-y-10 max-w-[1600px] mx-auto">
                {/* CABECERA DE ACCIÓN */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-green-600" /> Reservas del Hotel
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">Organiza la llegada de tus huéspedes y asigna sus espacios.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Buscar huésped o CI..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-3 rounded-2xl border-gray-200 w-64 lg:w-80 focus:ring-green-500 focus:border-green-500 transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                        >
                            <Plus className="w-5 h-5" /> Nueva Reserva
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    
                    {/* TABLA 1: RESERVAS POR ASIGNAR (Lado Izquierdo) */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-black uppercase tracking-widest text-orange-600 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> 1. Pendientes de Habitación ({pendingAssignment.length})
                            </h2>
                        </div>
                        
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                            {pendingAssignment.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-20 text-gray-400">
                                    <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-bold text-sm uppercase tracking-wider">No hay pendientes de cupo</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Huésped</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-center">Req.</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pendingAssignment.map(res => (
                                            <tr key={res.id} className="hover:bg-orange-50/30 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="font-black text-gray-800 uppercase text-sm">{res.guest?.full_name}</div>
                                                    <div className="text-[10px] font-bold text-gray-400">CI: {res.guest?.identification_number}</div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-orange-200">
                                                        {res.details.length} Hab.
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button 
                                                        onClick={() => setAssigningReservation(res)}
                                                        className="inline-flex items-center gap-1.5 bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-orange-700 transition-all shadow-md active:scale-95"
                                                    >
                                                        Asignar <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>

                    {/* TABLA 2: RESERVAS LISTAS PARA CONFIRMAR (Lado Derecho) */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                                <UserCheck className="w-4 h-4" /> 2. Listas para Confirmar ({readyForCheckin.length})
                            </h2>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                            {readyForCheckin.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-20 text-gray-400 text-center">
                                    <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="font-bold text-sm uppercase tracking-wider">Sin reservas para confirmar llegada</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Huésped</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400">Habitaciones</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {readyForCheckin.map(res => (
                                            <tr key={res.id} className="hover:bg-green-50/30 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="font-black text-gray-800 uppercase text-sm">{res.guest?.full_name}</div>
                                                    <div className="text-[10px] font-bold text-gray-400">CI: {res.guest?.identification_number}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {res.details.map((d: any, idx: number) => (
                                                            <span key={idx} className="bg-green-100 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-green-200">
                                                                {d.room?.number}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button 
                                                        onClick={() => setConfirmingStayRes(res)}
                                                        className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase hover:bg-green-700 transition-all shadow-md active:scale-95"
                                                    >
                                                        Confirmar Llegada
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>

                </div>
            </div>

            {/* MODALES DE SOPORTE */}
            <ReservationModal 
                show={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                guests={guests} 
                rooms={rooms} 
            />

            {assigningReservation && (
                <AssignRoomsModal 
                    show={!!assigningReservation} 
                    onClose={() => setAssigningReservation(null)}
                    pendingReservations={[assigningReservation]} // Mandamos solo la que seleccionó
                    availableRooms={rooms.filter(r => r.status === 'disponible')}
                />
            )}
        </AppLayout>
    );
}