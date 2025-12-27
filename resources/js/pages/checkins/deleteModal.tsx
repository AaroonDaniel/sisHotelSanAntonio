import { useForm } from '@inertiajs/react';
import { 
    X, 
    Save, 
    BedDouble, 
    User, 
    Calendar, 
    Clock, 
    UserPlus, 
    Plus, 
    ShoppingBag, 
    ArrowRight,
    CheckCircle2,
    Briefcase,
    MapPin,
    Hash
} from 'lucide-react';
import { useEffect, FormEventHandler, useState } from 'react';

// --- Interfaces ---
interface Guest { id: number; full_name: string; identification: string; }
interface Room { id: number; number: string; status: string; type: string; }
interface Checkin { 
    id?: number; 
    guest_id: number; 
    room_id: number; 
    check_in_date: string; 
    duration: number; 
    services?: string[]; // Ejemplo para servicios
}

interface CheckinModalProps {
    show: boolean;
    onClose: () => void;
    guests: Guest[];
    rooms: Room[];
    checkinToEdit?: Checkin | null;
}

export default function CheckinModal({ 
    show, 
    onClose, 
    guests: initialGuests, // Renombramos prop para usar estado local
    rooms, 
    checkinToEdit 
}: CheckinModalProps) {
    
    // --- ESTADOS PARA PANELES LATERALES ---
    // 'none' = formulario normal | 'guest' = crear cliente | 'services' = agregar servicios
    const [sidePanel, setSidePanel] = useState<'none' | 'guest' | 'services'>('none');
    
    // Estado local de huéspedes (para poder agregar uno nuevo visualmente sin recargar página completa)
    const [localGuests, setLocalGuests] = useState<Guest[]>(initialGuests);

    // Formulario Principal (Check-in)
    const now = new Date().toISOString().slice(0, 16);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        guest_id: '',
        room_id: '',
        check_in_date: now,
        duration: 1,
        notes: '',
        selected_services: [] as string[]
    });

    // --- FORMULARIO SECUNDARIO: NUEVO HUÉSPED (Estado Local) ---
    const [newGuest, setNewGuest] = useState({
        first_name: '',
        last_name: '',
        identification: '',
        nationality: ''
    });

    // --- FORMULARIO SECUNDARIO: SERVICIOS (Estado Local) ---
    // Esto podría venir de BD, lo simulo aquí para el ejemplo
    const availableServices = [
        { id: '1', name: 'Desayuno Extra', price: 25 },
        { id: '2', name: 'Lavandería', price: 15 },
        { id: '3', name: 'Limpieza Extra', price: 30 },
        { id: '4', name: 'Minibar Pack', price: 50 },
    ];

    useEffect(() => {
        if (show) {
            setLocalGuests(initialGuests); // Resincronizar lista
            setSidePanel('none'); // Resetear vista
            if (checkinToEdit) {
                setData({
                    guest_id: checkinToEdit.guest_id.toString(),
                    room_id: checkinToEdit.room_id.toString(),
                    check_in_date: checkinToEdit.check_in_date,
                    duration: checkinToEdit.duration,
                    notes: '',
                    selected_services: checkinToEdit.services || []
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, checkinToEdit, initialGuests]);

    // --- MANEJADORES ---

    const toggleGuestPanel = () => {
        setSidePanel(sidePanel === 'guest' ? 'none' : 'guest');
    };

    const toggleServicePanel = () => {
        setSidePanel(sidePanel === 'services' ? 'none' : 'services');
    };

    // Función simulada para "Guardar Cliente" y pasarlo al form principal
    const handleSaveNewGuest = () => {
        // AQUÍ IRÍA TU PETICIÓN AXIOS POST REAL AL BACKEND (/guests)
        // Simulamos éxito:
        if (!newGuest.first_name || !newGuest.identification) return; // Validación simple

        const simulatedId = Math.random(); // ID temporal
        const createdGuest: Guest = {
            id: simulatedId,
            full_name: `${newGuest.first_name} ${newGuest.last_name}`,
            identification: newGuest.identification
        };

        // 1. Agregamos a la lista local
        setLocalGuests(prev => [createdGuest, ...prev]);
        // 2. Seleccionamos automáticamente en el form principal
        setData('guest_id', simulatedId.toString());
        // 3. Cerramos panel y limpiamos
        setSidePanel('none');
        setNewGuest({ first_name: '', last_name: '', identification: '', nationality: '' });
    };

    const handleToggleService = (serviceId: string) => {
        const current = data.selected_services;
        if (current.includes(serviceId)) {
            setData('selected_services', current.filter(id => id !== serviceId));
        } else {
            setData('selected_services', [...current, serviceId]);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };
        if (checkinToEdit) {
            put(`/checkins/${checkinToEdit.id}`, { onSuccess });
        } else {
            post('/checkins', { onSuccess });
        }
    };

    if (!show) return null;

    // Calculamos el ancho dinámico del modal
    const modalWidthClass = sidePanel === 'none' ? 'max-w-lg' : 'max-w-4xl';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            {/* Contenedor Principal con transición de ancho */}
            <div className={`w-full ${modalWidthClass} overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-500 ease-in-out`}>
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        {checkinToEdit ? 'Editar Asignación' : 'Nueva Asignación'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body: Grid de 2 Columnas */}
                <div className="flex flex-col md:flex-row">
                    
                    {/* --- COLUMNA 1: FORMULARIO PRINCIPAL (Check-in) --- */}
                    <form onSubmit={submit} className="flex-1 p-6 space-y-4">
                        
                        {/* 1. SELECCIÓN DE HUÉSPED */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Huésped</label>
                            <div className="flex gap-2">
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <select
                                        value={data.guest_id}
                                        onChange={(e) => setData('guest_id', e.target.value)}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500 bg-white"
                                    >
                                        <option value="">Seleccionar Cliente...</option>
                                        {localGuests.map(guest => (
                                            <option key={guest.id} value={guest.id}>
                                                {guest.full_name} ({guest.identification})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleGuestPanel}
                                    title="Registrar Nuevo Huésped"
                                    className={`flex items-center justify-center rounded-xl px-3 transition ${sidePanel === 'guest' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                >
                                    <UserPlus className="h-5 w-5" />
                                </button>
                            </div>
                            {errors.guest_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.guest_id}</p>}
                        </div>

                        {/* 2. SELECCIÓN DE HABITACIÓN */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Habitación</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <BedDouble className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={data.room_id}
                                    onChange={(e) => setData('room_id', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500 bg-white"
                                >
                                    <option value="">Seleccionar Habitación...</option>
                                    {rooms.map(room => (
                                        <option key={room.id} value={room.id} disabled={room.status !== 'available'}>
                                            {room.number} - {room.type} ({room.status})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.room_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.room_id}</p>}
                        </div>

                        {/* 3. FECHAS */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Entrada</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="datetime-local"
                                        value={data.check_in_date}
                                        onChange={(e) => setData('check_in_date', e.target.value)}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Días</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.duration}
                                        onChange={(e) => setData('duration', Number(e.target.value))}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. BOTÓN SERVICIOS */}
                        <div className="pt-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Extras</label>
                            <button
                                type="button"
                                onClick={toggleServicePanel}
                                className={`group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium transition ${
                                    sidePanel === 'services' 
                                    ? 'border-green-500 bg-green-50 text-green-700' 
                                    : 'border-gray-300 text-gray-500 hover:border-green-500 hover:bg-green-50 hover:text-green-600'
                                }`}
                            >
                                <div className={`rounded-full p-1 transition ${sidePanel === 'services' ? 'bg-green-200' : 'bg-gray-100 group-hover:bg-green-200'}`}>
                                    <ShoppingBag className="h-4 w-4" />
                                </div>
                                {data.selected_services.length > 0 ? `${data.selected_services.length} Servicios Seleccionados` : 'Agregar Servicios Adicionales'}
                                <Plus className={`h-4 w-4 ml-auto transition ${sidePanel === 'services' ? 'rotate-45 text-green-700' : 'opacity-50'}`} />
                            </button>
                        </div>
                    </form>

                    {/* --- COLUMNA 2: PANELES DINÁMICOS --- */}
                    {sidePanel !== 'none' && (
                        <div className="w-full md:w-[28rem] border-l border-gray-100 bg-gray-50/50 p-6 animate-in slide-in-from-left-4 fade-in duration-300">
                            
                            {/* --- CASO A: NUEVO HUÉSPED --- */}
                            {sidePanel === 'guest' && (
                                <div className="h-full flex flex-col">
                                    <div className="mb-6 flex items-center gap-2 text-green-700">
                                        <UserPlus className="h-5 w-5" />
                                        <h3 className="font-bold">Registro Rápido de Huésped</h3>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-500">Nombres</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full rounded-lg border-gray-200 text-sm focus:border-green-500 focus:ring-green-500"
                                                    value={newGuest.first_name}
                                                    onChange={e => setNewGuest({...newGuest, first_name: e.target.value})}
                                                    placeholder="Juan"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-500">Apellidos</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full rounded-lg border-gray-200 text-sm focus:border-green-500 focus:ring-green-500"
                                                    value={newGuest.last_name}
                                                    onChange={e => setNewGuest({...newGuest, last_name: e.target.value})}
                                                    placeholder="Pérez"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-500">Documento / CI</label>
                                            <div className="relative">
                                                <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input 
                                                    type="text" 
                                                    className="w-full rounded-lg border-gray-200 pl-9 text-sm focus:border-green-500 focus:ring-green-500"
                                                    value={newGuest.identification}
                                                    onChange={e => setNewGuest({...newGuest, identification: e.target.value})}
                                                    placeholder="1234567"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-500">Nacionalidad</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                                <input 
                                                    type="text" 
                                                    className="w-full rounded-lg border-gray-200 pl-9 text-sm focus:border-green-500 focus:ring-green-500"
                                                    value={newGuest.nationality}
                                                    onChange={e => setNewGuest({...newGuest, nationality: e.target.value})}
                                                    placeholder="Boliviana"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                                            <p>Este usuario se registrará en la base de datos y se asignará automáticamente a este Check-in.</p>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <button 
                                            type="button"
                                            onClick={handleSaveNewGuest}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-black transition"
                                        >
                                            Registrar y Asignar <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* --- CASO B: SERVICIOS --- */}
                            {sidePanel === 'services' && (
                                <div className="h-full flex flex-col">
                                    <div className="mb-6 flex items-center gap-2 text-green-700">
                                        <Briefcase className="h-5 w-5" />
                                        <h3 className="font-bold">Agregar Servicios Iniciales</h3>
                                    </div>

                                    <div className="flex-1 space-y-3 overflow-y-auto">
                                        {availableServices.map(service => {
                                            const isSelected = data.selected_services.includes(service.id);
                                            return (
                                                <div 
                                                    key={service.id}
                                                    onClick={() => handleToggleService(service.id)}
                                                    className={`cursor-pointer flex items-center justify-between rounded-xl border p-3 transition ${
                                                        isSelected 
                                                        ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`rounded-full p-1.5 ${isSelected ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            <ShoppingBag className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>{service.name}</p>
                                                            <p className="text-xs text-gray-500">{service.price} Bs.</p>
                                                        </div>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="mt-6 text-center">
                                        <p className="text-xs text-gray-400">Selecciona los servicios para agregarlos al consumo.</p>
                                        <button 
                                            type="button"
                                            onClick={() => setSidePanel('none')}
                                            className="mt-3 w-full rounded-xl border border-gray-300 bg-white py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                                        >
                                            Confirmar Selección
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer General (Botones de acción del formulario principal) */}
                <div className="flex justify-between border-t border-gray-100 bg-white px-6 py-4">
                    <span className="text-xs text-gray-400 self-center">
                        {sidePanel !== 'none' ? 'Termina la edición lateral antes de guardar.' : ''}
                    </span>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={submit} // Usamos onClick explícito para disparar el submit del form principal
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Finalizar Asignación</>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}