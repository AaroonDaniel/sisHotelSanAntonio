import OperatorSelector, {
    Operator as SharedOperator,
} from '@/components/OperatorSelector';
import ToleranceModal from '@/components/ToleranceModal';
import {
    DEPARTAMENTOS_BOLIVIA,
    esExtranjero,
    NACIONALIDADES,
    paisDe,
} from '@/lib/catalogos';
import { useForm } from '@inertiajs/react';
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

    // Si viene con "Z" al final, es UTC y debemos convertirlo a hora local
    if (dateString.includes('Z')) {
        const date = new Date(dateString);
        // Convertimos a hora de Bolivia
        return date
            .toLocaleString('sv-SE', { timeZone: 'America/La_Paz' })
            .replace(' ', 'T')
            .slice(0, 16);
    }

    // Si no tiene "Z", asumimos que ya está en hora local
    const cleanString = dateString.replace(' ', 'T').substring(0, 16);
    return cleanString;
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
    // Adelanto ORIGINAL (solo el primer Payment, sin sumar pagos
    // posteriores ni devoluciones). Es lo que debe mostrarse/editarse en
    // este formulario — 'advance_payment' es el neto de TODOS los
    // movimientos y no sirve para esto (ver Checkin::getInitialAdvancePaymentAttribute).
    initial_advance_payment?: number;
    agreed_price: number;
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
    is_corporate?: boolean | number;
    special_agreement?: {
        id: number;
        type: 'corporativo' | 'delegacion' | 'AJUSTE DE PRECIO';
        agreed_price: number;
        payment_frequency_days: number;
    } | null;
    payments?: any[];
    corporate_days?: number;
    checkin_operator_id?: number | null;
    checkout_operator_id?: number | null;
    // Relación cargada por el backend (RoomController::status() /
    // CheckinController::index() con with('checkinOperator')) para poder
    // mostrar "asignado por: Nombre" sin tener que cruzar con la lista de
    // operadores en el frontend.
    checkin_operator?: {
        id: number;
        full_name: string;
        nickname: string;
    } | null;
}

// Re-exportado para no romper a quienes ya importan { Operator } desde este
// archivo (rooms/status.tsx, checkins/index.tsx); la definición real vive
// en el componente compartido.
export type Operator = SharedOperator;

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
    operators?: Operator[];
    initialRoomId?: number | null;
    // 🚀 NUEVO: cuando la habitación viene de una reserva de Delegación ya
    // asignada, se pasa aquí el precio pactado por cama (90/60/50) guardado
    // en el detalle de la reserva, para no usar el precio normal de tabla.
    initialAgreedPrice?: number | null;
    initialSpecialAgreementId?: number | null;
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
    type: 'estandar' | 'corporativo' | 'delegacion' | 'AJUSTE DE PRECIO';
    corporate_days: number;
    agreed_price: number | string;
    checkin_operator_id: string;
}

