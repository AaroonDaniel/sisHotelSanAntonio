import { router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    BedDouble,
    CheckCircle2,
    Clock,
    FileText,
    Globe,
    LogOut,
    Printer,
    Save,
    User,
    Phone,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

// --- DICCIONARIOS Y FUNCIONES ---
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
    'PANAMEÑA', 'PUERTORRIQUEÑA', 'HAITIANA', 'TRINITARIA', 'JAMAICANA', 'OTRO',
];

const countryCodes: { [key: string]: string } = {
    'BOLIVIANA': '+591',
    'ARGENTINA': '+54',
    'BRASILERA': '+55',
    'CHILENA': '+56',
    'COLOMBIANA': '+57',
    'PERÚANA': '+51',
    'ECUATORIANA': '+593',
    'PARAGUAYA': '+595',
    'URUGUAYA': '+598',
    'VENEZOLANA': '+58',
    'MÉXICANA': '+52',
    'ESTADOUNIDENSE': '+1',
    'ESPAÑOLA': '+34',
    'FRANCESA': '+33',
    'ALEMANA': '+49',
    'ITALIANA': '+39',
    'CHINA': '+86',
    'JAPÓNESA': '+81',
    'RUSA': '+7',
    'CANADIENSE': '+1',
    'INGLESA': '+44',
    'PORTUGUESA': '+351',
    'INDIA': '+91',
    'AUSTRALIANA': '+61',
    'CUBANA': '+53',
    'DOMINICANA': '+1',
    'GUATEMALTECA': '+502',
    'HONDUREÑA': '+504',
    'SALVADOREÑA': '+503',
    'NICARAGÜENSE': '+505',
    'COSTARRICENSE': '+506',
    'PANAMEÑA': '+507',
    'PUERTORRIQUEÑA': '+1',
    'HAITIANA': '+509',
    'TRINITARIA': '+1',
    'JAMAICANA': '+1',
    'OTRO': ''
};

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

const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    return dateString.replace(' ', 'T').substring(0, 16);
};

