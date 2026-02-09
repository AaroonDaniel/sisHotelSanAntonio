import { useForm } from '@inertiajs/react';
import { 
    ArrowRightLeft, 
    Users, 
    BedDouble, 
    AlertTriangle, 
    CheckCircle2,
    Filter,
    Building2
} from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';
import ConfirmTransferModal from '@/components/ConfirmTransferModal'; // Asegúrate que la ruta sea correcta

interface TransferModalProps {
    show: boolean;
    onClose: () => void;
    checkin: any;
    availableRooms: any[]; 
    occupiedRooms: any[];
    blocks: any[];
}

export default function TransferModal({ 
    show, 
    onClose, 
    checkin, 
    availableRooms = [], 
    occupiedRooms = [],
    blocks = []
}: TransferModalProps) {
    
    const [mode, setMode] = useState<'individual' | 'group'>('individual');
    
    // Estados para los filtros visuales
    const [selectedBlock, setSelectedBlock] = useState<string>('');
    const [selectedBathroom, setSelectedBathroom] = useState<string>('');

    // Estado para el modal de confirmación
    const [showConfirm, setShowConfirm] = useState(false);  

    const { data, setData, put, processing, reset, errors, clearErrors } = useForm({
        new_room_id: '',
        target_room_id: '',
    });

    // Resetear al abrir/cerrar
    useEffect(() => {
        if (!show) {
            reset();
            clearErrors();
            setMode('individual');
            setSelectedBlock('');
            setSelectedBathroom('');
            setShowConfirm(false);
        }
    }, [show]);

    const handleModeChange = (newMode: 'individual' | 'group') => {
        setMode(newMode);
        reset();
        clearErrors();
        setSelectedBlock('');
        setSelectedBathroom('');
    };

    if (!show || !checkin) return null;

    // 1. Primer Submit: Solo abre el modal de confirmación
    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    // 2. Segundo Submit: Ejecuta la acción real (llamado desde el modal hijo)
    const handleConfirmAction = () => {
        const url = mode === 'individual' 
            ? `/checkins/${checkin.id}/transfer`
            : `/checkins/${checkin.id}/merge`;

        put(url, { 
            onSuccess: () => { 
                setShowConfirm(false);
                reset(); 
                onClose(); 
            },
            onError: () => setShowConfirm(false)
        });
    };

    // --- LÓGICA DE FILTRADO ---
    const baseList = mode === 'individual' ? availableRooms : occupiedRooms;

    const filteredRooms = baseList.filter(room => {
        if (room.id === checkin.room_id) return false;
        if (selectedBlock && String(room.block_id) !== selectedBlock) return false;
        if (selectedBathroom && room.price?.bathroom_type !== selectedBathroom) return false;
        return true;
    });

    // Helper para seleccionar habitación
    const handleSelectRoom = (roomId: string) => {
        if (mode === 'individual') {
            setData('new_room_id', roomId);
        } else {
            setData('target_room_id', roomId);
        }
    };

    // Saber cuál está seleccionada actualmente
    const currentSelectedId = mode === 'individual' ? data.new_room_id : data.target_room_id;

    // Helper para obtener el número de habitación destino (para mostrar en la alerta)
    const getTargetRoomNumber = () => {
        const room = [...availableRooms, ...occupiedRooms].find(r => String(r.id) === String(currentSelectedId));
        return room ? room.number : '???';
    };

    return (
        <>
            <div className="fixed inset-0 z-[50] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in zoom-in-95">
                {/* CONTENEDOR PRINCIPAL */}
                <div className="flex h-[70vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                    
                    {/* --- COLUMNA IZQUIERDA --- */}
                    <div className="flex w-full flex-col border-r border-gray-200 bg-white md:w-4/12 lg:w-3/12">
                        <div className={`relative px-6 py-6 text-white transition-colors duration-300 ${mode === 'individual' ? 'bg-emerald-600' : 'bg-emerald-600'}`}>
                            <h2 className="flex items-center gap-2 text-xl font-bold">
                                {mode === 'individual' ? <ArrowRightLeft className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                                {mode === 'individual' ? 'Transferencia' : 'Fusión Grupal'}
                            </h2>
                            <p className="mt-2 text-xs font-medium text-white/80">
                                Huésped: <span className="font-bold text-white uppercase">{checkin.guest?.full_name}</span>
                            </p>
                            <p className="text-xs text-white/80">
                                Origen: <span className="font-mono font-bold bg-white/20 px-1 rounded">Hab. {checkin.room?.number}</span>
                            </p>
                        </div>

                        <div className="flex border-b border-gray-100 bg-gray-50">
                            <button onClick={() => handleModeChange('individual')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${mode === 'individual' ? 'border-b-2 border-emerald-600 bg-white text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
                                Individual
                            </button>
                            <button onClick={() => handleModeChange('group')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${mode === 'group' ? 'border-b-2 border-emerald-600 bg-white text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}>
                                Grupal
                            </button>
                        </div>

                        <div className="flex flex-1 flex-col justify-between p-6">
                            <div className={`rounded-xl border p-4 text-xs shadow-sm ${mode === 'individual' ? 'border-blue-100 bg-blue-50 text-emerald-800' : 'border-orange-100 bg-orange-50 text-orange-800'}`}>
                                {mode === 'individual' ? (
                                    <div className="flex gap-3">
                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                                        <div>
                                            <p className="font-bold">Cambio de Habitación</p>
                                            <p className="mt-1 opacity-80">La habitación actual pasará a <span className="font-bold">LIMPIEZA</span>. El costo se recalculará.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
                                        <div>
                                            <p className="font-bold">Unirse a Grupo</p>
                                            <p className="mt-1 opacity-80">Se cerrará la cuenta actual y el huésped se unirá como <b>Acompañante</b>.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex flex-col gap-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={processing || !currentSelectedId}
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                                        mode === 'individual' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500'
                                    }`}
                                >
                                    {processing ? 'Procesando...' : 'Confirmar Operación'}
                                </button>
                                <button onClick={onClose} type="button" className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA --- */}
                    <div className="flex flex-1 flex-col bg-gray-50/50">
                        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Filter className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Filtros:</span>
                            </div>
                            <div className="relative">
                                <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                <select 
                                    value={selectedBlock}
                                    onChange={(e) => setSelectedBlock(e.target.value)}
                                    className="h-9 rounded-lg border-gray-200 bg-gray-50 pl-8 pr-8 text-xs font-bold text-gray-600 focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">Todos los Bloques</option>
                                    {blocks.map((block: any) => (
                                        <option key={block.id} value={block.id}>{block.description}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex rounded-lg bg-gray-100 p-1">
                                <button onClick={() => setSelectedBathroom(selectedBathroom === 'private' ? '' : 'private')} className={`rounded px-3 py-1 text-[10px] font-bold uppercase transition-all ${selectedBathroom === 'private' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Privado</button>
                                <button onClick={() => setSelectedBathroom(selectedBathroom === 'shared' ? '' : 'shared')} className={`rounded px-3 py-1 text-[10px] font-bold uppercase transition-all ${selectedBathroom === 'shared' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Compartido</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {filteredRooms.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                    <BedDouble className="h-12 w-12 opacity-20" />
                                    <p className="mt-4 text-sm font-medium">No hay habitaciones disponibles con estos filtros.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {filteredRooms.map((room) => {
                                        const isSelected = String(room.id) === String(currentSelectedId);
                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => handleSelectRoom(String(room.id))}
                                                className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200 ${isSelected ? 'scale-95 border-emerald-500 ring-2 ring-emerald-500 ring-offset-2' : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'}`}
                                            >
                                                <div className={`flex w-full items-center justify-between px-3 py-2 text-xs font-bold ${isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-600 group-hover:bg-indigo-50 group-hover:text-emerald-700'}`}>
                                                    <span>Hab. {room.number}</span>
                                                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                </div>
                                                <div className="flex flex-1 flex-col items-center justify-center p-3 text-center">
                                                    <div className={`mb-2 rounded-full p-2 ${mode === 'individual' ? 'bg-emerald-100 text-emerald-600' : 'bg-cyan-100 text-cyan-600'}`}>
                                                        {mode === 'individual' ? <BedDouble className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                                    </div>
                                                    <p className="text-[10px] font-bold uppercase leading-tight text-gray-700">{room.room_type?.name || 'Habitación'}</p>
                                                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">{room.price?.bathroom_type === 'private' ? 'B. Priv' : 'B. Comp'}</span>
                                                        {mode === 'individual' && (<span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">Bs {room.price?.amount}</span>)}
                                                    </div>
                                                    {mode === 'group' && (
                                                        <div className="mt-2 w-full rounded bg-cyan-50 px-1 py-1 text-[9px] font-bold text-cyan-800 truncate">{room.checkins?.[0]?.guest?.full_name || 'Ocupado'}</div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- AQUÍ SE RENDERIZA EL NUEVO MODAL DE CONFIRMACIÓN --- */}
            <ConfirmTransferModal 
                show={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirmAction}
                type={mode}
                guestName={checkin.guest?.full_name}
                targetRoomNumber={getTargetRoomNumber()}
                processing={processing}
            />
        </>
    );
}