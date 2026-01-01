import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle, // Icono para advertencia
    BedDouble,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Globe,
    Printer,
    Save,
    User,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

// --- 1. DICCIONARIOS ---
const civilStatusOptions = [
    { value: 'SINGLE', label: 'SOLTERO(A)' },
    { value: 'MARRIED', label: 'CASADO(A)' },
    { value: 'DIVORCED', label: 'DIVORCIADO(A)' },
    { value: 'WIDOWED', label: 'VIUDO(A)' },
    { value: 'CONCUBINAGE', label: 'CONCUBINATO' },
];

const countries = [
    'BOLIVIANA', 'ARGENTINA', 'BRASILERA', 'CHILENA', 'COLOMBIANA', 'PERÚANA', 'ECUATORIANA',
    'PARAGUAYA', 'URUGUAYA', 'VENEZOLANA', 'MÉXICANA', 'ESTADOUNIDENSE', 'ESPAÑOLA',
    'FRANCESA', 'ALEMANA', 'ITALIANA', 'CHINA', 'JAPÓNESA', 'RUSA', 'CANADIENSE',
    'INGLESA', 'PORTUGUESA', 'INDIA', 'AUSTRALIANA', 'CUBANA', 'DOMINICANA',
    'GUATEMALTECA', 'HONDUREÑA', 'SALVADOREÑA', 'NICARAGÜENSE', 'COSTARRICENSE',
    'PANAMEÑA', 'PUERTORRIQUEÑA', 'HAITIANA', 'TRINITARIA', 'JAMAICANA','OTRO'
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
    full_name: string;
    identification_number: string;
    issued_in?: string;
    nationality?: string;
    civil_status?: string;
    birth_date?: string;
    age?: number;
    profession?: string;
    origin?: string;
    profile_status?: string; // Nuevo campo
}

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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExistingGuest, setIsExistingGuest] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [displayAge, setDisplayAge] = useState<number | string>('');

    // Autocompletado Nacionalidad
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

    // --- FORMULARIO ---
    const now = new Date().toISOString().slice(0, 16);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            guest_id: '' as string | null,
            room_id: '',
            check_in_date: now,
            duration_days: 1 as number | string,
            advance_payment: 0,
            notes: '',
            selected_services: [] as string[],
            full_name: '',
            identification_number: '',
            issued_in: '',
            nationality: 'BOLIVIANA',
            civil_status: '',
            birth_date: '' as string,
            profession: '',
            origin: '',
        });

    // --- EFECTOS ---

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calcular edad
    useEffect(() => {
        if (data.birth_date) {
            setDisplayAge(calculateAge(data.birth_date));
        } else {
            setDisplayAge('');
        }
    }, [data.birth_date]);

    // Inicializar datos
    useEffect(() => {
        if (show) {
            clearErrors();
            if (checkinToEdit) {
                // MODO EDICIÓN
                setIsExistingGuest(true);
                setData({
                    ...data,
                    guest_id: String(checkinToEdit.guest_id),
                    room_id: String(checkinToEdit.room_id),
                    check_in_date: checkinToEdit.check_in_date,
                    duration_days: checkinToEdit.duration_days,
                    advance_payment: checkinToEdit.advance_payment,
                    notes: checkinToEdit.notes || '',
                    selected_services: checkinToEdit.services || [],
                    full_name: checkinToEdit.guest?.full_name || '',
                    identification_number:
                        checkinToEdit.guest?.identification_number || '',
                    issued_in: checkinToEdit.guest?.issued_in || '',
                    nationality: checkinToEdit.guest?.nationality || 'BOLIVIANA',
                    civil_status: checkinToEdit.guest?.civil_status || '',
                    birth_date: checkinToEdit.guest?.birth_date || '',
                    profession: checkinToEdit.guest?.profession || '',
                    origin: checkinToEdit.guest?.origin || '',
                });
            } else {
                // MODO CREACIÓN
                reset();
                setIsExistingGuest(false);
                if (initialRoomId) {
                    setData((prev) => ({
                        ...prev,
                        room_id: String(initialRoomId),
                    }));
                }
            }
        }
    }, [show, checkinToEdit, initialRoomId]);

    // --- LÓGICA DE ESTADO PENDIENTE ---
    // Si no es un invitado existente y no tiene carnet, es un perfil "Pendiente"
    const isProfileIncomplete =
        !isExistingGuest &&
        (!data.identification_number || data.identification_number.length < 3);

    // Filtramos usando directamente el campo full_name
    const filteredGuests =
        data.full_name && data.full_name.length > 1
            ? guests.filter((g) => {
                  const term = data.full_name.toLowerCase();
                  const fullName = g.full_name.toLowerCase();
                  return (
                      fullName.includes(term) ||
                      g.identification_number?.toLowerCase().includes(term)
                  );
              })
            : [];

    const handleSelectGuest = (guest: Guest) => {
        setIsExistingGuest(true);
        setIsDropdownOpen(false);
        clearErrors();

        setData((prev) => ({
            ...prev,
            guest_id: guest.id.toString(),
            full_name: guest.full_name,
            identification_number: guest.identification_number || '',
            issued_in: guest.issued_in || '',
            nationality: guest.nationality || 'BOLIVIANA',
            civil_status: guest.civil_status || '',
            birth_date: guest.birth_date || '',
            profession: guest.profession || '',
            origin: guest.origin || '',
        }));
    };

    const handleNationalityChange = (val: string) => {
        const upperVal = val.toUpperCase();
        setData('nationality', upperVal);
        if (upperVal.length > 0) {
            setFilteredCountries(countries.filter((c) => c.includes(upperVal)));
            setShowCountrySuggestions(true);
        } else {
            setShowCountrySuggestions(false);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => {
            reset();
            onClose();
        };
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

    const checkoutString =
        durationVal > 0
            ? estimatedCheckout.toLocaleDateString('es-BO', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
              })
            : 'Indefinido / Por confirmar';

    const servicesList = [
        { id: '1', name: 'Desayuno', price: 35 },
        { id: '2', name: 'Lavandería', price: 20 },
        { id: '3', name: 'Limpieza', price: 50 },
    ];

    if (!show) return null;
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        {checkinToEdit
                            ? `Asignación: Hab. ${rooms.find((r) => r.id === Number(data.room_id))?.number || ''}`
                            : 'Nuevo Ingreso'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {hasErrors && (
                    <div className="border-b border-red-100 bg-red-50 px-6 py-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Revise los errores.</span>
                        </div>
                    </div>
                )}

                <form onSubmit={submit} className="flex flex-col md:flex-row">
                    {/* IZQUIERDA - DATOS HUÉSPED */}
                    <div className="relative flex-1 border-r border-gray-100 bg-white p-6">
                        {/* AVISO DE PERFIL PENDIENTE */}
                        {isProfileIncomplete && data.full_name.length > 3 && (
                            <div className="absolute top-0 right-0 left-0 z-10 flex animate-in items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-2 slide-in-from-top-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    PERFIL PENDIENTE: Se guardará solo con el
                                    nombre.
                                </span>
                            </div>
                        )}

                        {/* Espaciador si hay aviso */}
                        <div
                            className={`${isProfileIncomplete && data.full_name.length > 3 ? 'mt-8' : ''} transition-all`}
                        ></div>

                        {/* 1. CAMPO FUSIONADO: NOMBRE COMPLETO / BUSCADOR */}
                        <div className="mb-6 space-y-4" ref={dropdownRef}>
                            <div className="relative">
                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                    Nombre Completo del Huésped
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500 disabled:bg-gray-50"
                                        placeholder="Escribe para buscar o crear nuevo..."
                                        value={data.full_name}
                                        onChange={(e) => {
                                            const val =
                                                e.target.value.toUpperCase();
                                            setData((prev) => ({
                                                ...prev,
                                                full_name: val,
                                                guest_id: null,
                                            }));
                                            setIsExistingGuest(false);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            if (data.full_name.length > 1)
                                                setIsDropdownOpen(true);
                                        }}
                                        disabled={!!checkinToEdit}
                                        required // Nombre SIEMPRE requerido
                                        autoComplete="off"
                                    />

                                    {/* DROPDOWN DE SUGERENCIAS */}
                                    {isDropdownOpen &&
                                        !isExistingGuest &&
                                        filteredGuests.length > 0 && (
                                            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                                                {filteredGuests.map((g) => (
                                                    <div
                                                        key={g.id}
                                                        onClick={() =>
                                                            handleSelectGuest(g)
                                                        }
                                                        className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm text-black last:border-0 hover:bg-green-50"
                                                    >
                                                        <div className="font-bold text-gray-800">
                                                            {g.full_name}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span className="rounded bg-gray-100 px-1.5 py-0.5">
                                                                CI:{' '}
                                                                {g.identification_number ||
                                                                    'S/N'}
                                                            </span>
                                                            {g.nationality && (
                                                                <span>
                                                                    •{' '}
                                                                    {
                                                                        g.nationality
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="bg-gray-50 px-4 py-2 text-center text-xs font-medium text-gray-500">
                                                    Si no es ninguno, sigue
                                                    escribiendo para crear uno
                                                    nuevo.
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* CAMPOS OPCIONALES PARA ASIGNACIÓN RÁPIDA */}
                            {/* NOTA: Hemos quitado 'required' de los inputs */}

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="flex items-center justify-between text-xs font-bold text-gray-500">
                                        Carnet (CI)
                                        {isProfileIncomplete && (
                                            <span className="rounded bg-amber-100 px-1 text-[9px] text-amber-600">
                                                Opcional
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        className={`w-full rounded-lg border-gray-200 px-3 py-2 text-sm text-black uppercase disabled:bg-gray-100 disabled:text-gray-500 ${isProfileIncomplete ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`}
                                        value={data.identification_number}
                                        onChange={(e) =>
                                            setData(
                                                'identification_number',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        disabled={
                                            isExistingGuest || !!checkinToEdit
                                        }
                                        placeholder="123456"
                                        // NO REQUIRED
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">
                                        Expedido
                                    </label>
                                    <input
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm text-black uppercase disabled:bg-gray-100 disabled:text-gray-500"
                                        value={data.issued_in}
                                        onChange={(e) =>
                                            setData(
                                                'issued_in',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        disabled={
                                            isExistingGuest || !!checkinToEdit
                                        }
                                        placeholder="LP"
                                    />
                                </div>
                                <div className="relative col-span-1">
                                    <label className="text-xs font-bold text-gray-500">
                                        Nacionalidad
                                    </label>
                                    <input
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm text-black uppercase disabled:bg-gray-100 disabled:text-gray-500"
                                        value={data.nationality}
                                        onChange={(e) =>
                                            handleNationalityChange(
                                                e.target.value,
                                            )
                                        }
                                        disabled={
                                            isExistingGuest || !!checkinToEdit
                                        }
                                        onFocus={() =>
                                            !isExistingGuest &&
                                            !checkinToEdit &&
                                            setShowCountrySuggestions(true)
                                        }
                                    />
                                    {showCountrySuggestions &&
                                        !isExistingGuest &&
                                        !checkinToEdit && (
                                            <div className="absolute z-10 mt-1 max-h-32 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                                                {filteredCountries.map((c) => (
                                                    <div
                                                        key={c}
                                                        onClick={() => {
                                                            setData(
                                                                'nationality',
                                                                c,
                                                            );
                                                            setShowCountrySuggestions(
                                                                false,
                                                            );
                                                        }}
                                                        className="cursor-pointer px-2 py-1 text-xs text-black hover:bg-gray-100"
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Estado Civil
                                    </label>
                                    <select
                                        className="w-full rounded-lg border-gray-200 px-2 py-2 text-sm text-black disabled:bg-gray-100 disabled:text-gray-500"
                                        value={data.civil_status}
                                        onChange={(e) =>
                                            setData(
                                                'civil_status',
                                                e.target.value,
                                            )
                                        }
                                        disabled={
                                            isExistingGuest || !!checkinToEdit
                                        }
                                    >
                                        <option value="">-</option>
                                        {civilStatusOptions.map((opt) => (
                                            <option
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Fecha Nac.
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-200 px-2 py-2 text-sm text-black disabled:bg-gray-100 disabled:text-gray-500"
                                        value={data.birth_date}
                                        onChange={(e) =>
                                            setData(
                                                'birth_date',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!!checkinToEdit}
                                        // NO REQUIRED
                                    />
                                    <span className="text-[10px] font-medium text-gray-400">
                                        Edad:{' '}
                                        {displayAge
                                            ? `${displayAge} años`
                                            : '-'}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Profesión
                                    </label>
                                    <input
                                        className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm text-black uppercase disabled:bg-gray-100 disabled:text-gray-500"
                                        value={data.profession}
                                        onChange={(e) =>
                                            setData(
                                                'profession',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        disabled={
                                            isExistingGuest || !!checkinToEdit
                                        }
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">
                                    Procedencia
                                </label>
                                <div className="relative">
                                    <Globe className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                    <input
                                        className="w-full rounded-lg border-gray-200 py-2 pl-9 text-sm text-black uppercase disabled:bg-gray-100 disabled:text-gray-500"
                                        value={data.origin}
                                        onChange={(e) =>
                                            setData(
                                                'origin',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="CIUDAD DE ORIGEN"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DERECHA - ASIGNACIÓN */}
                    <div className="flex-1 bg-gray-50 p-6">
                        <h3 className="mb-4 border-b border-gray-200 pb-1 text-sm font-bold text-gray-800">
                            Detalles de Asignación
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-green-700">
                                    <BedDouble className="h-4 w-4" />
                                    N° PLAZA / HABITACIÓN
                                </label>
                                <select
                                    value={data.room_id}
                                    onChange={(e) =>
                                        setData('room_id', e.target.value)
                                    }
                                    className={`block w-full rounded-xl border-green-200 bg-white py-2.5 pl-3 text-base font-bold text-black shadow-sm focus:ring-green-500`}
                                >
                                    <option value="">
                                        Seleccionar Plaza...
                                    </option>
                                    {rooms.map((room) => (
                                        <option
                                            key={room.id}
                                            value={room.id}
                                            disabled={
                                                room.status !== 'LIBRE' &&
                                                room.status !== 'available' &&
                                                 // Dejamos ambos por seguridad
                                                room.id !==
                                                    Number(
                                                        checkinToEdit?.room_id,
                                                    )
                                            }
                                        >
                                            {room.number} ({room.status}) -{' '}
                                            {room.price?.amount} Bs.
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Fecha Ingreso
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={data.check_in_date}
                                        onChange={(e) =>
                                            setData(
                                                'check_in_date',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-lg border-gray-200 text-sm text-black"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Estadía (Días)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.duration_days}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setData(
                                                'duration_days',
                                                val === '' ? '' : Number(val),
                                            );
                                        }}
                                        className="w-full rounded-lg border-gray-200 text-sm text-black"
                                    />
                                    <span
                                        className={`text-[10px] font-medium ${durationVal > 0 ? 'text-green-600' : 'text-orange-600'}`}
                                    >
                                        Salida: {checkoutString}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">
                                    Adelanto (Bs)
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute top-2.5 left-3 h-4 w-4 text-green-600" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.advance_payment}
                                        onChange={(e) =>
                                            setData(
                                                'advance_payment',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-lg border-gray-200 pl-9 text-sm font-bold text-green-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">
                                    Observaciones
                                </label>
                                <div className="relative">
                                    <FileText className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                    <textarea
                                        rows={2}
                                        value={data.notes}
                                        onChange={(e) =>
                                            setData(
                                                'notes',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        className="w-full rounded-lg border-gray-200 pl-9 text-sm text-black uppercase"
                                        placeholder="DETALLES..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-500">
                                    Servicios Adicionales
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {servicesList.map((srv) => {
                                        const active =
                                            data.selected_services.includes(
                                                srv.id,
                                            );
                                        return (
                                            <button
                                                key={srv.id}
                                                type="button"
                                                onClick={() => {
                                                    const newServs = active
                                                        ? data.selected_services.filter(
                                                              (id) =>
                                                                  id !== srv.id,
                                                          )
                                                        : [
                                                              ...data.selected_services,
                                                              srv.id,
                                                          ];
                                                    setData(
                                                        'selected_services',
                                                        newServs,
                                                    );
                                                }}
                                                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${active ? 'border-green-500 bg-green-100 font-bold text-green-700' : 'border-gray-200 bg-white text-gray-600'}`}
                                            >
                                                {active && (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                )}
                                                {srv.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex items-center justify-end gap-3">
                            {checkinToEdit && (
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="mr-auto flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-100"
                                    title="Imprimir Hoja de Asignación"
                                >
                                    <Printer className="h-4 w-4" />
                                    <span className="hidden sm:inline">
                                        Imprimir
                                    </span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                            >
                                Cancelar
                            </button>

                            {/* BOTÓN CAMBIA DE COLOR SEGÚN ESTADO */}
                            <button
                                type="submit"
                                disabled={processing}
                                className={`flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50 ${isProfileIncomplete ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'}`}
                            >
                                {processing ? (
                                    'Procesando...'
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        {checkinToEdit
                                            ? 'Actualizar'
                                            : isProfileIncomplete
                                              ? 'Asignación Rápida'
                                              : 'Registrar'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
