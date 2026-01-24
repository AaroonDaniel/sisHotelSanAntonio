import { router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    BedDouble,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileText,
    Globe,
    Phone,
    Printer,
    Save,
    Trash2,
    User,
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
    'BOLIVIANA',
    'ARGENTINA',
    'BRASILERA',
    'CHILENA',
    'COLOMBIANA',
    'PERÚANA',
    'ECUATORIANA',
    'PARAGUAYA',
    'URUGUAYA',
    'VENEZOLANA',
    'MÉXICANA',
    'ESTADOUNIDENSE',
    'ESPAÑOLA',
    'FRANCESA',
    'ALEMANA',
    'ITALIANA',
    'CHINA',
    'JAPÓNESA',
    'RUSA',
    'CANADIENSE',
    'INGLESA',
    'PORTUGUESA',
    'INDIA',
    'AUSTRALIANA',
    'CUBANA',
    'DOMINICANA',
    'GUATEMALTECA',
    'HONDUREÑA',
    'SALVADOREÑA',
    'NICARAGÜENSE',
    'COSTARRICENSE',
    'PANAMEÑA',
    'PUERTORRIQUEÑA',
    'HAITIANA',
    'TRINITARIA',
    'JAMAICANA',
    'OTRO',
];

const countryCodes: { [key: string]: string } = {
    BOLIVIANA: '+591',
    ARGENTINA: '+54',
    BRASILERA: '+55',
    CHILENA: '+56',
    COLOMBIANA: '+57',
    PERÚANA: '+51',
    ECUATORIANA: '+593',
    PARAGUAYA: '+595',
    URUGUAYA: '+598',
    VENEZOLANA: '+58',
    MÉXICANA: '+52',
    ESTADOUNIDENSE: '+1',
    ESPAÑOLA: '+34',
    FRANCESA: '+33',
    ALEMANA: '+49',
    ITALIANA: '+39',
    CHINA: '+86',
    JAPÓNESA: '+81',
    RUSA: '+7',
    CANADIENSE: '+1',
    INGLESA: '+44',
    PORTUGUESA: '+351',
    INDIA: '+91',
    AUSTRALIANA: '+61',
    CUBANA: '+53',
    DOMINICANA: '+1',
    GUATEMALTECA: '+502',
    HONDUREÑA: '+504',
    SALVADOREÑA: '+503',
    NICARAGÜENSE: '+505',
    COSTARRICENSE: '+506',
    PANAMEÑA: '+507',
    PUERTORRIQUEÑA: '+1',
    HAITIANA: '+509',
    TRINITARIA: '+1',
    JAMAICANA: '+1',
    OTRO: '',
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
    companions?: any[];

}

export interface Room {
    id: number;
    number: string;
    status: string;
    price?: { amount: number };
    room_type?: { name: string; capacity: number };
    checkins?: CheckinData[];
}

interface CheckinModalProps {
    show: boolean;
    onClose: () => void;
    checkinToEdit?: CheckinData | null;
    targetGuestId?: number | null;
    guests: Guest[];
    rooms: Room[];
    initialRoomId?: number | null;
}

interface CompanionData {
    id?: number;
    full_name: string;
    identification_number: string;
    relationship: string;
    nationality: string;
    issued_in: string;
    civil_status: string;
    birth_date: string;
    profession: string;
    origin: string;
    phone: string;
}

interface CheckinFormData {
    guest_id: string | null;
    room_id: string;
    check_in_date: string;
    duration_days: number | string;
    advance_payment: number;
    notes: string;
    selected_services: string[];
    // Campos del Titular (Index 0)
    full_name: string;
    identification_number: string;
    issued_in: string;
    nationality: string;
    civil_status: string;
    birth_date: string;
    profession: string;
    origin: string;
    phone: string;
    // Lista de Acompañantes (Index 1..N)
    companions: CompanionData[];
}

