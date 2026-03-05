import { useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    ArrowLeft,
    Ban,
    BedDouble,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    Info,
    Loader2,
    Save,
    Search,
    Tag,
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

// --- FUNCIONES DE UTILIDAD ---
const isMatchingBathroom = (dbVal?: string, filterVal?: string) => {
    const db = dbVal?.toLowerCase() || '';
    const filter = filterVal?.toLowerCase() || '';
    if (!filter) return true; 
    if (db === filter) return true;
    if ((filter === 'private' || filter === 'privado') && (db === 'private' || db === 'privado')) return true;
    if ((filter === 'shared' || filter === 'compartido') && (db === 'shared' || db === 'compartido')) return true;
    return false;
};

const getRoomBathroom = (r: any) => {
    if (r.price && !Array.isArray(r.price) && r.price.bathroom_type) return r.price.bathroom_type;
    if (r.prices && Array.isArray(r.prices) && r.prices.length > 0) return r.prices[0].bathroom_type;
    return 'N/A';
};

const translateBathroom = (bath: string) => {
    if (!bath) return 'Indiferente';
    const b = bath.toLowerCase();
    if (b === 'private' || b === 'privado') return 'Privado';
    if (b === 'shared' || b === 'compartido') return 'Compartido';
    return bath;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
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
    const [isFullyAssigned, setIsFullyAssigned] = useState(false);

    // Filtros
    const [strictFilter, setStrictFilter] = useState(true); 
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBlock, setSelectedBlock] = useState<string>(''); 
    const [selectedRoomType, setSelectedRoomType] = useState<string>(''); 
    const [selectedBathroom, setSelectedBathroom] = useState<string>(''); 
    
    const [isAssigning, setIsAssigning] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelingReservationId, setCancelingReservationId] = useState<number | null>(null);

    // Definición de modo para evitar error ts(2367)
    const mode: 'individual' | 'group' = 'individual'; 

    const blocks: any[] = Array.from(new Set(rooms?.map(r => r.block_id))).map(id => rooms.find(r => r.block_id === id)?.block).filter(Boolean);
    const roomTypes: any[] = Array.from(new Set(rooms?.map(r => r.room_type_id))).map(id => rooms.find(r => r.room_type_id === id)?.room_type).filter(Boolean);

    useEffect(() => {
        if (show) {
            setSelectedReservation(null);
            resetWizard();
        }
    }, [show, reservations]);

    const resetWizard = () => {
        setAssignments({});
        setCurrentStep(0);
        setTempSelectedRoom(null);
        setSearchQuery('');
        setSelectedBlock('');
        setSelectedRoomType('');
        setSelectedBathroom('');
        setIsFullyAssigned(false);
    };

    if (!show) return null;

    const handleClose = () => {
        setSelectedReservation(null);
        resetWizard();
        onClose();
    };

    const handleRowClick = (res: any) => {
        setSelectedReservation(res);
        resetWizard();
        setStrictFilter(true);

        if (res.details && res.details.length > 0) {
            const allAssigned = res.details.every((detail: any) => detail.room_id !== null);
            if (allAssigned) {
                const currentAssignments: Record<number, string> = {};
                res.details.forEach((d: any) => { currentAssignments[d.id] = String(d.room_id); });
                setAssignments(currentAssignments);
                setIsFullyAssigned(true);
            }
        }
    };

    const handleNext = () => {
        if (!currentDetail || !tempSelectedRoom) return;
        setAssignments(prev => ({ ...prev, [currentDetail.id]: tempSelectedRoom }));
        
        const nextStepIndex = currentStep + 1;
        if (nextStepIndex < detailsCount) {
            setCurrentStep(nextStepIndex);
            setTempSelectedRoom(assignments[selectedReservation.details[nextStepIndex].id] || null);
            setStrictFilter(true);
            setSearchQuery('');
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStep = currentStep - 1;
            setCurrentStep(prevStep);
            setTempSelectedRoom(assignments[selectedReservation.details[prevStep].id] || null);
        }
    };

    const handleAssignRooms = async () => {
        if (!selectedReservation) return;
        const finalAssignments = { ...assignments };
        if (currentDetail && tempSelectedRoom) finalAssignments[currentDetail.id] = tempSelectedRoom;

        setIsAssigning(true);
        console.log("🚀 [ENVIANDO ASIGNACIONES]: ", finalAssignments);

        try {
            // URL corregida a /reservas para coincidir con el backend
            const response = await axios.post(`/reservas/${selectedReservation.id}/assign-rooms`, {
                assignments: finalAssignments
            });
            if (response.data.success) {
                console.log("✅ [ÉXITO]: Habitaciones asignadas correctamente.");
                setAssignments(finalAssignments);
                setIsFullyAssigned(true);
                setIsAssigning(false);
            }
        } catch (error) {
            console.error("❌ [ERROR AL ASIGNAR]:", error);
            alert('Ocurrió un error al asignar las habitaciones. Revise la consola.');
            setIsAssigning(false);
        }
    };

    const handleConfirmCheckin = () => {
        console.log("🟢 [INICIANDO CHECK-IN]");
        alert("Iniciando llenado de datos para Check-in.");
    };

    const detailsCount = selectedReservation?.details?.length || 0;
    const currentDetail = selectedReservation && currentStep < detailsCount ? selectedReservation.details[currentStep] : null;
    const isReadyToAssign = selectedReservation && detailsCount > 0 && currentStep === detailsCount - 1 && tempSelectedRoom !== null;
    const currentSelectedId = tempSelectedRoom;

    let filteredRooms: any[] = [];
    let requestedRoomTypeName = "Desconocido";

    if (currentDetail && rooms) {
        const typeObj = rooms.find(r => r.room_type?.id.toString() === currentDetail.requested_room_type_id?.toString());
        requestedRoomTypeName = typeObj?.room_type?.name || "Cualquier Tipo";

        let baseList = rooms.filter(r => {
            const isLibre = ['available', 'disponible', 'libre', 'LIBRE'].includes(r.status);
            const isAlreadyAssignedInWizard = Object.entries(assignments).some(([dId, rId]) => rId === r.id.toString() && dId !== currentDetail.id.toString());
            return isLibre && !isAlreadyAssignedInWizard;
        });

        filteredRooms = baseList.filter(room => {
            if (searchQuery && !String(room.number).toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
            if (selectedBlock && String(room.block_id) !== selectedBlock) return false;
            if (selectedRoomType && String(room.room_type_id) !== selectedRoomType) return false;
            if (selectedBathroom && getRoomBathroom(room) !== selectedBathroom) return false;
            if (strictFilter) {
                const isTypeMatch = room.room_type?.id.toString() === currentDetail.requested_room_type_id?.toString();
                const isBathMatch = isMatchingBathroom(getRoomBathroom(room), currentDetail.requested_bathroom);
                if (!isTypeMatch || !isBathMatch) return false;
            }
            return true;
        });
    }

    const handleSelectRoom = (id: string) => setTempSelectedRoom(id);

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* --- HEADER --- */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 uppercase">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        Asignación de Reservas
                    </h2>
                    <button onClick={handleClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* PANEL IZQUIERDO */}
                    <div className="relative flex w-[45%] flex-col overflow-y-auto border-r border-gray-100 bg-white p-6">
                        <label className="mb-4 block text-xs font-bold text-gray-500 uppercase">Huéspedes Programados</label>
                        <div className="space-y-3">
                            {reservations.map((res) => {
                                const isSelected = selectedReservation?.id === res.id;
                                return (
                                    <div key={res.id} className="flex flex-col">
                                        <div onClick={() => handleRowClick(res)} className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${isSelected ? 'scale-[1.01] border-green-500 bg-green-50/60 shadow-lg ring-1 ring-green-500' : 'border-gray-200 bg-white hover:border-green-300'}`}>
                                            <div className="mb-2 flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold ${isSelected ? 'bg-green-600 text-white shadow-md' : 'bg-green-100 text-green-600'}`}>{res.guest?.full_name?.charAt(0)}</div>
                                                    <div>
                                                        <h3 className="text-sm font-black uppercase text-gray-900 leading-tight">{res.guest?.full_name || 'Sin Nombre'}</h3>
                                                        <p className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mt-0.5">CI: {res.guest?.identification_number || 'S/N'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                                                <div className="flex flex-col"><span className="text-[9px] font-bold text-gray-400 uppercase">Ingreso</span><span className="text-xs font-bold text-gray-800">{formatDate(res.arrival_date || res.expected_check_in)}</span></div>
                                                <div className="flex flex-col"><span className="text-[9px] font-bold text-gray-400 uppercase">Estadía</span><span className="text-xs font-bold text-gray-800"><Clock className="inline h-3 w-3 mr-1 text-green-500" />{res.duration_days || 1} Noche(s)</span></div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-top-2">
                                                <button onClick={(e) => { e.stopPropagation(); setCancelingReservationId(res.id); setIsCancelModalOpen(true); }} className="w-full bg-red-500 py-3 text-[11px] font-bold text-white uppercase hover:bg-red-600 transition">Anular Reserva</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="flex flex-1 flex-col bg-gray-50 overflow-hidden">
                        
                        {selectedReservation && !isFullyAssigned && currentDetail && (
                            <div className="px-6 pt-6 pb-2 shrink-0 bg-white">
                                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/80 p-3 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">ASIGNACIÓN</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-blue-900">{currentStep + 1}</span>
                                            <span className="text-sm font-bold text-blue-400">de {detailsCount}</span>
                                        </div>
                                    </div>
                                    <div className="hidden border-r border-l border-blue-200 px-6 text-center sm:block">
                                        <span className="block text-[10px] font-bold text-blue-400 uppercase">Requiere</span>
                                        <span className="block text-sm leading-tight font-black text-blue-900 uppercase">{requestedRoomTypeName}</span>
                                        <div className="mx-auto my-1 w-8 border-t border-blue-200/50"></div>
                                        <span className="block text-[10px] font-bold text-blue-500 uppercase">Baño {translateBathroom(currentDetail.requested_bathroom)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={handlePrev} disabled={currentStep === 0} className="rounded-lg border border-blue-200 bg-white p-2 text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-30 transition-all"><ChevronLeft className="h-5 w-5" /></button>
                                        <button type="button" onClick={handleNext} disabled={currentStep === detailsCount - 1 || !tempSelectedRoom} className={`rounded-lg border p-2 shadow-md transition-all ${currentStep === detailsCount - 1 || !tempSelectedRoom ? 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400' : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'}`}>
                                            {currentStep === detailsCount - 1 ? <Ban className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 flex flex-col overflow-hidden">
                            {!selectedReservation ? (
                                 <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-gray-400"><ArrowLeft className="mb-4 h-16 w-16 opacity-20 animate-pulse" /><h3 className="text-lg font-black tracking-widest uppercase">Seleccione una Reserva</h3></div>
                            ) : isFullyAssigned ? (
                                <div className="flex flex-1 flex-col items-center justify-center p-10 animate-in zoom-in-95 overflow-y-auto">
                                    <div className="bg-green-100 p-5 rounded-full mb-4 shadow-inner"><CheckCircle2 className="w-16 h-16 text-green-600" /></div>
                                    <h2 className="text-2xl font-black text-gray-800 uppercase mb-2 text-center">¡Todas las habitaciones asignadas!</h2>
                                    <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm text-sm">
                                        <h3 className="text-xs font-black text-gray-600 uppercase border-b pb-3 mb-4 tracking-widest">Resumen de Habitaciones:</h3>
                                        {selectedReservation.details.map((d: any) => (
                                            <div key={d.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2 border border-gray-200">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] text-gray-700 font-black uppercase tracking-wider">{requestedRoomTypeName}</span>
                                                    <span className="text-[10px] text-gray-500">(Baño {translateBathroom(d.requested_bathroom)})</span>
                                                    <span className="text-xs font-bold text-green-700 mt-1">Bs {d.price || '0.00'}</span>
                                                </div>
                                                <span className="text-lg font-black text-green-700 bg-green-100 px-4 py-1.5 rounded-md border border-green-200">HAB. {rooms.find(r => r.id === (d.room_id || Number(assignments[d.id])))?.number || '?'}</span>
                                            </div>
                                        ))}
                                        <div className="mt-4 border-t pt-4 flex justify-between items-center">
                                            <div className="flex flex-col"><span className="text-[10px] font-bold text-blue-500 uppercase">Adelanto Registrado</span><span className="text-xl font-black text-blue-900">Bs {selectedReservation.advance_payment || '0.00'}</span></div>
                                            <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-blue-500 uppercase">Método</span><span className="text-[11px] font-black text-blue-800 bg-blue-200 px-3 py-1 rounded-md uppercase tracking-widest">{selectedReservation.payment_type || 'EFECTIVO'}</span></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* BARRA DE FILTROS COMPACTA */}
                                    <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm z-10 shrink-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="relative flex-1 min-w-[140px]">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-3.5 w-3.5 text-gray-400" /></div>
                                                <input type="text" placeholder="BUSCAR HAB..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 w-full rounded-lg border-gray-200 bg-gray-50 pl-9 pr-2 text-[10px] font-bold text-gray-900 uppercase focus:border-green-500 focus:ring-green-500" />
                                            </div>
                                            <div className="relative">
                                                <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                                <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} className="h-8 rounded-lg border-gray-200 bg-gray-50 pl-8 pr-6 text-[10px] font-bold uppercase text-gray-600 focus:border-green-500 focus:ring-green-500 cursor-pointer hover:bg-gray-100">
                                                    <option value="">Bloques</option>
                                                    {blocks.map((block: any) => <option key={block.id} value={block.id}>{block.description}</option>)}
                                                </select>
                                            </div>
                                            <div className="relative">
                                                <Tag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                                <select value={selectedRoomType} onChange={(e) => setSelectedRoomType(e.target.value)} className="h-8 rounded-lg border-gray-200 bg-gray-50 pl-8 pr-6 text-[10px] font-bold uppercase text-gray-600 focus:border-green-500 focus:ring-green-500 cursor-pointer hover:bg-gray-100">
                                                    <option value="">Tipos</option>
                                                    {roomTypes.map((type: any) => <option key={type.id} value={type.id}>{type.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex rounded-lg bg-gray-100 p-0.5 border border-gray-200">
                                                <button onClick={() => setSelectedBathroom(selectedBathroom === 'private' ? '' : 'private')} className={`rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'private' ? 'bg-white text-green-700 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>Priv</button>
                                                <button onClick={() => setSelectedBathroom(selectedBathroom === 'shared' ? '' : 'shared')} className={`rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'shared' ? 'bg-white text-green-700 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>Comp</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GRILLA DE HABITACIONES */}
                                    <div className="flex-1 overflow-y-auto p-5">
                                        {filteredRooms.length === 0 ? (
                                            <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 py-12 shadow-sm"><BedDouble className="h-12 w-12 opacity-20 mb-3" /><p className="text-xs font-bold uppercase">No hay habitaciones disponibles.</p></div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                                {filteredRooms.map((room) => {
                                                    const isSelected = String(room.id) === String(currentSelectedId);
                                                    const roomBath = getRoomBathroom(room);
                                                    const translatedBath = roomBath === 'private' ? 'Privado' : 'Compartido';
                                                    const isPerfectMatch = room.room_type?.id.toString() === currentDetail?.requested_room_type_id?.toString() && isMatchingBathroom(roomBath, currentDetail?.requested_bathroom);
                                                    
                                                    return (
                                                        <button key={room.id} onClick={() => handleSelectRoom(String(room.id))} className={`group relative flex flex-col items-center justify-center text-center outline-none border-2 rounded-xl p-4 transition-all duration-200 ${isSelected ? 'border-green-500 bg-green-50 shadow-md scale-105 ring-2 ring-green-200 ring-offset-1 bg-white' : isPerfectMatch ? 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 shadow-sm' : 'border-dashed border-gray-300 bg-gray-50 opacity-60 hover:opacity-100'}`}>
                                                            {isSelected && <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm"><CheckCircle2 className="w-3 h-3" /></div>}
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{room.room_type?.name}</span>
                                                            <span className={`text-3xl font-black ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>{room.number}</span>
                                                            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}>Baño {translatedBath}</span>
                                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${isSelected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>Bs {room.price?.amount}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* --- FOOTER DEL MODAL --- */}
                        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex justify-between items-center z-20">
                            <button onClick={handleClose} className="rounded-xl bg-white border border-gray-300 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 shadow-sm transition-all uppercase text-[12px]">Cerrar Ventana</button>
                            <div className="flex gap-3">
                                {selectedReservation && (
                                    <button onClick={() => { setCancelingReservationId(selectedReservation.id); setIsCancelModalOpen(true); }} className="rounded-xl px-6 py-2.5 text-sm font-bold text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-all uppercase text-[12px]">Anular Reserva</button>
                                )}
                                {isFullyAssigned ? (
                                    <button onClick={handleConfirmCheckin} className="px-8 py-2.5 rounded-xl bg-green-600 text-white font-black uppercase hover:bg-green-700 shadow-md active:scale-95 text-[12px] flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Confirmar Reserva</button>
                                ) : isReadyToAssign && (
                                    <button onClick={handleAssignRooms} disabled={isAssigning} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-black uppercase hover:bg-blue-700 shadow-md active:scale-95 transition-all text-[12px] flex items-center gap-2">{isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Asignar Habitaciones</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <CancelModal show={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} actionUrl={cancelingReservationId ? `/reservas/${cancelingReservationId}` : null} />
        </div>
    );
}