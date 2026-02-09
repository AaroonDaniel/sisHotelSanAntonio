import { useForm } from '@inertiajs/react';
import { 
    ArrowRightLeft, 
    Users, 
    BedDouble, 
    AlertTriangle, 
    X,
    CheckCircle2
} from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';

interface TransferModalProps {
    show: boolean;
    onClose: () => void;
    checkin: any;
    availableRooms: any[]; 
    occupiedRooms: any[]; 
}

export default function TransferModal({ 
    show, 
    onClose, 
    checkin, 
    availableRooms = [], 
    occupiedRooms = [] 
}: TransferModalProps) {
    
    const [mode, setMode] = useState<'individual' | 'group'>('individual');

    const { data, setData, put, processing, reset, errors, clearErrors } = useForm({
        new_room_id: '',
        target_room_id: '',
    });

    useEffect(() => {
        if (!show) {
            reset();
            clearErrors();
            setMode('individual');
        }
    }, [show]);

    const handleModeChange = (newMode: 'individual' | 'group') => {
        setMode(newMode);
        reset();
        clearErrors();
    };

    if (!show || !checkin) return null;

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        
        // --- DIAGNÓSTICO: Ver en consola qué ID estamos usando ---
        console.log("Checkin ID:", checkin?.id);
        
        if (!checkin?.id) {
            alert("Error: No se encontró el ID del checkin.");
            return;
        }

        if (mode === 'individual') {
            // URL Manual
            const url = `/checkins/${checkin.id}/transfer`;
            console.log("Enviando a URL:", url); // <--- MIRA ESTO EN LA CONSOLA DEL NAVEGADOR

            put(url, {
                onSuccess: () => { 
                    reset(); 
                    onClose(); 
                },
            });
        } else {
            if(!confirm(`⚠️ ATENCIÓN ⚠️\n\nEstás a punto de cerrar la cuenta de ${checkin.guest.full_name} y unirlo a otra habitación.\n\nLa habitación actual quedará en LIMPIEZA.\n\n¿Confirmar?`)) {
                return;
            }

            const url = `/checkins/${checkin.id}/merge`;
            console.log("Enviando a URL (Merge):", url);

            put(url, {
                onSuccess: () => { 
                    reset(); 
                    onClose(); 
                },
            });
        }
    };

    const individualOptions = availableRooms.filter(r => r.id !== checkin.room_id);
    const groupOptions = occupiedRooms.filter(r => r.id !== checkin.room_id);

    return (
        <div className="fixed inset-0 z-[70] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in zoom-in-95">
            <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* HEADER */}
                <div className={`relative px-6 py-5 text-white transition-colors duration-300 ${mode === 'individual' ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 rounded-full p-1 text-white/50 hover:bg-white/20 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <h2 className="flex items-center gap-2 text-xl font-bold">
                        {mode === 'individual' ? <ArrowRightLeft className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                        {mode === 'individual' ? 'Cambio de Habitación' : 'Unirse a Grupo'}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-white/80">
                        Huésped: <span className="font-bold text-white uppercase">{checkin.guest?.full_name}</span>
                    </p>
                    <p className="text-xs text-white/80">
                        Habitación Actual: <span className="font-mono font-bold bg-white/20 px-1 rounded">{checkin.room?.number}</span>
                    </p>
                </div>

                {/* TABS */}
                <div className="flex border-b border-gray-100 bg-gray-50">
                    <button
                        type="button"
                        onClick={() => handleModeChange('individual')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                            mode === 'individual' 
                            ? 'border-b-2 border-indigo-600 bg-white text-indigo-700 shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Individual
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange('group')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                            mode === 'group' 
                            ? 'border-b-2 border-purple-600 bg-white text-purple-700 shadow-sm' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Grupal (Fusión)
                    </button>
                </div>

                {/* FORMULARIO */}
                <form onSubmit={handleSubmit} className="p-6">
                    
                    <div className={`mb-6 rounded-xl border p-4 text-xs shadow-sm ${mode === 'individual' ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-orange-100 bg-orange-50 text-orange-800'}`}>
                        {mode === 'individual' ? (
                            <div className="flex gap-3">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-500" />
                                <div>
                                    <p className="font-bold">Transferencia Estándar</p>
                                    <p className="mt-1 opacity-80">
                                        Mueve al huésped a una habitación vacía. La fecha de ingreso se mantiene.
                                        La habitación actual pasará a <span className="font-bold">LIMPIEZA</span>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500" />
                                <div>
                                    <p className="font-bold">Fusión de Cuentas</p>
                                    <p className="mt-1 opacity-80">
                                        Cierra la cuenta actual y agrega a este huésped como <b>Acompañante</b> en otra habitación.
                                        La habitación actual pasará a <span className="font-bold">LIMPIEZA</span>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-bold text-gray-700">
                            {mode === 'individual' ? 'Seleccionar Habitación Destino (Libre)' : 'Seleccionar Habitación del Grupo (Ocupada)'}
                        </label>
                        
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                {mode === 'individual' ? <BedDouble className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                            </div>
                            
                            {mode === 'individual' ? (
                                <select
                                    value={data.new_room_id}
                                    onChange={(e) => setData('new_room_id', e.target.value)}
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-3 pl-10 text-sm font-semibold text-gray-800 focus:border-indigo-500 focus:ring-indigo-500"
                                    required
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {individualOptions.map((room) => (
                                        <option key={room.id} value={room.id}>
                                            Hab. {room.number} - {room.room_type?.name} (Bs. {room.price?.amount})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    value={data.target_room_id}
                                    onChange={(e) => setData('target_room_id', e.target.value)}
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-3 pl-10 text-sm font-semibold text-gray-800 focus:border-purple-500 focus:ring-purple-500"
                                    required
                                >
                                    <option value="">-- Seleccionar Grupo --</option>
                                    {groupOptions.map((room) => (
                                        <option key={room.id} value={room.id}>
                                            Hab. {room.number} ({room.room_type?.name}) - {room.checkins?.[0]?.guest?.full_name || 'Sin nombre'}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        
                        {errors.new_room_id && mode === 'individual' && (
                            <p className="mt-2 text-xs font-bold text-red-600">{errors.new_room_id}</p>
                        )}
                        {errors.target_room_id && mode === 'group' && (
                            <p className="mt-2 text-xs font-bold text-red-600">{errors.target_room_id}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing || (mode === 'individual' ? !data.new_room_id : !data.target_room_id)}
                            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                                mode === 'individual' 
                                ? 'bg-indigo-600 hover:bg-indigo-500' 
                                : 'bg-purple-600 hover:bg-purple-500'
                            }`}
                        >
                            {processing ? 'Procesando...' : mode === 'individual' ? 'Confirmar Cambio' : 'Unirse al Grupo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}