export default function CheckinModal({
    show,
    onClose,
    checkinToEdit,
    targetGuestId,
    guests,
    rooms,
    initialRoomId,
}: CheckinModalProps) {
    // REFS PARA DETECTAR CLICS FUERA
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExistingGuest, setIsExistingGuest] = useState(false);

    // [NUEVO] Estado para la navegación del carrusel (0 = Titular)
    const [currentIndex, setCurrentIndex] = useState(0);

    // REFS PARA DETECTAR CLICS FUERA
    const dropdownRef = useRef<HTMLDivElement>(null);
    const nationalityRef = useRef<HTMLDivElement>(null);

    const [displayAge, setDisplayAge] = useState<number | string>('');
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

    const now = new Date().toISOString().slice(0, 16);

    // [ACTUALIZADO] useForm con la Interfaz y el campo companions
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<CheckinFormData>({
            guest_id: '' as string | null,
            room_id: '',
            check_in_date: now,
            duration_days: 1,
            advance_payment: 0,
            notes: '',
            selected_services: [],
            full_name: '',
            identification_number: '',
            issued_in: '',
            nationality: 'BOLIVIANA',
            civil_status: '',
            birth_date: '',
            profession: '',
            origin: '',
            phone: '',
            companions: [], // <--- ESTE ES EL CAMBIO CLAVE (Array vacío inicial)
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
    // --- CARGA DE DATOS ---
    useEffect(() => {
        if (show) {
            clearErrors();
            
            // 1. LÓGICA DE ENFOQUE INTELIGENTE (Determinar índice inicial)
            let startAt = 0;
            if (checkinToEdit && targetGuestId) {
                // Caso A: Es el titular
                if (Number(checkinToEdit.guest_id) === Number(targetGuestId)) {
                    startAt = 0;
                } 
                // Caso B: Es un acompañante
                else if (checkinToEdit.companions) {
                    const compIndex = checkinToEdit.companions.findIndex((c: any) => c.id === Number(targetGuestId));
                    if (compIndex !== -1) {
                        startAt = compIndex + 1; // +1 porque el índice 0 es el titular
                    }
                }
            }
            setCurrentIndex(startAt); // Aplicamos el índice calculado

            // 2. CARGA DE DATOS AL FORMULARIO
            if (checkinToEdit) {
                setIsExistingGuest(true);
                const isIncomplete = checkinToEdit.guest?.profile_status === 'INCOMPLETE';
                const initialDate = isIncomplete ? now : formatDateForInput(checkinToEdit.check_in_date);

                setData({
                    ...data,
                    guest_id: String(checkinToEdit.guest_id),
                    room_id: String(checkinToEdit.room_id),
                    check_in_date: initialDate,
                    duration_days: checkinToEdit.duration_days,
                    advance_payment: checkinToEdit.advance_payment,
                    notes: checkinToEdit.notes || '',
                    selected_services: checkinToEdit.services || [],
                    
                    // Datos Titular
                    full_name: checkinToEdit.guest?.full_name || '',
                    identification_number: checkinToEdit.guest?.identification_number || '',
                    issued_in: checkinToEdit.guest?.issued_in || '',
                    nationality: checkinToEdit.guest?.nationality || 'BOLIVIANA',
                    civil_status: checkinToEdit.guest?.civil_status || '',
                    birth_date: checkinToEdit.guest?.birth_date || '',
                    profession: checkinToEdit.guest?.profession || '',
                    origin: checkinToEdit.guest?.origin || '',
                    phone: checkinToEdit.guest?.phone || '',

                    // Datos Acompañantes (Mapeo importante)
                    companions: checkinToEdit.companions ? checkinToEdit.companions.map((c: any) => ({
                        id: c.id,
                        full_name: c.full_name, // Nombre completo
                        identification_number: c.identification_number || '', // CI
                        relationship: c.pivot?.relationship || 'ACOMPAÑANTE', // Parentesco (viene del pivot)
                        nationality: c.nationality || 'BOLIVIANA',
                        issued_in: c.issued_in || '',
                        civil_status: c.civil_status || '',
                        birth_date: c.birth_date || '',
                        profession: c.profession || '',
                        origin: c.origin || '',
                        phone: c.phone || '', 
                    })) : [],
                });
            } else {
                // CASO NUEVO REGISTRO
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
    }, [show, checkinToEdit, initialRoomId, targetGuestId]);
    // --- LÓGICA MAESTRA (CARRUSEL Y EDICIÓN) ---

    // A. Variables calculadas
    const companionsList = data.companions || []; // Evita error "possibly undefined"
    const totalPeople = 1 + companionsList.length;
    const isTitular = currentIndex === 0;

    const currentRoom = rooms.find((r) => r.id === Number(data.room_id));
    const maxCapacity = currentRoom?.room_type?.capacity || 4;

    // Bandera: ¿Ya llegamos al límite de esta habitación?
    const isFull = totalPeople >= maxCapacity;

    // B. OBJETO PROXY: ¿Qué datos muestro en los inputs AHORA?
    const currentPerson = isTitular
        ? {
              // Datos directos del Titular
              full_name: data.full_name,
              identification_number: data.identification_number,
              issued_in: data.issued_in,
              nationality: data.nationality,
              civil_status: data.civil_status,
              birth_date: data.birth_date,
              profession: data.profession,
              origin: data.origin,
              phone: data.phone,
              relationship: 'TITULAR',
          }
        : {
              // Datos del Acompañante (con valores por defecto seguros)
              ...companionsList[currentIndex - 1],
              full_name: companionsList[currentIndex - 1]?.full_name || '',
              identification_number:
                  companionsList[currentIndex - 1]?.identification_number || '',
              nationality:
                  companionsList[currentIndex - 1]?.nationality || 'BOLIVIANA',
              phone: companionsList[currentIndex - 1]?.phone || '',
              origin: companionsList[currentIndex - 1]?.origin || '',
              profession: companionsList[currentIndex - 1]?.profession || '',
              relationship:
                  companionsList[currentIndex - 1]?.relationship || '',
              issued_in: companionsList[currentIndex - 1]?.issued_in || '',
              civil_status:
                  companionsList[currentIndex - 1]?.civil_status || '',
              birth_date: companionsList[currentIndex - 1]?.birth_date || '',
          };

    // C. ACTUALIZAR EDAD VISUAL (Reemplaza al useEffect viejo)
    useEffect(() => {
        if (currentPerson.birth_date) {
            setDisplayAge(calculateAge(currentPerson.birth_date));
        } else {
            setDisplayAge('');
        }
    }, [currentPerson.birth_date, currentIndex]);

    // D. MANEJADOR DE CAMBIOS UNIFICADO
    const handleFieldChange = (field: string, value: string) => {
        if (isTitular) {
            setData(field as any, value);
        } else {
            const newCompanions = [...companionsList];
            if (!newCompanions[currentIndex - 1]) return;
            (newCompanions[currentIndex - 1] as any)[field] = value;
            setData('companions', newCompanions);
        }
    };

    // E. NAVEGACIÓN (Siguiente / Anterior / Borrar)
    const handleNext = () => {
        if (currentIndex < totalPeople - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else if (totalPeople < maxCapacity) {
            const newCompanion: CompanionData = {
                full_name: '',
                identification_number: '',
                relationship: '',
                nationality: 'BOLIVIANA',
                issued_in: '',
                civil_status: '',
                birth_date: '',
                profession: '',
                origin: '',
                phone: '',
            };
            setData('companions', [...companionsList, newCompanion]);
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
    };

    const handleDeleteCurrent = () => {
        if (isTitular) return;
        const newCompanions = [...companionsList];
        newCompanions.splice(currentIndex - 1, 1);
        setData('companions', newCompanions);
        setCurrentIndex((prev) => Math.max(0, prev - 1));
    };

    // F. LÓGICA ESPECÍFICA (Nacionalidad y Autocompletado)
    const updateNationalityAndPhone = (nationalityValue: string) => {
        const upperValue = nationalityValue.toUpperCase();
        const code = countryCodes[upperValue];
        let newPhone = currentPerson.phone;

        const currentPhoneClean = newPhone ? newPhone.trim() : '';
        const isJustCode = Object.values(countryCodes).some(
            (c) => c === currentPhoneClean,
        );

        if (code && (newPhone === '' || isJustCode)) {
            newPhone = code + ' ';
        }

        handleFieldChange('nationality', upperValue);
        handleFieldChange('phone', newPhone);

        if (upperValue.length > 0) {
            setFilteredCountries(
                countries.filter((c) => c.includes(upperValue)),
            );
            setShowCountrySuggestions(true);
        } else {
            setShowCountrySuggestions(false);
        }
    };

    const handleSelectGuest = (guest: Guest) => {
        setIsExistingGuest(true);
        setIsDropdownOpen(false);
        clearErrors();

        if (isTitular) {
            // A. SI ES TITULAR: Actualizamos las variables raíz
            setData(prev => ({
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
                phone: guest.phone || '',
            }));
        } else {
            // B. SI ES ACOMPAÑANTE: Actualizamos el array 'companions'
            const newCompanions = [...companionsList];
            const idx = currentIndex - 1; // Posición en el array

            // Si la ficha existe (debería), la actualizamos
            if (newCompanions[idx]) {
                newCompanions[idx] = {
                    ...newCompanions[idx], // Mantenemos parentesco actual
                    full_name: guest.full_name,
                    identification_number: guest.identification_number || '',
                    nationality: guest.nationality || 'BOLIVIANA',
                    issued_in: guest.issued_in || '',
                    civil_status: guest.civil_status || '',
                    birth_date: guest.birth_date || '',
                    profession: guest.profession || '',
                    origin: guest.origin || '',
                    phone: guest.phone || '',
                };
                setData('companions', newCompanions);
            }
        }
    };

    // Filtros y Validaciones
    // BUSCADOR UNIVERSAL (Funciona para Titular y Acompañantes)
    // Usamos currentPerson.full_name para filtrar, sin importar quién sea
    const filteredGuests = 
        currentPerson.full_name && currentPerson.full_name.length > 1
            ? guests.filter((g) => {
                  const term = currentPerson.full_name.toLowerCase();
                  const fullName = g.full_name.toLowerCase();
                  const ci = g.identification_number ? g.identification_number.toLowerCase() : '';
                  return fullName.includes(term) || ci.includes(term);
              })
            : [];

    const isProfileIncomplete =
        isTitular &&
        !isExistingGuest &&
        (!data.identification_number || data.identification_number.length < 3);

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
        { id: '2', name: 'Garaje', price: 0 },
        /*
        {
            
            { id: '3', name: 'Desayuno', price: 0 },
            
        },
        */
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
                    {/* --- COLUMNA IZQUIERDA: CARRUSEL DE PERSONAS --- */}
                    <div className="relative flex-1 border-r border-gray-100 bg-white p-6">
                        {/* A. BARRA DE NAVEGACIÓN (EL "MAGO") */}
                        <div className="mb-5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/80 p-3 shadow-sm">
                            {/* Contador: 1 de X */}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                                    {isTitular ? 'TITULAR' : 'ACOMPAÑANTE'}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-blue-900">
                                        {currentIndex + 1}
                                    </span>
                                    <span className="text-sm font-bold text-blue-400">
                                        {/* Aquí mostramos la capacidad real que jalamos de la BD */}
                                        de {totalPeople}{' '}
                                        <span className="ml-1 text-[10px] text-blue-300">
                                            (Cap. Máx {maxCapacity})
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Info Habitación (Solo visual) */}
                            <div className="hidden border-r border-l border-blue-200 px-4 text-center sm:block">
                                <span className="block text-[10px] font-bold text-blue-400 uppercase">
                                    Habitación
                                </span>
                                <span className="font-bold text-blue-800">
                                    {rooms.find(
                                        (r) => r.id === Number(data.room_id),
                                    )?.room_type?.name || 'ESTÁNDAR'}
                                </span>
                            </div>

                            {/* Botones: Borrar | Atrás | Siguiente */}
                            <div className="flex items-center gap-2">
                                {!isTitular && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteCurrent}
                                        className="mr-2 rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                                        title="Eliminar a esta persona"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={currentIndex === 0}
                                    className="rounded-lg border border-blue-200 bg-white p-2 text-blue-700 shadow-sm hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    // BLOQUEO INTELIGENTE:
                                    disabled={
                                        currentIndex === totalPeople - 1 &&
                                        isFull
                                    }
                                    className={`flex items-center gap-1 rounded-lg border p-2 shadow-md transition ${
                                        currentIndex === totalPeople - 1 &&
                                        isFull
                                            ? 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400 shadow-none'
                                            : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {/* Solo muestra "+" si hay espacio real */}
                                    {currentIndex === totalPeople - 1 &&
                                        !isFull && (
                                            <span className="px-1 text-xs font-bold">
                                                +
                                            </span>
                                        )}
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* B. ALERTA DE PERFIL PENDIENTE (Solo visible para Titular) */}
                        {isTitular &&
                            isProfileIncomplete &&
                            data.full_name.length > 3 && (
                                <div className="mb-4 flex animate-in items-center justify-between rounded-lg border-b border-amber-100 bg-amber-50 px-6 py-2 slide-in-from-top-2">
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        PERFIL PENDIENTE: Se guardará solo con
                                        el nombre.
                                    </span>
                                </div>
                            )}

                        <div className="space-y-4">
                            {/* C. INPUT NOMBRE (Conectado a currentPerson) */}
                            {/* CAMPO NOMBRE CON BUSCADOR UNIVERSAL (CORREGIDO) */}
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
                                        placeholder="ESCRIBE PARA BUSCAR..."
                                        // IMPORTANTE: Usamos currentPerson para que funcione en el carrusel
                                        value={currentPerson.full_name}
                                        onChange={(e) => {
                                            handleFieldChange('full_name', e.target.value.toUpperCase());
                                            
                                            // 1. Activamos el dropdown para CUALQUIERA (Titular o Acompañante)
                                            setIsDropdownOpen(true); 

                                            // 2. Solo si es Titular reseteamos el ID principal
                                            if (isTitular) {
                                                setData('guest_id', null);
                                                setIsExistingGuest(false);
                                            }
                                        }}
                                        onFocus={() => { 
                                            // Activamos dropdown para CUALQUIERA si hay texto
                                            if (currentPerson.full_name.length > 1) setIsDropdownOpen(true);
                                        }}
                                        required
                                        autoComplete="off"
                                    />

                                    {/* Dropdown de Búsqueda (Visible para TODOS) */}
                                    {isDropdownOpen && filteredGuests.length > 0 && (
                                        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                            {filteredGuests.map((g) => (
                                                <div 
                                                    key={g.id} 
                                                    onClick={() => handleSelectGuest(g)} 
                                                    className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm hover:bg-green-50 last:border-0"
                                                >
                                                    <div className="font-bold text-gray-800">{g.full_name}</div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5">
                                                            CI: {g.identification_number || 'S/N'}
                                                        </span>
                                                        {g.nationality && (
                                                            <span>• {g.nationality}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* D. FILA CARNET Y NACIONALIDAD */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Carnet (CI)
                                    </label>
                                    <input
                                        className={`w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase ${isProfileIncomplete ? 'border-amber-300' : ''}`}
                                        value={
                                            currentPerson.identification_number
                                        }
                                        onChange={(e) =>
                                            handleFieldChange(
                                                'identification_number',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="123456"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Expedido
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase"
                                        value={currentPerson.issued_in}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                'issued_in',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="LP"
                                    />
                                </div>
                                <div className="relative" ref={nationalityRef}>
                                    <label className="text-xs font-bold text-gray-500">
                                        Nacionalidad
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase"
                                        value={currentPerson.nationality}
                                        onChange={(e) =>
                                            updateNationalityAndPhone(
                                                e.target.value,
                                            )
                                        }
                                        onFocus={() =>
                                            setShowCountrySuggestions(true)
                                        }
                                    />
                                    {showCountrySuggestions && (
                                        <div className="absolute z-10 mt-1 max-h-32 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                                            {filteredCountries.map((c) => (
                                                <div
                                                    key={c}
                                                    onClick={() => {
                                                        updateNationalityAndPhone(
                                                            c,
                                                        );
                                                        setShowCountrySuggestions(
                                                            false,
                                                        );
                                                    }}
                                                    className="cursor-pointer px-2 py-1 text-xs hover:bg-gray-100"
                                                >
                                                    {c}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* E. FILA ESTADO CIVIL Y FECHA */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Estado Civil
                                    </label>
                                    <select
                                        className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                        value={currentPerson.civil_status}
                                        onChange={(e) =>
                                            handleFieldChange(
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
                                <div className="col-span-2 flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500">
                                            Fecha Nac.
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                            value={currentPerson.birth_date}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'birth_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <span className="pl-1 text-xs font-bold text-gray-700">
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
                                            className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase"
                                            value={currentPerson.profession}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'profession',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* F. FILA PROCEDENCIA Y TELÉFONO */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Procedencia
                                    </label>
                                    <div className="relative">
                                        <Globe className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                        <input
                                            className="w-full rounded-lg border border-gray-400 py-2 pl-9 text-sm text-black uppercase"
                                            value={currentPerson.origin}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'origin',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            placeholder="CIUDAD"
                                        />
                                    </div>
                                </div>
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
                                            value={currentPerson.phone}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'phone',
                                                    e.target.value,
                                                )
                                            }
                                            className="block w-full rounded-xl border border-gray-400 py-2 pl-9 text-sm text-black"
                                            placeholder="#### ####"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* G. PARENTESCO (Solo visible si NO es titular) */}
                            {!isTitular && (
                                <div className="mt-2 animate-in rounded-lg border border-blue-100 bg-blue-50 p-2 fade-in">
                                    <label className="text-xs font-bold text-blue-600 uppercase">
                                        Parentesco con el Titular
                                    </label>
                                    <input
                                        className="mt-1 w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-bold text-blue-900 uppercase focus:ring-blue-500"
                                        value={currentPerson.relationship}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                'relationship',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="EJ. ESPOSA, HIJO"
                                    />
                                </div>
                            )}
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
                                    HABITACIÓN
                                </label>

                                {/* --- CAMPO BLOQUEADO (DISABLED) --- */}
                                <select
                                    value={data.room_id}
                                    onChange={(e) =>
                                        setData('room_id', e.target.value)
                                    }
                                    disabled={!!checkinToEdit || !!initialRoomId}
                                    className="block w-full cursor-not-allowed rounded-xl border-gray-300 bg-gray-100 py-2.5 pl-3 text-base font-bold text-black shadow-sm focus:ring-green-500"
                                >
                                    {rooms.map((room) => (
                                        <option key={room.id} value={room.id}>
                                            {room.number} - Costo{' '}
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
                                        disabled={true}
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
                                    Servicios
                                </label>

                                {/* INICIO DEL CÓDIGO A AGREGAR */}
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
                                                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                                                    active
                                                        ? 'border-green-500 bg-green-100 font-bold text-green-700'
                                                        : 'border border-gray-400 bg-white text-gray-600'
                                                }`}
                                            >
                                                {active && (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                )}
                                                {srv.name}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        disabled={true}
                                        className="flex items-center gap-1 rounded-full border border-green-500 bg-green-100 px-3 py-1 text-xs font-bold text-green-700 transition"
                                    >
                                        Desayuno
                                    </button>
                                </div>

                                {/* FIN DEL CÓDIGO A AGREGAR */}
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
