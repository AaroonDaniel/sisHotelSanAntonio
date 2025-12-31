import { useForm } from '@inertiajs/react';
import {
    ArrowRight,
    AlertCircle, // Icono para errores
    BedDouble,
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    FileText,
    Flag,
    Globe,
    Heart,
    MapPin,
    Save,
    Search,
    ShoppingBag,
    User,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

// --- 1. DICCIONARIOS ---
const civilStatusOptions = [
    { value: 'SINGLE', label: 'SOLTERO(A)' },
    { value: 'MARRIED', label: 'CASADO(A)' },
    { value: 'DIVORCED', label: 'DIVORCIADO(A)' },
    { value: 'WIDOWED', label: 'VIUDO(A)' },
    { value: 'CONCUBINAGE', label: 'CONCUBINATO' },
];

const countries = [
    'BOLIVIA', 'ARGENTINA', 'BRASIL', 'CHILE', 'COLOMBIA', 'PERÚ', 'ECUADOR',
    'PARAGUAY', 'URUGUAY', 'VENEZUELA', 'MÉXICO', 'ESTADOS UNIDOS', 'ESPAÑA'
];

// --- 2. INTERFACES ---
interface Guest {
    id: number;
    first_name: string;
    last_name: string;
    identification_number: string;
    issued_in?: string;
    nationality?: string;
    civil_status?: string;
    age?: number;
    profession?: string;
    origin?: string;
}

interface Room {
    id: number;
    number: string;
    status: string;
    price?: { amount: number };
}

interface CheckinModalProps {
    show: boolean;
    onClose: () => void;
    checkinToEdit?: any;
    guests: Guest[];
    rooms: Room[];
}

export default function CheckinModal({
    show,
    onClose,
    checkinToEdit,
    guests,
    rooms,
}: CheckinModalProps) {
    // --- ESTADOS LOCALES ---
    const [guestSearch, setGuestSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExistingGuest, setIsExistingGuest] = useState(false); // Si es true, bloquea campos
    
    // Autocompletado Nacionalidad
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

    // --- FORMULARIO UNIFICADO ---
    const now = new Date().toISOString().slice(0, 16);
    
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        // IDs
        guest_id: '' as string | null, // Si es null o vacío, el backend debe crear uno nuevo
        room_id: '',
        
        // Datos Check-in
        check_in_date: now,
        duration_days: 1, // Default 1, pero permite 0
        advance_payment: 0,
        notes: '',
        selected_services: [] as string[],

        // Datos del Huésped (Se envían siempre para crear o mostrar)
        first_name: '',
        last_name: '',
        identification_number: '',
        issued_in: '',
        nationality: 'BOLIVIA',
        civil_status: '',
        age: '' as string | number,
        profession: '',
        origin: '',
    });

    // --- EFECTOS ---
    useEffect(() => {
        if (show) {
            clearErrors(); // Limpiar errores al abrir
            if (checkinToEdit) {
                // MODO EDICIÓN
                setIsExistingGuest(true);
                setGuestSearch(`${checkinToEdit.guest?.first_name || ''} ${checkinToEdit.guest?.last_name || ''}`);
                setData({
                    ...data,
                    guest_id: checkinToEdit.guest_id,
                    room_id: checkinToEdit.room_id,
                    check_in_date: checkinToEdit.check_in_date,
                    duration_days: checkinToEdit.duration_days,
                    advance_payment: checkinToEdit.advance_payment,
                    notes: checkinToEdit.notes || '',
                    selected_services: checkinToEdit.services || [],
                    // Datos del huésped (solo lectura en edición)
                    first_name: checkinToEdit.guest?.first_name || '',
                    last_name: checkinToEdit.guest?.last_name || '',
                    identification_number: checkinToEdit.guest?.identification_number || '',
                    issued_in: checkinToEdit.guest?.issued_in || '',
                    nationality: checkinToEdit.guest?.nationality || 'BOLIVIA',
                    civil_status: checkinToEdit.guest?.civil_status || '',
                    age: checkinToEdit.guest?.age || '',
                    profession: checkinToEdit.guest?.profession || '',
                    origin: checkinToEdit.guest?.origin || '',
                });
            } else {
                // MODO CREACIÓN
                reset();
                setGuestSearch('');
                setIsExistingGuest(false);
            }
        }
    }, [show, checkinToEdit]);

    // --- LÓGICA DE BÚSQUEDA ---
    const filteredGuests = guests.filter((g) => {
        const term = guestSearch.toLowerCase();
        const fullName = `${g.first_name} ${g.last_name}`.toLowerCase();
        return fullName.includes(term) || g.identification_number.includes(term);
    });

    // Seleccionar Huésped existente
    const handleSelectGuest = (guest: Guest) => {
        setIsExistingGuest(true);
        setGuestSearch(`${guest.first_name} ${guest.last_name}`);
        setIsDropdownOpen(false);
        clearErrors();

        setData((prev) => ({
            ...prev,
            guest_id: guest.id.toString(), // ID EXISTENTE
            first_name: guest.first_name,
            last_name: guest.last_name,
            identification_number: guest.identification_number,
            issued_in: guest.issued_in || '',
            nationality: guest.nationality || 'BOLIVIA',
            civil_status: guest.civil_status || '',
            age: guest.age || '',
            profession: guest.profession || '',
            origin: guest.origin || '',
        }));
    };

    // Limpiar para crear nuevo
    const handleClearGuest = () => {
        setIsExistingGuest(false);
        setGuestSearch('');
        setData((prev) => ({
            ...prev,
            guest_id: null, // IMPORTANTE: null indica al backend crear uno nuevo
            first_name: '',
            last_name: '',
            identification_number: '',
            issued_in: '',
            nationality: 'BOLIVIA',
            civil_status: '',
            age: '',
            profession: '',
            origin: '',
        }));
    };

    const handleNationalityChange = (val: string) => {
        const upperVal = val.toUpperCase();
        setData('nationality', upperVal);
        if (upperVal.length > 0) {
            setFilteredCountries(countries.filter(c => c.includes(upperVal)));
            setShowCountrySuggestions(true);
        } else {
            setShowCountrySuggestions(false);
        }
    };

    // --- SUBMIT ---
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };

        if (checkinToEdit) {
            put(`/checks/${checkinToEdit.id}`, { onSuccess });
        } else {
            post('/checks', { onSuccess });
        }
    };

    // Lógica visual de días
    const durationVal = Number(data.duration_days);
    const estimatedCheckout = new Date(data.check_in_date);
    estimatedCheckout.setDate(estimatedCheckout.getDate() + (durationVal || 0)); // Si es 0 suma 0
    
    const checkoutString = durationVal > 0 
        ? estimatedCheckout.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' })
        : 'Indefinido / Por confirmar';

    // Servicios
    const servicesList = [
        { id: '1', name: 'Desayuno', price: 35 },
        { id: '2', name: 'Lavandería', price: 20 },
        { id: '3', name: 'Limpieza', price: 50 },
    ];

    if (!show) return null;

    // Detectar si hay errores para mostrarlos arriba
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        {checkinToEdit ? 'Editar Registro' : 'Nuevo Ingreso'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* --- ALERTA DE ERRORES (Si no guarda, aparecerá esto) --- */}
                {hasErrors && (
                    <div className="bg-red-50 border-b border-red-100 px-6 py-2">
                        <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                            <AlertCircle className="h-4 w-4" />
                            <span>No se pudo guardar. Revise los campos marcados en rojo.</span>
                        </div>
                        <div className="ml-6 text-xs text-red-500 mt-1">
                            {/* Muestra el primer error encontrado para guiar al usuario */}
                            {Object.values(errors)[0]}
                        </div>
                    </div>
                )}

                <form onSubmit={submit} className="flex flex-col md:flex-row">
                    
                    {/* --- IZQUIERDA: DATOS DEL HUÉSPED --- */}
                    <div className="flex-1 border-r border-gray-100 p-6">
                        
                        {/* Buscador */}
                        <div className="mb-6 relative">
                            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Buscar Huésped (Autocompletar)</label>
                            <div className="flex gap-2">
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={guestSearch}
                                        onChange={(e) => {
                                            setGuestSearch(e.target.value);
                                            setIsDropdownOpen(true);
                                            if(e.target.value === '') handleClearGuest();
                                        }}
                                        placeholder="Buscar por Nombre o CI..."
                                        // AQUI SE APLICA TEXT-BLACK
                                        className="w-full rounded-xl border-gray-200 pl-9 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                        autoComplete="off"
                                    />
                                    {isDropdownOpen && guestSearch && !isExistingGuest && (
                                        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                                            {filteredGuests.length > 0 ? (
                                                filteredGuests.map(g => (
                                                    <div key={g.id} onClick={() => handleSelectGuest(g)} className="cursor-pointer px-4 py-2 text-sm text-black hover:bg-green-50">
                                                        <span className="font-bold">{g.first_name} {g.last_name}</span>
                                                        <span className="ml-2 text-xs text-gray-500">CI: {g.identification_number}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-xs text-gray-400">Sin resultados. Llene el formulario manual.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button type="button" onClick={handleClearGuest} className="rounded-xl border border-gray-200 px-3 hover:bg-gray-50 text-gray-500" title="Nuevo / Limpiar">
                                    <User className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Campos de Datos Personales */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-800 border-b pb-1">Datos Personales</h3>
                            
                            {/* Nombres y Apellidos */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Nombres</label>
                                    <input 
                                        className={`w-full rounded-lg border px-3 py-2 text-sm uppercase text-black focus:ring-green-500 ${errors.first_name ? 'border-red-500' : 'border-gray-200'} disabled:bg-gray-100 disabled:text-gray-500`}
                                        value={data.first_name}
                                        onChange={e => setData('first_name', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest}
                                        placeholder="JUAN"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Apellidos</label>
                                    <input 
                                        className={`w-full rounded-lg border px-3 py-2 text-sm uppercase text-black focus:ring-green-500 ${errors.last_name ? 'border-red-500' : 'border-gray-200'} disabled:bg-gray-100 disabled:text-gray-500`}
                                        value={data.last_name}
                                        onChange={e => setData('last_name', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest}
                                        placeholder="PÉREZ"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Nacionalidad, CI, Exp */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1 relative">
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Nacionalidad</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black focus:border-green-500 disabled:bg-gray-100"
                                        value={data.nationality}
                                        onChange={e => handleNationalityChange(e.target.value)}
                                        disabled={isExistingGuest}
                                        onFocus={() => !isExistingGuest && setShowCountrySuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                                    />
                                    {showCountrySuggestions && !isExistingGuest && (
                                        <div className="absolute z-10 w-full bg-white border shadow-lg max-h-32 overflow-y-auto rounded-md">
                                            {filteredCountries.map(c => (
                                                <div key={c} onClick={() => setData('nationality', c)} className="px-2 py-1 hover:bg-gray-100 text-xs text-black cursor-pointer">{c}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-1">
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Carnet (CI)</label>
                                    <input 
                                        className={`w-full rounded-lg border px-3 py-2 text-sm uppercase text-black focus:ring-green-500 ${errors.identification_number ? 'border-red-500' : 'border-gray-200'} disabled:bg-gray-100`}
                                        value={data.identification_number}
                                        onChange={e => setData('identification_number', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Expedido</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black focus:border-green-500 disabled:bg-gray-100"
                                        value={data.issued_in}
                                        onChange={e => setData('issued_in', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest}
                                        placeholder="LP"
                                    />
                                </div>
                            </div>

                            {/* Estado Civil, Edad, Profesión */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Estado Civil</label>
                                    <select 
                                        className="w-full rounded-lg border-gray-200 px-2 py-2 text-sm text-black focus:border-green-500 disabled:bg-gray-100"
                                        value={data.civil_status}
                                        onChange={e => setData('civil_status', e.target.value)}
                                        disabled={isExistingGuest}
                                    >
                                        <option value="">-</option>
                                        {civilStatusOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Edad</label>
                                    <input 
                                        type="number"
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm text-black focus:border-green-500 disabled:bg-gray-100"
                                        value={data.age}
                                        onChange={e => setData('age', e.target.value)}
                                        disabled={isExistingGuest}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Profesión</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black focus:border-green-500 disabled:bg-gray-100"
                                        value={data.profession}
                                        onChange={e => setData('profession', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest}
                                    />
                                </div>
                            </div>

                            {/* Procedencia */}
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Procedencia (Origen)</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input 
                                        className="w-full rounded-lg border-gray-200 pl-9 py-2 text-sm uppercase text-black focus:border-green-500 disabled:bg-gray-100"
                                        value={data.origin}
                                        onChange={e => setData('origin', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest}
                                        placeholder="CIUDAD DE ORIGEN"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- DERECHA: ASIGNACIÓN --- */}
                    <div className="flex-1 p-6 bg-gray-50">
                        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1 mb-4">Detalles de Asignación</h3>

                        <div className="space-y-5">
                            
                            {/* Selector de Plaza */}
                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-green-700">
                                    <BedDouble className="h-4 w-4" />
                                    N° PLAZA / HABITACIÓN
                                </label>
                                <select
                                    value={data.room_id}
                                    onChange={(e) => setData('room_id', e.target.value)}
                                    // AQUI TEXT-BLACK para que se vea fuerte
                                    className={`block w-full rounded-xl bg-white py-2.5 pl-3 text-base font-bold text-black focus:ring-green-500 shadow-sm ${errors.room_id ? 'border-red-500' : 'border-green-200'}`}
                                >
                                    <option value="">Seleccionar Plaza...</option>
                                    {rooms.map((room) => (
                                        <option key={room.id} value={room.id} disabled={room.status !== 'AVAILABLE' && room.id !== Number(checkinToEdit?.room_id)}>
                                            {room.number} ({room.status}) - {room.price?.amount} Bs.
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Fecha Ingreso</label>
                                    <input
                                        type="datetime-local"
                                        value={data.check_in_date}
                                        onChange={(e) => setData('check_in_date', e.target.value)}
                                        className="w-full rounded-lg border-gray-200 text-sm text-black focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500">Estadía (Días)</label>
                                    <input
                                        type="number"
                                        min="0" // Permite 0
                                        value={data.duration_days}
                                        onChange={(e) => setData('duration_days', Number(e.target.value))}
                                        className="w-full rounded-lg border-gray-200 text-sm text-black focus:border-green-500"
                                    />
                                    {/* Muestra texto diferente si es 0 */}
                                    <span className={`text-[10px] font-medium ${durationVal > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                        Salida: {checkoutString}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Total Cancelado / Adelanto (Bs)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-green-600" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.advance_payment}
                                        onChange={(e) => setData('advance_payment', Number(e.target.value))}
                                        className="w-full rounded-lg border-gray-200 pl-9 text-sm font-bold text-green-700 focus:border-green-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-500">Observaciones</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <textarea
                                        rows={2}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value.toUpperCase())}
                                        className="w-full rounded-lg border-gray-200 pl-9 text-sm uppercase text-black focus:border-green-500"
                                        placeholder="DETALLES..."
                                    />
                                </div>
                            </div>

                            {/* Servicios Extra */}
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-500">Servicios Adicionales</label>
                                <div className="flex flex-wrap gap-2">
                                    {servicesList.map(srv => {
                                        const active = data.selected_services.includes(srv.id);
                                        return (
                                            <button
                                                key={srv.id}
                                                type="button"
                                                onClick={() => {
                                                    const newServs = active 
                                                        ? data.selected_services.filter(id => id !== srv.id)
                                                        : [...data.selected_services, srv.id];
                                                    setData('selected_services', newServs);
                                                }}
                                                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs border transition ${active ? 'bg-green-100 border-green-500 text-green-700 font-bold' : 'bg-white border-gray-200 text-gray-600'}`}
                                            >
                                                {active && <CheckCircle2 className="h-3 w-3" />}
                                                {srv.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        {/* Footer Botones */}
                        <div className="mt-8 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 disabled:opacity-50">
                                {processing ? 'Procesando...' : (
                                    <><Save className="h-4 w-4" /> {checkinToEdit ? 'Actualizar' : 'Registrar Ingreso'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}