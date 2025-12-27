import { useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowRight,
    BedDouble,
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Flag,
    Globe,
    Hash,
    Heart,
    MapPin,
    Plus,
    Save,
    Search,
    ShoppingBag,
    User,
    UserPlus,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

// --- CONSTANTES ---
const countries = [
    'Bolivia', 'Argentina', 'Brasil', 'Chile', 'Colombia', 'Perú', 'Ecuador',
    'Paraguay', 'Uruguay', 'Venezuela', 'México', 'Estados Unidos', 'España',
    'Francia', 'Alemania', 'Italia', 'China', 'Japón', 'Rusia',
];

// --- INTERFACES ---
interface Guest {
    id: number;
    first_name: string;
    last_name: string;
    identification_number: string;
}

interface Room {
    id: number;
    number: string;
    status: string;
    price?: { amount: number };
}

interface Checkin {
    id?: number;
    guest_id: number;
    room_id: number;
    check_in_date: string;
    duration_days: number;
    advance_payment: number;
    notes?: string;
    services?: string[];
}

interface CheckinModalProps {
    show: boolean;
    onClose: () => void;
    checkinToEdit?: Checkin | null;
    guests: Guest[];
    rooms: Room[];
}

export default function CheckinModal({
    show,
    onClose,
    checkinToEdit,
    guests: initialGuests,
    rooms,
}: CheckinModalProps) {
    // --- ESTADOS ---
    const [sidePanel, setSidePanel] = useState<'none' | 'guest' | 'services'>('none');
    const [localGuests, setLocalGuests] = useState<Guest[]>(initialGuests);

    // Estados para el Buscador Principal
    const [guestSearch, setGuestSearch] = useState('');
    const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // --- FORMULARIO PRINCIPAL (CHECK-IN) ---
    const now = new Date().toISOString().slice(0, 16);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        guest_id: '',
        room_id: '',
        check_in_date: now,
        duration_days: 1,
        advance_payment: 0,
        notes: '',
        selected_services: [] as string[],
    });

    // --- ESTADOS PARA NUEVO HUÉSPED (Panel Lateral) ---
    const [newGuest, setNewGuest] = useState({
        first_name: '',
        last_name: '',
        nationality: '',
        identification_number: '',
        issued_in: '',
        civil_status: '',
        age: '',
        profession: '',
        origin: '',
    });

    // Lógica Autocompletado Nacionalidad (Panel Lateral)
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    // --- EFECTOS ---
    useEffect(() => {
        if (show) {
            setLocalGuests(initialGuests);
            setSidePanel('none');
            setIsGuestDropdownOpen(false);
            setGuestSearch('');
            
            setNewGuest({
                first_name: '', last_name: '', nationality: '', identification_number: '',
                issued_in: '', civil_status: '', age: '', profession: '', origin: ''
            });

            if (checkinToEdit) {
                setData({
                    guest_id: checkinToEdit.guest_id.toString(),
                    room_id: checkinToEdit.room_id.toString(),
                    check_in_date: checkinToEdit.check_in_date,
                    duration_days: checkinToEdit.duration_days,
                    advance_payment: checkinToEdit.advance_payment,
                    notes: checkinToEdit.notes || '',
                    selected_services: checkinToEdit.services || [],
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, checkinToEdit, initialGuests]);

    useEffect(() => {
        if (data.guest_id) {
            const selected = localGuests.find((g) => g.id.toString() === data.guest_id.toString());
            if (selected) {
                setGuestSearch(`${selected.first_name} ${selected.last_name}`);
            }
        } else {
            if (!isGuestDropdownOpen && !guestSearch) setGuestSearch('');
        }
    }, [data.guest_id, localGuests]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- MANEJADORES ---

    const handleNationalityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewGuest({ ...newGuest, nationality: value });
        if (value.length > 0) {
            setFilteredCountries(countries.filter((c) => c.toLowerCase().includes(value.toLowerCase())));
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectGuest = (guest: Guest) => {
        setData('guest_id', guest.id.toString());
        setGuestSearch(`${guest.first_name} ${guest.last_name}`);
        setIsGuestDropdownOpen(false);
    };

    const handleSaveNewGuest = async () => {
        if (!newGuest.first_name || !newGuest.identification_number) return;

        try {
            const response = await axios.post('/invitados', {
                ...newGuest,
                is_quick_create: true,
            });

            const realGuest = response.data;
            const guestFormatted: Guest = {
                id: realGuest.id,
                first_name: realGuest.first_name,
                last_name: realGuest.last_name,
                identification_number: realGuest.identification_number,
            };

            setLocalGuests((prev) => [guestFormatted, ...prev]);
            setData('guest_id', realGuest.id.toString());
            setGuestSearch(`${realGuest.first_name} ${realGuest.last_name}`);
            
            setSidePanel('none');
            setNewGuest({
                first_name: '', last_name: '', nationality: '', identification_number: '',
                issued_in: '', civil_status: '', age: '', profession: '', origin: ''
            });

        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar el huésped.');
        }
    };

    const filteredGuests = localGuests.filter((guest) => {
        const fullName = `${guest.first_name || ''} ${guest.last_name || ''}`;
        const search = guestSearch.toLowerCase();
        return fullName.toLowerCase().includes(search) || guest.identification_number.includes(guestSearch);
    });

    const handleToggleService = (id: string) => {
        const current = data.selected_services;
        if (current.includes(id)) {
            setData('selected_services', current.filter((s) => s !== id));
        } else {
            setData('selected_services', [...current, id]);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };
        
        if (checkinToEdit) {
            // CORRECCIÓN: Cambiado de '/checkins' a '/checks'
            put(`/checks/${checkinToEdit.id}`, { onSuccess });
        } else {
            // CORRECCIÓN: Cambiado de '/checkins' a '/checks'
            post('/checks', { onSuccess });
        }
    };

    const servicesList = [
        { id: '1', name: 'Desayuno Buffet', price: 35 },
        { id: '2', name: 'Lavandería Express', price: 20 },
        { id: '3', name: 'Limpieza Extra', price: 50 },
    ];

    const estimatedCheckout = new Date(data.check_in_date);
    estimatedCheckout.setDate(estimatedCheckout.getDate() + Number(data.duration_days));
    const checkoutString = estimatedCheckout.toLocaleDateString('es-BO', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    if (!show) return null;

    const widthClass = sidePanel === 'none' ? 'max-w-3xl' : 'max-w-6xl';

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className={`w-full ${widthClass} flex max-h-[95vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-500 ease-in-out`}>
                
                {/* --- HEADER (VERDE) --- */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        {checkinToEdit ? 'Editar Check-in' : 'Nuevo Check-in'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* IZQUIERDA: FORMULARIO PRINCIPAL */}
                    <form id="main-form" onSubmit={submit} className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                            
                            {/* 1. SELECCIÓN DE HUÉSPED */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Huésped</label>
                                <div className="flex gap-2">
                                    <div className="relative w-full">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={guestSearch}
                                            onChange={(e) => {
                                                setGuestSearch(e.target.value);
                                                setIsGuestDropdownOpen(true);
                                                if (e.target.value === '') setData('guest_id', '');
                                            }}
                                            onFocus={() => setIsGuestDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setIsGuestDropdownOpen(false), 200)}
                                            placeholder="Buscar por nombre o CI..."
                                            className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500 placeholder:text-gray-400"
                                            autoComplete="off"
                                        />
                                        {isGuestDropdownOpen && (
                                            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-100 bg-white shadow-lg py-1">
                                                {filteredGuests.length > 0 ? (
                                                    filteredGuests.map((g) => (
                                                        <div key={g.id} onClick={() => selectGuest(g)} className="cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-green-50">
                                                            <div className="font-bold text-gray-700">{g.first_name} {g.last_name}</div>
                                                            <div className="text-xs text-gray-400">CI: {g.identification_number}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-center text-sm text-gray-400">No se encontraron resultados</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSidePanel(sidePanel === 'guest' ? 'none' : 'guest')}
                                        className={`flex items-center justify-center rounded-xl border px-3 transition ${sidePanel === 'guest' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 bg-white text-green-600 hover:border-green-300'}`}
                                        title="Registrar nuevo huésped"
                                    >
                                        <UserPlus className="h-5 w-5" />
                                    </button>
                                </div>
                                {errors.guest_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.guest_id}</p>}
                            </div>

                            {/* 2. FECHA INGRESO */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Fecha Ingreso</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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

                            {/* 3. HABITACIÓN */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Habitación</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <BedDouble className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <select
                                        value={data.room_id}
                                        onChange={(e) => setData('room_id', e.target.value)}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    >
                                        <option value="">Seleccionar Habitación...</option>
                                        {rooms.map((room) => (
                                            <option key={room.id} value={room.id} disabled={room.status !== 'available' && room.id !== Number(checkinToEdit?.room_id)}>
                                                {room.number} ({room.status}) - {room.price?.amount} Bs.
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.room_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.room_id}</p>}
                            </div>

                            {/* 4. DURACIÓN */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Duración (Días)</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.duration_days}
                                        onChange={(e) => setData('duration_days', Number(e.target.value))}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>
                                <p className="mt-1 text-xs font-medium text-green-600">Salida estimada: {checkoutString}</p>
                            </div>

                            {/* 5. ADELANTO */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Adelanto (Bs.)</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.advance_payment}
                                        onChange={(e) => setData('advance_payment', Number(e.target.value))}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm font-bold text-green-700 focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* 6. NOTAS */}
                            <div className="md:col-span-1">
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Notas Adicionales</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute top-3 left-3">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                        placeholder="Detalles especiales..."
                                    />
                                </div>
                            </div>

                            {/* 7. BOTÓN SERVICIOS */}
                            <div className="pt-2 md:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => setSidePanel(sidePanel === 'services' ? 'none' : 'services')}
                                    className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium transition ${sidePanel === 'services' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600'}`}
                                >
                                    <ShoppingBag className="h-4 w-4" />
                                    {data.selected_services.length > 0 ? `${data.selected_services.length} Servicios Seleccionados` : 'Agregar Servicios Adicionales'}
                                    <Plus className={`ml-auto h-4 w-4 transition-transform ${sidePanel === 'services' ? 'rotate-45' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* DERECHA: PANELES LATERALES */}
                    {sidePanel !== 'none' && (
                        <div className="flex w-full animate-in flex-col border-l border-gray-100 bg-gray-50 p-6 duration-300 slide-in-from-right-4 md:w-[26rem]">
                            
                            {/* --- PANEL A: NUEVO HUÉSPED --- */}
                            {sidePanel === 'guest' && (
                                <>
                                    <div className="mb-6 flex items-center gap-2 text-gray-800">
                                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600"><UserPlus className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold">Nuevo Huésped</h3>
                                    </div>

                                    <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                                        {/* Nombres y Apellidos */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-500">Nombres</label>
                                                <div className="relative">
                                                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                                    <input type="text" className="w-full rounded-lg border-gray-200 pl-8 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.first_name} onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })} placeholder="Juan" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-500">Apellidos</label>
                                                <div className="relative">
                                                    <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                                    <input type="text" className="w-full rounded-lg border-gray-200 pl-8 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.last_name} onChange={(e) => setNewGuest({ ...newGuest, last_name: e.target.value })} placeholder="Pérez" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nacionalidad */}
                                        <div ref={suggestionRef}>
                                            <label className="mb-1 block text-xs font-bold text-gray-500">Nacionalidad</label>
                                            <div className="relative">
                                                <Flag className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={newGuest.nationality}
                                                    onChange={handleNationalityChange}
                                                    onFocus={() => newGuest.nationality && setShowSuggestions(true)}
                                                    className="w-full rounded-lg border-gray-200 pl-9 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                                    placeholder="Bolivia"
                                                    autoComplete="off"
                                                />
                                                {showSuggestions && filteredCountries.length > 0 && (
                                                    <div className="absolute z-10 mt-1 max-h-32 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                                        {filteredCountries.map((c, i) => (
                                                            <div key={i} onClick={() => { setNewGuest({ ...newGuest, nationality: c }); setShowSuggestions(false); }} className="cursor-pointer px-4 py-2 text-xs hover:bg-green-50 hover:text-green-700">
                                                                {c}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Documento */}
                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-500">N° Documento</label>
                                            <div className="relative">
                                                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input type="text" className="w-full rounded-lg border-gray-200 pl-9 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.identification_number} onChange={(e) => setNewGuest({ ...newGuest, identification_number: e.target.value })} placeholder="1234567" />
                                            </div>
                                        </div>

                                        {/* Expedido y Edad */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-500">Expedido</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                                    <input type="text" className="w-full rounded-lg border-gray-200 pl-8 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.issued_in} onChange={(e) => setNewGuest({ ...newGuest, issued_in: e.target.value })} placeholder="LP" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-bold text-gray-500">Edad</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                                    <input type="number" className="w-full rounded-lg border-gray-200 pl-8 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.age} onChange={(e) => setNewGuest({ ...newGuest, age: e.target.value })} placeholder="0" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Estado Civil */}
                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-500">Estado Civil</label>
                                            <div className="relative">
                                                <Heart className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <select className="w-full rounded-lg border-gray-200 pl-9 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.civil_status} onChange={(e) => setNewGuest({ ...newGuest, civil_status: e.target.value })}>
                                                    <option value="">Seleccionar</option>
                                                    <option value="single">Soltero(a)</option>
                                                    <option value="married">Casado(a)</option>
                                                    <option value="divorced">Divorciado(a)</option>
                                                    <option value="widowed">Viudo(a)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Profesión */}
                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-500">Profesión</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input type="text" className="w-full rounded-lg border-gray-200 pl-9 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.profession} onChange={(e) => setNewGuest({ ...newGuest, profession: e.target.value })} placeholder="Ingeniero" />
                                            </div>
                                        </div>

                                        {/* Procedencia */}
                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-gray-500">Procedencia</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <input type="text" className="w-full rounded-lg border-gray-200 pl-9 text-sm text-black focus:border-green-500 focus:ring-green-500" value={newGuest.origin} onChange={(e) => setNewGuest({ ...newGuest, origin: e.target.value })} placeholder="Ciudad de Origen" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-gray-200 pt-4">
                                        <button type="button" onClick={handleSaveNewGuest} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 active:scale-95">
                                            Registrar y Asignar <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* --- PANEL B: SERVICIOS --- */}
                            {sidePanel === 'services' && (
                                <>
                                    <div className="mb-6 flex items-center gap-2 text-gray-800">
                                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600"><ShoppingBag className="h-5 w-5" /></div>
                                        <h3 className="text-lg font-bold">Servicios Extra</h3>
                                    </div>
                                    <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                                        {servicesList.map((item) => {
                                            const isSelected = data.selected_services.includes(item.id);
                                            return (
                                                <div key={item.id} onClick={() => handleToggleService(item.id)} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${isSelected ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`rounded-full p-1.5 ${isSelected ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-500'}`}><Briefcase className="h-4 w-4" /></div>
                                                        <div><p className={`text-sm font-bold ${isSelected ? 'text-green-900' : 'text-gray-700'}`}>{item.name}</p><p className="text-xs text-gray-500">{item.price} Bs.</p></div>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 border-t border-gray-200 pt-4 text-center">
                                        <button type="button" onClick={() => setSidePanel('none')} className="w-full rounded-xl border border-gray-300 bg-white py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">Listo</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex justify-end gap-4 border-t border-gray-100 bg-white px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100">Cancelar</button>
                    <button type="submit" form="main-form" disabled={processing} className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50">
                        {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Registrar Check-in</>}
                    </button>
                </div>
            </div>
        </div>
    );
}