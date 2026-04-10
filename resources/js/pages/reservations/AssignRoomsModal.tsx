import { router } from '@inertiajs/react';
import { 
    Bed, 
    CheckCircle2, 
    ChevronRight, 
    ChevronLeft, 
    Save, 
    AlertCircle,
    Undo2,
    ArrowRight
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

interface Props {
    show: boolean;
    onClose: () => void;
    reservation: any; 
    availableRooms: any[];
}

export default function AssignRoomsModal({ show, onClose, reservation, availableRooms }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [localAssignments, setLocalAssignments] = useState<Record<number, any>>({});
    const [showSummary, setShowSummary] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (show) {
            setCurrentIndex(0);
            setLocalAssignments({});
            setShowSummary(false);
            setIsProcessing(false);
        }
    }, [show]);

    const activeDetail = reservation?.details[currentIndex];

    // Filtro Inteligente (Regla 1 a 1: Oculta las habitaciones que ya elegiste)
    const filteredRooms = useMemo(() => {
        if (!activeDetail) return [];
        const alreadyPickedIds = Object.values(localAssignments).map(r => r.id);
        
        return availableRooms.filter(room => 
            room.room_type_id === activeDetail.requested_room_type_id &&
            !alreadyPickedIds.includes(room.id)
        );
    }, [activeDetail, localAssignments, availableRooms]);

    const handleSelectRoom = (room: any) => {
        setLocalAssignments(prev => ({
            ...prev,
            [currentIndex]: room
        }));
        if (currentIndex < reservation.details.length - 1) {
            setTimeout(() => setCurrentIndex(currentIndex + 1), 300);
        }
    };

    // Guardado nativo SIN Ziggy usando router.post
    const submitFinal = () => {
        setIsProcessing(true);
        const payload = Object.entries(localAssignments).map(([idx, room]) => ({
            detail_id: reservation.details[idx].id,
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

    if (!show) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in">
                <div className="flex h-[85vh] w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-gray-100 shadow-2xl border border-white/20">
                    
                    {/* COLUMNA IZQUIERDA */}
                    <div className="w-1/3 bg-gray-900 p-8 flex flex-col">
                        <div className="mb-8">
                            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2">Reserva de</h3>
                            <h2 className="text-xl font-bold text-white uppercase">{reservation.guest?.full_name}</h2>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                            {reservation.details.map((detail: any, idx: number) => {
                                const isSelected = currentIndex === idx;
                                const isAssigned = localAssignments[idx];

                                return (
                                    <div 
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                                            isSelected 
                                            ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                                            : isAssigned 
                                                ? 'border-green-500/50 bg-green-500/5' 
                                                : 'border-gray-800 bg-gray-800/40 hover:border-gray-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-400' : 'text-gray-500'}`}>
                                                Habitación {idx + 1}
                                            </span>
                                            {isAssigned && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        </div>
                                        <div className="text-white font-bold text-sm mt-1">
                                            {detail.requested_room_type?.name}
                                        </div>
                                        {isAssigned && (
                                            <div className="mt-2 text-green-400 text-xs font-bold flex items-center gap-1">
                                                <ArrowRight className="w-3 h-3" /> Seleccionada: {isAssigned.number}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-800 flex gap-3">
                            <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={() => setShowSummary(true)}
                                disabled={Object.keys(localAssignments).length < reservation.details.length}
                                className="flex-[2] bg-white text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-500 hover:text-white transition-all"
                            >
                                Guardar Todo
                            </button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden">
                        <div className="p-8 bg-white border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase">
                                    {activeDetail?.requested_room_type?.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                        Baño {activeDetail?.requested_bathroom}
                                    </span>
                                    <span className="text-gray-400 text-xs font-medium">Asignando petición {currentIndex + 1} de {reservation.details.length}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    disabled={currentIndex === 0}
                                    onClick={() => setCurrentIndex(prev => prev - 1)}
                                    className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-20 transition-all border border-gray-200"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <button 
                                    disabled={currentIndex === reservation.details.length - 1}
                                    onClick={() => setCurrentIndex(prev => prev + 1)}
                                    className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-20 transition-all border border-gray-200"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                            {filteredRooms.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <AlertCircle className="w-16 h-16 text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-bold uppercase text-sm">No hay {activeDetail?.requested_room_type?.name} disponibles</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {filteredRooms.map((room: any) => (
                                        <button
                                            key={room.id}
                                            onClick={() => handleSelectRoom(room)}
                                            className="group relative bg-white border-2 border-gray-200 p-6 rounded-[2rem] flex flex-col items-center justify-center transition-all hover:border-blue-500 hover:shadow-xl active:scale-95"
                                        >
                                            <Bed className="w-8 h-8 text-gray-300 group-hover:text-blue-500 transition-colors mb-2" />
                                            <span className="text-xl font-black text-gray-800">{room.number}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Piso {room.floor?.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="mt-12 flex justify-center">
                                <button 
                                    onClick={() => {
                                        if (currentIndex < reservation.details.length - 1) setCurrentIndex(currentIndex + 1);
                                        else setShowSummary(true);
                                    }}
                                    className="flex items-center gap-3 bg-gray-900 text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95"
                                >
                                    {currentIndex < reservation.details.length - 1 ? 'Siguiente Habitación' : 'Finalizar Asignación'}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE RESUMEN FINAL */}
            {showSummary && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/90 p-4 backdrop-blur-sm animate-in zoom-in-95">
                    <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className="bg-blue-600 p-8 text-white">
                            <h2 className="text-2xl font-black uppercase leading-none mb-2">Resumen de Asignación</h2>
                            <p className="text-blue-100 text-sm font-medium opacity-80 italic">Verifica los números antes de ocupar el hotel.</p>
                        </div>

                        <div className="p-8 space-y-4">
                            {reservation.details.map((detail: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase">{detail.requested_room_type?.name}</div>
                                        <div className="text-gray-800 font-bold">Requisito #{idx + 1}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Habitación</div>
                                        <div className="text-2xl font-black text-gray-900">{localAssignments[idx]?.number}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button 
                                onClick={() => setShowSummary(false)}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                            >
                                <Undo2 className="w-4 h-4" /> Editar
                            </button>
                            <button 
                                onClick={submitFinal}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" /> {isProcessing ? 'Guardando...' : 'Confirmar Todo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}