import { useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    Banknote,
    BedDouble,
    Building2,
    Calendar,
    CheckCircle,
    Loader2,
    Plus,
    Save,
    Trash2,
    User,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';

// --- INTERFACES ---
export interface Guest {
    id: number;
    name: string;
    last_name: string;
    full_name?: string;
    identification_number?: string;
}

export interface Price {
    id: number;
    amount: number;
    bathroom_type: string;
}

export interface RoomType {
    id: number;
    name: string;
    capacity?: number;
}

// 🚀 SOLUCIÓN 1: Mantenemos Room limpio para que no cause recursividad
export interface Room {
    id: number;
    number: string;
    status: string;
    price_id?: number;
    price?: Price;
    prices?: Price[];
    room_type?: RoomType;
    room_type_id?: number;
}

export interface DetailItem {
    id?: number;
    room_id: string | null;
    price_id: string;
    price: number;
    requested_room_type_id: string;
    requested_bathroom: string;
    // Variables temporales exclusivas para la UI
    room?: Room;
    room_type?: RoomType;
    _temp_pax_count?: number;
    _temp_room_name?: string;
    _temp_id?: number;
    _temp_advance_payment?: number;
}

export interface Reservation {
    id: number;
    guest_id: number;
    guest?: Guest;
    guest_count: number;
    arrival_date: string;
    arrival_time: string;
    duration_days: number;
    advance_payment: number;
    payment_type: string;
    qr_bank?: string;
    status: string;
    is_corporate?: boolean;
    is_delegation?: boolean;
    details: DetailItem[];
}

// 🚀 SOLUCIÓN 2: Volvemos a usar DetailItem[] (esto le gusta a Inertia)
interface ReservationFormData {
    is_new_guest: boolean;
    guest_id: string;
    new_guest_name: string;
    new_guest_ci: string;
    guest_count: number | '';
    arrival_date: string;
    arrival_time: string;
    duration_days: number;
    advance_payment: number;
    payment_type: string;
    qr_bank: string;
    status: string;
    is_corporate: boolean;
    is_delegation: boolean;
    details: DetailItem[];
}

interface Props {
    show: boolean;
    onClose: () => void;
    reservationToEdit?: Reservation | null;
    guests: Guest[];
    rooms: Room[];
}

// --- FUNCIONES AUXILIARES ---
const isMatchingBathroom = (dbVal?: string, filterVal?: string) => {
    const db = dbVal?.toLowerCase() || '';
    const filter = filterVal?.toLowerCase() || '';
    if (!filter) return false;
    if (db === filter) return true;
    if (
        (filter === 'private' || filter === 'privado') &&
        (db === 'private' || db === 'privado')
    )
        return true;
    if (
        (filter === 'shared' || filter === 'compartido') &&
        (db === 'shared' || db === 'compartido')
    )
        return true;
    return false;
};

const getExactRoomPrice = (room: Room): Price | null => {
    if (room.price && !Array.isArray(room.price)) return room.price;
    if (room.prices && Array.isArray(room.prices)) {
        return room.prices.find((p) => p.id === room.price_id) || null;
    }
    return null;
};

const getRoomCapacity = (rt: RoomType): number => {
    if (rt.capacity) return rt.capacity;
    const n = rt.name.toLowerCase();
    if (n.includes('simple')) return 1;
    if (n.includes('doble') || n.includes('matrimonial')) return 2;
    if (n.includes('triple')) return 3;
    if (n.includes('cuadruple') || n.includes('familiar')) return 4;
    return 1; // Default
};

export default function ReservationModal({
    show,
    onClose,
    reservationToEdit,
    guests,
    rooms,
}: Props) {
    const [guestQuery, setGuestQuery] = useState('');
    const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Interruptores
    const [isCorporateToggle, setIsCorporateToggle] = useState<boolean>(false);

    // Semáforo
    const [availabilityData, setAvailabilityData] = useState<any>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

    const {
        data,
        setData,
        post,
        put,
        processing,
        reset,
        clearErrors,
        transform,
    } = useForm<ReservationFormData>({
        is_new_guest: false,
        guest_id: '',
        new_guest_name: '',
        new_guest_ci: '',
        guest_count: 1,
        arrival_date: new Date().toISOString().split('T')[0],
        arrival_time: '14:00',
        duration_days: 1,
        advance_payment: 0,
        payment_type: 'EFECTIVO',
        qr_bank: '',
        status: 'pendiente',
        is_corporate: false,
        is_delegation: false,
        details: [],
    });

    const [autoAssignFilter, setAutoAssignFilter] = useState<
        'ambos' | 'private' | 'shared'
    >('ambos');

    

    // Función Inteligente para Delegaciones Rápidas
    const handleAutoAssign = () => {
        let remaining = unassignedGuests;
        if (remaining <= 0) return;

        // 🚀 SOLUCIÓN 3: El escape táctico de TypeScript
        // Usamos 'as any[]' únicamente en esta copia temporal. Así el form no colapsa,
        // pero el código compila perfectamente porque evadimos la validación estricta solo aquí.
        const newDetails = [...data.details] as any[];
        
        // ⏱️ Calculamos las fechas en milisegundos
        const formStart = new Date(data.arrival_date).getTime();
        const formEnd = formStart + (data.duration_days * 24 * 60 * 60 * 1000);
        
        // 1. Filtrar habitaciones disponibles
        let availableRooms = rooms.filter(room => {
            if (newDetails.some(d => d.room_id === String(room.id))) return false;
            if (['MANTENIMIENTO', 'INHABILITADO'].includes(room.status.toUpperCase())) return false;

            const isShared = room.price?.bathroom_type?.toLowerCase() === 'shared' || room.price?.bathroom_type?.toLowerCase() === 'compartido';
            if (autoAssignFilter === 'private' && isShared) return false;
            if (autoAssignFilter === 'shared' && !isShared) return false;

            // ⚡ TRUCO: Convertimos a any solo temporalmente para leer la BD sin que TS moleste
            const rAny = room as any;

            // 🔍 2. VERIFICACIÓN DE DISPONIBILIDAD
            const hasConflict = rAny.reservation_details?.some((rd: any) => {
                const res = rd.reservation;
                if (!res || ['CANCELADO', 'COMPLETADO'].includes(res.status?.toUpperCase())) return false;
                
                const resStart = new Date(res.arrival_date).getTime();
                const resEnd = resStart + (res.duration_days * 24 * 60 * 60 * 1000);
                
                return (formStart < resEnd && formEnd > resStart);
            }) || rAny.checkin_details?.some((cd: any) => {
                const ch = cd.checkin;
                if (!ch || ['CHECKOUT', 'CANCELADO'].includes(ch.status?.toUpperCase())) return false;
                
                const chStart = new Date(ch.arrival_date || ch.created_at).getTime(); 
                const chEnd = chStart + ((ch.duration_days || 1) * 24 * 60 * 60 * 1000);

                return (formStart < chEnd && formEnd > chStart);
            });

            return !hasConflict;
        });

        // 3. Proceso de asignación
        for (const room of availableRooms) {
            if (remaining <= 0) break;

            const rType = room.room_type;
            if (!rType || rType.name.toLowerCase().includes('salon')) continue;

            const cap = getRoomCapacity(rType) || 1;
            const physicalBath = (room.price?.bathroom_type?.toLowerCase() === 'shared' || room.price?.bathroom_type?.toLowerCase() === 'compartido') ? 'shared' : 'private';

            // Usamos la función de recálculo (puedes ignorar este error de linter si tienes uno aquí, JS lo correrá bien)
            const priceCalc = recalculatePrice(
                String(rType.id),
                physicalBath,
                cap,
                true,
                isCorporateToggle
            );

            newDetails.push({
                _temp_id: Date.now() + Math.random(),
                room_id: String(room.id),
                price_id: priceCalc.priceId,
                price: priceCalc.price,
                requested_room_type_id: String(rType.id),
                requested_bathroom: physicalBath,
                _temp_pax_count: cap,
                _temp_room_name: rType.name,
                _temp_advance_payment: 0,
                room: room
            });
            
            remaining -= cap;
        }
        
        setData('details', newDetails);
    };
    const validGuestCount =
        typeof data.guest_count === 'number' ? data.guest_count : 0;

    // 🚀 REGLA ESTRICTA: Si es corporativo, se anula la delegación automáticamente
    const isDelegation = validGuestCount >= 20 && !isCorporateToggle;

    // Cálculo Interactivo de la "Sala de Espera" (Blindado para TypeScript)
    const totalCapacityAssigned = (data.details || []).reduce(
        (sum: number, item: any) => {
            const pax = item._temp_pax_count ? Number(item._temp_pax_count) : 1;
            return sum + pax;
        },
        0
    );
    
    const unassignedGuests = Math.max(
        0,
        validGuestCount - totalCapacityAssigned
    );
    // Filtrar Tipos de Habitación (Excluir Salón) y mapear únicos
    const uniqueRoomTypes = useMemo(() => {
        const map = new Map();
        rooms.forEach((r) => {
            const type = r.room_type;
            if (type) {
                const nameLower = type.name.toLowerCase();
                if (
                    !nameLower.includes('salon') &&
                    !nameLower.includes('salón')
                ) {
                    if (!map.has(type.id)) map.set(type.id, type);
                }
            }
        });
        return Array.from(map.values());
    }, [rooms]);

    // Semáforo Predictivo
    useEffect(() => {
        if (show && data.arrival_date) {
            setIsLoadingAvailability(true);
            axios
                .get(
                    `/api/reservations/availability?arrival_date=${data.arrival_date}`,
                )
                .then((res) => setAvailabilityData(res.data))
                .catch((err) => console.error(err))
                .finally(() => setIsLoadingAvailability(false));
        }
    }, [show, data.arrival_date]);

    // Cargar datos al Editar
    useEffect(() => {
        if (show && reservationToEdit) {
            setData((prev) => {
                // Lógica para repartir el adelanto visualmente si es Corporativo
                const isCorp = Boolean(reservationToEdit.is_corporate);
                const advanceTotal = Number(
                    reservationToEdit.advance_payment || 0,
                );
                const detailsCount = reservationToEdit.details?.length || 1;
                const splitAdvance = isCorp ? advanceTotal / detailsCount : 0;

                return {
                    ...prev,
                    guest_id: String(reservationToEdit.guest_id || ''),
                    arrival_date: reservationToEdit.arrival_date || '',
                    arrival_time: reservationToEdit.arrival_time || '',
                    duration_days: Number(reservationToEdit.duration_days || 1),
                    guest_count: Number(reservationToEdit.guest_count || 1),
                    advance_payment: advanceTotal,
                    payment_type: reservationToEdit.payment_type || 'EFECTIVO',
                    is_delegation: Boolean(reservationToEdit.is_delegation),
                    is_corporate: isCorp,
                    details: (reservationToEdit.details || []).map(
                        (detail: any) => {
                            // 1. Extraer el Precio correctamente
                            let safePrice = 0;
                            if (
                                detail.price &&
                                typeof detail.price === 'object'
                            ) {
                                safePrice = Number(detail.price.amount) || 0;
                            } else {
                                safePrice = Number(detail.price) || 0;
                            }

                            // 2. Extraer el Tipo de Habitación (Soporta camelCase de Laravel)
                            const roomTypeObj =
                                detail.requested_room_type ||
                                detail.requestedRoomType ||
                                detail.room?.room_type ||
                                detail.room?.roomType;

                            return {
                                id: detail.id,
                                _temp_id: detail.id || Math.random(),
                                room_id: detail.room_id || null,
                                price_id: String(detail.price_id || ''),
                                price: safePrice,
                                requested_room_type_id: String(
                                    detail.requested_room_type_id ||
                                        roomTypeObj?.id ||
                                        '',
                                ),
                                requested_bathroom:
                                    detail.requested_bathroom || 'private',
                                room: detail.room,
                                room_type: roomTypeObj,
                                _temp_room_name:
                                    roomTypeObj?.name || 'Habitación',
                                _temp_pax_count: roomTypeObj?.capacity || 1,
                                _temp_advance_payment: splitAdvance, // 👈 Llena el adelanto por caja si es corporativo
                            };
                        },
                    ),
                };
            });

            if (reservationToEdit.guest) {
                setGuestQuery(
                    reservationToEdit.guest.full_name ||
                        `${reservationToEdit.guest.name} ${reservationToEdit.guest.last_name}`,
                );
            }
            setIsCorporateToggle(Boolean(reservationToEdit.is_corporate));
        } else if (!show) {
            reset();
            clearErrors();
            setGuestQuery('');
            setIsCorporateToggle(false);
        }
    }, [show, reservationToEdit]);

    // LÓGICA DE PRECIOS OFICIAL
    const recalculatePrice = (
        typeId: string,
        bath: string,
        paxCount: number,
        isDel: boolean,
        isCorp: boolean,
    ) => {
        if (!bath || !typeId) return { price: 0, priceId: '' };

        const dbBath = bath === 'compartido_sindesayuno' ? 'shared' : bath;

        const matchingRoom = rooms.find((r) => {
            const rType =
                r.room_type?.id?.toString() || r.room_type_id?.toString();
            const p = getExactRoomPrice(r);
            return (
                rType === typeId && isMatchingBathroom(p?.bathroom_type, dbBath)
            );
        });

        const p = matchingRoom ? getExactRoomPrice(matchingRoom) : null;
        let finalPrice = p ? Number(p.amount) : 0;
        let finalPriceId = p ? p.id.toString() : '';

        if (isDel) {
            if (bath === 'private' || bath === 'privado')
                finalPrice = 90 * paxCount;
            else if (bath === 'compartido_sindesayuno')
                finalPrice = 50 * paxCount;
            else if (bath === 'shared' || bath === 'compartido')
                finalPrice = 60 * paxCount;
            finalPriceId = '';
        }

        return { price: finalPrice, priceId: finalPriceId };
    };

    // Agregar Habitación (Pila)
    const addRoomBox = () => {
        const select = document.getElementById(
            'roomSelector',
        ) as HTMLSelectElement;
        const typeId = select.value;
        if (!typeId) return;

        const rType = uniqueRoomTypes.find(
            (t: any) => t.id.toString() === typeId,
        );
        if (!rType) return;

        const cap = getRoomCapacity(rType);
        const defaultBath = 'private'; // Por defecto privado para forzar cálculo

        const res = recalculatePrice(
            typeId,
            defaultBath,
            cap,
            isDelegation,
            isCorporateToggle,
        );

        const newDetail: DetailItem = {
            _temp_id: Date.now(),
            room_id: null,
            price_id: res.priceId,
            price: res.price,
            requested_room_type_id: typeId,
            requested_bathroom: defaultBath,
            _temp_pax_count: cap,
            _temp_room_name: rType.name,
            _temp_advance_payment: 0,
        };

        setData('details', [newDetail, ...data.details]);
        select.value = '';
    };

    const removeRoomBox = (tempId: number | undefined) => {
        if (!tempId) return;
        setData(
            'details',
            data.details.filter((d) => d._temp_id !== tempId),
        );
    };

    const updateDetailRow = (
        index: number,
        field: keyof DetailItem,
        value: any,
    ) => {
        const newDetails = [...data.details] as any[];
        // @ts-ignore
        newDetails[index][field] = value;

        if (field === 'requested_bathroom') {
            const res = recalculatePrice(
                newDetails[index].requested_room_type_id,
                value,
                newDetails[index]._temp_pax_count || 1,
                isDelegation,
                isCorporateToggle,
            );
            newDetails[index].price = res.price;
            newDetails[index].price_id = res.priceId;
        }

        setData('details', newDetails);
    };

    const handleGuestCountChange = (val: string) => {
        if (val === '' || Number(val) <= 0) {
            setData((prev) => ({ ...prev, guest_count: '', details: [] }));
        } else {
            setData('guest_count', Number(val));
        }
    };

    const filteredGuests = useMemo(() => {
        if (!guestQuery) return [];
        return guests.filter((g) => {
            const fullName = g.full_name || `${g.name} ${g.last_name}`;
            const ci = g.identification_number || '';
            const query = guestQuery.toLowerCase();
            return fullName.toLowerCase().includes(query) || ci.includes(query);
        });
    }, [guests, guestQuery]);

    const selectGuest = (guest: Guest) => {
        setData('guest_id', guest.id.toString());
        setData('is_new_guest', false);
        setData('new_guest_name', '');
        setGuestQuery(guest.full_name || `${guest.name} ${guest.last_name}`);
        setIsGuestDropdownOpen(false);
    };

    // Totales
    const totalPerNight = data.details.reduce(
        (acc, item) => acc + Number(item.price),
        0,
    );
    const grandTotal = totalPerNight * Number(data.duration_days);

    const totalAdvancePayment = isCorporateToggle
        ? data.details.reduce(
              (sum, item) => sum + (Number(item._temp_advance_payment) || 0),
              0,
          )
        : Number(data.advance_payment);

    const balance = grandTotal - totalAdvancePayment;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // CORREGIDO: Validación numérica segura
        if (Number(data.guest_count) <= 0 || isNaN(Number(data.guest_count))) {
            alert('⚠️ Ingrese una cantidad de huéspedes válida.');
            return;
        }
        if (unassignedGuests > 0) {
            alert(
                `⚠️ Faltan acomodar ${unassignedGuests} personas en habitaciones.`,
            );
            return;
        }
        if (data.details.length === 0) {
            alert('⚠️ Debe agregar al menos una habitación.');
            return;
        }
        if (data.details.some((det) => !det.requested_bathroom)) {
            alert(
                '⚠️ El campo "Tipo de Baño" es obligatorio en todas las habitaciones agregadas.',
            );
            return;
        }
        if (isCorporateToggle && totalAdvancePayment <= 0) {
            alert(
                '⚠️ Las Reservas Corporativas exigen dejar un adelanto económico mayor a 0 sumando todas las habitaciones.',
            );
            return;
        }
        if (
            !isDelegation &&
            data.details.some((det) => !det.requested_bathroom)
        ) {
            alert(
                '⚠️ El campo "Tipo de Baño" es obligatorio para habitaciones sueltas.',
            );
            return;
        }

        transform((currentData) => ({
            ...currentData,
            guest_count: Number(currentData.guest_count),
            advance_payment: totalAdvancePayment,
            is_delegation: isDelegation,
            is_corporate: isCorporateToggle,
            details: currentData.details.map((det) => ({
                id: det.id, // Pasamos el ID para que actualice y no duplique al editar
                room_id: det.room_id,
                price_id: det.price_id,
                price: det.price,
                requested_room_type_id: det.requested_room_type_id,
                requested_bathroom: det.requested_bathroom,
            })),
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (reservationToEdit)
            put(`/reservas/${reservationToEdit.id}`, options);
        else post('/reservas', options);
    };

    // Drag to scroll horizontal
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const startDrag = (e: React.MouseEvent) => {
        setIsDragging(true);
        if (scrollContainerRef.current) {
            setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
            setScrollLeft(scrollContainerRef.current.scrollLeft);
        }
    };
    const stopDrag = () => setIsDragging(false);
    const onDrag = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in">
            <div className="flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                        <Building2 className="h-6 w-6 text-green-600" />
                        {reservationToEdit
                            ? 'Editar Requerimientos de Reserva'
                            : 'Nueva Reserva Inteligente'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-red-100 hover:text-red-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* ========================================================= */}
                    {/* COLUMNA IZQUIERDA (PANEL ADMINISTRATIVO COMPRIMIDO)       */}
                    {/* ========================================================= */}
                    <div className="flex w-1/3 flex-col justify-between space-y-4 overflow-y-auto border-r border-gray-200 bg-white p-4 lg:p-5">
                        <div className="space-y-3">
                            {/* Buscador */}
                            <div className="relative" ref={dropdownRef}>
                                <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                    Buscar Huésped (CI / Nombre)
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border border-gray-400 py-2 pl-10 text-sm font-bold text-gray-600 uppercase focus:border-green-500 focus:ring-green-500"
                                        value={guestQuery}
                                        onChange={(e) => {
                                            const val =
                                                e.target.value.toUpperCase();
                                            setGuestQuery(val);
                                            setIsGuestDropdownOpen(true);
                                            if (data.guest_id)
                                                setData('guest_id', '');
                                            setData('new_guest_name', val);
                                            setData('is_new_guest', true);
                                        }}
                                        onFocus={() => {
                                            if (guestQuery.length > 0)
                                                setIsGuestDropdownOpen(true);
                                        }}
                                    />
                                    {isGuestDropdownOpen &&
                                        filteredGuests.length > 0 && (
                                            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                                                {filteredGuests.map((g) => (
                                                    <div
                                                        key={g.id}
                                                        onClick={() =>
                                                            selectGuest(g)
                                                        }
                                                        className="cursor-pointer border-b px-4 py-2.5 transition-colors hover:bg-green-50"
                                                    >
                                                        <div className="text-sm font-bold text-gray-800 uppercase">
                                                            {g.full_name ||
                                                                `${g.name} ${g.last_name}`}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">
                                                            CI:{' '}
                                                            {g.identification_number ||
                                                                'S/N'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>
                            </div>

                            {/* Fechas y Personas */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                        Llegada
                                    </label>
                                    <input
                                        type="date"
                                        value={data.arrival_date}
                                        onChange={(e) =>
                                            setData(
                                                'arrival_date',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-xl border border-gray-400 py-1.5 text-center text-sm font-bold text-gray-600 focus:border-green-500 focus:ring-green-500 [&::-webkit-datetime-edit]:justify-center"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                        Noches
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.duration_days}
                                        onChange={(e) =>
                                            setData(
                                                'duration_days',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="[&::-webkit-outer-spin-button] w-full rounded-xl border border-gray-400 py-1.5 text-center text-sm font-bold text-gray-800 focus:border-green-500 focus:ring-green-500 [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                        Cantidad de Personas
                                    </label>
                                    <div className="relative">
                                        <Users className="absolute top-2 left-3 h-4 w-4 text-blue-500" />
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.guest_count}
                                            onChange={(e) =>
                                                handleGuestCountChange(
                                                    e.target.value,
                                                )
                                            }
                                            className="[&::-webkit-outer-spin-button] w-full rounded-xl border-blue-300 bg-blue-50 py-1.5 pl-9 text-lg font-black text-blue-900 focus:border-blue-500 focus:ring-blue-500 [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Botón Corporativo y Mensaje Delegación (Compacto en 1 sola fila) */}
                            <div className="flex min-h-[24px] items-center justify-between pt-1">
                                {/* Checkbox Corporativo */}
                                <label className="group flex cursor-pointer items-center gap-2 select-none">
                                    <input
                                        type="checkbox"
                                        checked={isCorporateToggle}
                                        onChange={() =>
                                            setIsCorporateToggle(
                                                !isCorporateToggle,
                                            )
                                        }
                                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 shadow-sm transition-colors focus:ring-indigo-500"
                                    />
                                    <span
                                        className={`flex items-center gap-1.5 text-[11px] font-black tracking-wide uppercase transition-colors ${isCorporateToggle ? 'text-indigo-800' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Banknote className="h-3.5 w-3.5" />{' '}
                                        Plan Corporativo
                                    </span>
                                </label>

                                {/* Alerta Delegación (Solo aparece si hay >= 20 personas Y corporativo está apagado) */}
                                {isDelegation && (
                                    <div className="flex animate-in items-center rounded-lg border border-blue-200 bg-blue-100 px-2 py-0.5 shadow-sm fade-in slide-in-from-right-2">
                                        <span className="text-[9px] font-black tracking-wide text-blue-800 uppercase">
                                            🏷️ Modo Delegación
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bloque Financiero Inferior */}
                        <div className="space-y-3 border-t border-gray-200 pt-4">
                            {!isCorporateToggle && (
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold text-gray-600 uppercase">
                                        Adelanto General (Bs)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={data.advance_payment}
                                        onChange={(e) =>
                                            setData(
                                                'advance_payment',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="text-md [&::-webkit-outer-spin-button] w-full rounded-xl border border-gray-400 py-1.5 text-center font-black text-gray-700 focus:border-green-500 focus:ring-green-500 [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            )}

                            <div className="flex rounded-lg bg-gray-100 p-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setData((prev) => ({
                                            ...prev,
                                            payment_type: 'EFECTIVO',
                                            qr_bank: '',
                                        }))
                                    }
                                    className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${data.payment_type === 'EFECTIVO' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    EFECTIVO
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setData('payment_type', 'QR')
                                    }
                                    className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${data.payment_type === 'QR' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    QR BANCARIO
                                </button>
                            </div>

                            {data.payment_type === 'QR' && (
                                <div className="mt-1.5 grid animate-in grid-cols-4 gap-1.5 fade-in slide-in-from-top-1">
                                    {[
                                        {
                                            id: 'YAPE',
                                            img: '/images/bancos/yape.png',
                                        },
                                        {
                                            id: 'FIE',
                                            img: '/images/bancos/fie.png',
                                        },
                                        {
                                            id: 'BNB',
                                            img: '/images/bancos/bnb.png',
                                        },
                                        {
                                            id: 'ECO',
                                            img: '/images/bancos/eco.png',
                                        },
                                    ].map((banco) => (
                                        <button
                                            key={banco.id}
                                            type="button"
                                            title={banco.id}
                                            onClick={() =>
                                                setData('qr_bank', banco.id)
                                            }
                                            className={`relative flex h-10 w-full items-center justify-center rounded-lg border p-1 transition-all duration-200 ${
                                                data.qr_bank === banco.id
                                                    ? 'z-10 scale-105 border-green-500 bg-green-50 shadow-sm'
                                                    : 'border-gray-200 bg-white opacity-70 grayscale-[30%] hover:border-gray-300 hover:bg-gray-50 hover:opacity-100 hover:grayscale-0'
                                            }`}
                                        >
                                            <img
                                                src={banco.img}
                                                alt={banco.id}
                                                className="h-full w-full object-contain"
                                            />

                                            {/* El icono de "Check" cuando está seleccionado */}
                                            {data.qr_bank === banco.id && (
                                                <div className="absolute -top-1.5 -right-1.5 rounded-full bg-green-500 text-white shadow-sm">
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
                                <div className="flex justify-between text-gray-500">
                                    <span>
                                        Subtotal ({data.duration_days} noches):
                                    </span>
                                    <span>{grandTotal.toFixed(2)} Bs</span>
                                </div>
                                {isCorporateToggle && (
                                    <div className="flex justify-between border-t pt-1.5 font-bold text-indigo-600">
                                        <span>Adelanto (Sumado):</span>
                                        <span>
                                            - {totalAdvancePayment.toFixed(2)}{' '}
                                            Bs
                                        </span>
                                    </div>
                                )}
                                <div className="text-md flex justify-between border-t pt-1.5 font-bold text-gray-800">
                                    <span>Saldo Restante:</span>
                                    <span
                                        className={
                                            balance > 0
                                                ? 'text-red-600'
                                                : 'text-green-600'
                                        }
                                    >
                                        {Math.max(0, balance).toFixed(2)} Bs
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* COLUMNA DERECHA (PIZARRA INTERACTIVA)                     */}
                    {/* ========================================================= */}
                    <div className="relative flex w-2/3 flex-col bg-gray-100">
                        {/* ZONA SUPERIOR: SALA DE ESPERA (DESAPARECEN Y CON SCROLL) */}
                        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-6 shadow-sm transition-all duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    {unassignedGuests > 0 ? (
                                        `Por Asignar (${unassignedGuests} personas)`
                                    ) : validGuestCount > 0 ? (
                                        <span className="flex animate-in items-center gap-1.5 text-green-600 fade-in">
                                            <CheckCircle className="h-4 w-4" />{' '}
                                            ¡Todos los huéspedes asignados a
                                            cuartos!
                                        </span>
                                    ) : (
                                        'Ingrese cantidad de huéspedes'
                                    )}
                                </h3>
                                {availabilityData && !isLoadingAvailability && (
                                    <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-[10px] font-bold text-gray-500">
                                        <Calendar className="h-3 w-3" /> Hoy
                                        libres:{' '}
                                        {availabilityData.currently_free} |
                                        Proyectadas al inicio:{' '}
                                        <span className="text-green-600">
                                            {availabilityData.total_available}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* CONTENEDOR GRID: SÓLO APARECE SI HAY PERSONAS SIN ASIGNAR */}
                            {unassignedGuests > 0 && validGuestCount > 0 && (
                                <div
                                    ref={scrollContainerRef}
                                    onMouseDown={startDrag}
                                    onMouseLeave={stopDrag}
                                    onMouseUp={stopDrag}
                                    onMouseMove={onDrag}
                                    className="mt-4 flex animate-in cursor-grab overflow-x-auto pb-2 select-none fade-in slide-in-from-top-2 active:cursor-grabbing"
                                    style={{
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                    }}
                                >
                                    <div
                                        className={`grid ${unassignedGuests > 12 ? 'grid-rows-2' : 'grid-rows-1'} auto-cols-max grid-flow-col gap-3 px-1`}
                                    >
                                        {Array.from({
                                            length: unassignedGuests,
                                        }).map((_, i) => (
                                            <div
                                                key={`wait-${i}`}
                                                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400 shadow-sm transition-transform hover:scale-110"
                                            >
                                                <User className="h-5 w-5" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ZONA INFERIOR: DISTRIBUCIÓN DE CAJAS */}
                        <div className="flex-1 space-y-4 overflow-y-auto p-6">
                            {/* Barra de Herramientas para Agregar - SE OCULTA SI ES CERO O YA ESTÁN TODOS ASIGNADOS */}
                            {/* Barra de Herramientas para Agregar */}
                            {unassignedGuests > 0 && validGuestCount > 0 && (
    <div className="mb-6 flex animate-in items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm zoom-in-95 fade-in flex-wrap md:flex-nowrap">
        
        {/* Selector principal de habitación */}
        <select
            id="roomSelector"
            className="flex-1 cursor-pointer border-0 bg-transparent px-4 py-2 text-sm font-bold text-gray-700 uppercase focus:ring-0"
        >
            <option value="" disabled selected>
                Elegir tipo de habitación a ocupar...
            </option>
            {uniqueRoomTypes.map((rt: any) => (
                <option key={rt.id} value={rt.id}>
                    {rt.name} (Entran: {getRoomCapacity(rt)} personas)
                </option>
            ))}
        </select>

        {/* Botón Insertar Normal */}
        <button
            type="button"
            onClick={addRoomBox}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-green-500 active:scale-95"
        >
            <Plus className="h-5 w-5" /> Insertar
        </button>

        {/* 👇 SECCIÓN MODO DELEGACIÓN (Auto-Agarrar) 👇 */}
        {isDelegation && (
            <div className="flex items-center gap-1 ml-auto border-l border-gray-200">
                
                {/* Selector de Filtro de Baño */}
                <select
                    value={autoAssignFilter}
                    onChange={(e) => setAutoAssignFilter(e.target.value as any)}
                    className="cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-0.5 py-2 text-xs font-bold text-indigo-800 uppercase shadow-sm transition-colors hover:bg-indigo-50 focus:border-indigo-500 focus:ring-indigo-500"
                    title="Filtrar tipo de baño para auto-asignación"
                >
                    <option value="ambos">Ambos</option>
                    <option value="private">Privado</option>
                    <option value="shared">Compartido</option>
                </select>

                {/* Botón de Acción Auto-Agarrar */}
                <button
                    type="button"
                    onClick={handleAutoAssign}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95"
                >
                    <Zap className="h-4 w-4" /> Auto-Asignar
                </button>
            </div>
        )}
    </div>
)}

                            {/* Cajas Dinámicas */}
                            {data.details.length === 0 && (
                                <div className="mt-4 flex h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 text-gray-400">
                                    <BedDouble className="mb-2 h-12 w-12 opacity-50" />
                                    <p className="text-sm font-medium">
                                        Aún no hay habitaciones en la reserva.
                                    </p>
                                </div>
                            )}

                            {/* CAJAS INTERACTIVAS (CORREGIDAS PARA PERMITIR EDITAR Y BORRAR) */}
                            {data.details.map((detail, index) => (
                                <div
                                    key={detail._temp_id || index}
                                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BedDouble className="h-5 w-5 text-indigo-500" />
                                            <span className="text-sm font-bold text-gray-800 uppercase">
                                                {detail.room_type?.name ||
                                                    detail._temp_room_name ||
                                                    'Habitación'}
                                            </span>
                                        </div>
                                        {/* Botón Borrar (Solo se muestra si no tiene un cuarto físico ya asignado, o si decides permitirlo siempre) */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeRoomBox(detail._temp_id)
                                            }
                                            className="rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="mt-1 flex items-center justify-between gap-4">
                                        {/* Seleccionador de Baño */}
                                        <div className="flex-1">
                                            <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">
                                                Tipo de Baño
                                            </label>
                                            <select
                                                value={
                                                    detail.requested_bathroom
                                                }
                                                onChange={(e) =>
                                                    updateDetailRow(
                                                        index,
                                                        'requested_bathroom',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-lg border-gray-300 py-1.5 text-xs font-bold text-gray-700 focus:border-green-500 focus:ring-green-500"
                                            >
                                                <option value="private">
                                                    Privado
                                                </option>
                                                <option value="shared">
                                                    Compartido
                                                </option>
                                                {isDelegation && (
                                                    <option value="compartido_sindesayuno">
                                                        Compartido S/Desayuno
                                                    </option>
                                                )}
                                            </select>
                                        </div>

                                        {/* Input Adelanto (Solo en Corporativo) */}
                                        {isCorporateToggle && (
                                            <div className="flex-1">
                                                <label className="mb-1 block text-[10px] font-bold text-indigo-500 uppercase">
                                                    Adelanto (Bs)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={
                                                        detail._temp_advance_payment ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        updateDetailRow(
                                                            index,
                                                            '_temp_advance_payment',
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="0.00"
                                                    className="w-full rounded-lg border-indigo-200 bg-indigo-50 py-1.5 text-xs font-bold text-indigo-800 focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>
                                        )}

                                        {/* Visualizador de Precio Final */}
                                        <div className="flex-1 text-right">
                                            <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">
                                                Precio / Noche
                                            </label>
                                            <div className="text-lg font-black text-blue-600">
                                                Bs. {detail.price}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Etiqueta de Habitación Físicamente Asignada */}
                                    {detail.room && (
                                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700">
                                            <CheckCircle className="h-4 w-4" />
                                            Asignada físicamente: Habitación{' '}
                                            {detail.room.number}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PIE DEL MODAL */}
                <div className="flex justify-end gap-3 border-t border-gray-200 bg-white p-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-gray-400 bg-white px-5 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={submit}
                        disabled={
                            unassignedGuests > 0 ||
                            processing ||
                            (isCorporateToggle && totalAdvancePayment <= 0)
                        }
                        className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
                            unassignedGuests === 0 &&
                            (!isCorporateToggle || totalAdvancePayment > 0) &&
                            data.details.length > 0
                                ? 'bg-green-600 text-white shadow-lg hover:-translate-y-0.5 hover:bg-green-500 active:scale-95'
                                : 'cursor-not-allowed bg-gray-200 text-gray-400'
                        }`}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />{' '}
                                Procesando...
                            </>
                        ) : unassignedGuests > 0 ? (
                            <>
                                <AlertCircle className="h-4 w-4" /> Acomoda{' '}
                                {unassignedGuests} personas para guardar
                            </>
                        ) : isCorporateToggle && totalAdvancePayment <= 0 ? (
                            <>
                                <AlertCircle className="h-4 w-4" /> Adelanto
                                obligatorio en corporativo
                            </>
                        ) : data.details.length === 0 ? (
                            <>
                                <AlertCircle className="h-4 w-4" /> Agregue
                                habitaciones
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" /> Guardar Reserva
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