// --- INTERFACES ---
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
    phone?: string;
    profile_status?: string;
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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExistingGuest, setIsExistingGuest] = useState(false);
    
    // REFS PARA DETECTAR CLICS FUERA
    const dropdownRef = useRef<HTMLDivElement>(null);   // Para el buscador de nombre
    const nationalityRef = useRef<HTMLDivElement>(null); // Para el buscador de nacionalidad (NUEVO)

    const [displayAge, setDisplayAge] = useState<number | string>('');
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

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
            phone: '', 
        });

    // --- MANEJO DE CLICS FUERA (DROPDOWNS) ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Cierra el buscador de huéspedes si clic fuera
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
            // Cierra el buscador de nacionalidad si clic fuera
            if (
                nationalityRef.current &&
                !nationalityRef.current.contains(event.target as Node)
            ) {
                setShowCountrySuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (data.birth_date) {
            setDisplayAge(calculateAge(data.birth_date));
        } else {
            setDisplayAge('');
        }
    }, [data.birth_date]);

    // --- CARGA DE DATOS ---
    useEffect(() => {
        if (show) {
            clearErrors();
            if (checkinToEdit) {
                setIsExistingGuest(true);
                const isIncomplete =
                    checkinToEdit.guest?.profile_status === 'INCOMPLETE';
                const initialDate = isIncomplete
                    ? now
                    : formatDateForInput(checkinToEdit.check_in_date);

                setData({
                    ...data,
                    guest_id: String(checkinToEdit.guest_id),
                    room_id: String(checkinToEdit.room_id),
                    check_in_date: initialDate,
                    duration_days: checkinToEdit.duration_days,
                    advance_payment: checkinToEdit.advance_payment,
                    notes: checkinToEdit.notes || '',
                    selected_services: checkinToEdit.services || [],
                    full_name: checkinToEdit.guest?.full_name || '',
                    identification_number:
                        checkinToEdit.guest?.identification_number || '',
                    issued_in: checkinToEdit.guest?.issued_in || '',
                    nationality: checkinToEdit.guest?.nationality || 'BOLIVIA',
                    civil_status: checkinToEdit.guest?.civil_status || '',
                    birth_date: checkinToEdit.guest?.birth_date || '',
                    profession: checkinToEdit.guest?.profession || '',
                    origin: checkinToEdit.guest?.origin || '',
                    phone: checkinToEdit.guest?.phone || '', 
                });
            } else {
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

    const isProfileIncomplete =
        !isExistingGuest &&
        (!data.identification_number || data.identification_number.length < 3);

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
            nationality: guest.nationality || 'BOLIVIA',
            civil_status: guest.civil_status || '',
            birth_date: guest.birth_date || '',
            profession: guest.profession || '',
            origin: guest.origin || '',
            phone: guest.phone || '', 
        }));
    };

    // --- LOGICA DE ACTUALIZACIÓN (NACIONALIDAD -> TELÉFONO) ---
    const updateNationalityAndPhone = (nationalityValue: string) => {
        const upperValue = nationalityValue.toUpperCase();
        
        let newPhone = data.phone;
        const code = countryCodes[upperValue];

        const currentPhoneClean = data.phone ? data.phone.trim() : '';
        const isJustCode = Object.values(countryCodes).some(c => c === currentPhoneClean);

        if (code && (data.phone === '' || isJustCode)) {
            newPhone = code + ' ';
        }

        setData(prev => ({
            ...prev,
            nationality: upperValue,
            phone: newPhone
        }));

        if (upperValue.length > 0) {
            setFilteredCountries(countries.filter((c) => c.includes(upperValue)));
            setShowCountrySuggestions(true);
        } else {
            setShowCountrySuggestions(false);
        }
    };

    const handleNationalityChange = (val: string) => {
        updateNationalityAndPhone(val);
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

    const handleCheckout = () => {
        if (!checkinToEdit) return;
        if (
            confirm(
                '¿Confirmar salida? Se generará el recibo final y pasará a limpieza.',
            )
        ) {
            router.put(
                `/checks/${checkinToEdit.id}/checkout`,
                {},
                {
                    onSuccess: () => {
                        onClose();
                        window.open(
                            `/checks/${checkinToEdit.id}/checkout-receipt`,
                            '_blank',
                        );
                    },
                },
            );
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
            : 'Indefinido';

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
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        {checkinToEdit
                            ? `Asignación: Hab. ${rooms.find((r) => r.id === Number(data.room_id))?.number || ''}`
                            : 'Nuevo Ingreso'}
                    </h2>

                    <div className="flex items-center gap-2">
                        {checkinToEdit && (
                            <button
                                type="button"
                                onClick={handleCheckout}
                                className="mr-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-200"
                            >
                                <LogOut className="h-4 w-4" />
                                Finalizar Estadía
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
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
                        {isProfileIncomplete && data.full_name.length > 3 && (
                            <div className="absolute top-0 right-0 left-0 z-10 flex animate-in items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-2 slide-in-from-top-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    PERFIL PENDIENTE: Se guardará solo con el
                                    nombre.
                                </span>
                            </div>
                        )}
                        <div
                            className={`${isProfileIncomplete && data.full_name.length > 3 ? 'mt-8' : ''} transition-all`}
                        ></div>

                        <div className="mb-6 space-y-4">
                            {/* NOMBRE COMPLETO */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                    Nombre Completo
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border border-gray-400 py-2.5 pl-10 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500 disabled:bg-gray-50"
                                        placeholder="Escribe para buscar..."
                                        value={data.full_name}
                                        onChange={(e) => {
                                            setData((prev) => ({
                                                ...prev,
                                                full_name:
                                                    e.target.value.toUpperCase(),
                                                guest_id: null,
                                            }));
                                            setIsExistingGuest(false);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            if (data.full_name.length > 1)
                                                setIsDropdownOpen(true);
                                        }}
                                        
                                        required
                                        autoComplete="off"
                                    />
                                    {isDropdownOpen &&
                                        !isExistingGuest &&
                                        filteredGuests.length > 0 && (
                                            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border border-gray-400 bg-white shadow-xl">
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
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* CAMPOS DE HUÉSPED */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">
                                        Carnet (CI)
                                    </label>
                                    <input
                                        className={`w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase ${isProfileIncomplete ? 'border-amber-300 focus:border-amber-500' : ''}`}
                                        value={data.identification_number}
                                        onChange={(e) =>
                                            setData(
                                                'identification_number',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="123456"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500">
                                        Expedido
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase"
                                        value={data.issued_in}
                                        onChange={(e) =>
                                            setData(
                                                'issued_in',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="LP"
                                    />
                                </div>
                                <div className="relative col-span-1" ref={nationalityRef}>
                                    <label className="text-xs font-bold text-gray-500">
                                        Nacionalidad
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase"
                                        value={data.nationality}
                                        onChange={(e) =>
                                            handleNationalityChange(
                                                e.target.value,
                                            )
                                        }
                                        onFocus={() =>
                                            setShowCountrySuggestions(true)
                                        }
                                        autoComplete="off"
                                    />
                                    {showCountrySuggestions && (
                                        <div className="absolute z-10 mt-1 max-h-32 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                                            {filteredCountries.map((c) => (
                                                <div
                                                    key={c}
                                                    onClick={() => {
                                                        // USAMOS LA NUEVA LÓGICA AQUÍ
                                                        updateNationalityAndPhone(c);
                                                        setShowCountrySuggestions(false); // <--- CERRAMOS LA LISTA
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
                                        className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                        value={data.civil_status}
                                        onChange={(e) =>
                                            setData(
                                                'civil_status',
                                                e.target.value,
                                            )
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

                                {/* --- CORRECCIÓN ESPACIO FECHA NAC. --- */}
                                <div className="col-span-2 flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500">
                                            Fecha Nac.
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                            value={data.birth_date}
                                            onChange={(e) =>
                                                setData(
                                                    'birth_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <span className="text-sm font-bold text-gray-700">
                                            {displayAge
                                                ? `Edad: ${displayAge}`
                                                : ''}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500">
                                            Profesión
                                        </label>
                                        <input
                                            className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase focus:border-gray-600 focus:ring-0"
                                            value={data.profession}
                                            onChange={(e) =>
                                                setData(
                                                    'profession',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* --- FILA DE PROCEDENCIA Y TELÉFONO --- */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Procedencia
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                        <input
                                            className="w-full rounded-lg border border-gray-400 py-2 pl-9 text-sm text-black uppercase"
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
                                
                                {/* CAMPO TELÉFONO CON ICONO PHONE */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Teléfono
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={data.phone}
                                            onChange={(e) =>
                                                setData('phone', e.target.value)
                                            }
                                            disabled={!data.nationality}
                                            className="block w-full rounded-xl border border-gray-400 py-2 pl-9 text-sm text-black disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="#### ####"
                                        />
                                    </div>
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
                                    <BedDouble className="h-4 w-4" /> N° PLAZA /
                                    HABITACIÓN
                                </label>

                                {/* --- CAMPO BLOQUEADO (DISABLED) --- */}
                                <select
                                    value={data.room_id}
                                    onChange={(e) =>
                                        setData('room_id', e.target.value)
                                    }
                                    disabled={true} 
                                    className="block w-full cursor-not-allowed rounded-xl border-gray-300 bg-gray-100 py-2.5 pl-3 text-base font-bold text-black shadow-sm focus:ring-green-500"
                                >
                                    {rooms.map((room) => (
                                        <option key={room.id} value={room.id}>
                                            {room.number} ({room.status}) -{' '}
                                            {room.price?.amount} Bs.
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* --- CORRECCIÓN DISEÑO FECHA INGRESO Y ESTADÍA --- */}
                            <div className="flex gap-3">
                                <div className="flex-grow">
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
                                        className="w-full rounded-lg border border-gray-400 text-sm text-black"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-bold text-gray-500">
                                        Estadía
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
                                        className="w-full rounded-lg border border-gray-400 text-right text-sm text-black"
                                    />
                                </div>
                            </div>

                            <div className="-mt-3 text-right">
                                <span
                                    className={`text-[10px] font-medium ${durationVal > 0 ? 'text-green-600' : 'text-orange-600'}`}
                                >
                                    Salida: {checkoutString}
                                </span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">
                                    Adelanto (Bs)
                                </label>

                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center font-bold text-green-600">
                                        Bs
                                    </span>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.advance_payment}
                                        onChange={(e) =>
                                            setData(
                                                'advance_payment',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-lg border border-gray-400 pl-12 text-sm font-bold text-green-700"
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
                                        className="w-full rounded-lg border border-gray-400 pl-9 text-sm text-black uppercase"
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
                                                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${active ? 'border-green-500 bg-green-100 font-bold text-green-700' : 'border border-gray-400 bg-white text-gray-600'}`}
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