import { useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Filter,
    Info,
    Loader2,
    Save,
    Search,
    Undo2,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import CancelModal from '@/components/cancelModal';

export interface PendingReservationsModalProps {
    show: boolean;
    onClose: () => void;
    reservations: any[]; 
    rooms: any[]; 
    onNewReservation?: () => void; 
}

// 🛠️ Función estricta para comparar baños
const isMatchingBathroom = (dbVal?: string, filterVal?: string) => {
    const db = dbVal?.toLowerCase() || '';
    const filter = filterVal?.toLowerCase() || '';
    if (!filter) return true; 
    if (db === filter) return true;
    if ((filter === 'private' || filter === 'privado') && (db === 'private' || db === 'privado')) return true;
    if ((filter === 'shared' || filter === 'compartido') && (db === 'shared' || db === 'compartido')) return true;
    return false;
};

// 🛠️ Función para leer el baño de la base de datos
const getRoomBathroom = (r: any) => {
    if (r.price && !Array.isArray(r.price) && r.price.bathroom_type) return r.price.bathroom_type;
    if (r.prices && Array.isArray(r.prices) && r.prices.length > 0) return r.prices[0].bathroom_type;
    return 'N/A';
};

// 🛠️ Traductor visual
const translateBathroom = (bath: string) => {
    if (!bath) return 'Indiferente';
    const b = bath.toLowerCase();
    if (b === 'private' || b === 'privado') return 'Privado';
    if (b === 'shared' || b === 'compartido') return 'Compartido';
    return bath;
};

export default function PendingReservationsModal({
    show,
    onClose,
    reservations,
    rooms,
    onNewReservation,
}: PendingReservationsModalProps) {
    
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

    const [assignments, setAssignments] = useState<Record<number, string>>({}); 
    const [currentStep, setCurrentStep] = useState<number>(0); 
    const [tempSelectedRoom, setTempSelectedRoom] = useState<string | null>(null); 
    
    // Filtros
    const [strictFilter, setStrictFilter] = useState(true); 
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isAssigning, setIsAssigning] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelingReservationId, setCancelingReservationId] = useState<number | null>(null);

    useEffect(() => {
        if (show) {
            setSelectedReservation(null);
            setAssignments({});
            setCurrentStep(0);
            setTempSelectedRoom(null);
            setSearchQuery('');
        }
    }, [show, reservations]);

    if (!show) return null;

    const handleClose = () => {
        setSelectedReservation(null);
        setAssignments({});
        setCurrentStep(0);
        setTempSelectedRoom(null);
        setSearchQuery('');
        onClose();
    };

    const handleRowClick = (res: any) => {
        setSelectedReservation(res);
        setAssignments({}); 
        setCurrentStep(0); 
        setTempSelectedRoom(null);
        setStrictFilter(true);
        setSearchQuery('');
    };

    const handleNextStep = () => {
        if (!currentDetail || !tempSelectedRoom) return;
        
        setAssignments(prev => ({ ...prev, [currentDetail.id]: tempSelectedRoom }));
        
        const nextStepIndex = currentStep + 1;
        setCurrentStep(nextStepIndex);
        
        if (selectedReservation.details[nextStepIndex]) {
            const nextDetailId = selectedReservation.details[nextStepIndex].id;
            const previouslyAssignedRoom = assignments[nextDetailId];
            setTempSelectedRoom(previouslyAssignedRoom || null);
        } else {
            setTempSelectedRoom(null); 
        }
        
        setStrictFilter(true);
        setSearchQuery('');
    };

    const handleUndoStep = () => {
        if (currentStep > 0) {
            const prevStep = currentStep - 1;
            const prevDetail = selectedReservation.details[prevStep];
            setCurrentStep(prevStep);
            setTempSelectedRoom(assignments[prevDetail.id] || null);
        }
    };

    const handleConfirmAssignment = async () => {
        if (!selectedReservation) return;
        setIsAssigning(true);
        try {
            const response = await axios.post(`/api/reservations/${selectedReservation.id}/assign-rooms`, {
                assignments: assignments
            });
            if (response.data.success) {
                window.location.reload(); 
            }
        } catch (error) {
            console.error(error);
            alert('Ocurrió un error al guardar.');
            setIsAssigning(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '---';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    // ========================================================
    // 🧠 MOTOR LÓGICO
    // ========================================================
    const detailsCount = selectedReservation?.details?.length || 0;
    const isQueueComplete = selectedReservation && detailsCount > 0 && currentStep === detailsCount;
    const currentDetail = selectedReservation && !isQueueComplete ? selectedReservation.details[currentStep] : null;

    let displayedRooms: any[] = [];
    let requestedRoomTypeName = "Desconocido";

    if (currentDetail && rooms) {
        const typeObj = rooms.find(r => r.room_type?.id.toString() === currentDetail.requested_room_type_id?.toString());
        requestedRoomTypeName = typeObj?.room_type?.name || "Cualquier Tipo";

        let availableRooms = rooms.filter(r => {
            const isLibre = ['available', 'disponible', 'libre'].includes(r.status?.toLowerCase() || '');
            const isAlreadyAssigned = Object.entries(assignments).some(([dId, rId]) => rId === r.id.toString() && dId !== currentDetail.id.toString());
            return isLibre && !isAlreadyAssigned;
        });

        if (strictFilter) {
            displayedRooms = availableRooms.filter(r => {
                const isTypeMatch = r.room_type?.id.toString() === currentDetail.requested_room_type_id?.toString();
                const roomBath = getRoomBathroom(r);
                const isBathMatch = isMatchingBathroom(roomBath, currentDetail.requested_bathroom);
                return isTypeMatch && isBathMatch;
            });
        } else {
            displayedRooms = availableRooms;
        }

        if (searchQuery) {
            displayedRooms = displayedRooms.filter(r => String(r.number).toLowerCase().includes(searchQuery.toLowerCase().trim()));
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 uppercase">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        Asignación de Reservas
                        <span className="ml-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                            ({reservations?.length || 0} PENDIENTES)
                        </span>
                    </h2>
                    <button onClick={handleClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* ==================================================== */}
                    {/* COLUMNA IZQUIERDA: LISTA DE RESERVAS                 */}
                    {/* ==================================================== */}
                    <div className="flex w-full flex-col border-r border-gray-100 bg-white p-6 md:w-1/3 lg:w-1/4 overflow-y-auto">
                        <label className="mb-4 block text-xs font-bold text-gray-500 uppercase">
                            Cola de Recepción
                        </label>

                        {reservations && reservations.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center pb-10 text-gray-400">
                                <CheckCircle2 className="mb-3 h-12 w-12 text-gray-400 opacity-20" />
                                <p className="text-sm font-bold tracking-wider text-gray-500 uppercase text-center">
                                    Todas las reservas asignadas
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reservations.map((res) => {
                                    const isSelected = selectedReservation?.id === res.id;
                                    return (
                                        <div
                                            key={res.id}
                                            onClick={() => handleRowClick(res)}
                                            className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ease-in-out ${
                                                isSelected
                                                    ? 'scale-[1.02] border-green-500 bg-white shadow-xl ring-2 ring-green-200'
                                                    : 'border-gray-200 bg-white hover:border-green-300 shadow-sm'
                                            } `}
                                        >
                                            <div className="mb-2 flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold transition-all ${isSelected ? 'bg-green-600 text-white shadow-md' : 'bg-green-100 text-green-600'} `}>
                                                        {res.guest?.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase text-gray-900 leading-tight">
                                                            {res.guest?.full_name || 'Sin Nombre'}
                                                        </h3>
                                                        <p className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mt-0.5">
                                                            CI: {res.guest?.identification_number || 'S/N'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">Ingreso</span>
                                                    <span className="flex items-center gap-1 text-xs font-bold text-gray-800">
                                                        <CalendarDays className="h-3 w-3 text-gray-400" />
                                                        {formatDate(res.arrival_date)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">Cuartos</span>
                                                    <span className="flex items-center gap-1 text-xs font-bold text-gray-800">
                                                        <BedDouble className="h-3 w-3 text-green-500" />
                                                        {res.details?.length || 0} Req.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ==================================================== */}
                    {/* COLUMNA DERECHA: EL WIZARD Y LA GRILLA ESTILO TRANSFER*/}
                    {/* ==================================================== */}
                    <div className="flex flex-1 flex-col bg-gray-50">
                        
                        {!selectedReservation ? (
                            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-gray-400 animate-in fade-in">
                                <ArrowLeft className="mb-4 h-16 w-16 opacity-20 animate-pulse" />
                                <h3 className="text-lg font-black tracking-widest text-gray-500 uppercase">
                                    Seleccione una Reserva
                                </h3>
                                <p className="mt-2 max-w-sm text-sm font-medium text-gray-400">
                                    Haga clic en una reserva de la izquierda para comenzar.
                                </p>
                            </div>
                        ) : detailsCount === 0 ? (
                            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center animate-in zoom-in-95">
                                <AlertCircle className="w-20 h-20 text-red-400 mb-4" />
                                <h3 className="text-2xl font-black text-gray-800 uppercase mb-2">Reserva Vacía</h3>
                                <p className="text-gray-500 max-w-md text-sm">
                                    Esta reserva fue guardada sin ningún requerimiento. Por favor anúlela.
                                </p>
                            </div>
                        ) : isQueueComplete ? (
                            // --- PANTALLA 3: CONFIRMACIÓN FINAL ---
                            <div className="flex flex-1 flex-col items-center justify-center p-10 animate-in zoom-in-95 duration-300">
                                <div className="bg-green-100 p-6 rounded-full mb-6 shadow-inner">
                                    <CheckCircle2 className="w-20 h-20 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-black text-gray-800 uppercase mb-2">¡Asignación Lista!</h2>
                                <p className="text-gray-500 text-center max-w-md mb-8 text-sm">
                                    Al confirmar, estas habitaciones pasarán a estado Reservado (Morado).
                                </p>
                                
                                <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm">
                                    <h3 className="text-xs font-black text-gray-600 uppercase border-b border-gray-100 pb-2 mb-3">
                                        Resumen de Habitaciones:
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedReservation.details.map((d: any, i: number) => {
                                            const roomAssigned = rooms.find(r => r.id.toString() === assignments[d.id]);
                                            const roomType = rooms.find(r => r.room_type?.id.toString() === d.requested_room_type_id?.toString())?.room_type?.name;
                                            return (
                                                <div key={d.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{roomType}</span>
                                                        <span className="text-[10px] text-gray-400">Baño {translateBathroom(d.requested_bathroom)}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-green-700 bg-green-100 px-3 py-1.5 rounded border border-green-200">
                                                        HAB. {roomAssigned?.number}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={handleUndoStep} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 transition flex items-center gap-2">
                                        <Undo2 className="w-4 h-4" /> Corregir
                                    </button>
                                    <button 
                                        onClick={handleConfirmAssignment} 
                                        disabled={isAssigning}
                                        className="px-8 py-2.5 rounded-xl bg-green-600 text-white font-black uppercase tracking-wider hover:bg-green-500 transition shadow-md active:scale-95 flex items-center gap-2"
                                    >
                                        {isAssigning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Confirmar Reserva
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // --- PANTALLA 2: EL WIZARD ---
                            <div className="flex flex-1 flex-col animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
                                
                                {/* CABECERA OSCURA DEL WIZARD */}
                                <div className="bg-slate-800 text-white p-5 md:p-6 relative shrink-0">
                                    <div className="absolute -top-10 -left-10 opacity-10">
                                        <BedDouble className="w-48 h-48" />
                                    </div>
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
                                                {requestedRoomTypeName}
                                            </h3>
                                            <span className="flex items-center gap-1.5 text-xs bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600 w-fit">
                                                <span className="text-slate-400 font-bold uppercase text-[10px]">Baño Requerido:</span>
                                                <span className="font-bold uppercase text-green-400">{translateBathroom(currentDetail?.requested_bathroom)}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-green-500">
                                                Asignación {currentStep + 1} de {detailsCount}
                                            </span>
                                            {selectedReservation.preferences && (
                                                <span className="text-[9px] text-yellow-300 flex items-center gap-1 italic max-w-[150px] text-right">
                                                    <Info className="w-3 h-3 shrink-0" /> {selectedReservation.preferences}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* BARRA DE FILTROS COMPACTA */}
                                <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm shrink-0 z-10">
                                    <div className="flex flex-wrap items-center gap-2 justify-between">
                                        
                                        <div className="relative flex-1 min-w-[140px] max-w-xs">
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

                                        <div className="flex rounded-lg bg-gray-100 p-0.5 border border-gray-200">
                                            <button 
                                                onClick={() => setStrictFilter(true)} 
                                                className={`flex items-center gap-1 rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${strictFilter ? 'bg-green-50 text-green-700 shadow-sm border border-green-200' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                <Filter className="w-3 h-3 shrink-0" /> Sugeridas
                                            </button>
                                            <button 
                                                onClick={() => setStrictFilter(false)} 
                                                className={`rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${!strictFilter ? 'bg-green-50 text-green-700 shadow-sm border border-green-200' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Todas Libres
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* --- GRILLA DE HABITACIONES (TU CÓDIGO) --- */}
                                <div className="flex-1 overflow-y-auto p-5">
                                    {displayedRooms.length === 0 ? (
                                        <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 py-12 shadow-sm">
                                            <BedDouble className="h-12 w-12 opacity-20 mb-3" />
                                            <p className="text-xs font-bold uppercase">
                                                {searchQuery ? `No se encontró "${searchQuery}"` : 'No hay habitaciones disponibles.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                            {displayedRooms.map((room) => {
                                                const isSelected = String(room.id) === String(tempSelectedRoom);
                                                const roomBath = getRoomBathroom(room);
                                                const translatedBath = roomBath === 'private' || roomBath === 'privado' ? 'Privado' : roomBath === 'shared' || roomBath === 'compartido' ? 'Compartido' : 'N/A';
                                                
                                                // Definimos si cumple o no para el diseño
                                                const isPerfectMatch = room.room_type?.id.toString() === currentDetail?.requested_room_type_id?.toString() && isMatchingBathroom(roomBath, currentDetail?.requested_bathroom);

                                                return (
                                                    <button
                                                        key={room.id}
                                                        onClick={() => setTempSelectedRoom(String(room.id))}
                                                        className={`group relative flex flex-col items-center justify-center text-center outline-none border-2 rounded-xl p-4 transition-all duration-200 ${
                                                            isSelected 
                                                            ? 'border-green-500 bg-green-50 shadow-md scale-105 ring-2 ring-green-200 ring-offset-1' 
                                                            : isPerfectMatch
                                                                ? 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 shadow-sm'
                                                                : 'border-dashed border-gray-300 bg-gray-50 opacity-60 hover:opacity-100'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                        
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                                            {room.room_type?.name}
                                                        </span>
                                                        
                                                        <span className={`text-3xl font-black ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>
                                                            {room.number}
                                                        </span>
                                                        
                                                        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                                                Baño {translatedBath}
                                                            </span>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${isSelected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                                Bs {room.price?.amount || '0'}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* FOOTER DEL WIZARD */}
                                <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-20">
                                    <button 
                                        onClick={handleUndoStep}
                                        disabled={currentStep === 0}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                                            currentStep > 0 
                                                ? 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-100' 
                                                : 'text-gray-300 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        <ArrowLeft className="w-4 h-4" /> Atrás
                                    </button>
                                    
                                    <button 
                                        onClick={handleNextStep}
                                        disabled={!tempSelectedRoom}
                                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md ${
                                            tempSelectedRoom 
                                                ? 'bg-green-600 text-white hover:bg-green-500 hover:shadow-lg active:scale-95' 
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        {currentStep === detailsCount - 1 ? 'Finalizar' : 'Siguiente'} 
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}