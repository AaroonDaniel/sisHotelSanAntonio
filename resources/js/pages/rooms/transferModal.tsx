import ConfirmTransferModal from '@/components/ConfirmTransferModal';
import { useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    BedDouble,
    Building2,
    CheckCircle2,
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

    const { data, setData, processing, reset, clearErrors, post } = useForm({
        new_room_id: '',
        target_room_id: '',
        transfer_reason: '',
        selected_guests: [] as number[],
    });

    useEffect(() => {
        if(show && checkin) {
            resetFilters();
            setShowConfirm(false);
            
            setData('selected_guests', []);
        } else if (!show) {
            resetFilters();
            setShowConfirm(false);
        }
    }, [show, checkin]);

    // ==========================================
    // 🐞 MODO DEBUG: RASTREADOR DE HABITACIONES
    // ==========================================
    useEffect(() => {
        if (show) {
            console.group("🔍 DETALLES DEL MODAL DE TRANSFERENCIA");
            console.log("1. Modo actual:", mode);
            console.log("2. Habitación del huésped actual (ID):", checkin?.room_id);
            console.log("3. Habitaciones Libres recibidas (availableRooms):", availableRooms);
            console.log("4. Habitaciones Ocupadas recibidas (occupiedRooms):", occupiedRooms);
            console.log("5. Filtros activos:", { searchQuery, selectedBlock, selectedRoomType, selectedBathroom });
            console.log("6. RESULTADO FINAL MOSTRADO (filteredRooms):", filteredRooms);
            console.groupEnd();
        }
    }, [mode, availableRooms, occupiedRooms, show]);
    // ==========================================

    // 🚀 RESTAURADO: Función para cambiar el modo
    const handleModeChange = (newMode: 'individual' | 'group') => {
        setMode(newMode);
        resetFilters();
    };
    
    const handleToggleGuest = (id: number) => {
        let newSelected = [...data.selected_guests];
        if (newSelected.includes(id)){
            newSelected = newSelected.filter((gId) => gId !== id); 
        } else {
            newSelected.push(id);
        }
        setData('selected_guests', newSelected);
    } 

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

        post(url, {
            onSuccess: () => {
                setShowConfirm(false);
                resetFilters();
                onClose();
            },
            onError: () => setShowConfirm(false)
        });
    };

    // --- LÓGICA DE FILTRADO ---
    const baseList = mode === 'individual' ? availableRooms : occupiedRooms;

    const filteredRooms = baseList.filter(room => {
        // 1. Excluir habitación actual
        if (room.id === checkin.room_id) return false;

        // 2. Buscador
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            const roomNumber = String(room.number).toLowerCase();
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
    const getSelectedGuestNames = () => {
        if (!checkin || data.selected_guests.length === 0) return '';

        // Juntamos al titular y a los acompañantes en una sola lista
        const allGuests = [
            checkin.guest,
            ...(checkin.companions || [])
        ].filter(Boolean);

        // Filtramos solo los que están seleccionados y sacamos sus nombres
        const names = allGuests
            .filter(g => data.selected_guests.includes(g.id))
            .map(g => g.full_name);

        // Los unimos con comas (Ej: "Juan Perez, Maria Lopez")
        return names.join(' - ');
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
                            
                            {/* NUEVO BLOQUE: Selección interactiva de huéspedes con PARPADEO */}
                            <div className={`rounded-xl p-1 transition-all duration-300 ${
                                data.selected_guests.length === 0 
                                ? 'animate-pulse ring-2 ring-green-400 ring-offset-1 bg-green-50/50' 
                                : ''
                            }`}>
                                <label className={`mb-2 flex items-center justify-between text-xs font-bold uppercase transition-colors ${
                                    data.selected_guests.length === 0 ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                    <span>
                                        {data.selected_guests.length === 0 
                                            ? 'SELECCIONE A QUIÉN MOVER' 
                                            : 'Huéspedes a transferir'}
                                    </span>
                                    <span className="rounded bg-green-50 px-5 py-2 text-[12px] text-center text-green-700 border border-green-100">
                                        Hab. {checkin.room?.number}
                                    </span>
                                </label>
                                
                                <div className={`flex max-h-48 flex-col gap-2 overflow-y-auto rounded-xl border p-3 shadow-sm transition-colors ${
                                    data.selected_guests.length === 0 ? 'border-green-300 bg-white' : 'border-gray-200 bg-white'
                                }`}>
                                    {/* TITULAR */}
                                    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-gray-100 hover:bg-gray-50">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-800 uppercase">
                                                {checkin.guest?.full_name}
                                            </span>
                                            
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={data.selected_guests.includes(checkin.guest_id)}
                                            onChange={() => handleToggleGuest(checkin.guest_id)}
                                            className="h-5 w-5 cursor-pointer rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        />
                                    </label>
                                    
                                    {/* ACOMPAÑANTES */}
                                    {checkin.companions?.map((comp: any) => (
                                        <label
                                            key={comp.id}
                                            className="flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-gray-100 hover:bg-gray-50"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-800 uppercase">
                                                    {comp.full_name}
                                                </span>
                                                
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={data.selected_guests.includes(comp.id)}
                                                onChange={() => handleToggleGuest(comp.id)}
                                                className="h-5 w-5 cursor-pointer rounded border-gray-300 text-green-600 focus:ring-green-500"
                                            />
                                        </label>
                                    ))}
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
                                            <p className="mt-1 opacity-80 leading-tight">Mueve a los seleccionados a una habitación vacía.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="font-bold uppercase">UNIR A GRUPO</p>
                                            <p className="mt-1 opacity-80 leading-tight">Mueve a los seleccionados para unirlos a una habitación que ya está ocupada.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: FILTROS Y GRILLA */}
                    <div className="flex flex-1 flex-col bg-gray-50">
                        
                        {/* --- BARRA DE FILTROS COMPACTA (UNA LÍNEA) --- */}
                        <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm z-10">
                            <div className="flex flex-wrap items-center gap-2">
                                
                                {/* 1. BUSCADOR (Primero, ocupa el espacio sobrante) */}
                                <div className="relative flex-1 min-w-[140px]">
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
                                        <option value="">Tipos</option>
                                        {roomTypes.map((type: any) => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. FILTRO BAÑO */}
                                <div className="flex rounded-lg bg-gray-100 p-0.5 border border-gray-200">
                                    <button 
                                        onClick={() => setSelectedBathroom(selectedBathroom === 'private' ? '' : 'private')} 
                                        className={`rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'private' ? 'bg-green-50 text-green-700 shadow-sm border border-green-200' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Priv
                                    </button>
                                    <button 
                                        onClick={() => setSelectedBathroom(selectedBathroom === 'shared' ? '' : 'shared')} 
                                        className={`rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'shared' ? 'bg-green-50 text-green-700 shadow-sm border border-green-200' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Comp
                                    </button>
                                </div>

                            </div>
                        </div>

                        {/* --- GRILLA DE HABITACIONES (ESTILO RESERVA) --- */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {filteredRooms.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300 py-12 shadow-sm">
                                    <BedDouble className="h-12 w-12 opacity-20 mb-3" />
                                    <p className="text-xs font-bold uppercase">
                                        {searchQuery ? `No se encontró "${searchQuery}"` : 'No hay habitaciones disponibles.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    {filteredRooms.map((room) => {
                                        const isSelected = String(room.id) === String(currentSelectedId);
                                        const roomBath = room.price?.bathroom_type || 'N/A';
                                        const translatedBath = roomBath === 'private' ? 'Privado' : roomBath === 'shared' ? 'Compartido' : roomBath;

                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => handleSelectRoom(String(room.id))}
                                                className={`group relative flex flex-col items-center justify-center text-center outline-none border-2 rounded-xl p-4 transition-all duration-200 ${
                                                    isSelected 
                                                    ? 'border-green-500 bg-green-50 shadow-md scale-105 ring-2 ring-green-200 ring-offset-1' 
                                                    : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 shadow-sm'
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
                                                    {mode === 'individual' && (
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${isSelected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                            Bs {room.price?.amount}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* SI ES MODO GRUPAL, SE MUESTRA EL NOMBRE DEL OCUPANTE ACTUAL DE ESE CUARTO */}
                                                {mode === 'group' && room.checkins && room.checkins.length > 0 && (
                                                    <div className="mt-2 w-full truncate rounded bg-cyan-50 px-1.5 py-1 text-[8px] font-bold uppercase text-cyan-700 border border-cyan-100">
                                                        {room.checkins[0]?.guest?.full_name || 'OCUPADO'}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- FOOTER DEL MODAL (NUEVO Y ALINEADO A LA DERECHA) --- */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        type="button"
                        className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={processing || !currentSelectedId || data.selected_guests.length === 0}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? 'Procesando...' : 'Confirmar Cambio'}
                    </button>
                </div>
            </div>

            {/* Modal de Confirmación */}
            <ConfirmTransferModal 
                show={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirmAction}
                type={mode}
                guestName={getSelectedGuestNames()}
                targetRoomNumber={getTargetRoomNumber()}
                processing={processing}
            />
        </div>
    );
}