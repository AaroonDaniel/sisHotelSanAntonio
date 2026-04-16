import ToleranceModal from '@/components/ToleranceModal';
import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRightCircle,
    Banknote,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileText,
    Globe,
    Phone,
    Save,
    Trash2,
    User,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import CancelAssignmentModal from './cancelAssignmentModal';
// --- DICCIONARIOS Y FUNCIONES ---
const civilStatusOptions = [
    { value: 'SINGLE', label: 'SOLTERO(A)' },
    { value: 'MARRIED', label: 'CASADO(A)' },
    { value: 'DIVORCED', label: 'DIVORCIADO(A)' },
    { value: 'WIDOWED', label: 'VIUDO(A)' },
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

// Esta función prepara la fecha para el input datetime-local
const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';

    // 1. Creamos un objeto Fecha real a partir del dato del servidor
    // Esto maneja automáticamente si viene como "2026-02-08T17:25:00Z" (UTC)
    const date = new Date(dateString);

    // 2. Calculamos la diferencia horaria (en milisegundos)
    // Para Bolivia (GMT-4), offset será 240 minutos (4 horas)
    const offset = date.getTimezoneOffset() * 60000;

    // 3. Restamos el desfase para obtener la hora local exacta
    const localDate = new Date(date.getTime() - offset);

    // 4. Devolvemos el formato ISO limpio (YYYY-MM-DDTHH:mm) que exige el input
    return localDate.toISOString().slice(0, 16);
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
    agreed_price: number;
    is_delegation: boolean;
    discount?: number;
    notes?: string;
    services?: string[];
    guest?: Guest;
    companions?: any[];
    created_at?: string;
    actual_arrival_date?: string | null;
    schedule_id?: number | null;
    origin?: string | null;
    payment_method?: string | null;
    qr_bank?: string | null;
    is_temporary?: boolean;
    auto_adjust_price?: boolean;
    special_agreement?: {
        id: number;
        type: 'corporativo' | 'delegacion';
        agreed_price: number;
        payment_frequency_days: number;
    } | null;
    payments?: any[];
}

export interface Room {
    id: number;
    number: string;
    status: string;
    price?: { amount: number; bathroom_type?: string };
    room_type?: { name: string; capacity: number };
    checkins?: CheckinData[];
}

interface CheckinModalProps {
    show: boolean;
    onClose: (isSuccess?: boolean) => void;
    checkinToEdit?: CheckinData | null;
    targetGuestId?: number | null;
    guests: Guest[];
    rooms: Room[];
    schedules: Schedule[];
    initialRoomId?: number | null;
    availableServices?: any[];
    isReadOnly?: boolean;
    isReceptionView?: boolean;
}

interface CompanionData {
    id?: number;
    full_name: string;
    identification_number: string;
    nationality: string;
    issued_in: string;
    civil_status: string;
    birth_date: string;
    profession: string;
    origin: string;
    phone: string;
}
interface Schedule {
    id: number;
    name: string;
    check_in_time: string;
    check_out_time: string;
    entry_tolerance_minutes: number;
    exit_tolerance_minutes: number;
    is_active?: boolean | number;
}

interface CheckinFormData {
    guest_id: string | null;
    room_id: string;
    schedule_id?: string;
    actual_arrival_date?: string;
    check_in_date: string;
    duration_days: number | string;
    origin: string;
    advance_payment: number;
    discount?: number;
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
    //origin: string;
    phone: string;
    // Lista de Acompañantes (Index 1..N)
    companions: CompanionData[];
    payment_method: string; // 'EFECTIVO' o 'QR'
    qr_bank: string; // 'BNB', 'BCP', etc.
    is_temporary: boolean;
    auto_adjust_price: boolean;
    monto_efectivo?: number | string;
    monto_qr?: number | string;
    type: 'estandar' | 'corporativo' | 'delegacion';
    corporate_days: number;
    agreed_price: number | string;
}

