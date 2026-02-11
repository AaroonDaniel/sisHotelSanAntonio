import ConfirmTransferModal from '@/components/ConfirmTransferModal';
import { useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    BedDouble,
    Building2,
    CheckCircle2,
    Filter,
    Search,
    Tag,
    Users,
    X
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface TransferModalProps {
    show: boolean;
    onClose: () => void;
    checkin: any;
    availableRooms: any[];
    occupiedRooms: any[];
    blocks: any[];
    roomTypes?: any[];
}

export default function TransferModal({
    show,
    onClose,
    checkin,
    availableRooms = [],
    occupiedRooms = [],
    blocks = [],
    roomTypes = []
}: TransferModalProps) {

    const [mode, setMode] = useState<'individual' | 'group'>('individual');
    
    // Estados de Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBlock, setSelectedBlock] = useState<string>('');
    const [selectedRoomType, setSelectedRoomType] = useState<string>('');
    const [selectedBathroom, setSelectedBathroom] = useState<string>('');

    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, put, processing, reset, clearErrors } = useForm({
        new_room_id: '',
        target_room_id: '',
    });

    useEffect(() => {
        if (!show) {
            resetFilters();
            setShowConfirm(false);
        }
    }, [show]);

    const handleModeChange = (newMode: 'individual' | 'group') => {
        setMode(newMode);
        resetFilters();
    };

    const resetFilters = () => {
        reset();
        clearErrors();
        setSearchQuery('');
        setSelectedBlock('');
        setSelectedRoomType('');
        setSelectedBathroom('');
    };

    if (!show || !checkin) return null;

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const handleConfirmAction = () => {
        const url = mode === 'individual'
            ? `/checkins/${checkin.id}/transfer`
            : `/checkins/${checkin.id}/merge`;

        put(url, {
            onSuccess: () => {
                setShowConfirm(false);
                resetFilters();
                onClose();
            },
            onError: () => setShowConfirm(false)
        });
    };

    // --- LÓGICA DE FILTRADO CORREGIDA ---
    const baseList = mode === 'individual' ? availableRooms : occupiedRooms;

    const filteredRooms = baseList.filter(room => {
        // 1. Excluir habitación actual
        if (room.id === checkin.room_id) return false;

        // 2. Buscador INTELIGENTE (Solución al problema "A" vs "a")
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim(); // Convertimos búsqueda a minúsculas
            const roomNumber = String(room.number).toLowerCase(); // Convertimos hab a texto minúsculas
            
            // Ahora "a" encontrará "A", "10" encontrará "101", etc.
            if (!roomNumber.includes(query)) return false;
        }

        // 3. Filtros Exactos
        if (selectedBlock && String(room.block_id) !== selectedBlock) return false;
        if (selectedRoomType && String(room.room_type_id) !== selectedRoomType) return false;
        if (selectedBathroom && room.price?.bathroom_type !== selectedBathroom) return false;

        return true;
    });

    const handleSelectRoom = (roomId: string) => {
        if (mode === 'individual') {
            setData('new_room_id', roomId);
        } else {
            setData('target_room_id', roomId);
        }
    };

    const currentSelectedId = mode === 'individual' ? data.new_room_id : data.target_room_id;

    const getTargetRoomNumber = () => {
        const room = [...availableRooms, ...occupiedRooms].find(r => String(r.id) === String(currentSelectedId));
        return room ? room.number : '???';
    };

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        TRANSFERENCIA DE HABITACIÓN
                    </h2>

                    <button 
                        onClick={onClose} 
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* --- CONTENIDO PRINCIPAL --- */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* COLUMNA IZQUIERDA: DATOS Y MODO */}
                    <div className="flex w-full flex-col border-r border-gray-100 bg-white p-6 md:w-1/3 lg:w-1/4 overflow-y-auto">
                        
                        <div className="space-y-6">
                            {/* Datos del Huésped */}
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-500 uppercase">
                                    Huésped Actual
                                </label>
                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-800 uppercase">{checkin.guest?.full_name}</h3>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Origen</span>
                                        <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 border border-green-100">
                                            HAB. {checkin.room?.number}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Selector de Modo */}
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-500 uppercase">
                                    Tipo de Movimiento
                                </label>
                                <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50">
                                    <button 
                                        onClick={() => handleModeChange('individual')} 
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-[10px] font-bold uppercase transition-all ${
                                            mode === 'individual' 
                                            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' 
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        <ArrowRightLeft className="h-3 w-3" /> Individual
                                    </button>
                                    <button 
                                        onClick={() => handleModeChange('group')} 
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-[10px] font-bold uppercase transition-all ${
                                            mode === 'group' 
                                            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200' 
                                            : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        <Users className="h-3 w-3" /> Fusión
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className={`rounded-xl border p-4 text-xs ${mode === 'individual' ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-orange-100 bg-orange-50 text-orange-800'}`}>
                                {mode === 'individual' ? (
                                    <div className="flex gap-2">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="font-bold uppercase">CAMBIO SIMPLE</p>
                                            <p className="mt-1 opacity-80 leading-tight">La habitación actual quedará en LIMPIEZA.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="font-bold uppercase">UNIR A GRUPO</p>
                                            <p className="mt-1 opacity-80 leading-tight">Se unirá como acompañante a otra habitación ocupada.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto pt-6 space-y-3">
                            <button
                                onClick={handleSubmit}
                                disabled={processing || !currentSelectedId}
                                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    mode === 'individual' ? 'bg-green-600 hover:bg-green-500' : 'bg-green-600 hover:bg-green-500'
                                }`}
                            >
                                {processing ? 'PROCESANDO...' : 'CONFIRMAR CAMBIO'}
                            </button>
                            <button onClick={onClose} type="button" className="w-full rounded-xl border border-gray-300 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 uppercase">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: FILTROS Y GRILLA */}
                    <div className="flex flex-1 flex-col bg-gray-50">
                        
                        {/* --- BARRA DE FILTROS COMPACTA (UNA LÍNEA) --- */}
                        <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                
                                {/* 1. BUSCADOR (Primero, ocupa el espacio sobrante) */}
                                <div className="relative flex-1 min-w-[140px]">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-3.5 w-3.5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="BUSCAR..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 w-full rounded-lg border-gray-200 bg-gray-50 pl-9 pr-2 text-[10px] font-bold text-gray-900 uppercase focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>

                                {/* 2. FILTRO BLOQUE */}
                                <div className="relative">
                                    <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <select 
                                        value={selectedBlock}
                                        onChange={(e) => setSelectedBlock(e.target.value)}
                                        className="h-8 rounded-lg border-gray-200 bg-gray-50 pl-8 pr-6 text-[10px] font-bold uppercase text-gray-600 focus:border-green-500 focus:ring-green-500 cursor-pointer hover:bg-gray-100"
                                    >
                                        <option value="">Bloques</option>
                                        {blocks.map((block: any) => (
                                            <option key={block.id} value={block.id}>{block.description}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. FILTRO TIPO */}
                                <div className="relative">
                                    <Tag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <select 
                                        value={selectedRoomType}
                                        onChange={(e) => setSelectedRoomType(e.target.value)}
                                        className="h-8 rounded-lg border-gray-200 bg-gray-50 pl-8 pr-6 text-[10px] font-bold uppercase text-gray-600 focus:border-green-500 focus:ring-green-500 cursor-pointer hover:bg-gray-100"
                                    >
                                        <option value="">Todos</option>
                                        {roomTypes.map((type: any) => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. FILTRO BAÑO */}
                                <div className="flex rounded-lg bg-gray-100 p-0.5">
                                    <button 
                                        onClick={() => setSelectedBathroom(selectedBathroom === 'private' ? '' : 'private')} 
                                        className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'private' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Priv
                                    </button>
                                    <button 
                                        onClick={() => setSelectedBathroom(selectedBathroom === 'shared' ? '' : 'shared')} 
                                        className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'shared' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Comp
                                    </button>
                                </div>

                            </div>
                        </div>

                        {/* --- GRILLA DE HABITACIONES --- */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {filteredRooms.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                    <BedDouble className="h-12 w-12 opacity-20 mb-3" />
                                    <p className="text-xs font-bold uppercase">
                                        {searchQuery ? `No se encontró "${searchQuery}"` : 'No hay habitaciones disponibles.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                    {filteredRooms.map((room) => {
                                        const isSelected = String(room.id) === String(currentSelectedId);
                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => handleSelectRoom(String(room.id))}
                                                className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200 ${
                                                    isSelected 
                                                    ? 'scale-95 border-green-500 ring-2 ring-green-500 ring-offset-1 shadow-lg' 
                                                    : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
                                                }`}
                                            >
                                                <div className={`flex w-full items-center justify-between px-3 py-2 text-[10px] font-black uppercase ${
                                                    isSelected ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-500 group-hover:text-green-700'
                                                }`}>
                                                    <span>Hab. {room.number}</span>
                                                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                </div>
                                                
                                                <div className="flex flex-1 flex-col items-center justify-center p-3 text-center">
                                                    <div className={`mb-2 rounded-full p-2 ${isSelected ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400 group-hover:text-green-500'}`}>
                                                        {mode === 'individual' ? <BedDouble className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                                    </div>

                                                    <p className="text-[9px] font-bold uppercase text-gray-500 mb-1">{room.room_type?.name}</p>
                                                    
                                                    <div className="flex flex-wrap justify-center gap-1">
                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-gray-500">
                                                            {room.price?.bathroom_type === 'private' ? 'PRIV' : 'COMP'}
                                                        </span>
                                                        {mode === 'individual' && (
                                                            <span className="rounded bg-green-50 px-1.5 py-0.5 text-[8px] font-bold uppercase text-green-700 border border-green-100">
                                                                Bs {room.price?.amount}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {mode === 'group' && (
                                                        <div className="mt-2 w-full truncate rounded bg-cyan-50 px-1 py-1 text-[8px] font-bold uppercase text-cyan-700 border border-cyan-100">
                                                            {room.checkins?.[0]?.guest?.full_name || 'OCUPADO'}
                                                        </div>
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

            {/* Modal de Confirmación */}
            <ConfirmTransferModal 
                show={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirmAction}
                type={mode}
                guestName={checkin.guest?.full_name}
                targetRoomNumber={getTargetRoomNumber()}
                processing={processing}
            />
        </div>
    );
}