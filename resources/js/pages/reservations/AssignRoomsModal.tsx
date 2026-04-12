import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    BedDouble,
    CheckCircle2,
    Search,
    X,
    ChevronRight,
    ArrowRight,
    Undo2,
    Save,
    Calendar
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

interface AssignRoomsModalProps {
    show: boolean;
    onClose: () => void;
    reservation: any;
    availableRooms: any[];
}

// --- FUNCIONES AUXILIARES PARA PRECIO Y BAÑO ---
const getRoomPriceInfo = (room: any) => {
    if (room.price && !Array.isArray(room.price)) return room.price;
    if (room.prices && Array.isArray(room.prices)) {
        return room.prices.find((p: any) => p.id === room.price_id) || room.prices[0];
    }
    return null;
};

const isMatchingBathroom = (dbVal?: string, filterVal?: string) => {
    const db = dbVal?.toLowerCase() || '';
    const filter = filterVal?.toLowerCase() || '';
    if (!filter) return true; 
    if (db === filter) return true;
    if ((filter.includes('private') || filter.includes('privado')) && (db.includes('private') || db.includes('privado'))) return true;
    if ((filter.includes('shared') || filter.includes('compartido')) && (db.includes('shared') || db.includes('compartido'))) return true;
    return false;
};

export default function AssignRoomsModal({
    show,
    onClose,
    reservation,
    availableRooms = []
}: AssignRoomsModalProps) {

    // --- ESTADOS ---
    const [currentIndex, setCurrentIndex] = useState(0);
    const [localAssignments, setLocalAssignments] = useState<Record<number, any>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (show && reservation) {
            const initialAssignments: Record<number, any> = {};
            let firstEmptyIndex = -1;

            reservation.details.forEach((detail: any, idx: number) => {
                if (detail.room) {
                    initialAssignments[idx] = detail.room;
                } else if (firstEmptyIndex === -1) {
                    firstEmptyIndex = idx;
                }
            });

            setLocalAssignments(initialAssignments);
            setCurrentIndex(firstEmptyIndex !== -1 ? firstEmptyIndex : 0);
            setSearchQuery('');
            setShowSummary(false);
            setIsProcessing(false);
        }
    }, [show, reservation]);

    const activeDetail = reservation?.details[currentIndex];

    // 🚀 CALCULADORA DE DÍAS (MARGEN DE SEGURIDAD) 🚀
    const daysUntilArrival = useMemo(() => {
        if (!reservation?.arrival_date) return 0;
        const arrival = new Date(reservation.arrival_date);
        const today = new Date();
        // Igualamos las horas a 0 para que la diferencia sea de días exactos
        arrival.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const diffTime = arrival.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [reservation?.arrival_date]);

    // --- LÓGICA DE FILTRADO ---
    const filteredRooms = useMemo(() => {
        if (!activeDetail) return [];

        const alreadyPickedIds = Object.entries(localAssignments)
            .filter(([idx, _]) => Number(idx) !== currentIndex) 
            .map(([_, room]) => room.id);

        const expectedTypeId = String(activeDetail.requested_room_type_id || activeDetail.requested_room_type?.id);
        const expectedBathroom = activeDetail.requested_bathroom || '';

        return availableRooms.filter(room => {
            // 1. Ocultar si ya se eligió PARA OTRA PETICIÓN
            if (alreadyPickedIds.includes(room.id)) return false;

            // 2. Filtro por tipo de habitación
            const actualTypeId = String(room.room_type_id || room.room_type?.id || room.roomType?.id);
            if (actualTypeId !== expectedTypeId) return false;

            // 3. Filtro por tipo de baño
            const priceInfo = getRoomPriceInfo(room);
            const actualBathroom = priceInfo?.bathroom_type || '';

            if (expectedBathroom && actualBathroom) {
                if (!isMatchingBathroom(actualBathroom, expectedBathroom)) {
                    return false; 
                }
            }

            // 4. Filtro por buscador (número)
            if (searchQuery) {
                const query = searchQuery.toLowerCase().trim();
                const roomNumber = String(room.number).toLowerCase();
                if (!roomNumber.includes(query)) return false;
            }

            // 🛡️ 5. REGLA DEL MARGEN DE SEGURIDAD (5 DÍAS) 🛡️
           const roomStatus = room.status?.toUpperCase() || 'DESCONOCIDO';
            if (roomStatus === 'RESERVADO') {
                if (daysUntilArrival <= 5) {
                    return false; 
                }
            }

            return true;
        });
    }, [activeDetail, localAssignments, availableRooms, searchQuery, currentIndex, daysUntilArrival]); 

    // --- ACCIONES ---
    const handleSelectRoom = (room: any) => {
        setLocalAssignments(prev => ({
            ...prev,
            [currentIndex]: room
        }));

        if (currentIndex < reservation.details.length - 1) {
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setSearchQuery('');
            }, 250);
        }
    };

    const submitFinal = () => {
        setIsProcessing(true);

        const payload = Object.entries(localAssignments).map(([idx, room]) => ({
            detail_id: reservation.details[Number(idx)].id,
            room_id: room.id
        }));

        router.post(`/reservas/${reservation.id}/assign-rooms`, {
            assignments: payload
        }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setIsProcessing(false)
        });
    };

    if (!show || !reservation) return null;

    const allAssigned = Object.keys(localAssignments).length === reservation.details.length;

    return (
        <>
            <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
                <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                <BedDouble className="h-5 w-5" />
                            </div>
                            ASIGNACIÓN DE HABITACIONES
                        </h2>
                        <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* COLUMNA IZQUIERDA: LISTA DE REQUISITOS */}
                        <div className="flex w-full flex-col border-r border-gray-100 bg-white p-6 md:w-1/3 lg:w-1/4 overflow-y-auto">
                            <div className="mb-4">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600">Reserva de</p>
                                <h3 className="text-sm font-black uppercase text-gray-800">{reservation.guest?.full_name}</h3>
                                
                                {/* Etiqueta visual de los días faltantes para que el recepcionista lo sepa */}
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-green-500">
                                    <Calendar className="h-3 w-3" />
                                    {daysUntilArrival === 0 ? 'Llega Hoy' : 
                                     daysUntilArrival === 1 ? 'Llega Mañana' : 
                                     daysUntilArrival < 0 ? 'Reserva Pasada' : 
                                     `Llega en ${daysUntilArrival} días`}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="mb-2 block text-xs font-bold uppercase text-gray-600">
                                    Requisitos ({Object.keys(localAssignments).length}/{reservation.details.length})
                                </label>
                                
                                {reservation.details.map((detail: any, idx: number) => {
                                    const isSelected = currentIndex === idx;
                                    const isAssigned = localAssignments[idx];

                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={`cursor-pointer rounded-xl border p-3 transition-colors duration-200 ${
                                                isSelected 
                                                ? 'border-green-400 bg-green-50 ring-2 ring-green-100 ring-offset-1' 
                                                : isAssigned 
                                                    ? 'border-gray-200 bg-gray-50 hover:bg-gray-100' 
                                                    : 'border-dashed border-gray-300 bg-white hover:border-green-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[11px] font-bold uppercase ${isSelected ? 'text-green-700' : 'text-gray-500'}`}>
                                                    Petición {idx + 1}
                                                </span>
                                                {isAssigned && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                            </div>
                                            <div className="mt-1 text-xs font-black text-gray-800 uppercase leading-tight">
                                                {detail.requested_room_type?.name}
                                            </div>
                                            <div className="text-[11px] font-bold text-gray-800 uppercase mt-0.5">
                                                Baño: {detail.requested_bathroom === 'private' ? 'Privado' : 'Compartido'}
                                            </div>
                                            {isAssigned && (
                                                <div className="mt-2 inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-[12px] font-bold text-green-700 border border-green-200">
                                                    Hab. {isAssigned.number}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: GRILLA DE HABITACIONES */}
                        <div className="flex flex-1 flex-col bg-gray-50">
                            <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm z-10 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-black text-gray-800 uppercase">
                                        {activeDetail?.requested_room_type?.name}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Filtro: Baño {activeDetail?.requested_bathroom === 'private' ? 'Privado' : activeDetail?.requested_bathroom === 'shared' ? 'Compartido' : 'No especificado'}
                                    </p>
                                </div>
                                
                                <div className="relative w-48">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-3.5 w-3.5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="BUSCAR HAB..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 w-full rounded-lg border-gray-200 bg-gray-50 pl-9 pr-2 text-[10px] font-bold text-gray-900 uppercase focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 relative">
                                {filteredRooms.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 py-12 shadow-sm">
                                        <AlertTriangle className="h-12 w-12 opacity-20 mb-3 text-orange-500" />
                                        <p className="text-xs font-bold uppercase text-center max-w-xs">
                                            {searchQuery 
                                                ? `No se encontró "${searchQuery}"` 
                                                : `No hay habitaciones disponibles para esta fecha con el baño especificado.`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                        {filteredRooms.map((room) => {
                                            const isSelected = localAssignments[currentIndex]?.id === room.id;
                                            
                                            const priceInfo = getRoomPriceInfo(room);
                                            const roomBath = priceInfo?.bathroom_type || 'N/A';
                                            const translatedBath = roomBath.toLowerCase().includes('private') ? 'Privado' : roomBath.toLowerCase().includes('shared') ? 'Compartido' : roomBath;
                                            const roomPrice = priceInfo?.amount || 0;
                                            
                                            const roomStatus = room.status?.toUpperCase() || 'DESCONOCIDO';
                                            const isFree = roomStatus === 'LIBRE' || roomStatus === 'DISPONIBLE';
                                            const isOccupied = roomStatus === 'OCUPADO';
                                            
                                            const statusBadgeColor = isFree ? 'bg-green-100 text-green-700 border-green-200' :
                                                                     isOccupied ? 'bg-red-100 text-red-700 border-red-200' :
                                                                     'bg-orange-100 text-orange-700 border-orange-200';

                                            return (
                                                <button
                                                    key={room.id}
                                                    onClick={() => handleSelectRoom(room)}
                                                    className={`group relative flex flex-col items-center justify-center text-center outline-none border-2 rounded-xl p-4 transition-all duration-200 ${
                                                        isSelected 
                                                        ? 'border-green-500 bg-green-50 shadow-md scale-105 ring-2 ring-green-200 ring-offset-1' 
                                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 shadow-sm'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                                        {room.room_type?.name || activeDetail?.requested_room_type?.name}
                                                    </span>
                                                    
                                                    <span className={`text-3xl font-black ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>
                                                        {room.number}
                                                    </span>

                                                    <div className="flex flex-col gap-1 mt-2 w-full px-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase w-full ${statusBadgeColor}`}>
                                                            {roomStatus}
                                                        </span>
                                                        
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200">
                                                                Baño {translatedBath}
                                                            </span>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200">
                                                                Bs {roomPrice}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                        <button onClick={onClose} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button
                            onClick={() => setShowSummary(true)}
                            disabled={!allAssigned}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-green-500 disabled:opacity-50"
                        >
                            {allAssigned ? 'Revisar y Guardar' : 'Faltan Habitaciones'} 
                            {allAssigned && <ArrowRight className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/* 🛡️ PANTALLA DE RESUMEN Y CONFIRMACIÓN     */}
            {/* ========================================== */}
            {showSummary && (
                <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
                    <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        
                        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <Save className="h-5 w-5 text-green-600" />
                                RESUMEN DE ASIGNACIÓN
                            </h2>
                        </div>

                        <div className="p-6">
                            <p className="mb-4 text-base font-medium text-gray-600">
                                Estás a punto de asignar estas habitaciones para la reserva de <strong className="text-gray-900">{reservation.guest?.full_name}</strong>.
                            </p>

                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {reservation.details.map((detail: any, idx: number) => {
                                    const assignedRoom = localAssignments[idx];
                                    
                                    const priceInfo = getRoomPriceInfo(assignedRoom);
                                    const roomBath = priceInfo?.bathroom_type || detail.requested_bathroom;
                                    const translatedBath = roomBath?.toLowerCase().includes('private') ? 'Privado' : 'Compartido';

                                    return (
                                        <div key={idx} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                                            <div>
                                                <div className="text-[13px] font-bold uppercase text-gray-800">
                                                    Requisito #{idx + 1}
                                                </div>
                                                <div className="text-base font-black uppercase text-gray-800">
                                                    {detail.requested_room_type?.name}
                                                </div>
                                                <div className="text-[11px] font-bold text-gray-600 uppercase mt-0.5">
                                                    Baño: {translatedBath}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <ArrowRight className="h-5 w-5 text-gray-300" />
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold uppercase text-green-600">
                                                        Asignada
                                                    </div>
                                                    <div className="text-xl font-black text-gray-900">
                                                        Hab. {assignedRoom?.number || '?'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                            <button 
                                onClick={() => setShowSummary(false)}
                                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                            >
                                <Undo2 className="h-4 w-4" /> Retroceder
                            </button>
                            <button 
                                onClick={submitFinal}
                                disabled={isProcessing}
                                className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isProcessing ? 'Guardando...' : 'Confirmar Asignación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}