export default function CheckinModal({
    show,
    onClose,
    checkinToEdit,
    targetGuestId,
    guests,
    rooms,
    schedules = [],
    initialRoomId,
    availableServices = [],
    //isReadOnly = false,
    isReadOnly: propIsReadOnly = false,
    isReceptionView = false,
}: CheckinModalProps) {
    const isReadOnly = false;
    // Estado de para la Asig corporativa
    const [isCustomFrequency, setIsCustomFrequency] = useState(false);

    // Estado para manejar la alerta de huesped ocupado
    const [guestConflictError, setGuestConflictError] = useState<string | null>(
        null,
    );

    // Redirreccionar a la caja de nombre
    const nameInputRef = useRef<HTMLInputElement | null>(null);

    // Const para el desplazamiento de caja de text
    const professionRef = useRef<HTMLInputElement | null>(null);

    // Modal de alerta Tolerancia
    const [tolModal, setTolModal] = useState<{
        show: boolean;
        type: 'allowed' | 'denied';
        time: string;
        minutes: number;
    }>({ show: false, type: 'allowed', time: '', minutes: 0 });
    const [isToleranceApplied, setIsToleranceApplied] = useState(false);

    //

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // REFS PARA DETECTAR CLICS FUERA
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExistingGuest, setIsExistingGuest] = useState(false);

    // Alerta flotante asignacion unica
    const [showErrorToast, setShowErrorToast] = useState(false);

    // [NUEVO] Estado para la navegación del carrusel (0 = Titular)
    const [currentIndex, setCurrentIndex] = useState(0);

    // =========================================================
    // 🚀 LÓGICA PARA DETECTAR SI VIENE DE UNA RESERVA
    // =========================================================
    const isFromReservation = checkinToEdit?.notes
        ?.toLowerCase()
        .includes('reserva');
    const [showReservationToast, setShowReservationToast] = useState(false);
    const [showIncompleteToast, setShowIncompleteToast] = useState(false);
    // Console.log para verificar que React sí detecta la reserva
    useEffect(() => {
        if (show && checkinToEdit) {
            console.log('\n=================================');
            console.log('🏨 ABRIENDO MODAL DE CHECK-IN');
            console.log('-> Notas del Checkin:', checkinToEdit.notes);
            console.log('-> ¿Viene de Reserva?:', isFromReservation);
            console.log('=================================\n');
        }
    }, [show, checkinToEdit]);

    useEffect(() => {
        if (show && isFromReservation) {
            // Mostrar el toast al abrir el modal si viene de reserva
            setShowReservationToast(true);

            // Ocultarlo automáticamente después de 10 segundos (10000 ms)
            const timer = setTimeout(() => {
                setShowReservationToast(false);
            }, 10000);

            return () => clearTimeout(timer);
        } else {
            // Si se cierra el modal, reiniciar el estado
            setShowReservationToast(false);
        }
    }, [show, isFromReservation]);
    // =========================================================

    // REFS PARA DETECTAR CLICS FUERA
    const dropdownRef = useRef<HTMLDivElement>(null);
    const nationalityRef = useRef<HTMLDivElement>(null);

    const originDropdownRef = useRef<HTMLDivElement>(null);

    const [isOriginOpen, setIsOriginOpen] = useState(false);

    const professionDropdownRef = useRef<HTMLDivElement>(null);
    const [professionSuggestions, setProfessionSuggestions] = useState<
        string[]
    >([]);
    const [isProfessionDropdownOpen, setIsProfessionDropdownOpen] =
        useState(false);

    const [displayAge, setDisplayAge] = useState<number | string>('');
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

    //Hora actual
    const now = (() => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    })();
    // [ACTUALIZADO] useForm con la Interfaz y el campo companions
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<CheckinFormData>({
            guest_id: '' as string | null,
            room_id: '',
            schedule_id: '',
            origin: '',
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
            phone: '',
            companions: [],
            payment_method: 'EFECTIVO',
            qr_bank: '',
            is_temporary: false,
            auto_adjust_price: false,
            monto_efectivo: '',
            monto_qr: '',

            type: 'estandar',
            agreed_price: 0,
            corporate_days: 0,
        });

    // =========================================================================
    //  LÓGICA DE TOLERANCIA (Rango: -350m / +40m ejemplo)
    // =========================================================================

    const getToleranceStatus = () => {
        // 1. Validaciones básicas
        if (!data.schedule_id || !data.check_in_date) {
            return {
                isValid: false,
                message: 'Seleccione Horario',
                officialTime: '',
                toleranceMinutes: 0,
            };
        }

        const safeSchedules = schedules || [];
        const schedule = safeSchedules.find(
            (s: any) => String(s.id) === data.schedule_id,
        );

        if (!schedule) {
            return {
                isValid: false,
                message: 'Horario no encontrado',
                officialTime: '',
                toleranceMinutes: 0,
            };
        }

        // 2. Definir fechas base
        const inputDate = new Date(data.check_in_date);
        const [hours, minutes] = schedule.check_in_time.split(':').map(Number);

        // Creamos la fecha oficial basada en el día que seleccionó el usuario
        let officialDate = new Date(inputDate);
        officialDate.setHours(hours, minutes, 0, 0);

        // =====================================================================
        // CORRECCIÓN DE MEDIANOCHE (MADRUGADA)
        // =====================================================================
        // Si el horario es de madrugada (00:00 - 06:00) y el cliente llega
        // de noche (18:00 - 23:59), asumimos que el turno es "mañana".
        // =====================================================================
        if (hours < 6 && inputDate.getHours() > 18) {
            officialDate.setDate(officialDate.getDate() + 1);
        }

        // 3. Calcular Ventana de Tolerancia
        const toleranceStart = new Date(
            officialDate.getTime() - schedule.entry_tolerance_minutes * 60000,
        );

        // 4. Comparar si está dentro del rango
        // Debe ser MAYOR al inicio de la tolerancia y MENOR o IGUAL a la hora oficial
        const isInsideWindow =
            inputDate >= toleranceStart && inputDate <= officialDate;

        return {
            isValid: isInsideWindow,
            officialTime: schedule.check_in_time.substring(0, 5),
            toleranceMinutes: schedule.entry_tolerance_minutes,
        };
    };

    // Calcular estado actual
    const toleranceStatus = getToleranceStatus();

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

            if (
                professionDropdownRef.current &&
                !professionDropdownRef.current.contains(event.target as Node)
            ) {
                setIsProfessionDropdownOpen(false);
            }
            if (
                issuedInDropdownRef.current &&
                !issuedInDropdownRef.current.contains(event.target as Node)
            ) {
                setIsIssuedInDropdownOpen(false);
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

    //Reloj actualiza cada 5 segundos para saber si ya pasaron los 10 minutos
    useEffect(() => {
        let interval: any;
        if (show) {
            setCurrentTime(Date.now());
            interval = setInterval(() => setCurrentTime(Date.now()), 5000);
        }
        return () => clearInterval(interval);
    }, [show]);

    // --- EFECTO MAESTRO: CARGA DE DATOS, HORA Y GESTIÓN DE HORARIOS ---
    useEffect(() => {
        if (show) {
            clearErrors(); // Limpiamos errores previos
            setIsToleranceApplied(false);
            // 1. Calculamos la HORA ACTUAL EXACTA
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            const currentDateTimeISO = now.toISOString().slice(0, 16);
            const nowObj = new Date(); // Objeto fecha normal para comparaciones

            const activeSchedule = schedules.find(
                (s) => s.is_active === true || s.is_active === 1,
            );
            const defaultScheduleId = activeSchedule
                ? String(activeSchedule.id)
                : '';

            // 2. LÓGICA DE ENFOQUE (Índice del carrusel)
            let startAt = 0;
            if (checkinToEdit && targetGuestId) {
                if (Number(checkinToEdit.guest_id) === Number(targetGuestId)) {
                    startAt = 0; // Es el titular
                } else if (checkinToEdit.companions) {
                    const compIndex = checkinToEdit.companions.findIndex(
                        (c: any) => c.id === Number(targetGuestId),
                    );
                    if (compIndex !== -1) startAt = compIndex + 1; // Es un acompañante
                }
            }
            setCurrentIndex(startAt);

            if (checkinToEdit) {
                // ===============================================
                // MODO EDICIÓN: Cargar datos existentes
                // ===============================================

                // 🚀 CORRECCIÓN: Verificamos si aún falta llenar la procedencia
                const isOriginMissing =
                    !checkinToEdit.origin || checkinToEdit.origin.trim() === '';

                // 🚀 DETECTAMOS SI ES UNA HABITACIÓN "ADICIONAL" DE UNA RESERVA Y ESTÁ PENDIENTE
                const isSecondaryRoom =
                    checkinToEdit.notes?.toLowerCase().includes('adicional') &&
                    isOriginMissing;

                // Si es adicional y está pendiente, no bloqueamos como existente para obligar a buscar/crear
                setIsExistingGuest(!isSecondaryRoom);

                // --- LÓGICA DE DETECCIÓN DE EXCESO DE TIEMPO ---
                let calculatedDuration = Math.max(
                    1,
                    Number(checkinToEdit.duration_days),
                );
                const schedule = schedules.find(
                    (s) => String(s.id) === String(checkinToEdit.schedule_id),
                );

                if (schedule) {
                    const checkInDate = new Date(checkinToEdit.check_in_date);
                    const [outH, outM] = schedule.check_out_time
                        .split(':')
                        .map(Number);
                    const exitTolerance =
                        (schedule as any).exit_tolerance_minutes || 60;

                    let isValidDuration = false;
                    while (!isValidDuration) {
                        const targetCheckout = new Date(checkInDate);
                        targetCheckout.setDate(
                            targetCheckout.getDate() + calculatedDuration,
                        );
                        targetCheckout.setHours(outH, outM, 0, 0);

                        const hardLimit = new Date(
                            targetCheckout.getTime() + exitTolerance * 60000,
                        );

                        if (nowObj > hardLimit) {
                            calculatedDuration++;
                        } else {
                            isValidDuration = true;
                        }
                        if (calculatedDuration > 365) break;
                    }
                }

                // 1. Buscamos la habitación actual en la lista 'rooms' para saber su precio original
                const currentRoomObj = rooms?.find(
                    (r: any) => String(r.id) === String(checkinToEdit.room_id),
                );
                const originalRoomPrice = currentRoomObj?.price?.amount || 0;

                // 2. Comparamos el precio que está pagando vs el precio normal
                const isPriceAdjusted =
                    originalRoomPrice > 0 &&
                    Number(checkinToEdit.agreed_price) <
                        Number(originalRoomPrice);

                // Cargamos todo al formulario
                setData((prev) => ({
                    ...prev,
                    guest_id: isSecondaryRoom
                        ? ''
                        : String(checkinToEdit.guest_id),
                    room_id: String(checkinToEdit.room_id),
                    duration_days: calculatedDuration,
                    check_in_date: checkinToEdit.check_in_date,
                    schedule_id: checkinToEdit.schedule_id
                        ? String(checkinToEdit.schedule_id)
                        : '',
                    origin: checkinToEdit.origin || '',
                    advance_payment: checkinToEdit.advance_payment,
                    notes: checkinToEdit.notes || '',
                    actual_arrival_date:
                        checkinToEdit.actual_arrival_date || '',
                    selected_services: checkinToEdit.services
                        ? checkinToEdit.services.map((s: any) =>
                              String(s.id || s),
                          )
                        : [],

                    auto_adjust_price: isPriceAdjusted,
                    is_temporary: !!checkinToEdit.is_temporary,

                    type: checkinToEdit.special_agreement?.type || 'estandar', // <--- CORREGIDO
                    agreed_price:
                        checkinToEdit.special_agreement?.agreed_price ||
                        Number(originalRoomPrice),
                    corporate_days:
                        checkinToEdit.special_agreement
                            ?.payment_frequency_days || 0,

                    full_name: isSecondaryRoom
                        ? ''
                        : checkinToEdit.guest?.full_name || '',
                    identification_number: isSecondaryRoom
                        ? ''
                        : checkinToEdit.guest?.identification_number || '',
                    issued_in: isSecondaryRoom
                        ? ''
                        : checkinToEdit.guest?.issued_in || '',
                    nationality: isSecondaryRoom
                        ? 'BOLIVIANA'
                        : checkinToEdit.guest?.nationality || 'BOLIVIANA',
                    civil_status: isSecondaryRoom
                        ? ''
                        : checkinToEdit.guest?.civil_status || '',
                    birth_date: isSecondaryRoom
                        ? ''
                        : checkinToEdit.guest?.birth_date || '',
                    profession: isSecondaryRoom
                        ? ''
                        : checkinToEdit.guest?.profession || '',
                    phone: isSecondaryRoom
                        ? ''
                        : checkinToEdit.guest?.phone || '',

                    companions:
                        checkinToEdit.companions?.map((c: any) => ({
                            id: c.id,
                            full_name: c.full_name,
                            identification_number:
                                c.identification_number || '',
                            birth_date: c.birth_date || '',
                            nationality: c.nationality || 'BOLIVIANA',
                            issued_in: c.issued_in || '',
                            civil_status: c.civil_status || '',
                            profession: c.profession || '',
                            phone: c.phone || '',
                            origin: c.pivot?.origin || c.origin || '',
                        })) || [],

                    payment_method: checkinToEdit.payment_method || 'EFECTIVO',
                    qr_bank: checkinToEdit.qr_bank || '',
                }));

                // 🌟 LÓGICA PARA MOSTRAR LA CAJA "OTRO" SI TENÍA UN NÚMERO PERSONALIZADO
                if (checkinToEdit.special_agreement?.type === 'corporativo') {
                    const frec = String(
                        checkinToEdit.special_agreement.payment_frequency_days,
                    );
                    if (frec && !['1', '7', '15', '30'].includes(frec)) {
                        setIsCustomFrequency(true);
                    } else {
                        setIsCustomFrequency(false);
                    }
                } else {
                    setIsCustomFrequency(false);
                }
            } else {
                // ===============================================
                // MODO NUEVO REGISTRO: Limpiar formulario
                // ===============================================
                reset();
                setIsExistingGuest(false);
                setCurrentIndex(0);

                const initialRoomObj = rooms?.find(
                    (r: any) => String(r.id) === String(initialRoomId),
                );
                const originalRoomPriceForNew =
                    initialRoomObj?.price?.amount || 0;

                // Valores iniciales
                setData((prev) => ({
                    ...prev,
                    check_in_date: currentDateTimeISO,
                    room_id: initialRoomId ? String(initialRoomId) : '',
                    schedule_id: defaultScheduleId,
                    duration_days: 1,
                    selected_services: [],
                    companions: [],
                    payment_method: 'EFECTIVO',
                    qr_bank: '',
                    auto_adjust_price: false,
                    is_temporary: false,
                    type: 'estandar',
                    agreed_price: originalRoomPriceForNew
                        ? Number(originalRoomPriceForNew)
                        : 0,
                    corporate_days: 0,
                }));

                // Aseguramos que la caja "OTRO" se oculte
                setIsCustomFrequency(false);
            }
        } else {
            // ===============================================
            // 🛑 MAGIA AQUÍ: Cuando se cierra el modal (Cancelar)
            // ===============================================
            reset(); // Forzamos a Inertia a olvidar el estado anterior
            clearErrors();
            setIsExistingGuest(false);
            setCurrentIndex(0);
        }
        // 🛑 IMPORTANTE: Agregamos 'rooms' al arreglo de dependencias al final
    }, [show, checkinToEdit, initialRoomId, targetGuestId, schedules, rooms]);

    // Efecto para mostrar y ocultar asignacion unica
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            setShowErrorToast(true); // Mostrar

            // Ocultar después de 5 segundos
            const timer = setTimeout(() => {
                setShowErrorToast(false);
            }, 5000);

            return () => clearTimeout(timer); // Limpiar timer si cambia algo
        } else {
            setShowErrorToast(false);
        }
    }, [errors]);
    // Control de fecha y hora entorno del uso de horario  (useEffect)
    useEffect(() => {
        // Solo si el modal se está mostrando (show = true)
        // Y NO estamos editando una asignación existente (es nueva)
        if (show && !checkinToEdit) {
            const now = new Date();
            // Ajuste para obtener la hora local correcta en formato ISO (YYYY-MM-DDTHH:mm)
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            const currentDateTime = now.toISOString().slice(0, 16);

            // Actualizamos el formulario con la hora exacta de AHORA
            setData('check_in_date', currentDateTime);
        }
    }, [show, checkinToEdit]); // Se dispara cada vez que 'show' cambia

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

    // Auto Focus enfocar a la caja de texto del nombre completo
    // =========================================================
    // 🚀 AUTO-FOCUS INTELIGENTE CORREGIDO (Sin saltos fantasma)
    // =========================================================
    useEffect(() => {
        if (show) {
            setTimeout(() => {
                if (nameInputRef.current) {
                    // 1. Verificamos directamente en el HTML si la caja está vacía en este instante exacto
                    const isNameEmpty =
                        !nameInputRef.current.value ||
                        nameInputRef.current.value.trim() === '';

                    // 2. ¿Es una asignación completamente nueva (habitación verde)?
                    const isNewAssignment = !checkinToEdit;

                    // 3. ¿Estamos en la pestaña de un acompañante?
                    const isAddingCompanion = currentIndex > 0;

                    // SOLO ENFOCA si la caja está vacía Y (es un registro nuevo O es un acompañante nuevo)
                    if (isNameEmpty && (isNewAssignment || isAddingCompanion)) {
                        nameInputRef.current.focus();
                    }
                }
            }, 200); // Le damos 200ms para asegurar que React termine de pintar los datos
        }
    }, [show, currentIndex, checkinToEdit]);

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
                //origin: guest.origin || '',
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
                    //origin: guest.origin || '',
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
                  const ci = g.identification_number
                      ? g.identification_number.toLowerCase()
                      : '';
                  return fullName.includes(term) || ci.includes(term);
              })
            : [];

    const isProfileIncomplete =
        isTitular &&
        !isExistingGuest &&
        (!data.identification_number || data.identification_number.length < 3);

    // =========================================================
    // 🚀 LÓGICA DE ENVÍO Y ADVERTENCIA DE CAPACIDAD (ACTUALIZADO)
    // =========================================================

    // A. NUEVA FUNCIÓN: Se encarga ÚNICAMENTE de hablar con el Backend (Laravel)
    // Hemos movido aquí tu código original intacto.
    const executeSubmit = () => {
        // Camino de Éxito (onSuccess): Se ejecuta SOLAMENTE si el backend (Laravel) guarda todo correctamente.
        const onSuccess = (page: any) => {
            console.log('✅ RESPUESTA EXITOSA DEL SERVIDOR:', page);
            reset(); // Limpia los campos del formulario.
            onClose(true); // Cierra la ventana modal y actualiza la vista.
        };

        // Camino de Error (onError): Atrapa rechazos (ej. Asignación Única o errores de validación)
        const onError = (errors: any) => {
            console.error('❌ EL SERVIDOR RECHAZÓ LOS DATOS:', errors);

            // CONTROL DE DUPLICADOS: Alerta si el huésped ya está ocupando otra habitación
            if (errors.guest_id) {
                setGuestConflictError(errors.guest_id);
                setTimeout(() => {
                    setGuestConflictError(null);
                }, 7000);
            }
        };

        // Lógica de Envío (Routing): Decide si actualiza o crea
        if (checkinToEdit) {
            // MODO EDICIÓN (PUT): Para habitaciones Naranjas
            console.log('-> Método: PUT (Actualizar)');
            put(`/checks/${checkinToEdit.id}`, {
                onSuccess,
                onError,
                onFinish: () => console.log('🏁 Petición PUT terminada.'),
            });
        } else {
            // MODO CREACIÓN (POST): Para habitaciones Verdes
            console.log('-> Método: POST (Nuevo Registro)');
            post('/checks', {
                onSuccess,
                onError,
                onFinish: () => console.log('🏁 Petición POST terminada.'),
            });
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // =========================================================
        // 🛑 CANDADO DE SEGURIDAD: ASIGNACIÓN CORPORATIVA
        // =========================================================
        if (data.type === 'corporativo') {
            const montoAdelanto = Number(data.advance_payment);

            if (!montoAdelanto || montoAdelanto <= 0) {
                // 1. Alerta en pantalla
                alert(
                    "⚠️ ALERTA FINANCIERA:\n\nNo se puede activar la 'Asignación Corporativa' sin recibir dinero.\nPor favor, ingresa el monto en el campo de 'Monto de Adelanto'.",
                );

                // 2. Pintamos el error usando el sistema de Inertia que ya tienes
                // (Opcional, pero ayuda a que se vea en rojo abajo del input)
                return; // 🛑 EL CANDADO SE CIERRA: No ejecutamos executeSubmit()
            }
        }
        // =========================================================

        executeSubmit();
    };
    // ===============================
    // AUTOCOMPLETE EXPEDIDO (BD)
    // ===============================
    const issuedInDropdownRef = useRef<HTMLDivElement>(null);
    const [issuedInSuggestions, setIssuedInSuggestions] = useState<string[]>(
        [],
    );
    const [isIssuedInDropdownOpen, setIsIssuedInDropdownOpen] = useState(false);

    // ===============================
    // AUTOCOMPLETE PROCEDENCIA (BD)
    // ===============================

    // Estado para las sugerencias que vienen de la Base de Datos
    const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
    const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState(false);

    // Función para buscar en el Backend ORIGIN
    const searchOrigins = async (query: string) => {
        // Solo buscamos si hay al menos 2 letras para no saturar
        if (!query || query.length < 2) {
            setOriginSuggestions([]);
            return;
        }

        try {
            const response = await axios.get('/search/origins', {
                params: { query: query },
            });
            setOriginSuggestions(response.data);
        } catch (error) {
            console.error('Error buscando procedencias:', error);
        }
    };

    // Esta función se llamará en el onChange del input
    const handleOriginInput = (val: string) => {
        const upperVal = val.toUpperCase();
        handleFieldChange('origin', upperVal);
        setIsOriginDropdownOpen(true);
        searchOrigins(upperVal);
    };

    //Funsion parabuscar en el Backend EXPEDIDO
    const searchIssuedIn = async (query: string) => {
        // Buscamos desde 1 letra (ej: "L" para "LP")
        if (!query || query.length < 1) {
            setIssuedInSuggestions([]);
            return;
        }
        try {
            // NOTA: Asegúrate de tener esta ruta creada en tu backend (Laravel)
            const response = await axios.get('/search/issued-in', {
                params: { query: query },
            });
            setIssuedInSuggestions(response.data);
        } catch (error) {
            console.error('Error buscando expedidos:', error);
        }
    };

    const handleIssuedInInput = (val: string) => {
        const upperVal = val.toUpperCase();
        handleFieldChange('issued_in', upperVal);
        setIsIssuedInDropdownOpen(true);
        searchIssuedIn(upperVal);
    };

    // ===============================
    // AUTOCOMPLETE PROFESIÓN
    // ===============================
    const searchProfessions = async (query: string) => {
        if (!query || query.length < 2) {
            setProfessionSuggestions([]);
            return;
        }
        try {
            const response = await axios.get('/search/professions', {
                params: { query: query },
            });
            setProfessionSuggestions(response.data);
        } catch (error) {
            console.error('Error buscando profesiones:', error);
        }
    };

    const handleProfessionInput = (val: string) => {
        const upperVal = val.toUpperCase();
        handleFieldChange('profession', upperVal);
        setIsProfessionDropdownOpen(true);
        searchProfessions(upperVal);
    };

    // La variable que usarás para el .map en el dropdown ahora es originSuggestions
    // (Ya no necesitas 'filteredOrigins' porque el filtro lo hace la BD)

    const handleCheckout = () => {
        if (!checkinToEdit) return;

        if (
            confirm(
                '¿Confirmar salida? Se generará el recibo final y pasará a limpieza.',
            )
        ) {
            // 1. Preparamos el dinero y el método de pago que el recepcionista llenó
            // (Asegúrate de que 'data' sea el nombre de tu variable del formulario useForm)
            const metodo = data.payment_method || 'EFECTIVO';
            let payload: any = {
                check_out_date: new Date().toISOString(),
                payment_method: metodo,
                qr_bank: data.qr_bank,
            };

            // 2. Lógica para dividir el pago si selecciona "AMBOS"
            if (metodo === 'AMBOS') {
                payload.amount = 0;
                payload.monto_efectivo = Number(data.monto_efectivo) || 0;
                payload.monto_qr = Number(data.monto_qr) || 0;
            } else {
                // Si pagó todo en Efectivo o todo en QR (Usa el input donde escribes el monto final)
                payload.amount = Number(data.advance_payment) || 0;
            }

            // 3. Enviamos la petición con el payload lleno (ya no las {})
            router.put(
                `/checks/${checkinToEdit.id}/checkout`,
                payload, // <--- AQUÍ ENVIAMOS EL DINERO
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
    // Visuales
    const durationVal = Number(data.duration_days) || 0;
    const estimatedCheckout = new Date(data.check_in_date);
    estimatedCheckout.setDate(estimatedCheckout.getDate() + durationVal);
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

    const canCancel = () => {
        if (!checkinToEdit || !checkinToEdit.created_at) return false;
        const createdAt = new Date(checkinToEdit.created_at).getTime();
        const diffMinutes = (currentTime - createdAt) / 60000;
        return diffMinutes <= 35;
    };

    if (!show) return null;

    // --- FUNCIÓN DE TOLERANCIA ---
    const handleApplyTolerance = () => {
        // 1. Validaciones previas (Rojo si no corresponde)
        if (!toleranceStatus.isValid) {
            setTolModal({
                show: true,
                type: 'denied',
                time: toleranceStatus.officialTime,
                minutes: toleranceStatus.toleranceMinutes,
            });
            return;
        }

        // 2. Obtener el horario seleccionado
        const safeSchedules = schedules || [];
        const schedule = safeSchedules.find(
            (s: any) => String(s.id) === data.schedule_id,
        );
        if (!schedule) return;

        // 3. LÓGICA DE REEMPLAZO DE HORA
        // Tomamos la FECHA (Día) que el usuario eligió (o la de hoy por defecto)
        const currentInputDateVal = data.check_in_date; // ej: "2026-02-07T00:15"
        const datePart = currentInputDateVal.split('T')[0]; // "2026-02-07"

        // Tomamos la HORA OFICIAL del horario (ej: "06:00")
        const officialTime = schedule.check_in_time.substring(0, 5);

        // Combinamos: Mismo día + Hora del Horario
        const newDateTime = `${datePart}T${officialTime}`;

        // 4. Aplicamos el cambio al formulario
        setData((prev: any) => ({
            ...prev,
            check_in_date: newDateTime, // <--- Aquí se fuerza la hora del horario
            actual_arrival_date: prev.check_in_date, // Guardamos la hora real como respaldo
        }));

        // 5. Confirmación Visual
        setTolModal({
            show: true,
            type: 'allowed',
            time: officialTime,
            minutes: toleranceStatus.toleranceMinutes,
        });

        setIsToleranceApplied(true);
    };

    const typeBathroom: Record<string, string> = {
        SHARED: 'COMPARTIDO',
        PRIVATE: 'PRIVADO',
    };
    // =========================================================================
    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="flex max-h-[83vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        {checkinToEdit
                            ? `Asignación: Hab. ${rooms.find((r) => r.id === Number(data.room_id))?.number || ''}`
                            : 'Asignación'}
                    </h2>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onClose(false)}
                            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* ===================================================== */}
                {/* 🚀 ZONA DE TOASTS FLOTANTES (MÁS ABAJO Y LADO A LADO) */}
                {/* ===================================================== */}
                <div className="pointer-events-none fixed top-24 right-8 z-[100] flex flex-row items-start justify-end gap-4">
                    {/* TOAST 1: ALERTA DE ERROR (ROJO) */}
                    {showErrorToast && Object.keys(errors).length > 0 && (
                        <div className="pointer-events-auto flex w-80 animate-in flex-col gap-2 rounded-xl border border-red-200 bg-white p-4 shadow-xl duration-300 slide-in-from-right-10 fade-in">
                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-red-100 p-2 text-red-600">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-900">
                                        Faltan datos
                                    </h3>
                                    <ul className="mt-1 list-inside list-disc text-xs font-medium text-red-600">
                                        {Object.values(errors).map(
                                            (error: any, index) => (
                                                <li key={index}>{error}</li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowErrorToast(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                    {/* TOAST 2: ALERTA DE HUÉSPED DUPLICADO (DISEÑO TOAST) */}
                    {guestConflictError && (
                        <div className="pointer-events-auto flex w-80 animate-in flex-col gap-2 rounded-xl border border-red-300 bg-red-50 p-4 shadow-xl duration-300 slide-in-from-right-10 fade-in">
                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-red-200 p-2 text-red-700 shadow-sm">
                                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-red-800">
                                        Asignación Bloqueada
                                    </h3>
                                    <p className="mt-1 text-xs leading-tight font-semibold text-red-600">
                                        {guestConflictError}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGuestConflictError(null)}
                                    className="text-red-400 transition-colors hover:text-red-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TOAST 3: INFO DE RESERVA (AZUL - 10 SEGUNDOS) */}
                    {showReservationToast &&
                        checkinToEdit?.is_temporary &&
                        checkinToEdit?.notes
                            ?.toUpperCase()
                            .includes('RESERVA') && (
                            <div className="pointer-events-auto flex w-80 animate-in flex-col gap-2 rounded-xl border border-blue-200 bg-white p-4 shadow-xl duration-300 slide-in-from-right-10 fade-in">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900">
                                            Asignación de Reserva
                                        </h3>
                                        {/* Mostramos la nota directamente, que ahora contiene "RESERVA #74 - TITULAR ORIGINAL: OSCAR" */}
                                        <p className="mt-1 text-[11px] leading-tight font-bold text-blue-700 uppercase">
                                            {checkinToEdit?.notes}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowReservationToast(false)
                                        }
                                        className="text-gray-400 transition hover:text-gray-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                {/* Barra de tiempo de 10s */}
                                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-blue-50">
                                    <div className="h-full w-full origin-left animate-[w-0_10s_linear_forwards] bg-blue-500" />
                                </div>
                            </div>
                        )}
                </div>

                <form onSubmit={submit} className="flex flex-col md:flex-row">
                    {/* --- COLUMNA IZQUIERDA: CARRUSEL DE PERSONAS --- */}
                    <div className="relative flex-1 overflow-y-auto border-r border-gray-100 bg-white p-6">
                        <div className="space-y-4">
                            {/* ========================================================= */}
                            {/* ALERTA DE DATOS FALTANTES (Incrustada en la columna)      */}
                            {/* ========================================================= */}
                            {isTitular &&
                                isProfileIncomplete &&
                                data.full_name.length > 3 && (
                                    <div className="absolute -top-2 left-0 z-50 w-full px-5 pt-2">
                                        <div className="flex animate-in items-center justify-between rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-0.5 shadow-md backdrop-blur-sm duration-300 slide-in-from-top-2">
                                            <span className="flex items-center gap-2 text-[12px] font-bold text-amber-700">
                                                <AlertTriangle className="h-3.5 w-3.5" />
                                                PERFIL PENDIENTE: Se guardará
                                                solo con el nombre.
                                            </span>
                                        </div>
                                    </div>
                                )}

                            {/* C. INPUT NOMBRE (Conectado a currentPerson) */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="mb-1.5 block text-center text-base font-bold text-red-700 uppercase">
                                    DATOS DEL HUESPED {currentIndex + 1}
                                </label>

                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                    Nombre Completo
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        className="w-full rounded-xl border border-gray-400 py-2.5 pl-10 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500 disabled:bg-gray-50"
                                        placeholder="ESCRIBE PARA BUSCAR..."
                                        // IMPORTANTE: Usamos currentPerson para que funcione en el carrusel
                                        value={currentPerson.full_name}
                                        disabled={isReadOnly}
                                        onChange={(e) => {
                                            const newValue =
                                                e.target.value.toUpperCase();

                                            // LÓGICA DE LIMPIEZA AUTOMÁTICA
                                            // Detectamos si estamos editando sobre un usuario que YA estaba seleccionado (con ID)
                                            // o si el usuario borró todo el texto.
                                            const hasLinkedId = isTitular
                                                ? !!data.guest_id
                                                : !!companionsList[
                                                      currentIndex - 1
                                                  ]?.id;

                                            const shouldReset =
                                                hasLinkedId || newValue === '';

                                            if (shouldReset) {
                                                // --- CASO 1: LIMPIEZA PROFUNDA (Borrón y cuenta nueva) ---
                                                if (isTitular) {
                                                    setData((prev) => ({
                                                        ...prev,
                                                        full_name: newValue, // Mantenemos lo que escribe
                                                        guest_id: null, // Rompemos el vínculo con el ID anterior
                                                        // Limpiamos el resto de datos autocompletados
                                                        identification_number:
                                                            '',
                                                        issued_in: '',
                                                        nationality:
                                                            'BOLIVIANA',
                                                        civil_status: '',
                                                        birth_date: '',
                                                        profession: '',
                                                        //origin: '',
                                                        phone: '',
                                                    }));
                                                    setIsExistingGuest(false);
                                                } else {
                                                    // Lógica para Acompañantes
                                                    const newCompanions = [
                                                        ...companionsList,
                                                    ];
                                                    if (
                                                        newCompanions[
                                                            currentIndex - 1
                                                        ]
                                                    ) {
                                                        newCompanions[
                                                            currentIndex - 1
                                                        ] = {
                                                            ...newCompanions[
                                                                currentIndex - 1
                                                            ],
                                                            full_name: newValue,
                                                            id: undefined, // Rompemos el vínculo
                                                            // Limpiamos datos
                                                            identification_number:
                                                                '',
                                                            issued_in: '',
                                                            nationality:
                                                                'BOLIVIANA',
                                                            civil_status: '',
                                                            birth_date: '',
                                                            profession: '',
                                                            //origin: '',
                                                            phone: '',
                                                        };
                                                        setData(
                                                            'companions',
                                                            newCompanions,
                                                        );
                                                    }
                                                }
                                            } else {
                                                // --- CASO 2: ESCRITURA NORMAL (Solo actualiza el nombre) ---
                                                // Esto pasa cuando ya limpiamos y el usuario sigue escribiendo el nombre correcto
                                                handleFieldChange(
                                                    'full_name',
                                                    newValue,
                                                );
                                            }

                                            // 1. Siempre activamos el dropdown al escribir
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => {
                                            // Activamos dropdown para CUALQUIERA si hay texto
                                            if (
                                                currentPerson.full_name.length >
                                                1
                                            )
                                                setIsDropdownOpen(true);
                                        }}
                                        required
                                        autoComplete="off"
                                    />

                                    {/* Dropdown de Búsqueda (Visible para TODOS) */}
                                    {isDropdownOpen &&
                                        filteredGuests.length > 0 && (
                                            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                {filteredGuests.map((g) => (
                                                    <div
                                                        key={g.id}
                                                        onClick={() =>
                                                            handleSelectGuest(g)
                                                        }
                                                        className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm last:border-0 hover:bg-green-50"
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

                            {/* D. FILA CARNET Y NACIONALIDAD */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Carnet (CI)/Pasaporte
                                    </label>
                                    <input
                                        className={`w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase ${isProfileIncomplete ? 'border-amber-300' : ''}`}
                                        value={
                                            currentPerson.identification_number
                                        }
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                'identification_number',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="123456"
                                    />
                                </div>
                                <div
                                    className="relative"
                                    ref={issuedInDropdownRef}
                                >
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Expedido
                                    </label>
                                    <div className="relative">
                                        <input
                                            className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase focus:border-blue-500 focus:ring-blue-500"
                                            value={
                                                currentPerson.issued_in || ''
                                            }
                                            disabled={isReadOnly}
                                            placeholder="EJ: LP, SC, CB"
                                            autoComplete="off"
                                            onChange={(e) =>
                                                handleIssuedInInput(
                                                    e.target.value,
                                                )
                                            }
                                            onFocus={() => {
                                                // Mostramos sugerencias si ya hay algo escrito
                                                if (
                                                    (
                                                        currentPerson.issued_in ||
                                                        ''
                                                    ).length > 0
                                                ) {
                                                    setIsIssuedInDropdownOpen(
                                                        true,
                                                    );
                                                    searchIssuedIn(
                                                        currentPerson.issued_in as string,
                                                    );
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setIsIssuedInDropdownOpen(
                                                        false,
                                                    );
                                                }, 200); // Retraso vital para poder hacer clic en la lista
                                            }}
                                        />

                                        {/* Dropdown de sugerencias */}
                                        {isIssuedInDropdownOpen &&
                                            issuedInSuggestions.length > 0 && (
                                                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                    {issuedInSuggestions.map(
                                                        (item, index) => (
                                                            <div
                                                                key={index}
                                                                onClick={() => {
                                                                    handleFieldChange(
                                                                        'issued_in',
                                                                        item,
                                                                    );
                                                                    setIsIssuedInDropdownOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                                className="cursor-pointer border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 last:border-0 hover:bg-blue-200"
                                                            >
                                                                {item}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                </div>
                                <div className="relative" ref={nationalityRef}>
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Nacionalidad
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm font-medium text-gray-900 uppercase"
                                        value={currentPerson.nationality}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                            updateNationalityAndPhone(
                                                e.target.value,
                                            )
                                        }
                                        onFocus={() => {
                                            // 1. Si el texto dice exactamente BOLIVIANA, lo vaciamos al hacer clic
                                            if (
                                                currentPerson.nationality ===
                                                'BOLIVIANA'
                                            ) {
                                                updateNationalityAndPhone('');
                                            }
                                            // Mostramos las sugerencias de países
                                            setShowCountrySuggestions(true);
                                        }}
                                        onBlur={(e) => {
                                            // 2. Usamos un pequeño retraso de 200ms. Esto es MUY IMPORTANTE
                                            // para que si el usuario da clic en la lista de sugerencias, no se cierre antes de tiempo.
                                            setTimeout(() => {
                                                // Si el usuario se fue de la caja y la dejó vacía, restauramos BOLIVIANA
                                                if (
                                                    !e.target.value ||
                                                    e.target.value.trim() === ''
                                                ) {
                                                    updateNationalityAndPhone(
                                                        'BOLIVIANA',
                                                    );
                                                }
                                                setShowCountrySuggestions(
                                                    false,
                                                );
                                            }, 200);
                                        }}
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
                                                    className="cursor-pointer px-2 py-1 text-xs font-medium text-gray-900 hover:bg-gray-100" // Added text-gray-900 and font-medium
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
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Estado Civil
                                    </label>
                                    <select
                                        className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                        value={currentPerson.civil_status}
                                        disabled={isReadOnly}
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
                                    {/*}
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Fecha Nac.
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                            value={currentPerson.birth_date}
                                            disabled={isReadOnly}
                                            onChange={(e) =>
                                                handleFieldChange(
                                                    'birth_date',
                                                    e.target.value,
                                                )
                                            }
                                            onKeyDown={(e) => {
                                                // TAB hacia adelante (lo controlas tú)
                                                if (
                                                    e.key === 'Tab' &&
                                                    !e.shiftKey
                                                ) {
                                                    e.preventDefault();
                                                    professionRef.current?.focus();
                                                }

                                                // SHIFT + TAB hacia atrás (comportamiento normal)
                                                if (
                                                    e.key === 'Tab' &&
                                                    e.shiftKey
                                                ) {
                                                    // no hacemos nada para que el navegador retroceda libremente
                                                }
                                            }}
                                        />
                                        <span className="pl-1 text-xs font-bold text-gray-700">
                                            {displayAge
                                                ? `Edad: ${displayAge}`
                                                : ''}
                                        </span>
                                    </div>
                                    {*/}

                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Año Nac.
                                        </label>
                                        <input
                                            type="text"
                                            className="block w-full rounded-xl border border-gray-400 px-3 py-2 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                            value={
                                                currentPerson.birth_date
                                                    ? currentPerson.birth_date.substring(
                                                          0,
                                                          4,
                                                      )
                                                    : ''
                                            }
                                            disabled={isReadOnly}
                                            placeholder="EJ: 1990"
                                            onChange={(e) => {
                                                // Extraer solo hasta 4 números
                                                const year = e.target.value
                                                    .replace(/\D/g, '')
                                                    .substring(0, 4);

                                                if (year.length === 4) {
                                                    // Si ya escribió los 4 dígitos, guardamos la fecha completa "YYYY-01-01"
                                                    handleFieldChange(
                                                        'birth_date',
                                                        `${year}-01-01`,
                                                    );
                                                } else if (year.length > 0) {
                                                    // Mientras escribe, mantenemos el valor temporal
                                                    handleFieldChange(
                                                        'birth_date',
                                                        year,
                                                    );
                                                } else {
                                                    // Si borra el campo, limpiamos la fecha
                                                    handleFieldChange(
                                                        'birth_date',
                                                        '',
                                                    );
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                // TAB hacia adelante (pasa a Profesión)
                                                if (
                                                    e.key === 'Tab' &&
                                                    !e.shiftKey
                                                ) {
                                                    e.preventDefault();
                                                    professionRef.current?.focus();
                                                }
                                            }}
                                            maxLength={4}
                                        />
                                        <span className="pl-1 text-xs font-bold text-gray-700">
                                            {/* Mostrar edad calculada o estática */}
                                            {displayAge
                                                ? `Edad: ${displayAge}`
                                                : ''}
                                        </span>
                                    </div>

                                    {/* INPUT DE PROFESIÓN ACTUALIZADO */}
                                    {/* CAMPO PROFESIÓN ACTUALIZADO (ESTILO PROCEDENCIA) */}
                                    <div
                                        className="relative flex-1"
                                        ref={professionDropdownRef}
                                    >
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Profesión
                                        </label>
                                        <div className="relative">
                                            <input
                                                ref={professionRef}
                                                type="text"
                                                className="block w-full rounded-xl border border-gray-400 px-3 py-2 text-sm text-black uppercase focus:border-blue-500 focus:ring-blue-500"
                                                value={
                                                    currentPerson.profession ||
                                                    ''
                                                }
                                                disabled={isReadOnly}
                                                placeholder="EJ: INGENIERO"
                                                autoComplete="off"
                                                onChange={(e) =>
                                                    handleProfessionInput(
                                                        e.target.value,
                                                    )
                                                }
                                                onFocus={() => {
                                                    if (
                                                        (
                                                            currentPerson.profession ||
                                                            ''
                                                        ).length > 1
                                                    ) {
                                                        setIsProfessionDropdownOpen(
                                                            true,
                                                        );
                                                        searchProfessions(
                                                            currentPerson.profession as string,
                                                        );
                                                    }
                                                }}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        setIsProfessionDropdownOpen(
                                                            false,
                                                        );
                                                    }, 200);
                                                }}
                                            />

                                            {/* Dropdown conectado a la Base de Datos (professionSuggestions) */}
                                            {isProfessionDropdownOpen &&
                                                professionSuggestions.length >
                                                    0 && (
                                                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                        {professionSuggestions.map(
                                                            (
                                                                profItem,
                                                                index,
                                                            ) => (
                                                                <div
                                                                    key={index}
                                                                    onClick={() => {
                                                                        handleFieldChange(
                                                                            'profession',
                                                                            profItem,
                                                                        );
                                                                        setIsProfessionDropdownOpen(
                                                                            false,
                                                                        );
                                                                    }}
                                                                    className="cursor-pointer border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 last:border-0 hover:bg-blue-200"
                                                                >
                                                                    {profItem}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* F. FILA PROCEDENCIA Y TELÉFONO */}
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    className="relative"
                                    ref={originDropdownRef}
                                >
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Procedencia
                                    </label>

                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Globe className="h-4 w-4 text-gray-400" />
                                        </div>

                                        <input
                                            type="text"
                                            value={currentPerson.origin || ''} // <-- AHORA LEE DE CURRENTPERSON (Muestra el correcto en el carrusel)
                                            disabled={isReadOnly}
                                            placeholder="EJ: COCHABAMBA"
                                            autoComplete="off"
                                            onChange={(e) =>
                                                handleOriginInput(
                                                    e.target.value,
                                                )
                                            }
                                            onFocus={() => {
                                                if (
                                                    (currentPerson.origin || '')
                                                        .length > 1
                                                ) {
                                                    setIsOriginDropdownOpen(
                                                        true,
                                                    );
                                                    searchOrigins(
                                                        currentPerson.origin as string,
                                                    );
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setIsOriginDropdownOpen(
                                                        false,
                                                    );
                                                }, 200);
                                            }}
                                            className="block w-full rounded-xl border border-gray-400 py-2 pl-9 text-sm font-bold text-black uppercase focus:border-blue-500 focus:ring-blue-500"
                                        />

                                        {/* Dropdown conectado a la Base de Datos (originSuggestions) */}
                                        {isOriginDropdownOpen &&
                                            originSuggestions.length > 0 && (
                                                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                    {originSuggestions.map(
                                                        (originItem, index) => (
                                                            <div
                                                                key={index}
                                                                onClick={() => {
                                                                    handleFieldChange(
                                                                        'origin',
                                                                        originItem,
                                                                    ); // <-- AHORA USA LA FUNCIÓN INTELIGENTE
                                                                    setIsOriginDropdownOpen(
                                                                        false,
                                                                    );
                                                                }}
                                                                className="cursor-pointer border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 last:border-0 hover:bg-blue-200"
                                                            >
                                                                {originItem}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">
                                        Teléfono
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={currentPerson.phone}
                                            disabled={isReadOnly}
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
                        </div>

                        {/* A. BARRA DE NAVEGACIÓN  */}
                        <div className="relative -top-8 mt-10 mb-5 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/80 p-3 shadow-sm">
                            {/* Contador: 1 de X */}
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                                    HUESPED
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

                                {/* Nombre del Tipo de Habitación */}
                                <span className="block text-sm leading-tight font-black text-blue-900 uppercase">
                                    {rooms.find(
                                        (r) => r.id === Number(data.room_id),
                                    )?.room_type?.name || 'ESTÁNDAR'}
                                </span>

                                {/* Separador sutil */}
                                <div className="mx-auto my-1 w-8 border-t border-blue-200/50"></div>

                                {/* Tipo de Baño Traducido */}
                                <span className="block text-[10px] font-bold text-blue-500 uppercase">
                                    {(() => {
                                        const room = rooms.find(
                                            (r) =>
                                                r.id === Number(data.room_id),
                                        );

                                        // 1. Obtener valor (puede venir de price o room_type)
                                        const rawType =
                                            (room as any)?.price
                                                ?.bathroom_type ||
                                            (room as any)?.room_type
                                                ?.bathroom_type;

                                        if (!rawType) return '';

                                        // 2. Convertir a Mayúsculas para asegurar la búsqueda
                                        const key =
                                            String(rawType).toUpperCase(); // "shared" -> "SHARED"

                                        // 3. Traducir
                                        return typeBathroom[key] || rawType;
                                    })()}
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
                    </div>

                    {/* DERECHAAAAA - ASIGNACIÓN */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-3">
                        <div className="space-y-4.5">
                            {/* ========================================================= */}
                            {/* CAJA CONDICIONADA: VISTA ADMIN VS VISTA RECEPCIÓN         */}
                            {/* ========================================================= */}
                            {!isReceptionView ? (
                                /* ------------------------------------------------ */
                                /* VISTA 1: ADMINISTRADOR (Selector de habitación)  */
                                /* ------------------------------------------------ */
                                <div>
                                    <div className="mb-2 flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 p-1.5 shadow-sm">
                                        {/* IZQUIERDA: Checkbox Ajuste Automático (50%) */}
                                        <label
                                            htmlFor="auto_adjust_price_admin"
                                            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg p-2 text-xs font-bold transition-all select-none ${
                                                data.auto_adjust_price
                                                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                                                    : 'text-gray-500 hover:bg-gray-200/50'
                                            }`}
                                        >
                                            <input
                                                id="auto_adjust_price_admin"
                                                type="checkbox"
                                                checked={data.auto_adjust_price}
                                                onChange={(e) =>
                                                    setData(
                                                        'auto_adjust_price',
                                                        e.target.checked,
                                                    )
                                                }
                                                disabled={isReadOnly}
                                                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                            />
                                            Auto-Adjust Price
                                        </label>

                                        {/* DERECHA: Checkbox Temporal (50%) */}
                                        <label
                                            htmlFor="is_temporary_admin"
                                            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg p-2 text-xs font-bold transition-all select-none ${
                                                data.is_temporary
                                                    ? 'bg-amber-100 text-amber-700 shadow-sm'
                                                    : 'text-gray-500 hover:bg-gray-200/50'
                                            }`}
                                        >
                                            <input
                                                id="is_temporary_admin"
                                                type="checkbox"
                                                checked={data.is_temporary}
                                                onChange={(e) =>
                                                    setData(
                                                        'is_temporary',
                                                        e.target.checked,
                                                    )
                                                }
                                                disabled={isReadOnly}
                                                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-amber-500 focus:ring-amber-500 disabled:opacity-50"
                                            />
                                            Asig. TEMPORAL
                                        </label>
                                    </div>

                                    {/* --- CAMPO SELECT --- */}
                                    <select
                                        value={data.room_id}
                                        onChange={(e) =>
                                            setData('room_id', e.target.value)
                                        }
                                        disabled={
                                            !!checkinToEdit || !!initialRoomId
                                        }
                                        className="mt-2 block w-full cursor-not-allowed rounded-xl border-gray-300 bg-gray-100 py-2.5 pl-3 text-base font-bold text-black shadow-sm focus:ring-green-500"
                                    >
                                        <option value="">
                                            Seleccione una habitación...
                                        </option>
                                        {rooms.map((room) => (
                                            <option
                                                key={room.id}
                                                value={room.id}
                                            >
                                                {room.number} - Costo{' '}
                                                {room.price?.amount} Bs.
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                /* ------------------------------------------------ */
                                /* VISTA 2: RECEPCIONISTA (Diseño Limpio y Directo) */
                                /* ------------------------------------------------ */

                                <div className="mb-1">
                                    {/* 1. FILA DE OPCIONES (Solo Temporal Derecha) */}
                                    {/* ============================================================== */}
                                    {/* 🌟 FILA DE CONTROLES COMPACTOS (AUTO AJUSTE Y CORPORATIVO) 🌟 */}
                                    {/* ============================================================== */}
                                    <div className="col-span-full mb-2">
                                        <div className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-1 shadow-sm">
                                            {/* IZQUIERDA: Auto Ajuste de Precio */}
                                            <div
                                                className={`flex w-[40%] items-center justify-center rounded-lg p-1 transition-all ${
                                                    data.auto_adjust_price
                                                        ? 'bg-blue-100 shadow-sm'
                                                        : 'hover:bg-gray-200/50'
                                                }`}
                                            >
                                                <label
                                                    htmlFor="auto_adjust_price"
                                                    className={`flex cursor-pointer items-center justify-center gap-1.5 text-xs font-bold transition-all select-none ${
                                                        data.auto_adjust_price
                                                            ? 'text-blue-800'
                                                            : 'text-gray-500'
                                                    }`}
                                                >
                                                    <input
                                                        id="auto_adjust_price"
                                                        type="checkbox"
                                                        checked={data.auto_adjust_price}
                                                        onChange={(e) =>
                                                            setData(
                                                                'auto_adjust_price',
                                                                e.target.checked,
                                                            )
                                                        }
                                                        disabled={
                                                            isReadOnly ||
                                                            data.type === 'corporativo'
                                                        }
                                                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    AUTO AJUSTE
                                                </label>
                                            </div>

                                            {/* Línea divisoria sutil entre ambos botones */}
                                            <div className="h-5 w-px bg-gray-300"></div>

                                            {/* DERECHA: Asig. CORP (w-[60%]) DISEÑO ORIGINAL MANTENIDO */}
                                            <div
                                                className={`flex w-[60%] items-center justify-center rounded-lg p-1 transition-all ${
                                                    data.type === 'corporativo'
                                                        ? 'border border-indigo-100 bg-indigo-50 shadow-sm'
                                                        : 'hover:bg-gray-200/50'
                                                }`}
                                            >
                                                <label
                                                    htmlFor="is_corporate_rec"
                                                    className={`flex cursor-pointer items-center justify-center gap-1.5 text-xs font-bold transition-all select-none ${
                                                        data.type === 'corporativo'
                                                            ? 'text-indigo-800'
                                                            : 'text-gray-500'
                                                    }`}
                                                >
                                                    <input
                                                        id="is_corporate_rec"
                                                        type="checkbox"
                                                        checked={data.type === 'corporativo'}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            const selectedRoom = rooms.find(
                                                                (r) => r.id === Number(data.room_id) || r.id === initialRoomId,
                                                            );
                                                            const origPrice = selectedRoom?.price?.amount || 0;

                                                            if (!isChecked) {
                                                                // Si lo APAGA, limpiamos todo y restauramos el precio normal
                                                                setData((prev) => ({
                                                                    ...prev,
                                                                    type: 'estandar',
                                                                    corporate_days: 0,
                                                                    agreed_price: origPrice,
                                                                }));
                                                                setIsCustomFrequency(false);
                                                            } else {
                                                                // Si lo ENCIENDE, aplicamos el descuento base de -20 Bs
                                                                setData((prev) => ({
                                                                    ...prev,
                                                                    type: 'corporativo',
                                                                    auto_adjust_price: false,
                                                                    agreed_price: Math.max(0, origPrice - 20),
                                                                    corporate_days: 7, // Por defecto Semanal
                                                                }));
                                                            }
                                                        }}
                                                        disabled={isReadOnly}
                                                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                    />
                                                    ASIG. CORP
                                                </label>

                                                {/* Controles de Frecuencia que aparecen AL LADO (Diseño Compacto Original) */}
                                                {data.type === 'corporativo' && (
                                                    <div className="ml-2 flex items-center gap-1 border-l border-indigo-200 pl-2">
                                                        <select
                                                            className="h-6 w-[68px] rounded border-indigo-300 bg-white py-0 pr-4 pl-1 text-[13px] font-bold text-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
                                                            value={isCustomFrequency ? 'OTRO' : String(data.corporate_days)}
                                                            onChange={(e) => {
                                                                if (e.target.value === 'OTRO') {
                                                                    setIsCustomFrequency(true);
                                                                    setData('corporate_days', 0);
                                                                } else {
                                                                    setIsCustomFrequency(false);
                                                                    setData('corporate_days', Number(e.target.value));
                                                                }
                                                            }}
                                                            disabled={isReadOnly}
                                                            required={data.type === 'corporativo'}
                                                        >
                                                            <option value="0" disabled>Días...</option>
                                                            <option value="1">1 día</option>
                                                            <option value="7">7 días</option>
                                                            <option value="15">15 días</option>
                                                            <option value="30">30 días</option>
                                                            <option value="OTRO">Otro</option>
                                                        </select>

                                                        {isCustomFrequency && (
                                                            <input
                                                                type="number"
                                                                min="2"
                                                                className="w-16 [appearance:textfield] rounded-xl border border-gray-400 px-2 py-1 text-center text-sm text-black focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                placeholder="Nº"
                                                                value={data.corporate_days === 0 ? '' : data.corporate_days}
                                                                onChange={(e) => setData('corporate_days', Number(e.target.value))}
                                                                disabled={isReadOnly}
                                                                required={isCustomFrequency}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* 2. CONTENEDOR VERDE (Habitación, Costo Base y Total) */}
                                    <div className="rounded-xl border border-green-200 bg-green-50 p-1 shadow-sm transition-all">
                                        {(() => {
                                            // 1. Buscamos la habitación seleccionada
                                            const selectedRoom = rooms.find(
                                                (r) =>
                                                    r.id ===
                                                        Number(data.room_id) ||
                                                    r.id === initialRoomId,
                                            );

                                            const originalPrice =
                                                selectedRoom?.price?.amount ||
                                                0;
                                            let finalPrice = originalPrice;

                                            // ==========================================
                                            // 🧠 LÓGICA DE PRECIO FINAL
                                            // ==========================================
                                            if (data.type !== 'estandar') {
                                                finalPrice =
                                                    Number(data.agreed_price) ||
                                                    0;
                                            } else if (
                                                checkinToEdit &&
                                                checkinToEdit.special_agreement
                                            ) {
                                                finalPrice = Number(
                                                    checkinToEdit
                                                        .special_agreement
                                                        .agreed_price,
                                                );
                                            }

                                            const isAutoAdjusted =
                                                finalPrice !== originalPrice;

                                            // ==========================================
                                            // 💰 LÓGICA DEL TOTAL A COBRAR
                                            // ==========================================
                                            let noches =
                                                Number(data.duration_days) || 0;
                                            let tituloTotal = isAutoAdjusted
                                                ? 'Total a cobrar'
                                                : 'Total sugerido';

                                            // Si es un grupo especial, el total sugerido a cobrar AHORA MISMO es en base a su frecuencia
                                            if (data.type !== 'estandar') {
                                                noches =
                                                    Number(
                                                        data.corporate_days,
                                                    ) || 1;
                                                tituloTotal = `Cobro (cada ${noches} días)`;
                                            }

                                            const total = finalPrice * noches;

                                            return (
                                                <div className="-mx-1 flex h-auto max-w-md items-center justify-between">
                                                    {/* IZQUIERDA: Habitación + Costo por 1 Noche */}
                                                    <div className="flex flex-col items-start">
                                                        <label className="flex items-center gap-2 text-2xl leading-none font-black text-green-700">
                                                            HAB{' '}
                                                            {selectedRoom?.number ||
                                                                'N/A'}
                                                        </label>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            {isAutoAdjusted ? (
                                                                <>
                                                                    <span className="text-sm font-bold text-gray-400 line-through">
                                                                        {
                                                                            originalPrice
                                                                        }{' '}
                                                                        Bs
                                                                    </span>
                                                                    <span className="text-sm font-black text-green-800">
                                                                        {Number(
                                                                            finalPrice,
                                                                        ).toFixed(
                                                                            2,
                                                                        )}{' '}
                                                                        Bs /
                                                                        noche
                                                                    </span>
                                                                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-amber-700 uppercase shadow-sm">
                                                                        Tarifa
                                                                        Ajustada
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm font-bold text-green-800">
                                                                    {Number(
                                                                        finalPrice,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}{' '}
                                                                    Bs / noche
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* DERECHA: Total a cobrar */}
                                                    <div className="flex flex-col border-l border-green-200 pl-4 text-right">
                                                        <span className="mb-0.5 text-[11px] font-bold text-green-700 uppercase">
                                                            {tituloTotal}
                                                        </span>

                                                        {/* 🌟 AQUÍ ESTÁ EL CAMBIO: Input si es corporativo, Texto si es normal 🌟 */}
                                                        {data.type !== 'estandar' ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.10"
                                                                    min="0"
                                                                    value={
                                                                        total >
                                                                        0
                                                                            ? Number(
                                                                                  total.toFixed(
                                                                                      2,
                                                                                  ),
                                                                              )
                                                                            : ''
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const newTotal =
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            );
                                                                        // Matemática inversa: Total dividido entre días = precio base
                                                                        const dailyRate =
                                                                            noches >
                                                                            0
                                                                                ? newTotal /
                                                                                  noches
                                                                                : newTotal;
                                                                        setData(
                                                                            'agreed_price',
                                                                            dailyRate,
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        isReadOnly
                                                                    }
                                                                    className="w-[85px] [appearance:textfield] rounded-md border border-green-300 bg-white px-1 py-0 text-right text-2xl leading-none font-black text-gray-900 shadow-inner focus:border-green-500 focus:ring-1 focus:ring-green-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                    placeholder="0.00"
                                                                />
                                                                <span className="text-2xl leading-none font-black text-gray-900">
                                                                    Bs
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-2xl leading-none font-black text-gray-900">
                                                                {total.toFixed(
                                                                    2,
                                                                )}{' '}
                                                                Bs
                                                            </span>
                                                        )}

                                                        {noches > 1 && (
                                                            <span className="mt-0.5 text-[10px] font-medium text-gray-500">
                                                                {Number(
                                                                    finalPrice,
                                                                ).toFixed(
                                                                    2,
                                                                )}{' '}
                                                                x {noches}{' '}
                                                                {data.type !== 'estandar'
                                                            ? 'días'
                                                            : 'noches'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                            {/* Caja de fecha de ingreso y Noches */}
                            <div className="grid grid-cols-[1fr_160px] gap-3">
                                {/* COLUMNA IZQUIERDA: FECHA DE INGRESO + BOTÓN TOLERANCIA */}
                                <div className="relative flex flex-col">
                                    {/* 1. Header con etiqueta */}
                                    <div className="mb-0.5 flex min-h-[20px] flex-col justify-center">
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Ingreso
                                        </label>
                                    </div>

                                    {/* 2. BOTÓN TOLERANCIA (FLOTANTE / ABSOLUTO) */}
                                    {data.schedule_id &&
                                        toleranceStatus.isValid && (
                                            <div className="absolute top-0 right-1 z-10">
                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleApplyTolerance
                                                    }
                                                    disabled={
                                                        isToleranceApplied ||
                                                        isReadOnly
                                                    }
                                                    className={`group py-0.2 flex items-center gap-1.5 rounded-lg border px-0.5 text-[9px] font-black uppercase shadow-sm transition-all active:scale-95 ${
                                                        isToleranceApplied
                                                            ? 'cursor-default border-emerald-600 bg-emerald-100 text-emerald-800'
                                                            : 'animate-in cursor-pointer border-emerald-500 bg-emerald-50 text-emerald-700 duration-300 fade-in zoom-in hover:bg-emerald-100'
                                                    }`}
                                                    title={
                                                        isToleranceApplied
                                                            ? 'Tolerancia aplicada.'
                                                            : `Clic para ajustar a ${toleranceStatus.officialTime}`
                                                    }
                                                >
                                                    {/* Icono Dinámico */}
                                                    {isToleranceApplied ? (
                                                        <CheckCircle2 className="h-3 w-3" />
                                                    ) : (
                                                        <ArrowRightCircle className="h-3 w-3" />
                                                    )}

                                                    {/* Texto Dinámico */}
                                                    <span>
                                                        {isToleranceApplied
                                                            ? 'Ajustado'
                                                            : 'Usar Tolerancia'}
                                                    </span>
                                                </button>
                                            </div>
                                        )}

                                    {/* 3. Input de Fecha (AJUSTADO AL TAMAÑO SOLICITADO) */}
                                    <input
                                        type="datetime-local"
                                        value={formatDateForInput(
                                            data.check_in_date,
                                        )}
                                        onChange={(e) =>
                                            setData(
                                                'check_in_date',
                                                e.target.value,
                                            )
                                        }
                                        disabled={isReadOnly}
                                        // Clases actualizadas para coincidir con el diseño de Fecha Nac.
                                        className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100"
                                    />
                                </div>

                                {/* COLUMNA DERECHA: NOCHES Y CONTROL DE PRECIOS */}
                                <div className="flex w-40 flex-col">
                                    {/* 1. CABECERA FILA: ETIQUETA "NOCHES" + INFO SALIDA A LA DERECHA */}
                                    <div className="mb-1 flex items-end justify-between">
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Noches:
                                        </label>

                                        {/* Lógica de Salida */}
                                        {(() => {
                                            const schedule = schedules.find(
                                                (s) =>
                                                    String(s.id) ===
                                                    data.schedule_id,
                                            );
                                            return (
                                                <div className="text-right text-[12px] leading-3">
                                                    <span className="font-bold text-gray-800">
                                                        {checkoutString}
                                                    </span>
                                                    {schedule && (
                                                        <span className="ml-1 font-medium text-gray-800">
                                                            {schedule.check_out_time.substring(
                                                                0,
                                                                5,
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* 2. INPUT NOCHES CON BOTONES - / + (Diseño Compacto) */}
                                    <div className="flex h-[38px] w-full items-center overflow-hidden rounded-lg border border-gray-400 bg-white focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
                                        {/* Botón Restar (-) */}
                                        <button
                                            type="button"
                                            disabled={
                                                isReadOnly ||
                                                Number(data.duration_days) <= 1
                                            }
                                            onClick={() => {
                                                const current =
                                                    Number(
                                                        data.duration_days,
                                                    ) || 1;
                                                setData(
                                                    'duration_days',
                                                    Math.max(1, current - 1),
                                                );
                                            }}
                                            className="flex h-full w-10 items-center justify-center border-r border-gray-400 bg-gray-100 text-lg font-black text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50"
                                        >
                                            -
                                        </button>

                                        {/* Input Central (Número) */}
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.duration_days}
                                            disabled={isReadOnly}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setData(
                                                    'duration_days',
                                                    val === ''
                                                        ? ''
                                                        : Math.max(
                                                              0,
                                                              Number(val),
                                                          ),
                                                );
                                            }}
                                            // Clases para quitar las flechitas por defecto y centrar
                                            className="h-full w-full [appearance:textfield] border-none bg-transparent p-0 text-center text-sm font-black text-gray-900 focus:ring-0 disabled:bg-gray-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            placeholder="1"
                                        />

                                        {/* Botón Sumar (+) */}
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                const current =
                                                    Number(
                                                        data.duration_days,
                                                    ) || 0;
                                                setData(
                                                    'duration_days',
                                                    current + 1,
                                                );
                                            }}
                                            className="flex h-full w-10 items-center justify-center border-l border-gray-400 bg-gray-100 text-lg font-black text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* CAMPO ADELANTO (Siempre visible, bloqueado si no es titular) */}
                            <div>
                                <div className="relative -mt-2 animate-in duration-300 fade-in slide-in-from-top-2">
                                    <div className="flex flex-col gap-3">
                                        {/* FILA 1: EFECTIVO (Izquierda) | MONTO (Derecha) */}
                                        <div className="grid grid-cols-2 items-end gap-3">
                                            {/* IZQUIERDA: Método de Pago (Efectivo) */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                                    Método de Pago
                                                </label>
                                                <button
                                                    type="button"
                                                    disabled={!isTitular}
                                                    onClick={() =>
                                                        setData((prev) => ({
                                                            ...prev,
                                                            // Actúa como interruptor para poder desmarcarlo
                                                            payment_method:
                                                                prev.payment_method ===
                                                                'EFECTIVO'
                                                                    ? ''
                                                                    : 'EFECTIVO',
                                                            qr_bank: '',
                                                        }))
                                                    }
                                                    className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2 transition-all ${
                                                        data.payment_method ===
                                                        'EFECTIVO'
                                                            ? 'border-green-500 bg-green-50 shadow-sm ring-1 ring-green-500'
                                                            : 'border-gray-400 bg-white hover:bg-gray-50'
                                                    } disabled:opacity-50`}
                                                >
                                                    <Banknote
                                                        className={`h-4 w-4 ${data.payment_method === 'EFECTIVO' ? 'text-green-600' : 'text-gray-500'}`}
                                                    />
                                                    <span
                                                        className={`text-sm font-bold uppercase ${data.payment_method === 'EFECTIVO' ? 'text-green-800' : 'text-gray-700'}`}
                                                    >
                                                        Efectivo
                                                    </span>
                                                </button>
                                            </div>

                                            {/* DERECHA: Input de Monto */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                                    Monto de Adelanto
                                                </label>
                                                <div className="relative">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <span
                                                            className={`text-sm font-bold ${!isTitular ? 'text-gray-400' : 'text-green-600'}`}
                                                        >
                                                            Bs
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.50"
                                                        min="0"
                                                        value={
                                                            data.advance_payment ===
                                                            0
                                                                ? ''
                                                                : data.advance_payment
                                                        }
                                                        onChange={(e) =>
                                                            setData(
                                                                'advance_payment',
                                                                e.target
                                                                    .value as any,
                                                            )
                                                        }
                                                        onFocus={(e) =>
                                                            e.target.select()
                                                        }
                                                        disabled={!isTitular}
                                                        required={
                                                            data.type === 'corporativo'
                                                        }
                                                       className={`block w-full [appearance:textfield] rounded-xl border py-2 pl-9 text-sm font-bold text-black focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                                                            data.type === 'corporativo' &&
                                                            (!data.advance_payment ||
                                                                data.advance_payment <=
                                                                    0)
                                                                ? 'border-red-500 bg-red-50' // Se pinta de rojo si está vacío y es corporativo
                                                                : 'border-gray-400'
                                                        }`}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {errors.advance_payment && (
                                            <p className="-mt-1 text-[10px] font-bold text-red-500">
                                                {errors.advance_payment}
                                            </p>
                                        )}

                                        {/* FILA 2: BANCOS QR */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                                Transferencia QR
                                            </label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    'YAPE',
                                                    'BNB',
                                                    'FIE',
                                                    'ECO',
                                                ].map((banco) => {
                                                    const isSelected =
                                                        data.payment_method ===
                                                            'QR' &&
                                                        data.qr_bank === banco;
                                                    return (
                                                        <button
                                                            key={banco}
                                                            type="button"
                                                            disabled={
                                                                !isTitular
                                                            }
                                                            onClick={() =>
                                                                setData(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        // Actúa como interruptor para desmarcarlo
                                                                        payment_method:
                                                                            isSelected
                                                                                ? ''
                                                                                : 'QR',
                                                                        qr_bank:
                                                                            isSelected
                                                                                ? ''
                                                                                : banco,
                                                                    }),
                                                                )
                                                            }
                                                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 transition-all ${
                                                                isSelected
                                                                    ? 'border-green-500 bg-blue-50 shadow-sm ring-1 ring-green-500'
                                                                    : 'border-gray-400 bg-white hover:bg-gray-50'
                                                            } disabled:opacity-50`}
                                                        >
                                                            <img
                                                                src={`/images/bancos/${banco.toLowerCase()}.png`}
                                                                alt={banco}
                                                                className={`h-5 object-contain ${
                                                                    !isSelected &&
                                                                    'opacity-60 grayscale'
                                                                }`}
                                                            />
                                                            <span
                                                                className={`text-[11px] font-bold uppercase ${
                                                                    isSelected
                                                                        ? 'text-green-500'
                                                                        : 'text-gray-700'
                                                                }`}
                                                            >
                                                                {banco}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* ALERTA DINÁMICA: Si coloca un monto pero olvida elegir método */}
                                            {data.advance_payment > 0 &&
                                                (!data.payment_method ||
                                                    data.payment_method ===
                                                        '' ||
                                                    (data.payment_method ===
                                                        'QR' &&
                                                        !data.qr_bank)) && (
                                                    <div className="mt-3 flex animate-pulse items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-bold text-red-600 uppercase shadow-sm">
                                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                                        <span>
                                                            ¡Seleccione Efectivo
                                                            o un QR para el
                                                            adelanto!
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Campo de observaciones*/}
                            <div className="relative -top-4">
                                <label className="text-xs font-bold text-gray-500 uppercase">
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
                            {/*Caja de texto de servicio*/}
                            <div className="relative -top-10">
                                <label className="text-xs font-bold text-gray-500 uppercase">
                                    Servicios
                                </label>

                                {/* SECCIÓN DE SERVICIOS ACTUALIZADA */}
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        {/* 1. BOTÓN GARAJE (Dinámico: Se conecta a la BD) */}
                                        {availableServices
                                            .filter((s: any) =>
                                                s.name
                                                    .toUpperCase()
                                                    .includes('GARAJE'),
                                            ) // Solo mostramos Garaje
                                            .map((srv: any) => {
                                                const srvId = String(srv.id);
                                                const active =
                                                    data.selected_services.includes(
                                                        srvId,
                                                    );
                                                return (
                                                    <button
                                                        key={srv.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const newServs =
                                                                active
                                                                    ? data.selected_services.filter(
                                                                          (
                                                                              id,
                                                                          ) =>
                                                                              id !==
                                                                              srvId,
                                                                      )
                                                                    : [
                                                                          ...data.selected_services,
                                                                          srvId,
                                                                      ];
                                                            setData(
                                                                'selected_services',
                                                                newServs,
                                                            );
                                                        }}
                                                        className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
                                                            active
                                                                ? 'border-green-500 bg-green-100 font-bold text-green-700' // Estilo Activo
                                                                : 'border border-gray-400 bg-white text-gray-600 hover:border-gray-500' // Estilo Inactivo
                                                        }`}
                                                    >
                                                        {active && (
                                                            <CheckCircle2 className="h-3 w-3" />
                                                        )}
                                                        {srv.name}
                                                    </button>
                                                );
                                            })}

                                        {/* 2. BOTÓN DESAYUNO (Estático: Siempre activo visualmente) */}
                                        <button
                                            type="button"
                                            disabled={true} // No se puede quitar clickeando
                                            className="flex cursor-default items-center gap-1 rounded-full border border-green-500 bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                                        >
                                            <CheckCircle2 className="h-3 w-3" />
                                            DESAYUNO
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 text-center text-base font-medium text-gray-800"></div>
                                {/* FIN DEL CÓDIGO A AGREGAR */}
                            </div>
                        </div>

                        {/* PIE DEL FORMULARIO CON BOTONES */}
                        <div className="-mt-12 shrink-0 border-t border-gray-100 pt-2">
                            <div className="flex items-center justify-between gap-3">
                                {/* IZQUIERDA */}
                                <div className="flex items-center gap-3">
                                    {checkinToEdit && canCancel() && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCancelModal(true)
                                            }
                                            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="hidden sm:inline">
                                                Cancelar Asignación
                                            </span>
                                        </button>
                                    )}

                                    {!isReadOnly &&
                                        checkinToEdit &&
                                        !canCancel() && (
                                            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 select-none">
                                                <AlertCircle className="h-3 w-3" />
                                                <span>
                                                    Asignación confirmada
                                                </span>
                                            </div>
                                        )}
                                </div>

                                {/* DERECHA */}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => onClose(false)}
                                        className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                                    >
                                        {isReadOnly ? 'Cerrar' : 'Cancelar'}
                                    </button>

                                    {!isReadOnly && (
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className={`flex items-center gap-4 rounded-xl px-6 py-2 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50 ${
                                                isProfileIncomplete ||
                                                (checkinToEdit &&
                                                    (!data.origin ||
                                                        data.origin.trim() ===
                                                            ''))
                                                    ? 'bg-amber-600 hover:bg-amber-500'
                                                    : 'bg-green-600 hover:bg-green-500'
                                            }`}
                                        >
                                            {processing ? (
                                                'Procesando...'
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    {checkinToEdit
                                                        ? !data.origin ||
                                                          data.origin.trim() ===
                                                              ''
                                                            ? 'Completar Check-in'
                                                            : 'Actualizar'
                                                        : isProfileIncomplete
                                                          ? 'Asignación Rápida'
                                                          : 'Registrar'}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <ToleranceModal
                show={tolModal.show}
                onClose={() => setTolModal({ ...tolModal, show: false })}
                type={tolModal.type}
                data={{
                    time: tolModal.time,
                    minutes: tolModal.minutes,
                    action: 'entry', // Importante: 'entry' para mensaje de entrada
                }}
            />

            <CancelAssignmentModal
                show={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={() => onClose(false)}
                checkinId={checkinToEdit?.id || null}
            />
        </div>
    );
}
