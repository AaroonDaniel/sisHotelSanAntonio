import { useForm } from '@inertiajs/react';
import {
    BedDouble,
    Building2,
    Calendar,
    CheckCircle,
    ChevronRight,
    Loader2,
    Save,
    User,
    Users,
    X,
    Undo2,
    AlertCircle
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

// --- INTERFACES BÁSICAS ---
export interface ReservationDetail {
    id?: number;
    room_id: number | null;
    requested_room_type_id: number;
    requested_bathroom: string;
    room_type?: { id: number; name: string };
    price?: number;
}

export interface Reservation {
    id: number;
    guest: { full_name: string; identification_number: string };
    guest_count: number;
    arrival_date: string;
    status: string;
    details: ReservationDetail[];
}

export interface Room {
    id: number;
    number: string;
    status: string;
    room_type_id: number;
    floor?: { name: string };
}

interface Props {
    show: boolean;
    onClose: () => void;
    pendingReservations: Reservation[]; // Reservas con room_id = null
    availableRooms: Room[]; // Todos los cuartos libres
}

export default function AssignRoomsModal({ show, onClose, pendingReservations, availableRooms }: Props) {
    // Estado local para manejar las asignaciones en vivo sin tocar la BD hasta el final
    const [localReservations, setLocalReservations] = useState<Reservation[]>([]);
    const [activeResId, setActiveResId] = useState<number | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        reservation_id: '',
        assignments: [] as { detail_id: number; room_id: number }[]
    });

    // Cargar los datos prop al estado local al abrir
    useEffect(() => {
        if (show) {
            setLocalReservations(JSON.parse(JSON.stringify(pendingReservations)));
            if (pendingReservations.length > 0 && !activeResId) {
                setActiveResId(pendingReservations[0].id);
            }
        }
    }, [show, pendingReservations]);

    // Variables derivadas
    const activeReservation = localReservations.find(r => r.id === activeResId);
    
    // El Requisito Activo (El primero de la cola que tenga room_id en null)
    const activeRequirementIndex = activeReservation?.details.findIndex(d => d.room_id === null) ?? -1;
    const activeRequirement = activeRequirementIndex !== -1 ? activeReservation?.details[activeRequirementIndex] : null;

    // Habitaciones filtradas para el requisito actual
    const filteredRooms = useMemo(() => {
        if (!activeRequirement) return [];
        // Filtramos por tipo de habitación y que no hayan sido asignadas a otra cosa en este mismo modal
        const assignedRoomIds = localReservations.flatMap(r => r.details.map(d => d.room_id)).filter(id => id !== null);
        
        return availableRooms.filter(room => 
            room.room_type_id.toString() === activeRequirement.requested_room_type_id.toString() &&
            !assignedRoomIds.includes(room.id)
        );
    }, [availableRooms, activeRequirement, localReservations]);

    // Agrupar por pisos para la vista "Transfer"
    const groupedRooms = useMemo(() => {
        const groups: Record<string, Room[]> = {};
        filteredRooms.forEach(room => {
            const floorName = room.floor?.name || 'Sin Piso Asignado';
            if (!groups[floorName]) groups[floorName] = [];
            groups[floorName].push(room);
        });
        return groups;
    }, [filteredRooms]);

    // FUNCIONES DE INTERACCIÓN
    const handleAssignRoom = (physicalRoomId: number) => {
        if (!activeReservation || activeRequirementIndex === -1) return;

        setLocalReservations(prev => prev.map(res => {
            if (res.id === activeReservation.id) {
                const newDetails = [...res.details];
                newDetails[activeRequirementIndex].room_id = physicalRoomId;
                return { ...res, details: newDetails };
            }
            return res;
        }));
    };

    const handleUndoAssignment = (detailIndex: number) => {
        if (!activeReservation) return;

        setLocalReservations(prev => prev.map(res => {
            if (res.id === activeReservation.id) {
                const newDetails = [...res.details];
                newDetails[detailIndex].room_id = null; // Liberamos el cuarto
                return { ...res, details: newDetails };
            }
            return res;
        }));
    };

    const isReservationComplete = activeReservation?.details.every(d => d.room_id !== null);

    const submitAssignment = () => {
        if (!activeReservation || !isReservationComplete) return;

        const assignmentsPayload = activeReservation.details.map(d => ({
            detail_id: d.id!,
            room_id: d.room_id!
        }));

        setData({
            reservation_id: activeReservation.id.toString(),
            assignments: assignmentsPayload
        });

        // Simulamos el envío (Aquí debes apuntar a tu ruta real de asignación/checkin)
        post(`/reservas/${activeReservation.id}/assign-rooms`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                // Saltamos a la siguiente reserva automáticamente
                const nextRes = localReservations.find(r => r.id !== activeReservation.id && r.details.some(d => d.room_id === null));
                if (nextRes) setActiveResId(nextRes.id);
                else onClose();
            }
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* CABECERA */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-900 px-6 py-4 text-white">
                    <h2 className="flex items-center gap-3 text-xl font-bold">
                        <Building2 className="h-6 w-6 text-green-400" />
                        Centro de Asignación Rápida
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-800 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* ========================================== */}
                    {/* ⬅️ PANEL IZQUIERDO: LISTA DE RESERVAS      */}
                    {/* ========================================== */}
                    <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                        <div className="p-4 border-b border-gray-200 bg-white">
                            <h3 className="font-bold text-gray-700 uppercase text-xs flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Reservas Pendientes
                            </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {localReservations.length === 0 && (
                                <div className="p-6 text-center text-gray-400 text-sm">No hay reservas pendientes.</div>
                            )}
                            
                            {localReservations.map(res => {
                                const isSelected = activeResId === res.id;
                                const assignedCount = res.details.filter(d => d.room_id !== null).length;
                                const totalCount = res.details.length;
                                const isComplete = assignedCount === totalCount;

                                return (
                                    <div 
                                        key={res.id} 
                                        onClick={() => setActiveResId(res.id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            isSelected 
                                            ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-[1.02]' 
                                            : isComplete
                                                ? 'border-green-200 bg-green-50 opacity-60'
                                                : 'border-gray-200 bg-white hover:border-indigo-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className={`font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>
                                                {res.guest?.full_name}
                                            </h4>
                                            {isComplete ? (
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            ) : (
                                                <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                                    Espera
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {res.guest_count} Pax</span>
                                            <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {totalCount} Hab.</span>
                                        </div>

                                        {/* Barra de progreso de asignación */}
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                            <div className={`h-1.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${(assignedCount / totalCount) * 100}%` }}></div>
                                        </div>
                                        <div className="text-right text-[9px] font-bold text-gray-400 uppercase">
                                            {assignedCount} de {totalCount} Asignadas
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ========================================== */}
                    {/* ➡️ PANEL DERECHO: LA COLA Y EL MAPA        */}
                    {/* ========================================== */}
                    <div className="w-2/3 bg-white flex flex-col relative">
                        
                        {!activeReservation ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <Building2 className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">Seleccione una reserva de la izquierda</p>
                            </div>
                        ) : (
                            <>
                                {/* LA COLA (QUEUE) SUPERIOR */}
                                <div className="bg-indigo-900 p-6 shadow-md z-10 text-white">
                                    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4 flex justify-between">
                                        <span>Requisitos de {activeReservation.guest?.full_name}</span>
                                        {isReservationComplete && <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> ¡Lista para confirmar!</span>}
                                    </h3>
                                    
                                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                                        {activeReservation.details.map((detail, idx) => {
                                            const isActive = idx === activeRequirementIndex;
                                            const isAssigned = detail.room_id !== null;
                                            const assignedRoom = availableRooms.find(r => r.id === detail.room_id);

                                            return (
                                                <div key={idx} className="flex items-center">
                                                    <div className={`min-w-[200px] p-3 rounded-xl border-2 transition-all relative ${
                                                        isActive 
                                                        ? 'border-indigo-400 bg-indigo-800 shadow-lg scale-105' 
                                                        : isAssigned 
                                                            ? 'border-green-500 bg-green-900/40' 
                                                            : 'border-indigo-800/50 bg-indigo-900/50 opacity-50'
                                                    }`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-200' : isAssigned ? 'text-green-400' : 'text-gray-400'}`}>
                                                                Petición {idx + 1}
                                                            </span>
                                                            {isAssigned && (
                                                                <button onClick={() => handleUndoAssignment(idx)} className="text-gray-400 hover:text-red-400" title="Desasignar cuarto">
                                                                    <Undo2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="font-bold text-sm truncate">
                                                            {detail.room_type?.name || 'Habitación'}
                                                        </div>
                                                        
                                                        <div className="mt-2 text-xs font-medium">
                                                            {isAssigned ? (
                                                                <span className="flex items-center gap-1.5 text-green-300 bg-green-900/50 px-2 py-1 rounded-md">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Cuarto {assignedRoom?.number}
                                                                </span>
                                                            ) : isActive ? (
                                                                <span className="text-indigo-200 animate-pulse flex items-center gap-1">
                                                                    👉 Selecciona abajo
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">En espera...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {idx < activeReservation.details.length - 1 && (
                                                        <ChevronRight className="w-6 h-6 text-indigo-700 mx-2 flex-shrink-0" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* MAPA DE HABITACIONES (TIPO TRANSFER) */}
                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                                    {isReservationComplete ? (
                                        <div className="h-full flex flex-col items-center justify-center text-green-600 animate-in zoom-in-95">
                                            <CheckCircle className="w-20 h-20 mb-4 opacity-50" />
                                            <h2 className="text-2xl font-black uppercase tracking-wide text-green-700 mb-2">Asignación Perfecta</h2>
                                            <p className="text-gray-500 font-medium">Puedes proceder a guardar los cambios abajo.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                            {Object.entries(groupedRooms).length === 0 ? (
                                                <div className="text-center p-10 text-gray-400">
                                                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                    No hay habitaciones libres de este tipo en este momento.
                                                </div>
                                            ) : (
                                                Object.entries(groupedRooms).map(([floorName, roomsInFloor]) => (
                                                    <div key={floorName} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">
                                                            {floorName}
                                                        </h4>
                                                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                            {roomsInFloor.map(room => (
                                                                <button
                                                                    key={room.id}
                                                                    onClick={() => handleAssignRoom(room.id)}
                                                                    className="group relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/30 hover:bg-indigo-600 hover:border-indigo-600 hover:shadow-lg transition-all"
                                                                >
                                                                    <BedDouble className="w-6 h-6 text-indigo-400 group-hover:text-white mb-2 transition-colors" />
                                                                    <span className="text-lg font-black text-indigo-900 group-hover:text-white transition-colors">
                                                                        {room.number}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-indigo-500/70 group-hover:text-indigo-200 uppercase mt-1">
                                                                        Asignar
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* PIE DE PANEL: GUARDAR */}
                                <div className="border-t border-gray-200 p-4 bg-white flex justify-between items-center">
                                    <div className="text-sm font-bold text-gray-500">
                                        {isReservationComplete ? '¡Listo para Confirmar!' : 'Complete la asignación arriba'}
                                    </div>
                                    <button 
                                        onClick={submitAssignment}
                                        disabled={!isReservationComplete || processing}
                                        className={`px-8 py-3 rounded-xl font-black uppercase text-sm tracking-wide transition-all flex items-center gap-2 ${
                                            isReservationComplete
                                            ? 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/30 hover:-translate-y-0.5 active:scale-95' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {processing ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>
                                        ) : (
                                            <><Save className="w-5 h-5" /> Confirmar Asignación</>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}