export default function CheckinModal({
    show,
    onClose,
    checkinToEdit,
    targetGuestId,
    guests,
    rooms,
    schedules = [],
    operators = [],
    initialRoomId,
    initialAgreedPrice,
    initialSpecialAgreementId,
    availableServices = [],
    //isReadOnly = false,
    isReadOnly: propIsReadOnly = false,
    isReceptionView = false,
}: CheckinModalProps) {
    const isReadOnly = false;
    // Estado de para la Asig corporativa
    const [isCustomFrequency, setIsCustomFrequency] = useState(false);

    // Autocompletado de nacionalidad (texto visible + mostrar lista).
    const [natInput, setNatInput] = useState('');
    const [showNat, setShowNat] = useState(false);

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

    // Parpadeo del selector flotante de operador cuando se intenta asignar
    // sin haber elegido a nadie. Se reinicia solo (setTimeout) para poder
    // volver a dispararse si el usuario insiste sin seleccionar.
    const [operatorAlertPulse, setOperatorAlertPulse] = useState(false);
    const triggerOperatorAlert = () => {
        setOperatorAlertPulse(false);
        // Forzamos un "reflow" del estado en el próximo tick para que la
        // animación se reinicie aunque ya estuviera visible.
        requestAnimationFrame(() => {
            setOperatorAlertPulse(true);
            setTimeout(() => setOperatorAlertPulse(false), 1600);
        });
    };

    // Toast de validación: "Seleccione un operador". Este proyecto NO usa
    // una librería de toasts (no hay sonner/react-hot-toast instalado, ver
    // package.json) — sigue el mismo patrón casero ya usado en este propio
    // archivo para guestConflictError/showErrorToast: estado local + zona
    // de toasts flotante + auto-cierre por setTimeout.
    const [operatorToastError, setOperatorToastError] = useState<string | null>(
        null,
    );

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
    const now = new Date()
        .toLocaleString('sv-SE', { timeZone: 'America/La_Paz' })
        .replace(' ', 'T')
        .slice(0, 16);

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
            payment_method: '',
            qr_bank: '',
            checkin_operator_id: '',
            is_temporary: false,
            auto_adjust_price: false,
            monto_efectivo: '',
            monto_qr: '',

            type: 'estandar',
            agreed_price: 0,
            corporate_days: 1,
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
        const officialDate = new Date(inputDate);
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
    const [editingTotal, setEditingTotal] = useState<string | null>(null);
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

            // 1. Calculamos la HORA ACTUAL EXACTA (Bolivia)
            const currentDateTimeISO = new Date()
                .toLocaleString('sv-SE', { timeZone: 'America/La_Paz' })
                .replace(' ', 'T')
                .slice(0, 16);
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
                const calculatedDuration = Math.max(
                    1,
                    Number(checkinToEdit.duration_days),
                );

                // 1. Buscamos la habitación actual en la lista 'rooms' para saber su precio original
                const currentRoomObj = rooms?.find(
                    (r: any) => String(r.id) === String(checkinToEdit.room_id),
                );
                const originalRoomPrice = currentRoomObj?.price?.amount || 0;

                // 2. Leemos directamente de la base de datos si tiene el convenio de Ajuste de Precio
                // 🚀 CORREGIDO: auto_adjust_price SOLO se activa si la BD registró
                // explícitamente que este precio vino del "Ajuste automático" por
                // ocupación (special_agreement.type === 'AJUSTE DE PRECIO').
                // Ya NO se infiere solo de "precio guardado < precio de tabla", porque
                // eso también es cierto para un descuento manual normal — y esa
                // comparación no puede distinguir entre ambos casos, causando que se
                // sobreescriba un descuento manual real al reabrir para editar.
                let isPriceAdjusted = false;

                if (
                    checkinToEdit.special_agreement?.type !== 'corporativo' &&
                    checkinToEdit.special_agreement?.type !== 'delegacion'
                ) {
                    isPriceAdjusted =
                        !!checkinToEdit.special_agreement &&
                        String(checkinToEdit.special_agreement.type) ===
                            'AJUSTE DE PRECIO';
                }
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
                    // Solo el adelanto INICIAL (primer pago), no el neto de
                    // todos los movimientos: si se guarda el formulario tal
                    // cual, esto es lo que update() reescribe en ese pago
                    // inicial — usar el neto acumulado aquí inflaría ese
                    // pago con el monto de adelantos posteriores ya
                    // registrados por separado.
                    advance_payment:
                        checkinToEdit.initial_advance_payment ??
                        checkinToEdit.advance_payment,
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

                    type:
                        checkinToEdit.special_agreement?.type ===
                            'corporativo' ||
                        checkinToEdit.special_agreement?.type === 'delegacion'
                            ? checkinToEdit.special_agreement.type
                            : 'estandar',
                    agreed_price:
                        checkinToEdit.agreed_price ||
                        checkinToEdit.special_agreement?.agreed_price ||
                        Number(originalRoomPrice),
                    corporate_days:
                        checkinToEdit.special_agreement
                            ?.payment_frequency_days || 0,
                    checkin_operator_id: checkinToEdit.checkin_operator_id
                        ? String(checkinToEdit.checkin_operator_id)
                        : '',

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

                    payment_method:
                        checkinToEdit.payments &&
                        checkinToEdit.payments.length > 0
                            ? checkinToEdit.payments[0].method
                            : checkinToEdit.payment_method || 'EFECTIVO',

                    qr_bank:
                        checkinToEdit.payments &&
                        checkinToEdit.payments.length > 0
                            ? checkinToEdit.payments[0].bank_name || ''
                            : checkinToEdit.qr_bank || '',

                    monto_efectivo:
                        (checkinToEdit.payments &&
                        checkinToEdit.payments.length > 0
                            ? checkinToEdit.payments[0].method
                            : checkinToEdit.payment_method || 'EFECTIVO') ===
                        'EFECTIVO'
                            ? (checkinToEdit.initial_advance_payment ??
                                  checkinToEdit.advance_payment) ||
                              ''
                            : '',

                    monto_qr:
                        (checkinToEdit.payments &&
                        checkinToEdit.payments.length > 0
                            ? checkinToEdit.payments[0].method
                            : checkinToEdit.payment_method || 'EFECTIVO') !==
                        'EFECTIVO'
                            ? (checkinToEdit.initial_advance_payment ??
                                  checkinToEdit.advance_payment) ||
                              ''
                            : '',
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

                // 🚀 Si la habitación viene de una reserva de Delegación con
                // precio ya pactado (90/60/50 por cama), usamos ESE precio.
                // Si no, caemos al precio normal de tabla como antes.
                const originalRoomPriceForNew = initialAgreedPrice
                    ? Number(initialAgreedPrice)
                    : initialRoomObj?.price?.amount || 0;

                console.log('🔍 [CHECKIN] Cálculo de precio inicial', {
                    room_id: initialRoomId,
                    room_number: initialRoomObj?.number,
                    room_capacity: initialRoomObj?.room_type?.capacity,
                    price_normal_tabla: initialRoomObj?.price?.amount,
                    initialAgreedPrice_recibido: initialAgreedPrice,
                    precio_final_usado: originalRoomPriceForNew,
                    origen: initialAgreedPrice
                        ? 'RESERVA DELEGACIÓN (detail.price)'
                        : 'PRECIO NORMAL DE TABLA',
                });

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
                    type: initialAgreedPrice ? 'delegacion' : 'estandar',
                    agreed_price: originalRoomPriceForNew
                        ? Number(originalRoomPriceForNew)
                        : 0,
                    corporate_days: 0,
                    checkin_operator_id: '',
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

    // =========================================================================
    // 🚀 BUGFIX CRÍTICO: AJUSTE AUTOMÁTICO DE PRECIO POR CANTIDAD DE HUÉSPEDES
    // -------------------------------------------------------------------------
    // Antes este cálculo estaba encerrado dentro de `if (data.auto_adjust_price)`,
    // por lo que con el toggle apagado (su estado por defecto) el precio NUNCA
    // se ajustaba por ocupación: solo restauraba el precio base.
    //
    // Regla de negocio restaurada:
    //   - En estadías ESTÁNDAR el precio se recalcula SIEMPRE según el conteo
    //     real de huéspedes (titular + acompañantes), sin depender del toggle.
    //   - Si la ocupación es MENOR a la capacidad de la habitación, se busca
    //     una tarifa equivalente (misma capacidad y tipo de baño).
    //   - Si la ocupación llena/supera la capacidad, rige el precio base.
    //   - Los convenios (corporativo/delegación) tienen precio cerrado: este
    //     efecto NO los toca.
    // =========================================================================

    /** Calcula la tarifa que corresponde a un conteo real de huéspedes. */
    const computeAdjustedPrice = (
        roomId: string | number,
        totalGuests: number,
    ): number => {
        const currentRoom = rooms?.find(
            (r: any) =>
                String(r.id) === String(roomId) ||
                String(r.id) === String(initialRoomId),
        );

        const originalPrice = Number(currentRoom?.price?.amount || 0);
        const maxCapacity = Number(currentRoom?.room_type?.capacity || 1);
        const bathroomType = currentRoom?.price?.bathroom_type;

        const effectiveGuests = Math.max(1, totalGuests);

        // Ocupación completa o sin tipo de baño definido => tarifa base.
        if (effectiveGuests >= maxCapacity || !bathroomType) {
            return originalPrice;
        }

        // Ocupación parcial: buscamos la tarifa para esa cantidad exacta.
        const matchedRoom = rooms?.find((r: any) => {
            const rCap = Number(r?.room_type?.capacity);
            const rBath = r?.price?.bathroom_type;
            return rCap === effectiveGuests && rBath === bathroomType;
        });

        return matchedRoom
            ? Number(matchedRoom?.price?.amount || 0)
            : originalPrice;
    };

    // Referencia para distinguir la HIDRATACIÓN inicial (carga del modal) de
    // los cambios activos del recepcionista. En modo edición no debemos pisar
    // el `agreed_price` guardado en BD al abrir; solo al modificar huéspedes.
    const priceHydratedRef = useRef<boolean>(false);

    useEffect(() => {
        // Al abrir/cerrar el modal reseteamos la bandera de hidratación.
        if (!show) {
            priceHydratedRef.current = false;
        }
    }, [show]);

    useEffect(() => {
        // Solo aplica a estadías estándar. Los convenios conservan precio cerrado.
        if (!show || data.type !== 'estandar') return;

        const totalP = 1 + (data.companions?.length || 0);

        // PRIMERA ejecución tras abrir el modal = hidratación.
        // En modo edición respetamos el precio que viene de BD; no recalculamos.
        if (!priceHydratedRef.current) {
            priceHydratedRef.current = true;
            if (checkinToEdit) return;
        }

        const newCalculatedPrice = computeAdjustedPrice(data.room_id, totalP);

        // Solo ajustamos el precio por ocupación cuando el recepcionista
        // ACTIVA "Ajuste de precio". Sin marcarlo, no se toca automáticamente
        // (evita la confusión de ver 220 -> 120 -> 100 al asignar).
        if (!data.auto_adjust_price) return;

        if (
            newCalculatedPrice > 0 &&
            Number(data.agreed_price) !== newCalculatedPrice
        ) {
            setData('agreed_price', newCalculatedPrice);
        }
    }, [
        data.companions?.length,
        data.room_id,
        data.type,
        data.auto_adjust_price,
        show,
    ]);

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
            const currentDateTime = new Date()
                .toLocaleString('sv-SE', { timeZone: 'America/La_Paz' })
                .replace(' ', 'T')
                .slice(0, 16);

            // Actualizamos el formulario con la hora exacta de AHORA (Bolivia)
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

    // Sincroniza el texto visible de nacionalidad al cambiar de persona.
    useEffect(() => {
        setNatInput(currentPerson.nationality || '');
        setShowNat(false);
    }, [currentIndex, currentPerson.nationality]);

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

    // 1. Verificamos que exista al menos UN teléfono en todo el grupo
    const hasValidPhoneInGroup = () => {
        const checkPhone = (p?: string | null) =>
            p && p.replace(/[^0-9]/g, '').length > 7;

        const titularPhone = checkPhone(data.phone);
        let validCompanionPhone = false;

        if (data.companions && data.companions.length > 0) {
            validCompanionPhone = data.companions.some((c) =>
                checkPhone(c.phone),
            );
        }

        return titularPhone || validCompanionPhone;
    };

    // 2. Evaluador estricto de campos con reporte en Consola
    const areAllFieldsFilled = (person: any, roleName: string) => {
        // Función de seguridad: Convierte a texto y quita espacios en blanco extras
        const s = (val: any) => String(val || '').trim();

        // Creamos un diccionario de pruebas para ver qué pasa y qué falla
        const checks = {
            full_name: s(person.full_name).length > 3,
            identification_number: s(person.identification_number).length >= 4,
            issued_in: s(person.issued_in).length > 0,
            nationality: s(person.nationality).length > 0,
            civil_status: s(person.civil_status).length > 0,
            birth_date: s(person.birth_date).length > 0,
            profession: s(person.profession).length > 1,
            origin: s(person.origin).length > 1,
        };

        // Evaluamos si TODAS las pruebas dieron "true"
        const isComplete = Object.values(checks).every((v) => v === true);

        return isComplete;
    };

    // 3. Evaluador maestro del estado de la asignación
    const isProfileIncomplete = (() => {
        // A) REGLA DEL TELÉFONO
        if (!hasValidPhoneInGroup()) {
            return true;
        }

        // B) VALIDAR AL TITULAR
        const titular = {
            full_name: data.full_name,
            identification_number: data.identification_number,
            issued_in: data.issued_in,
            nationality: data.nationality,
            civil_status: data.civil_status,
            birth_date: data.birth_date,
            profession: data.profession,
            origin: data.origin,
        };

        if (!areAllFieldsFilled(titular, 'TITULAR')) {
            return true;
        }

        // C) VALIDAR ACOMPAÑANTES
        if (data.companions && data.companions.length > 0) {
            for (let i = 0; i < data.companions.length; i++) {
                if (
                    !areAllFieldsFilled(
                        data.companions[i],
                        `ACOMPAÑANTE ${i + 1}`,
                    )
                ) {
                    return true;
                }
            }
        }

        return false;
    })();
    // =========================================================
    // 🚀 LÓGICA DE ENVÍO Y ADVERTENCIA DE CAPACIDAD (ACTUALIZADO)
    // =========================================================

    // A. NUEVA FUNCIÓN: Se encarga ÚNICAMENTE de hablar con el Backend (Laravel)
    // Hemos movido aquí tu código original intacto.
    const executeSubmit = () => {
        // 🚀 ESPÍA: Vemos exactamente qué viaja hacia Laravel
        console.log('🚀 [SUBMIT] PAQUETE ENVIADO A LARAVEL:', data);

        // Camino de Éxito (onSuccess)
        const onSuccess = (page: any) => {
            console.log('✅ RESPUESTA EXITOSA DEL SERVIDOR:', page);
            reset(); // Limpia los campos del formulario.
            onClose(true); // Cierra la ventana modal y actualiza la vista.
        };

        // Camino de Error (onError)
        const onError = (errors: any) => {
            console.error('❌ EL SERVIDOR RECHAZÓ LOS DATOS. RAZONES:', errors);
            if (errors.guest_id) {
                setGuestConflictError(errors.guest_id);
                setTimeout(() => {
                    setGuestConflictError(null);
                }, 7000);
            }
        };

        // Lógica de Envío
        if (checkinToEdit) {
            console.log('-> Método: PUT (Actualizar)');
            // 👇 VOLVIMOS A TU RUTA ORIGINAL: /checks
            put(`/checks/${checkinToEdit.id}`, {
                onSuccess,
                onError,
                onFinish: () => console.log('🏁 Petición PUT terminada.'),
            });
        } else {
            console.log('-> Método: POST (Nuevo Registro)');
            // 👇 VOLVIMOS A TU RUTA ORIGINAL: /checks
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
        // 🛑 CANDADO ABSOLUTO: sin operador seleccionado, no se asigna la
        // habitación bajo ninguna circunstancia. El botón ya queda
        // nativamente disabled sin operador, pero este guard es la
        // defensa real (cubre envío por Enter u otras vías) y dispara
        // el parpadeo del selector + el Toast de validación.
        // =========================================================
        if (!data.checkin_operator_id) {
            triggerOperatorAlert();
            setOperatorToastError(
                'Seleccione su usuario operador para continuar',
            );
            setTimeout(() => setOperatorToastError(null), 5000);
            return;
        }

        // 🚀 1. ESPÍAS: VEMOS QUÉ ESTAMOS INTENTANDO GUARDAR
        console.log('🚀 =========================================');
        console.log('🚀 [SUBMIT] VALIDANDO ANTES DE ENVIAR');
        console.log('-> 📦 Paquete de datos actual:', data);
        console.log(
            '-> 💸 Auto-Ajuste MARCADO:',
            data.auto_adjust_price,
            '| Precio:',
            data.agreed_price,
        );

        // =========================================================
        // 🛑 CANDADO DE SEGURIDAD: ASIGNACIÓN CORPORATIVA
        // =========================================================
        if (data.type === 'corporativo') {
            const montoAdelanto = Number(data.advance_payment);

            if (!montoAdelanto || montoAdelanto <= 0) {
                console.log(
                    '-> 🛑 BLOQUEADO: Intento de guardar Corporativo sin adelanto.',
                );
                // 1. Alerta en pantalla
                alert(
                    "⚠️ ALERTA FINANCIERA:\n\nNo se puede activar la 'Asignación Corporativa' sin recibir dinero.\nPor favor, ingresa el monto en el campo de 'Monto de Adelanto'.",
                );
                return; // 🛑 EL CANDADO SE CIERRA
            }
        }
        // =========================================================

        // =========================================================
        // 🛑 CANDADO: EL TITULAR DEBE SER MAYOR DE EDAD (18+)
        // Un menor no puede ser el responsable de la asignación.
        // (Los acompañantes sí pueden ser menores, junto a un adulto.)
        // =========================================================
        if (data.birth_date) {
            const edadTitular = Number(calculateAge(data.birth_date));
            if (!isNaN(edadTitular) && edadTitular < 18) {
                setGuestConflictError(
                    'El titular debe ser mayor de edad (18 años o más). Un menor no puede ser el responsable de la habitación. Registre al adulto como titular y al menor como acompañante.',
                );
                return; // 🛑 No deja procesar la asignación.
            }
        }

        console.log('-> ✅ CANDADOS SUPERADOS. Ejecutando executeSubmit()...');
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
        return diffMinutes <= 30;
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

    // Color del botón "Guardar/Asignar": gris "no listo" mientras falte el
    // operador (aunque el botón siga clicable a propósito, ver submit()),
    // ámbar si falta completar datos, verde cuando todo está listo.
    const saveButtonColorClass = !data.checkin_operator_id
        ? 'bg-gray-400 hover:bg-gray-400'
        : isProfileIncomplete ||
            (checkinToEdit && (!data.origin || data.origin.trim() === ''))
          ? 'bg-amber-600 hover:bg-amber-500'
          : 'bg-green-600 hover:bg-green-500';

    // El registro YA tiene un operador guardado (viene del backend, no del
    // valor por defecto que precarga el formulario) → ya no hace falta
    // pedir que se elija: se muestra "asignado por:" en el header en vez
    // del panel flotante.
    const hasSavedOperator = !!checkinToEdit?.checkin_operator_id;
    const savedOperatorName =
        checkinToEdit?.checkin_operator?.full_name ??
        checkinToEdit?.checkin_operator?.nickname ??
        null;
    // =========================================================================
    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
            {/* relative + overflow-visible: ancla del panel lateral de
                operador. El overflow-hidden se queda SOLO en la tarjeta
                blanca de abajo, así el panel lateral nunca se recorta
                aunque quede fuera del ancho de esta caja. */}
            <div className="relative w-full max-w-5xl overflow-visible">
                {/* ===================================================== */}
                {/* 🔴 PANEL LATERAL DE OPERADOR — side-toolbar flotando a   */}
                {/* la derecha de la caja blanca (no arriba): en laptops     */}
                {/* (1366x768) sobra ancho pero falta alto, así que un        */}
                {/* panel vertical pegado al borde derecho nunca choca con   */}
                {/* los bordes superior/inferior del navegador. left-full +  */}
                {/* ml-4 (en vez de un -right-[Npx] fijo) hace que se ancle  */}
                {/* justo después del borde derecho de la caja SIN adivinar  */}
                {/* su ancho a mano. Solo aplica a asignaciones NUEVAS o sin */}
                {/* operador guardado todavía; si ya hay uno, se reemplaza   */}
                {/* por el texto "asignado por:" junto a la X (más abajo).   */}
                {/* ===================================================== */}
                {!hasSavedOperator && (
                    <div
                        className={`absolute top-0 left-full z-50 ml-4 max-h-[80vh] w-28 overflow-y-auto rounded-lg border-2 p-3 shadow-lg transition-all ${
                            data.checkin_operator_id
                                ? 'border-green-200 bg-green-50'
                                : 'border-red-200 bg-red-50'
                        } ${
                            operatorAlertPulse
                                ? 'animate-pulse ring-4 ring-red-400'
                                : ''
                        }`}
                    >
                        <p
                            className={`mb-3 text-center text-[11px] font-bold text-balance ${
                                data.checkin_operator_id
                                    ? 'text-green-700'
                                    : 'text-red-700'
                            }`}
                        >
                            {data.checkin_operator_id
                                ? 'Operador seleccionado'
                                : 'Seleccione su nombre'}
                        </p>
                        <OperatorSelector
                            operators={operators}
                            value={data.checkin_operator_id}
                            onChange={(id) =>
                                setData('checkin_operator_id', id)
                            }
                            error={errors.checkin_operator_id}
                            compact
                            size="lg"
                            orientation="col"
                            label=""
                        />
                    </div>
                )}

                <div className="flex max-h-[83vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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

                        <div className="flex items-center">
                            {hasSavedOperator && savedOperatorName && (
                                <span className="mr-4 text-base text-gray-600">
                                    asignado por:{' '}
                                    <strong className="font-bold text-gray-800">
                                        {savedOperatorName}
                                    </strong>
                                </span>
                            )}
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
                                        onClick={() =>
                                            setGuestConflictError(null)
                                        }
                                        className="text-red-400 transition-colors hover:text-red-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TOAST 2.5: VALIDACIÓN — FALTA SELECCIONAR OPERADOR */}
                        {operatorToastError && (
                            <div className="pointer-events-auto flex w-80 animate-in flex-col gap-2 rounded-xl border border-red-300 bg-red-50 p-4 shadow-xl duration-300 slide-in-from-right-10 fade-in">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-red-200 p-2 text-red-700 shadow-sm">
                                        <AlertTriangle className="h-5 w-5 animate-pulse" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-red-800">
                                            {operatorToastError}
                                        </h3>
                                        <p className="mt-1 text-xs leading-tight font-semibold text-red-600">
                                            Debes elegir quién está ejecutando
                                            esta acción antes de guardar.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOperatorToastError(null)
                                        }
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

                    <form
                        onSubmit={submit}
                        className="flex flex-col md:flex-row"
                    >
                        {/* --- COLUMNA IZQUIERDA: CARRUSEL DE PERSONAS --- */}
                        <div className="relative flex-1 overflow-y-auto border-r border-gray-100 bg-white p-6">
                            <div className="space-y-4">
                                {/* ========================================================= */}
                                {/* ALERTA DE DATOS FALTANTES (Incrustada en la columna)      */}
                                {/* ========================================================= */}
                                {!checkinToEdit &&
                                    isTitular &&
                                    isProfileIncomplete &&
                                    data.full_name.length > 3 &&
                                    // AGREGAMOS ESTA LÓGICA: Solo mostrar si NO hay más datos aún
                                    !data.identification_number &&
                                    !data.birth_date &&
                                    !data.phone && (
                                        <div className="absolute -top-2 left-0 z-50 w-full px-5 pt-2">
                                            <div className="flex animate-in items-center justify-between rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-0.5 shadow-md backdrop-blur-sm duration-300 slide-in-from-top-2">
                                                <span className="flex items-center gap-2 text-[12px] font-bold text-amber-700">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    PERFIL PENDIENTE: Se
                                                    guardará solo con el nombre.
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
                                                    hasLinkedId ||
                                                    newValue === '';

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
                                                        setIsExistingGuest(
                                                            false,
                                                        );
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
                                                                    currentIndex -
                                                                        1
                                                                ],
                                                                full_name:
                                                                    newValue,
                                                                id: undefined, // Rompemos el vínculo
                                                                // Limpiamos datos
                                                                identification_number:
                                                                    '',
                                                                issued_in: '',
                                                                nationality:
                                                                    'BOLIVIANA',
                                                                civil_status:
                                                                    '',
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
                                                    currentPerson.full_name
                                                        .length > 1
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
                                                                handleSelectGuest(
                                                                    g,
                                                                )
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
                                        />
                                    </div>
                                    <div
                                        className="relative order-2"
                                        ref={issuedInDropdownRef}
                                    >
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Expedido
                                        </label>
                                        {esExtranjero(
                                            currentPerson.nationality,
                                        ) ? (
                                            <input
                                                className="w-full cursor-not-allowed rounded-lg border border-gray-400 bg-gray-100 px-3 py-2 text-sm text-gray-500 uppercase"
                                                value={
                                                    currentPerson.issued_in ||
                                                    ''
                                                }
                                                disabled
                                                readOnly
                                                title="Pasaporte: expedido en su pais"
                                            />
                                        ) : (
                                            <select
                                                className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase focus:border-blue-500 focus:ring-blue-500"
                                                value={
                                                    currentPerson.issued_in ||
                                                    ''
                                                }
                                                disabled={isReadOnly}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        'issued_in',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Seleccione...
                                                </option>
                                                {DEPARTAMENTOS_BOLIVIA.map(
                                                    (d) => (
                                                        <option
                                                            key={d}
                                                            value={d}
                                                        >
                                                            {d}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        )}
                                    </div>
                                    <div
                                        className="relative order-1"
                                        ref={nationalityRef}
                                    >
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Nacionalidad
                                        </label>
                                        <input
                                            className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm font-medium text-gray-900 uppercase"
                                            value={natInput}
                                            disabled={isReadOnly}
                                            placeholder="Escriba un pais..."
                                            autoComplete="off"
                                            onFocus={() => {
                                                setNatInput('');
                                                setShowNat(true);
                                            }}
                                            onChange={(e) => {
                                                setNatInput(
                                                    e.target.value.toUpperCase(),
                                                );
                                                setShowNat(true);
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setShowNat(false);
                                                    setNatInput(
                                                        currentPerson.nationality ||
                                                            '',
                                                    );
                                                }, 200);
                                            }}
                                        />
                                        {showNat && (
                                            <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
                                                {NACIONALIDADES.filter((n) => {
                                                    const q = natInput.trim();
                                                    if (!q) return true;
                                                    return (
                                                        n.includes(q) ||
                                                        paisDe(n).includes(q)
                                                    );
                                                }).map((n) => (
                                                    <div
                                                        key={n}
                                                        onMouseDown={() => {
                                                            handleFieldChange(
                                                                'nationality',
                                                                n,
                                                            );
                                                            if (
                                                                esExtranjero(n)
                                                            ) {
                                                                handleFieldChange(
                                                                    'issued_in',
                                                                    paisDe(n),
                                                                );
                                                            } else {
                                                                handleFieldChange(
                                                                    'issued_in',
                                                                    '',
                                                                );
                                                            }
                                                            setNatInput(n);
                                                            setShowNat(false);
                                                        }}
                                                        className="flex cursor-pointer justify-between px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-blue-50"
                                                    >
                                                        <span>{n}</span>
                                                        <span className="text-gray-400">
                                                            {paisDe(n)}
                                                        </span>
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
                                        <div className="flex-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">
                                                Edad
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                                value={
                                                    currentPerson.birth_date
                                                        ? new Date().getFullYear() -
                                                          parseInt(
                                                              currentPerson.birth_date.split(
                                                                  '-',
                                                              )[0],
                                                          )
                                                        : ''
                                                }
                                                disabled={isReadOnly}
                                                onChange={(e) => {
                                                    const age = parseInt(
                                                        e.target.value,
                                                        10,
                                                    );
                                                    if (
                                                        !isNaN(age) &&
                                                        age > 0
                                                    ) {
                                                        // Calculamos el año restando la edad al año actual
                                                        const birthYear =
                                                            new Date().getFullYear() -
                                                            age;
                                                        // Guardamos el formato ficticio de la base de datos (Ej: 1992-01-01)
                                                        handleFieldChange(
                                                            'birth_date',
                                                            `${birthYear}-01-01`,
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
                                        </div>

                                        {/*}
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Fecha Nac.
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full rounded-lg border border-gray-400 px-2 py-2 text-sm text-black"
                                            value={currentPerson.birth_date}
                                            max={
                                                new Date()
                                                    .toISOString()
                                                    .split('T')[0]
                                            }
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
                                                                        key={
                                                                            index
                                                                        }
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
                                                                        {
                                                                            profItem
                                                                        }
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
                                                value={
                                                    currentPerson.origin || ''
                                                } // <-- AHORA LEE DE CURRENTPERSON (Muestra el correcto en el carrusel)
                                                disabled={isReadOnly}
                                                autoComplete="off"
                                                onChange={(e) =>
                                                    handleOriginInput(
                                                        e.target.value,
                                                    )
                                                }
                                                onFocus={() => {
                                                    if (
                                                        (
                                                            currentPerson.origin ||
                                                            ''
                                                        ).length > 1
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
                                                originSuggestions.length >
                                                    0 && (
                                                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                        {originSuggestions.map(
                                                            (
                                                                originItem,
                                                                index,
                                                            ) => (
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
                                            (r) =>
                                                r.id === Number(data.room_id),
                                        )?.room_type?.name || 'ESTÁNDAR'}
                                    </span>

                                    {/* Separador sutil */}
                                    <div className="mx-auto my-1 w-8 border-t border-blue-200/50"></div>

                                    {/* Tipo de Baño Traducido */}
                                    <span className="block text-[10px] font-bold text-blue-500 uppercase">
                                        {(() => {
                                            const room = rooms.find(
                                                (r) =>
                                                    r.id ===
                                                    Number(data.room_id),
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
                                                    checked={
                                                        data.auto_adjust_price
                                                    }
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
                                                setData(
                                                    'room_id',
                                                    e.target.value,
                                                )
                                            }
                                            disabled={
                                                !!checkinToEdit ||
                                                !!initialRoomId
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
                                                            checked={
                                                                data.auto_adjust_price
                                                            }
                                                            onChange={(e) =>
                                                                setData(
                                                                    'auto_adjust_price',
                                                                    e.target
                                                                        .checked,
                                                                )
                                                            }
                                                            disabled={
                                                                isReadOnly ||
                                                                data.type ===
                                                                    'corporativo'
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
                                                        data.type ===
                                                        'corporativo'
                                                            ? 'border border-indigo-100 bg-indigo-50 shadow-sm'
                                                            : 'hover:bg-gray-200/50'
                                                    }`}
                                                >
                                                    <label
                                                        htmlFor="is_corporate_rec"
                                                        className={`flex cursor-pointer items-center justify-center gap-1.5 text-xs font-bold transition-all select-none ${
                                                            data.type ===
                                                            'corporativo'
                                                                ? 'text-indigo-800'
                                                                : 'text-gray-500'
                                                        }`}
                                                    >
                                                        <input
                                                            id="is_corporate_rec"
                                                            type="checkbox"
                                                            checked={
                                                                data.type ===
                                                                'corporativo'
                                                            }
                                                            onChange={(e) => {
                                                                const isChecked =
                                                                    e.target
                                                                        .checked;
                                                                const selectedRoom =
                                                                    rooms.find(
                                                                        (r) =>
                                                                            r.id ===
                                                                                Number(
                                                                                    data.room_id,
                                                                                ) ||
                                                                            r.id ===
                                                                                initialRoomId,
                                                                    );
                                                                const origPrice =
                                                                    selectedRoom
                                                                        ?.price
                                                                        ?.amount ||
                                                                    0;

                                                                if (
                                                                    !isChecked
                                                                ) {
                                                                    // Si lo APAGA, limpiamos todo y restauramos el precio normal
                                                                    setData(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            type: 'estandar',
                                                                            corporate_days: 0,
                                                                            agreed_price:
                                                                                origPrice,
                                                                        }),
                                                                    );
                                                                    setIsCustomFrequency(
                                                                        false,
                                                                    );
                                                                } else {
                                                                    // Si lo ENCIENDE, aplicamos el descuento base de -20 Bs
                                                                    setData(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            type: 'corporativo',
                                                                            auto_adjust_price: false,
                                                                            agreed_price:
                                                                                Math.max(
                                                                                    0,
                                                                                    origPrice -
                                                                                        20,
                                                                                ),
                                                                            // 👇 CAMBIO AQUÍ: Ponemos 0 para que obligue a seleccionar
                                                                            corporate_days: 1,
                                                                        }),
                                                                    );
                                                                    // 👇 CAMBIO AQUÍ: Aseguramos que la caja de "OTRO" esté oculta inicialmente
                                                                    setIsCustomFrequency(
                                                                        false,
                                                                    );
                                                                }
                                                            }}
                                                            disabled={
                                                                isReadOnly
                                                            }
                                                            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                        />
                                                        ASIG. CORP
                                                    </label>

                                                    {/* Controles de Frecuencia que aparecen AL LADO */}
                                                    {data.type ===
                                                        'corporativo' && (
                                                        <div className="ml-2 flex items-center gap-1 border-l border-indigo-200 pl-2">
                                                            {/* 1. SELECTOR RÁPIDO */}
                                                            <select
                                                                className="h-6 w-[68px] rounded border-indigo-300 bg-white py-0 pr-4 pl-1 text-[13px] font-bold text-indigo-700 focus:border-indigo-500 focus:ring-indigo-500"
                                                                // Si el número en la caja es 1, 7, 15 o 30, el select lo muestra. Si escriben otro número a mano, el select muestra "OTRO"
                                                                value={
                                                                    [
                                                                        1, 7,
                                                                        15, 30,
                                                                    ].includes(
                                                                        Number(
                                                                            data.corporate_days,
                                                                        ),
                                                                    )
                                                                        ? String(
                                                                              data.corporate_days,
                                                                          )
                                                                        : 'OTRO'
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    if (
                                                                        e.target
                                                                            .value !==
                                                                        'OTRO'
                                                                    ) {
                                                                        setData(
                                                                            'corporate_days',
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                        );
                                                                    }
                                                                }}
                                                                disabled={
                                                                    isReadOnly
                                                                }
                                                            >
                                                                <option value="1">
                                                                    1 día
                                                                </option>
                                                                <option value="7">
                                                                    7 días
                                                                </option>
                                                                <option value="15">
                                                                    15 días
                                                                </option>
                                                                <option value="30">
                                                                    30 días
                                                                </option>
                                                                <option value="OTRO">
                                                                    Otro
                                                                </option>
                                                            </select>

                                                            {/* 2. CAJA DE TEXTO (SIEMPRE VISIBLE) */}
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="w-16 [appearance:textfield] rounded-xl border border-gray-400 px-2 py-1 text-center text-sm font-black text-black shadow-inner focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                placeholder="Días"
                                                                value={
                                                                    data.corporate_days ===
                                                                    0
                                                                        ? ''
                                                                        : data.corporate_days
                                                                }
                                                                onChange={(e) =>
                                                                    setData(
                                                                        'corporate_days',
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                    )
                                                                }
                                                                disabled={
                                                                    isReadOnly
                                                                }
                                                                required={
                                                                    data.type ===
                                                                    'corporativo'
                                                                }
                                                            />
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
                                                            Number(
                                                                data.room_id,
                                                            ) ||
                                                        r.id === initialRoomId,
                                                );

                                                // Función para forzar el redondeo oficial a 1 decimal (10, 20, 50 ctvs)
                                                const redondearMoneda = (
                                                    monto: number,
                                                ) =>
                                                    Math.round(monto * 10) / 10;

                                                const originalPrice =
                                                    redondearMoneda(
                                                        Number(
                                                            selectedRoom?.price
                                                                ?.amount || 0,
                                                        ),
                                                    );

                                                const corporateBasePrice =
                                                    Math.max(
                                                        0,
                                                        originalPrice - 20,
                                                    );

                                                let finalPrice = originalPrice;

                                                if (data.type !== 'estandar') {
                                                    finalPrice =
                                                        data.agreed_price !== ''
                                                            ? redondearMoneda(
                                                                  Number(
                                                                      data.agreed_price,
                                                                  ),
                                                              )
                                                            : 0;
                                                } else if (
                                                    Number(data.agreed_price) >
                                                    0
                                                ) {
                                                    finalPrice =
                                                        redondearMoneda(
                                                            Number(
                                                                data.agreed_price,
                                                            ),
                                                        );
                                                }

                                                const isAutoAdjusted =
                                                    finalPrice !==
                                                    originalPrice;
                                                const occupantsCount =
                                                    1 +
                                                    (data.companions?.length ||
                                                        0);
                                                const priceDelta =
                                                    finalPrice - originalPrice;

                                                let noches =
                                                    Number(
                                                        data.duration_days,
                                                    ) || 0;
                                                let tituloTotal = isAutoAdjusted
                                                    ? 'Total a cobrar'
                                                    : 'Total sugerido';

                                                // 🚀 CORREGIDO: Corporativo y Delegación ya NO comparten la misma
                                                // rama. Delegación no tiene ciclos ni "noches" — es un monto TOTAL
                                                // fijo pactado para toda la estadía.
                                                if (
                                                    data.type === 'corporativo'
                                                ) {
                                                    noches =
                                                        Number(
                                                            data.corporate_days,
                                                        ) || 1;
                                                    tituloTotal = `Cobro (cada ${noches} días)`;
                                                } else if (
                                                    data.type === 'delegacion'
                                                ) {
                                                    noches = 1;
                                                    tituloTotal =
                                                        'Monto Total Acordado';
                                                }

                                                const total = redondearMoneda(
                                                    finalPrice * noches,
                                                );

                                                // 🔒 Límites: Estándar/Corporativo mantienen el tope original
                                                // (precio de tabla × noches/ciclo). Delegación usa precio de
                                                // tabla × duración real de la estadía como resguardo básico,
                                                // ya que aquí "noches" siempre vale 1.
                                                const maxTotal =
                                                    data.type === 'delegacion'
                                                        ? redondearMoneda(
                                                              Math.max(
                                                                  originalPrice *
                                                                      (Number(
                                                                          data.duration_days,
                                                                      ) || 1),
                                                                  finalPrice,
                                                              ),
                                                          )
                                                        : redondearMoneda(
                                                              originalPrice *
                                                                  noches,
                                                          );
                                                const minTotal = 0;

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
                                                                        {data.type ===
                                                                            'estandar' &&
                                                                            priceDelta !==
                                                                                0 && (
                                                                                <span
                                                                                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase shadow-sm ${priceDelta < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                                                                                >
                                                                                    {priceDelta <
                                                                                    0
                                                                                        ? '▼'
                                                                                        : '▲'}{' '}
                                                                                    {Math.abs(
                                                                                        priceDelta,
                                                                                    ).toFixed(
                                                                                        2,
                                                                                    )}{' '}
                                                                                    Bs
                                                                                </span>
                                                                            )}
                                                                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-blue-700 uppercase shadow-sm">
                                                                            {
                                                                                occupantsCount
                                                                            }{' '}
                                                                            húesp.
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-sm font-bold text-green-800">
                                                                            {Number(
                                                                                finalPrice,
                                                                            ).toFixed(
                                                                                2,
                                                                            )}{' '}
                                                                            Bs /
                                                                            noche
                                                                        </span>
                                                                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-blue-700 uppercase shadow-sm">
                                                                            {
                                                                                occupantsCount
                                                                            }{' '}
                                                                            húesp.
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* DERECHA: Total a cobrar */}
                                                        <div className="flex flex-col border-l border-green-200 pl-4 text-right">
                                                            <span className="mb-0.5 text-[11px] font-bold text-green-700 uppercase">
                                                                {tituloTotal}
                                                            </span>

                                                            <div className="flex items-center justify-end gap-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.10"
                                                                    min={
                                                                        minTotal
                                                                    }
                                                                    max={
                                                                        maxTotal
                                                                    }
                                                                    value={
                                                                        editingTotal !==
                                                                        null
                                                                            ? editingTotal
                                                                            : total >
                                                                                0
                                                                              ? String(
                                                                                    total,
                                                                                )
                                                                              : ''
                                                                    }
                                                                    onFocus={() => {
                                                                        setEditingTotal(
                                                                            total >
                                                                                0
                                                                                ? String(
                                                                                      total,
                                                                                  )
                                                                                : '',
                                                                        );
                                                                    }}
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        setEditingTotal(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );
                                                                    }}
                                                                    onBlur={(
                                                                        e,
                                                                    ) => {
                                                                        const rawVal =
                                                                            e
                                                                                .target
                                                                                .value;

                                                                        if (
                                                                            rawVal ===
                                                                            ''
                                                                        ) {
                                                                            setData(
                                                                                'agreed_price',
                                                                                '',
                                                                            );
                                                                            setEditingTotal(
                                                                                null,
                                                                            );
                                                                            return;
                                                                        }

                                                                        let inputVal =
                                                                            Number(
                                                                                rawVal,
                                                                            );

                                                                        if (
                                                                            inputVal >
                                                                            maxTotal
                                                                        )
                                                                            inputVal =
                                                                                maxTotal;
                                                                        if (
                                                                            inputVal <
                                                                            minTotal
                                                                        )
                                                                            inputVal =
                                                                                minTotal;

                                                                        inputVal =
                                                                            redondearMoneda(
                                                                                inputVal,
                                                                            );

                                                                        const valorAGuardar =
                                                                            data.type ===
                                                                            'delegacion'
                                                                                ? inputVal
                                                                                : redondearMoneda(
                                                                                      noches >
                                                                                          0
                                                                                          ? inputVal /
                                                                                                noches
                                                                                          : inputVal,
                                                                                  );

                                                                        setData(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                agreed_price:
                                                                                    valorAGuardar,
                                                                                ...(prev.type ===
                                                                                    'estandar' &&
                                                                                inputVal !==
                                                                                    maxTotal
                                                                                    ? {
                                                                                          auto_adjust_price: false,
                                                                                      }
                                                                                    : {}),
                                                                            }),
                                                                        );

                                                                        setEditingTotal(
                                                                            null,
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
                                                            {noches > 1 && (
                                                                <span className="mt-0.5 text-[10px] font-medium text-gray-500">
                                                                    {Number(
                                                                        finalPrice,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}{' '}
                                                                    x {noches}{' '}
                                                                    {data.type !==
                                                                    'estandar'
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
                                            // 👇 NUEVO: Validación automática al salir de la casilla
                                            onBlur={(e) => {
                                                const selectedDate = new Date(
                                                    e.target.value,
                                                );
                                                const currentDate = new Date(
                                                    now,
                                                );
                                                // Si la fecha/hora escrita es mayor a la actual, se reinicia al momento actual
                                                if (
                                                    selectedDate > currentDate
                                                ) {
                                                    setData(
                                                        'check_in_date',
                                                        now,
                                                    );
                                                }
                                            }}
                                            disabled={false}
                                            max={now} // Mantiene el bloqueo en el calendario desplegable
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
                                                    Number(
                                                        data.duration_days,
                                                    ) <= 1
                                                }
                                                onClick={() => {
                                                    const current =
                                                        Number(
                                                            data.duration_days,
                                                        ) || 1;
                                                    setData(
                                                        'duration_days',
                                                        Math.max(
                                                            1,
                                                            current - 1,
                                                        ),
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
                                                            step="1"
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
                                                            disabled={
                                                                !isTitular
                                                            }
                                                            required={
                                                                data.type ===
                                                                'corporativo'
                                                            }
                                                            className={`block w-full [appearance:textfield] rounded-xl border py-2 pl-9 text-sm font-bold text-black focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                                                                data.type ===
                                                                    'corporativo' &&
                                                                (!data.advance_payment ||
                                                                    data.advance_payment <=
                                                                        0)
                                                                    ? 'border-red-500 bg-red-50' // Se pinta de rojo si está vacío y es corporativo
                                                                    : 'border-gray-400'
                                                            }`}
                                                            placeholder="0"
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
                                                            data.qr_bank ===
                                                                banco;
                                                        return (
                                                            <button
                                                                key={banco}
                                                                type="button"
                                                                disabled={
                                                                    !isTitular
                                                                }
                                                                onClick={() =>
                                                                    setData(
                                                                        (
                                                                            prev,
                                                                        ) => ({
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
                                                                ¡Seleccione
                                                                Efectivo o un QR
                                                                para el
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
                                            {/* 1. BOTÓN GARAJE (Dinámico, con control de capacidad)
                                            Reglas:
                                            - El servicio Garaje tiene capacidad (campo `quantity`).
                                            - El backend envía `quantity_used` = espacios ocupados por
                                              check-ins activos.
                                            - Si quedan 0 espacios y este check-in NO lo tiene seleccionado,
                                              el botón se pone rojo y queda DESHABILITADO (bloqueo total).
                                            - Si el check-in actual SÍ tiene el garaje, sigue activo para
                                              que el recepcionista pueda quitarlo. */}
                                            {availableServices
                                                .filter((s: any) =>
                                                    s.name
                                                        .toUpperCase()
                                                        .includes('GARAJE'),
                                                )
                                                .map((srv: any) => {
                                                    const srvId = String(
                                                        srv.id,
                                                    );
                                                    const active =
                                                        data.selected_services.includes(
                                                            srvId,
                                                        );
                                                    const capacity = Number(
                                                        srv.quantity ?? 0,
                                                    );
                                                    const used = Number(
                                                        srv.quantity_used ?? 0,
                                                    );
                                                    const remaining = Math.max(
                                                        0,
                                                        capacity - used,
                                                    );
                                                    // Bloqueado: ya no hay espacios Y el check-in actual
                                                    // no tiene el garaje (no debe poder agregarlo).
                                                    const blocked =
                                                        !active &&
                                                        remaining <= 0;

                                                    let btnClass: string;
                                                    if (blocked) {
                                                        btnClass =
                                                            'border-red-500 bg-red-100 font-bold text-red-700 cursor-not-allowed';
                                                    } else if (active) {
                                                        btnClass =
                                                            'border-green-500 bg-green-100 font-bold text-green-700';
                                                    } else {
                                                        btnClass =
                                                            'border border-gray-400 bg-white text-gray-600 hover:border-gray-500';
                                                    }

                                                    return (
                                                        <button
                                                            key={srv.id}
                                                            type="button"
                                                            disabled={blocked}
                                                            title={
                                                                blocked
                                                                    ? 'Parqueo completo: no quedan espacios disponibles'
                                                                    : `${remaining} de ${capacity} espacio${capacity === 1 ? '' : 's'} disponible${remaining === 1 ? '' : 's'}`
                                                            }
                                                            onClick={() => {
                                                                if (blocked)
                                                                    return;
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
                                                            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${btnClass}`}
                                                        >
                                                            {active && (
                                                                <CheckCircle2 className="h-3 w-3" />
                                                            )}
                                                            {srv.name}
                                                            {/* Contador de disponibilidad: solo se muestra
                                                            si el servicio tiene capacidad definida */}
                                                            {capacity > 0 && (
                                                                <span
                                                                    className={`ml-1 text-[10px] ${blocked ? 'text-red-600' : 'text-gray-500'}`}
                                                                >
                                                                    ({remaining}
                                                                    /{capacity})
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}

                                            {/* 2. DESAYUNO: incluido solo si la habitación es PRIVADA. */}
                                            {(() => {
                                                const rawBath =
                                                    (currentRoom as any)?.price
                                                        ?.bathroom_type ||
                                                    (currentRoom as any)
                                                        ?.room_type
                                                        ?.bathroom_type;
                                                const esPrivada =
                                                    String(
                                                        rawBath || '',
                                                    ).toUpperCase() ===
                                                    'PRIVATE';

                                                return esPrivada ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="flex cursor-default items-center gap-1 rounded-full border border-green-500 bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        DESAYUNO INCLUIDO
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="flex cursor-default items-center gap-1 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500"
                                                    >
                                                        SIN DESAYUNO (HAB.
                                                        COMPARTIDA)
                                                    </button>
                                                );
                                            })()}
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
                                                disabled={
                                                    processing ||
                                                    !data.checkin_operator_id
                                                }
                                                title={
                                                    !data.checkin_operator_id
                                                        ? 'Selecciona qué usuario está ejecutando esta acción antes de guardar'
                                                        : undefined
                                                }
                                                className={`flex items-center gap-4 rounded-xl px-6 py-2 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${saveButtonColorClass}`}
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
