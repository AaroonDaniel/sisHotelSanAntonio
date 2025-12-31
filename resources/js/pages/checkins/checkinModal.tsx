import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    BedDouble,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Globe,
    Printer,
    Save,
    Search,
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

const calculateAge = (dateString: string) => {
    if (!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// --- 2. INTERFACES ---
export interface Guest {
    id: number;
    //: string;
    full_name: string;
    identification_number: string;
    issued_in?: string;
    nationality?: string;
    civil_status?: string;
    birth_date?: string;
    age?: number;
    profession?: string;
    origin?: string;
}

// Interfaz para Checkin dentro del Modal
export interface CheckinData {
    id: number;
    guest_id: number;
    room_id: number;
    check_in_date: string;
    duration_days: number;
    advance_payment: number;
    notes?: string;
    services?: string[];
    guest?: Guest;
}

export interface Room {
    id: number;
    number: string;
    status: string;
    price?: { amount: number };
    room_type?: { name: string };
    checkins?: CheckinData[];
}

interface CheckinModalProps {
    show: boolean;
    onClose: () => void;
    checkinToEdit?: CheckinData | null;
    guests: Guest[];
    rooms: Room[];
    initialRoomId?: number | null;
}

export default function CheckinModal({
    show,
    onClose,
    checkinToEdit,
    guests,
    rooms,
    initialRoomId,
}: CheckinModalProps) {
    // --- ESTADOS LOCALES ---
    const [guestSearch, setGuestSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExistingGuest, setIsExistingGuest] = useState(false);
    
    //
    const [displayAge, setDisplayAge] = useState<number | string>('');
    
    // Autocompletado Nacionalidad
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

    // --- FORMULARIO UNIFICADO ---
    const now = new Date().toISOString().slice(0, 16);
    
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        guest_id: '' as string | null,
        room_id: '',
        check_in_date: now,
        duration_days: 1 as number | string, // Permitimos string vacío
        advance_payment: 0,
        notes: '',
        selected_services: [] as string[],
        //: '',
        full_name: '',
        identification_number: '',
        issued_in: '',
        nationality: 'BOLIVIA',
        civil_status: '',
        birth_date: '' as string,
        profession: '',
        origin: '',
    });

    // --- EFECTOS ---
    useEffect(() => {
        if (data.birth_date) {
            setDisplayAge(calculateAge(data.birth_date));
        } else {
            setDisplayAge('');
        }
    }, [data.birth_date]);

    useEffect(() => {
        if (show) {
            clearErrors();
            if (checkinToEdit) {
                // MODO EDICIÓN / VER
                setIsExistingGuest(true);
                setGuestSearch(`${checkinToEdit.guest?.full_name || ''}`);
                setData({
                    ...data,
                    guest_id: String(checkinToEdit.guest_id),
                    room_id: String(checkinToEdit.room_id),
                    check_in_date: checkinToEdit.check_in_date,
                    duration_days: checkinToEdit.duration_days,
                    advance_payment: checkinToEdit.advance_payment,
                    notes: checkinToEdit.notes || '',
                    selected_services: checkinToEdit.services || [],
                    //: checkinToEdit.guest?. || '',
                    full_name: checkinToEdit.guest?.full_name || '',
                    identification_number: checkinToEdit.guest?.identification_number || '',
                    issued_in: checkinToEdit.guest?.issued_in || '',
                    nationality: checkinToEdit.guest?.nationality || 'BOLIVIA',
                    civil_status: checkinToEdit.guest?.civil_status || '',
                    birth_date: checkinToEdit.guest?.birth_date || '',
                    profession: checkinToEdit.guest?.profession || '',
                    origin: checkinToEdit.guest?.origin || '',
                });
            } else {
                // MODO CREACIÓN
                reset();
                setGuestSearch('');
                setIsExistingGuest(false);
                if (initialRoomId) {
                    setData(prev => ({ ...prev, room_id: String(initialRoomId) }));
                }
            }
        }
    }, [show, checkinToEdit, initialRoomId]);

    // --- FUNCIONES AUXILIARES ---
    const filteredGuests = guests.filter((g) => {
        const term = guestSearch.toLowerCase();
        const fullName = ` ${g.full_name}`.toLowerCase();
        return fullName.includes(term) || g.identification_number.includes(term);
    });

    const handleSelectGuest = (guest: Guest) => {
        setIsExistingGuest(true);
        setGuestSearch(`${guest.full_name}`);
        setIsDropdownOpen(false);
        clearErrors();
        setData((prev) => ({
            ...prev,
            guest_id: guest.id.toString(),
            //: guest.,
            full_name: guest.full_name,
            identification_number: guest.identification_number,
            issued_in: guest.issued_in || '',
            nationality: guest.nationality || 'BOLIVIA',
            civil_status: guest.civil_status || '',
            birth_date: guest.birth_date || '',
            profession: guest.profession || '',
            origin: guest.origin || '',
        }));
    };

    const handleClearGuest = () => {
        setIsExistingGuest(false);
        setGuestSearch('');
        setData((prev) => ({
            ...prev,
            guest_id: null,
            //: '',
            full_name: '',
            identification_number: '',
            issued_in: '',
            nationality: 'BOLIVIA',
            civil_status: '',
            birth_date: '',
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

    // --- ACCIONES ---
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };
        if (checkinToEdit) {
            put(`/checks/${checkinToEdit.id}`, { onSuccess });
        } else {
            post('/checks', { onSuccess });
        }
    };

    const handlePrint = () => {
        if (checkinToEdit) {
            window.open(`/checks/${checkinToEdit.id}/receipt`, '_blank');
        }
    };

    // Visuales
    const durationVal = Number(data.duration_days);
    const estimatedCheckout = new Date(data.check_in_date);
    estimatedCheckout.setDate(estimatedCheckout.getDate() + (durationVal || 0));
    
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
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        {checkinToEdit ? `Asignación: Hab. ${rooms.find(r=>r.id === Number(data.room_id))?.number || ''}` : 'Nuevo Ingreso'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {hasErrors && (
                    <div className="bg-red-50 border-b border-red-100 px-6 py-2">
                        <div className="flex items-center gap-2 text-red-600 text-sm font-bold">
                            <AlertCircle className="h-4 w-4" />
                            <span>Revise los errores.</span>
                        </div>
                    </div>
                )}

                <form onSubmit={submit} className="flex flex-col md:flex-row">
                    {/* IZQUIERDA - DATOS HUÉSPED */}
                    <div className="flex-1 border-r border-gray-100 p-6">
                        {/* Buscador */}
                        <div className="mb-6 relative">
                            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Huésped Principal</label>
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
                                        placeholder="Buscar..."
                                        disabled={!!checkinToEdit}
                                        className="w-full rounded-xl border-gray-200 pl-9 text-sm text-black focus:border-green-500 disabled:bg-gray-100"
                                    />
                                    {isDropdownOpen && guestSearch && !isExistingGuest && !checkinToEdit && (
                                        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                                            {filteredGuests.map(g => (
                                                <div key={g.id} onClick={() => handleSelectGuest(g)} className="cursor-pointer px-4 py-2 text-sm text-black hover:bg-green-50">
                                                    <span className="font-bold">{g.full_name}</span>
                                                    <span className="ml-2 text-xs text-gray-500">CI: {g.identification_number}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {!checkinToEdit && (
                                    <button type="button" onClick={handleClearGuest} className="rounded-xl border border-gray-200 px-3 hover:bg-gray-50 text-gray-500">
                                        <User className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Campos Personales */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Nombre Completo</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black disabled:bg-gray-50"
                                        value={data.full_name}
                                        onChange={e => setData('full_name', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest || !!checkinToEdit}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1 relative">
                                    <label className="text-xs font-bold text-gray-500">Nacionalidad</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black disabled:bg-gray-50"
                                        value={data.nationality}
                                        onChange={e => handleNationalityChange(e.target.value)}
                                        disabled={isExistingGuest || !!checkinToEdit}
                                        onFocus={() => !isExistingGuest && !checkinToEdit && setShowCountrySuggestions(true)}
                                    />
                                    {showCountrySuggestions && !isExistingGuest && !checkinToEdit && (
                                        <div className="absolute z-10 w-full bg-white border shadow-lg max-h-32 overflow-y-auto rounded-md">
                                            {filteredCountries.map(c => (
                                                <div key={c} onClick={() => setData('nationality', c)} className="px-2 py-1 hover:bg-gray-100 text-xs text-black cursor-pointer">{c}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">Carnet (CI)</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black disabled:bg-gray-50"
                                        value={data.identification_number}
                                        onChange={e => setData('identification_number', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest || !!checkinToEdit}
                                        required
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">Expedido</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black disabled:bg-gray-50"
                                        value={data.issued_in}
                                        onChange={e => setData('issued_in', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest || !!checkinToEdit}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Estado Civil</label>
                                    <select 
                                        className="w-full rounded-lg border-gray-200 px-2 py-2 text-sm text-black disabled:bg-gray-50"
                                        value={data.civil_status}
                                        onChange={e => setData('civil_status', e.target.value)}
                                        disabled={isExistingGuest || !!checkinToEdit}
                                    >
                                        <option value="">-</option>
                                        {civilStatusOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Fecha Nac.</label>
                                    <input 
                                        type="date"
                                        className="w-full rounded-lg border-gray-200 px-2 py-2 text-sm text-black disabled:bg-gray-50"
                                        value={data.birth_date}
                                        onChange={e => setData('birth_date', e.target.value)}
                                        disabled={!!checkinToEdit} 
                                    />
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        Edad: {displayAge ? `${displayAge} años` : '-'}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Profesión</label>
                                    <input 
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm uppercase text-black disabled:bg-gray-50"
                                        value={data.profession}
                                        onChange={e => setData('profession', e.target.value.toUpperCase())}
                                        disabled={isExistingGuest || !!checkinToEdit}
                                    />
                                </div>
                            </div>

                            {/* Procedencia */}
                            <div>
                                <label className="text-xs font-bold text-gray-500">Procedencia</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input 
                                        className="w-full rounded-lg border-gray-200 pl-9 py-2 text-sm uppercase text-black disabled:bg-gray-50"
                                        value={data.origin}
                                        onChange={e => setData('origin', e.target.value.toUpperCase())}
                                        placeholder="CIUDAD DE ORIGEN"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DERECHA - ASIGNACIÓN */}
                    <div className="flex-1 p-6 bg-gray-50">
                        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-1 mb-4">Detalles de Asignación</h3>

                        <div className="space-y-5">
                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-green-700">
                                    <BedDouble className="h-4 w-4" />
                                    N° PLAZA / HABITACIÓN
                                </label>
                                <select
                                    value={data.room_id}
                                    onChange={(e) => setData('room_id', e.target.value)}
                                    className={`block w-full rounded-xl bg-white py-2.5 pl-3 text-base font-bold text-black focus:ring-green-500 shadow-sm border-green-200`}
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
                                    <label className="text-xs font-bold text-gray-500">Fecha Ingreso</label>
                                    <input
                                        type="datetime-local"
                                        value={data.check_in_date}
                                        onChange={(e) => setData('check_in_date', e.target.value)}
                                        className="w-full rounded-lg border-gray-200 text-sm text-black"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Estadía (Días)</label>
                                    
                                    {/* */}
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.duration_days}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setData('duration_days', val === '' ? '' : Number(val));
                                        }}
                                        className="w-full rounded-lg border-gray-200 text-sm text-black"
                                    />
                                    <span className={`text-[10px] font-medium ${durationVal > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                        Salida: {checkoutString}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">Adelanto (Bs)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-green-600" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.advance_payment}
                                        onChange={(e) => setData('advance_payment', Number(e.target.value))}
                                        className="w-full rounded-lg border-gray-200 pl-9 text-sm font-bold text-green-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">Observaciones</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <textarea
                                        rows={2}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value.toUpperCase())}
                                        className="w-full rounded-lg border-gray-200 pl-9 text-sm uppercase text-black"
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

                        <div className="mt-8 flex justify-end gap-3 items-center">
                            {checkinToEdit && (
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="mr-auto flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-100 transition"
                                    title="Imprimir Hoja de Asignación"
                                >
                                    <Printer className="h-4 w-4" />
                                    <span className="hidden sm:inline">Imprimir</span>
                                </button>
                            )}

                            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
                                Cancelar
                            </button>
                            <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 disabled:opacity-50">
                                {processing ? 'Procesando...' : (
                                    <><Save className="h-4 w-4" /> {checkinToEdit ? 'Actualizar' : 'Registrar'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}