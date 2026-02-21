import ToleranceModal from '@/components/ToleranceModal';
import { router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRightCircle,
    Bed,
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
    //origin?: string;
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
    created_at?: string;
    actual_arrival_date?: string | null;
    schedule_id?: number | null;
    origin?: string | null;
    payment_method?: string | null;
    qr_bank?: string | null;
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
    //origin: string;
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
    isReadOnly = false,
}: CheckinModalProps) {
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
            //origin: '',
            phone: '',
            companions: [], // <--- ESTE ES EL CAMBIO CLAVE (Array vacío inicial)
            payment_method: 'EFECTIVO', // Por defecto efectivo
            qr_bank: '', // Vacío al inicio
            is_temporary: false,
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
                setIsExistingGuest(true);

                // --- LÓGICA DE DETECCIÓN DE EXCESO DE TIEMPO ---
                let calculatedDuration = Math.max(
                    1,
                    Number(checkinToEdit.duration_days),
                );

                // Buscamos el horario asignado
                const schedule = schedules.find(
                    (s) => String(s.id) === String(checkinToEdit.schedule_id),
                );

                if (schedule) {
                    const checkInDate = new Date(checkinToEdit.check_in_date);
                    const [outH, outM] = schedule.check_out_time
                        .split(':')
                        .map(Number);
                    // Usamos una tolerancia por defecto si no existe en la interfaz
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
                            calculatedDuration++; // Sumamos 1 noche automáticamente
                        } else {
                            isValidDuration = true;
                        }
                        if (calculatedDuration > 365) break;
                    }
                }

                // Cargamos todo al formulario CON CONVERSIONES DE TIPO
                setData((prev) => ({
                    ...prev,
                    // CORRECCIÓN DE ERROR DE TIPOS (Number -> String)
                    guest_id: String(checkinToEdit.guest_id),
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

                    // Convertimos IDs de servicios a String
                    selected_services: checkinToEdit.services
                        ? checkinToEdit.services.map((s: any) =>
                              String(s.id || s),
                          )
                        : [],

                    // Datos Titular
                    full_name: checkinToEdit.guest?.full_name || '',
                    identification_number:
                        checkinToEdit.guest?.identification_number || '',
                    issued_in: checkinToEdit.guest?.issued_in || '',
                    nationality:
                        checkinToEdit.guest?.nationality || 'BOLIVIANA',
                    civil_status: checkinToEdit.guest?.civil_status || '',
                    birth_date: checkinToEdit.guest?.birth_date || '',
                    profession: checkinToEdit.guest?.profession || '',
                    //origin: checkinToEdit.guest?.origin || '',
                    phone: checkinToEdit.guest?.phone || '',

                    // Mapeamos acompañantes
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
                            //origin: c.origin || '',
                            phone: c.phone || '',
                        })) || [],

                    payment_method: checkinToEdit.payment_method || 'EFECTIVO', // <--- AGREGADO
                    qr_bank: checkinToEdit.qr_bank || '',
                }));
            } else {
                // ===============================================
                // MODO NUEVO REGISTRO: Limpiar formulario
                // ===============================================
                reset();
                setIsExistingGuest(false);
                setCurrentIndex(0);

                // Valores iniciales
                setData((prev) => ({
                    ...prev,
                    check_in_date: currentDateTimeISO,
                    room_id: initialRoomId ? String(initialRoomId) : '',
                    schedule_id: defaultScheduleId,
                    duration_days: 1,
                    selected_services: [],
                    companions: [],
                    payment_method: 'EFECTIVO', // <--- AGREGADO
                    qr_bank: '', // <--- AGREGADO
                }));
            }
        }
    }, [show, checkinToEdit, initialRoomId, targetGuestId, schedules]);

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
              //origin: data.origin,
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
              //origin: companionsList[currentIndex - 1]?.origin || '',
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
                //origin: '',
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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => {
            reset();
            onClose(true);
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
        return diffMinutes <= 10;
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
            <div className="flex max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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

                    {/* TOAST 2: AVISO FALTAN DATOS (ÁMBAR - CONSTANTE) */}
                    {/*}
                    {isTitular &&
                        (isProfileIncomplete ||
                            (checkinToEdit &&
                                (!data.origin ||
                                    data.origin.trim() === ''))) && (
                            <div className="pointer-events-auto fixed left-1/2 top-[15%] z-50 w-80 -translate-x-1/2 -translate-y-1/2 animate-in flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4 shadow-xl duration-300 fade-in zoom-in-95">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                                        <AlertTriangle className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-gray-900">
                                            Algunos campos faltan llenar
                                        </h3>
                                        <p className="mt-0.5 text-xs font-medium text-amber-700">
                                            Complete la{' '}
                                            <span className="font-bold">
                                                Procedencia
                                            </span>{' '}
                                            y los datos para habilitar el
                                            Check-in.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    {*/}
                    {/* TOAST 3: INFO DE RESERVA (AZUL - 10 SEGUNDOS) */}
                    {showReservationToast && (
                        <div className="pointer-events-auto flex w-80 animate-in flex-col gap-2 rounded-xl border border-blue-200 bg-white p-4 shadow-xl duration-300 slide-in-from-right-10 fade-in">
                            <div className="flex items-start gap-3">
                                <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-900">
                                        Asignación de Reserva
                                    </h3>
                                    <p className="mt-0.5 text-xs font-medium text-blue-700">
                                        Habitación separada previamente. (
                                        {checkinToEdit?.notes})
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowReservationToast(false)
                                    }
                                    className="text-gray-400 hover:text-gray-600"
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
                                    <label className="text-xs font-bold text-gray-500">
                                        Carnet (CI)
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
                                <div>
                                    <label className="text-xs font-bold text-gray-500">
                                        Expedido
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm text-black uppercase"
                                        value={currentPerson.issued_in}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                'issued_in',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        placeholder="La Paz"
                                    />
                                </div>
                                <div className="relative" ref={nationalityRef}>
                                    <label className="text-xs font-bold text-gray-500">
                                        Nacionalidad
                                    </label>
                                    <input
                                        className="w-full rounded-lg border border-gray-400 px-3 py-2 text-sm font-medium text-gray-900 uppercase" // Changed text-black to text-gray-900 font-medium
                                        value={currentPerson.nationality}
                                        disabled={isReadOnly}
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
                                    <label className="text-xs font-bold text-gray-500">
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
                                        <label className="text-xs font-bold text-gray-500">
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
                                            disabled={isReadOnly}
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
                                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                                        Procedencia
                                    </label>
                                    <div className="relative">
                                        <Globe className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-400 bg-blue-50/20 py-2 pl-9 text-sm font-bold text-blue-900 uppercase focus:border-blue-500 focus:ring-blue-500"
                                            // ✅ CORRECCIÓN CLAVE:
                                            // Vinculamos directamente a 'data.origin' (el dato de la asignación)
                                            value={data.origin || ''}
                                            // ✅ Al escribir, actualizamos directo el formulario principal
                                            onChange={(e) =>
                                                setData(
                                                    'origin',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            disabled={isReadOnly}
                                            placeholder="EJ: COCHABAMBA"
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
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                        <div className="space-y-5">
                            <div>
                                <div className="flex w-full items-center justify-between">
                                    {/* IZQUIERDA */}
                                    <label className="flex items-center gap-2 text-base font-bold text-green-700">
                                        <Bed className="h-4 w-4" />
                                        HABITACIÓN{' '}
                                        <span className="text-black">
                                            {data.room_id}
                                        </span>
                                    </label>

                                    {/* DERECHA: Checkbox Temporal */}
                                    <div className="flex items-center gap-2">
                                        <label
                                            htmlFor="is_temporary"
                                            className={`cursor-pointer text-xs font-bold transition-colors select-none ${
                                                data.is_temporary
                                                    ? 'text-amber-600'
                                                    : 'text-gray-400'
                                            }`}
                                        >
                                            Asig. TEMPORAL:
                                        </label>

                                        <input
                                            id="is_temporary"
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
                                    </div>
                                </div>

                                {/* --- CAMPO BLOQUEADO (DISABLED) --- */}
                                <select
                                    value={data.room_id}
                                    onChange={(e) =>
                                        setData('room_id', e.target.value)
                                    }
                                    disabled={
                                        !!checkinToEdit || !!initialRoomId
                                    }
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
                            <div className="grid grid-cols-[1fr_160px] gap-3">
                                {/* COLUMNA IZQUIERDA: FECHA DE INGRESO + BOTÓN TOLERANCIA */}
                                <div className="relative flex flex-grow flex-col">
                                    {/* 1. Header con etiqueta y Badge de Horario */}
                                    <div className="mb-0.5 flex min-h-[20px] items-center gap-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Fecha Ingreso (Check-In)
                                        </label>
                                    </div>

                                    {/* 2. BOTÓN TOLERANCIA (FLOTANTE / ABSOLUTO) */}
                                    {/* Se posiciona 'encima' del layout en la esquina derecha. No empuja nada. */}
                                    {data.schedule_id &&
                                        toleranceStatus.isValid && (
                                            <div className="absolute top-0 right-3 z-10">
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

                                    {/* 3. Input de Fecha (Se mantiene igual) */}
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
                                        className="w-full rounded-lg border border-gray-400 text-sm font-bold text-black disabled:bg-gray-100"
                                    />
                                </div>

                                {/* COLUMNA DERECHA: NOCHES Y CONTROL DE PRECIOS */}
                                <div className="flex w-40 flex-col">
                                    {/* 1. CABECERA FILA: ETIQUETA "NOCHES" + INFO SALIDA A LA DERECHA */}
                                    <div className="mb-1 flex items-end justify-between">
                                        <label className="text-xs font-bold text-gray-500 uppercase">
                                            Noches:
                                        </label>

                                        {/* Lógica de Salida (Movida aquí arriba) */}
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

                                    {/* 2. INPUT NOCHES */}
                                    <div className="relative">
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
                                            className="w-full rounded-lg border border-gray-400 pr-2 pl-3 text-right text-sm font-black text-blue-900 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                                            placeholder="1"
                                        />
                                        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                                            #
                                        </span>
                                    </div>

                                    {/* 3. PRECIO TOTAL (Debajo del input) */}
                                    <div className="mt-0.5 flex justify-end">
                                        {(() => {
                                            const selectedRoom = rooms.find(
                                                (r) =>
                                                    r.id ===
                                                        Number(data.room_id) ||
                                                    r.id === initialRoomId,
                                            );
                                            const price =
                                                selectedRoom?.price?.amount ||
                                                0;
                                            const total =
                                                price *
                                                (Number(data.duration_days) ||
                                                    0);
                                            return (
                                                <span className="animate-in text-sm font-black text-green-600 fade-in">
                                                    Total: {total} Bs
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* CAMPO ADELANTO (Siempre visible, bloqueado si no es titular) */}
                            <div>
                                {/* ELIMINADA LA CONDICIÓN isTitular && AQUÍ */}
                                <div className="relative -top-3 -mt-4 animate-in duration-300 fade-in slide-in-from-top-2">
                                    <div className="flex flex-col gap-2">
                                        {/* FILA SUPERIOR: SELECCIÓN DE MÉTODO + MONTO */}
                                        <div className="flex gap-2">
                                            {/* A. SELECTOR TIPO DE PAGO (IZQUIERDA) */}
                                            <div className="w-1/2">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">
                                                    Método
                                                </label>
                                                <div className="flex rounded-lg bg-gray-100 p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                payment_method:
                                                                    'EFECTIVO',
                                                                qr_bank: '',
                                                            }))
                                                        }
                                                        disabled={!isTitular} // Bloquear si no es titular (opcional)
                                                        className={`flex-1 rounded py-1 text-[9px] font-bold transition-all ${
                                                            data.payment_method ===
                                                            'EFECTIVO'
                                                                ? 'bg-white text-green-700 shadow-sm ring-1 ring-gray-200'
                                                                : 'text-gray-400 hover:text-gray-600'
                                                        }`}
                                                    >
                                                        EFECTIVO
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setData(
                                                                'payment_method',
                                                                'QR',
                                                            )
                                                        }
                                                        disabled={!isTitular}
                                                        className={`flex-1 rounded py-1 text-[9px] font-bold transition-all ${
                                                            data.payment_method ===
                                                            'QR'
                                                                ? 'bg-white text-purple-700 shadow-sm ring-1 ring-gray-200'
                                                                : 'text-gray-400 hover:text-gray-600'
                                                        }`}
                                                    >
                                                        QR
                                                    </button>
                                                </div>
                                            </div>

                                            {/* B. INPUT DE MONTO (DERECHA) */}
                                            <div className="w-1/2">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">
                                                    Adelanto
                                                </label>
                                                <div className="relative">
                                                    <span
                                                        className={`absolute inset-y-0 left-2 flex items-center text-[10px] font-bold ${!isTitular ? 'text-gray-400' : 'text-green-600'}`}
                                                    >
                                                        Bs
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.50"
                                                        min="0"
                                                        value={
                                                            data.advance_payment
                                                        }
                                                        onChange={(e) =>
                                                            setData(
                                                                'advance_payment',
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        disabled={!isTitular}
                                                        className="w-full rounded-lg border border-gray-400 py-1 pl-6 text-xs font-black text-gray-800 focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* FILA INFERIOR: SELECCIÓN DE BANCO (SOLO APARECE SI ES QR) */}
                                        <div
                                            className={`border-t border-gray-100 pt-1.5 transition-all duration-300 ${
                                                data.payment_method === 'QR'
                                                    ? 'visible opacity-100'
                                                    : 'invisible opacity-0'
                                            }`}
                                        >
                                            <div className="mb-1 flex items-center justify-between">
                                                {/* Badge pequeño que muestra qué banco se eligió */}
                                                {data.qr_bank && (
                                                    <span className="rounded bg-purple-100 text-[8px] font-bold text-purple-700">
                                                        {data.qr_bank}
                                                    </span>
                                                )}
                                            </div>

                                            {/* GRID DE BANCOS */}
                                            <div className="grid grid-cols-4 gap-1">
                                                {[
                                                    {
                                                        id: 'YAPE',
                                                        label: 'YAPE',
                                                        color: 'border-green-200 bg-green-50 text-green-700',
                                                    },
                                                    {
                                                        id: 'FIE',
                                                        label: 'FIE',
                                                        color: 'border-orange-200 bg-orange-50 text-orange-700',
                                                    },
                                                    {
                                                        id: 'BNB',
                                                        label: 'BNB',
                                                        color: 'border-blue-200 bg-blue-50 text-blue-700',
                                                    },
                                                    {
                                                        id: 'ECO',
                                                        label: 'ECO',
                                                        color: 'border-yellow-200 bg-yellow-50 text-yellow-700',
                                                    },
                                                ].map((banco) => (
                                                    <button
                                                        key={banco.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setData(
                                                                'qr_bank',
                                                                banco.id,
                                                            )
                                                        }
                                                        disabled={!isTitular}
                                                        className={`rounded border px-0.5 py-1 text-[8px] font-bold transition-all active:scale-95 ${
                                                            data.qr_bank ===
                                                            banco.id
                                                                ? `ring-1 ring-purple-500 ring-offset-0 ${banco.color} scale-105 shadow-sm brightness-95`
                                                                : `border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50`
                                                        }`}
                                                    >
                                                        {banco.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* MENSAJE DE ERROR VISUAL (SI HAY MONTO PERO NO BANCO) */}
                                            {data.advance_payment > 0 &&
                                                !data.qr_bank && (
                                                    <div className="mt-1 flex animate-pulse items-center justify-center gap-0.5 text-[8px] font-bold text-red-500">
                                                        <AlertCircle className="h-2 w-2" />
                                                        <span>Requerido</span>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                                {/* ELIMINADA LA LLAVE DE CIERRE AQUÍ */}
                            </div>

                            <div className="relative -top-7">
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

                            <div className="relative -top-10">
                                <label className="mb-2 block text-xs font-bold text-gray-500">
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
                        {/* 3. FOOTER DE BOTONES (ESTÁTICO - FUERA DEL SCROLL) */}
                        <div className="shrink-0">
                            <div className="flex items-center justify-end gap-3">
                                {checkinToEdit && canCancel() && (
                                    <button
                                        type="button"
                                        onClick={() => setShowCancelModal(true)}
                                        className="mr-auto flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
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
                                        <div className="mr-auto flex items-center gap-2 text-xs font-medium text-gray-400 select-none">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>Asignación confirmada</span>
                                        </div>
                                    )}

                                <div className="-mt-10 flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                                    <button
                                        type="button"
                                        onClick={() => onClose(false)}
                                        className="rounded-xl px-5 py-2 text-sm font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 active:scale-95"
                                    >
                                        {isReadOnly ? 'Cerrar' : 'Cancelar'}
                                    </button>

                                    {/* TU BOTÓN ORIGINAL INTACTO */}
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
