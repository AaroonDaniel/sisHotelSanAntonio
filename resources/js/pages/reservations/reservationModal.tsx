import { useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    Bath,
    BedDouble,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Info,
    Link as LinkIcon,
    Loader2,
    Save,
    Unlink,
    User,
    Users,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';

// --- INTERFACES ---
export interface Guest {
    id: number;
    name: string;
    last_name: string;
    full_name?: string;
    identification_number?: string;
    nationality?: string;
}

export interface Price {
    id: number;
    amount: number;
    bathroom_type: string;
}

export interface RoomType {
    id: number;
    name: string;
}

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
    room_id: string | null;
    price_id: string;
    price: number;
    requested_room_type_id: string; // 🚀 NUEVO: Lo que pide el cliente
    requested_bathroom: string;     // 🚀 NUEVO: El baño que pide el cliente

    _temp_pax_count?: number;
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
    details?: DetailItem[];
}

interface ReservationFormData {
    is_new_guest: boolean;
    guest_id: string;
    new_guest_name: string;
    new_guest_ci: string;
    guest_count: number;
    arrival_date: string;
    arrival_time: string;
    duration_days: number;
    advance_payment: number;
    payment_type: string;
    qr_bank: string;
    status: string;
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
    if ((filter === 'private' || filter === 'privado') && (db === 'private' || db === 'privado')) return true;
    if ((filter === 'shared' || filter === 'compartido') && (db === 'shared' || db === 'compartido')) return true;
    return false;
};

const getExactRoomPrice = (room: Room): Price | null => {
    if (room.price && !Array.isArray(room.price)) return room.price;
    if (room.prices && Array.isArray(room.prices)) {
        return room.prices.find((p) => p.id === room.price_id) || null;
    }
    return null;
};

// CONSTANTES CORPORATIVAS
const CORPORATE_MIN_GUESTS = 30;

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
    const [breaks, setBreaks] = useState<boolean[]>([]);

    // 🚀 ESTADOS PARA EL SEMÁFORO DE DISPONIBILIDAD
    const [availabilityData, setAvailabilityData] = useState<any>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

    const { data, setData, post, put, processing, reset, clearErrors } =
        useForm<ReservationFormData>({
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
            details: [],
        });

    // 🚀 EFECTO: Consulta la disponibilidad predictiva al cambiar la fecha
    useEffect(() => {
        if (show && data.arrival_date) {
            setIsLoadingAvailability(true);
            axios.get(`/api/reservations/availability?arrival_date=${data.arrival_date}`)
                .then(res => setAvailabilityData(res.data))
                .catch(err => console.error("Error consultando disponibilidad:", err))
                .finally(() => setIsLoadingAvailability(false));
        }
    }, [show, data.arrival_date]);

    // Lista única de Tipos de Habitación para los Selectores
    const uniqueRoomTypes = useMemo(() => {
        const map = new Map();
        rooms.forEach((r) => {
            const type = r.room_type;
            if (type && !map.has(type.id)) {
                map.set(type.id, type);
            }
        });
        return Array.from(map.values());
    }, [rooms]);

    useEffect(() => {
        if (show) {
            if (reservationToEdit) {
                // Modo Edición
                const mappedDetails: DetailItem[] = (reservationToEdit.details || []).map((det: any) => {
                    return {
                        room_id: det.room_id || null,
                        price_id: det.price_id ? det.price_id.toString() : '',
                        price: typeof det.price === 'object' ? Number(det.price.amount) : Number(det.price),
                        requested_room_type_id: det.requested_room_type_id?.toString() || '',
                        requested_bathroom: det.requested_bathroom || '',
                        _temp_pax_count: 1,
                    };
                });

                const totalRooms = mappedDetails.length;
                const totalGuests = reservationToEdit.guest_count;
                const newBreaks = new Array(Math.max(0, totalGuests - 1)).fill(false);
                if (totalRooms > 1 && totalGuests > 1) {
                    for (let i = 0; i < totalRooms - 1; i++) {
                        if (i < newBreaks.length) newBreaks[i] = true;
                    }
                }
                setBreaks(newBreaks);

                setData({
                    ...data,
                    is_new_guest: false,
                    guest_count: reservationToEdit.guest_count,
                    arrival_date: reservationToEdit.arrival_date,
                    arrival_time: reservationToEdit.arrival_time,
                    duration_days: reservationToEdit.duration_days,
                    status: reservationToEdit.status,
                    guest_id: reservationToEdit.guest_id.toString(),
                    details: mappedDetails,
                    advance_payment: reservationToEdit.advance_payment,
                    payment_type: reservationToEdit.payment_type || 'EFECTIVO',
                    qr_bank: reservationToEdit.qr_bank || '',
                });

                const currentGuest = guests.find((g) => g.id === reservationToEdit.guest_id);
                if (currentGuest) {
                    setGuestQuery(currentGuest.full_name || `${currentGuest.name} ${currentGuest.last_name}`);
                }
            } else {
                // Nueva Reserva Rápida
                reset();
                setGuestQuery('');
                setBreaks([]);
                setData((prev) => ({
                    ...prev,
                    guest_count: 1,
                    arrival_date: new Date().toISOString().split('T')[0],
                    details: [
                        {
                            room_id: null,
                            price_id: '',
                            price: 0,
                            requested_room_type_id: '',
                            requested_bathroom: '',
                            _temp_pax_count: 1,
                        },
                    ],
                }));
            }
            clearErrors();
            setIsGuestDropdownOpen(false);
        }
    }, [show, reservationToEdit, rooms]);

    // 🚀 LÓGICA DE PRECIOS AUTOMÁTICA
    // Calcula el precio basándose SÓLO en el tipo de habitación y baño solicitados
    const recalculatePrice = (typeId: string, bath: string, paxCount: number, isCorporate: boolean) => {
        if (!typeId || !bath) return { price: 0, priceId: '' };

        // Buscamos cualquier habitación que coincida con esos dos datos
        const matchingRoom = rooms.find(r => {
            const rType = r.room_type?.id?.toString() || r.room_type_id?.toString();
            const p = getExactRoomPrice(r);
            return rType === typeId && isMatchingBathroom(p?.bathroom_type, bath);
        });

        if (matchingRoom) {
            const p = getExactRoomPrice(matchingRoom);
            if (isCorporate) {
                const isPrivate = bath.toLowerCase() === 'private' || bath.toLowerCase() === 'privado';
                const rate = isPrivate ? 90 : 60;
                return { price: rate * paxCount, priceId: p!.id.toString() };
            } else {
                return { price: Number(p!.amount), priceId: p!.id.toString() };
            }
        }
        return { price: 0, priceId: '' };
    };

    const updateDetailRow = (index: number, field: keyof DetailItem, value: any) => {
        const newDetails = [...data.details];
        const isCorporate = data.guest_count >= 30;

        // @ts-ignore
        newDetails[index][field] = value;

        // Al cambiar tipo de habitación o baño, recalculamos el precio de esa fila
        if (field === 'requested_room_type_id' || field === 'requested_bathroom') {
            const typeId = newDetails[index].requested_room_type_id;
            const bath = newDetails[index].requested_bathroom;
            
            // Si es corporativo y cambió el baño, forzamos el baño en todas las filas
            if (isCorporate && field === 'requested_bathroom') {
                newDetails.forEach((det, i) => {
                    det.requested_bathroom = value;
                    const res = recalculatePrice(det.requested_room_type_id, value, det._temp_pax_count || 1, true);
                    det.price = res.price;
                    det.price_id = res.priceId;
                });
            } else {
                const res = recalculatePrice(typeId, bath, newDetails[index]._temp_pax_count || 1, isCorporate);
                newDetails[index].price = res.price;
                newDetails[index].price_id = res.priceId;
            }
        }
        
        setData('details', newDetails);
    };

    const handleGuestCountChange = (newCount: number) => {
        const validCount = Math.max(1, newCount);
        const newBreaks = new Array(Math.max(0, validCount - 1)).fill(true);
        for (let i = 0; i < Math.min(breaks.length, newBreaks.length); i++) {
            newBreaks[i] = breaks[i];
        }
        setBreaks(newBreaks);

        setData((prev) => {
            const groups: number[] = [];
            let currentGroupSize = 1;
            for (let i = 0; i < newBreaks.length; i++) {
                if (newBreaks[i]) {
                    groups.push(currentGroupSize);
                    currentGroupSize = 1;
                } else {
                    currentGroupSize++;
                }
            }
            groups.push(currentGroupSize);

            const isCorporate = validCount >= 30;
            const forcedBath = isCorporate ? prev.details.find((d) => d.requested_bathroom)?.requested_bathroom || '' : '';

            const newDetails: DetailItem[] = groups.map((groupSize, index) => {
                const existing = prev.details[index];
                let newBath = existing ? existing.requested_bathroom : '';
                let newType = existing ? existing.requested_room_type_id : '';
                
                if (isCorporate && forcedBath) newBath = forcedBath;

                const res = recalculatePrice(newType, newBath, groupSize, isCorporate);

                return {
                    room_id: null, // Siempre nulo en la vista de venta
                    price_id: res.priceId,
                    price: res.price,
                    requested_bathroom: newBath,
                    requested_room_type_id: newType,
                    _temp_pax_count: groupSize,
                };
            });
            return { ...prev, guest_count: validCount, details: newDetails };
        });
    };

    const toggleBreak = (index: number) => {
        const newBreaks = [...breaks];
        newBreaks[index] = !newBreaks[index];
        setBreaks(newBreaks);

        setData((prev) => {
            const groups: number[] = [];
            let currentGroupSize = 1;
            for (let i = 0; i < newBreaks.length; i++) {
                if (newBreaks[i]) {
                    groups.push(currentGroupSize);
                    currentGroupSize = 1;
                } else {
                    currentGroupSize++;
                }
            }
            groups.push(currentGroupSize);

            const isCorporate = prev.guest_count >= 30;

            const newDetails: DetailItem[] = groups.map((groupSize, idx) => {
                const existing = prev.details[idx];
                const newBath = existing ? existing.requested_bathroom : '';
                const newType = existing ? existing.requested_room_type_id : '';
                
                const res = recalculatePrice(newType, newBath, groupSize, isCorporate);

                return {
                    room_id: null,
                    price_id: res.priceId,
                    price: res.price,
                    requested_bathroom: newBath,
                    requested_room_type_id: newType,
                    _temp_pax_count: groupSize,
                };
            });
            return { ...prev, details: newDetails };
        });
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

    const totalPerNight = data.details.reduce((acc, item) => acc + Number(item.price), 0);
    const grandTotal = totalPerNight * Number(data.duration_days);
    const balance = grandTotal - Number(data.advance_payment);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (data.payment_type === 'QR' && data.advance_payment > 0 && !data.qr_bank) {
            alert('Seleccione un banco para el pago QR.');
            return;
        }

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (reservationToEdit) put(`/reservas/${reservationToEdit.id}`, options);
        else post('/reservas', options);
    };

    if (!show) return null;

    return (
         <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="flex h-[76vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* CABECERA */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Calendar className="h-5 w-5" />
                        </div>
                        {reservationToEdit ? 'Editar Requerimientos' : 'Reserva Rápida (Recepción)'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form id="reservation-form" onSubmit={submit} className="flex-1 overflow-y-auto bg-white p-6">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                        
                        {/* ==================================================== */}
                        {/* COLUMNA IZQUIERDA (DATOS HUÉSPED Y FECHAS)           */}
                        {/* ==================================================== */}
                        <div className="space-y-4 lg:col-span-4">
                            <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm" ref={dropdownRef}>
                                <label className="mb-3 block border-b border-red-100 pb-2 text-center text-base font-bold tracking-wide text-red-700 uppercase">
                                    1. DATO DEL HUESPED
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
                                        value={guestQuery}
                                        onChange={(e) => {
                                            const newValue = e.target.value.toUpperCase();
                                            setGuestQuery(newValue);
                                            setIsGuestDropdownOpen(true);
                                            if (data.guest_id) setData('guest_id', '');
                                            setData('new_guest_name', newValue);
                                            setData('is_new_guest', true);
                                        }}
                                        onFocus={() => { if (guestQuery.length > 0) setIsGuestDropdownOpen(true); }}
                                        autoComplete="off"
                                    />
                                    {isGuestDropdownOpen && filteredGuests.length > 0 && (
                                        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                            {filteredGuests.map((g) => (
                                                <div
                                                    key={g.id}
                                                    onClick={() => selectGuest(g)}
                                                    className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm transition-colors hover:bg-green-50"
                                                >
                                                    <div className="font-bold text-gray-800 uppercase">
                                                        {g.full_name || `${g.name} ${g.last_name}`}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5">CI: {g.identification_number || 'S/N'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {data.is_new_guest && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">CI / DNI</label>
                                        <input
                                            type="text"
                                            value={data.new_guest_ci}
                                            onChange={(e) => setData('new_guest_ci', e.target.value)}
                                            className="w-full rounded-xl border border-gray-400 px-3 py-2 text-sm focus:border-green-500 focus:ring-green-500"
                                            placeholder="Número de Documento"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <label className="mb-3 block border-b border-gray-100 pb-2 text-center text-sm font-bold tracking-wide text-gray-700 uppercase">
                                    2. FECHAS Y ESTADÍA
                                </label>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">Llegada</label>
                                        <div className="relative">
                                            <Calendar className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-gray-400" />
                                            <input
                                                type="date"
                                                value={data.arrival_date}
                                                onChange={(e) => setData('arrival_date', e.target.value)}
                                                className="w-full rounded-xl border border-gray-400 bg-white py-2 pl-10 text-sm text-gray-800 focus:ring-green-500 focus:border-green-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">Hora Aprox.</label>
                                        <div className="relative">
                                            <Clock className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-gray-400" />
                                            <input
                                                type="time"
                                                value={data.arrival_time}
                                                onChange={(e) => setData('arrival_time', e.target.value)}
                                                className="w-full rounded-xl border border-gray-400 py-2 pl-10 text-sm text-gray-800 focus:border-green-500 focus:ring-green-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">Estancia (Noches)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.duration_days}
                                            onChange={(e) => setData('duration_days', Number(e.target.value))}
                                            className="w-full rounded-xl border border-gray-400 py-2 text-center text-sm font-bold text-gray-800 focus:border-green-500 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 flex justify-between text-xs font-bold text-gray-500 uppercase">
                                            <span>Cant. Personas</span>
                                            {data.guest_count >= CORPORATE_MIN_GUESTS && (
                                                <span className="animate-in rounded bg-purple-100 px-1.5 py-0.5 text-[9px] text-purple-700 fade-in">
                                                    CORPORATIVO
                                                </span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <Users className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-gray-400" />
                                            <input
                                                type="number"
                                                min="1"
                                                value={data.guest_count}
                                                onChange={(e) => handleGuestCountChange(Number(e.target.value))}
                                                className="w-full rounded-xl border border-gray-400 py-2 pl-10 text-sm font-bold text-gray-900 focus:border-gray-500 focus:ring-gray-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* BLOQUE VISUAL DE DISTRIBUCIÓN DE CAMAS */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-800 uppercase">
                                    <Info className="h-4 w-4 text-blue-500" /> Distribución de Huéspedes
                                </h3>
                                <p className="text-[10px] text-gray-500 mb-3 leading-tight">
                                    Agrupa a los huéspedes para indicar cuántas habitaciones se crearán.
                                </p>
                                <div className="space-y-2">
                                    {(() => {
                                        const visualBlocks = [];
                                        let currentBlock: number[] = [];
                                        for (let i = 0; i < data.guest_count; i++) {
                                            currentBlock.push(i);
                                            if (breaks[i] && i < data.guest_count - 1) {
                                                visualBlocks.push(currentBlock);
                                                currentBlock = [];
                                            }
                                        }
                                        if (currentBlock.length > 0) visualBlocks.push(currentBlock);
                                        const renderedElements: any[] = [];
                                        let accumulatedSingles: number[][] = [];
                                        
                                        visualBlocks.forEach((block, blockIndex) => {
                                            if (block.length > 1) {
                                                if (accumulatedSingles.length > 0) {
                                                    renderedElements.push(
                                                        <div key={`grid-${blockIndex}`} className="flex flex-wrap justify-start gap-1 rounded-lg border border-blue-100 bg-white p-2">
                                                            {accumulatedSingles.map((singleGroup) => (
                                                                <div key={singleGroup[0]} className="flex items-center">
                                                                    <div className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-[10px] font-bold transition-all hover:bg-green-100 ${singleGroup[0] === 0 ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                                                                        {singleGroup[0] + 1}
                                                                    </div>
                                                                    <button type="button" onClick={() => toggleBreak(singleGroup[0])} className="mx-0.5 text-gray-300 transition-colors hover:text-green-500">
                                                                        <LinkIcon className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                    accumulatedSingles = [];
                                                }
                                                renderedElements.push(
                                                    <div key={`row-${blockIndex}`} className="flex w-full animate-in flex-col items-center fade-in slide-in-from-left-2">
                                                        {blockIndex > 0 && (
                                                            <div className="relative my-0.5 flex h-4 w-0.5 items-center justify-center bg-gray-300">
                                                                <button type="button" onClick={() => toggleBreak(block[0] - 1)} className="absolute z-10 rounded-full border border-gray-300 bg-white p-0.5 shadow-sm hover:border-green-500 hover:text-green-600">
                                                                    <LinkIcon className="h-2 w-2" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="relative flex w-full flex-wrap items-center justify-start gap-2 rounded-lg border border-blue-200 bg-white p-2 shadow-sm">
                                                            <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-lg bg-green-500"></div>
                                                            <span className="ml-2 text-[9px] font-bold text-gray-400">HAB {blockIndex + 1}</span>
                                                            {block.map((guestIdx, localIdx) => (
                                                                <div key={guestIdx} className="flex items-center">
                                                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${guestIdx === 0 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                                        {guestIdx + 1}
                                                                    </div>
                                                                    {localIdx < block.length - 1 && (
                                                                        <div className="mx-1">
                                                                            <button type="button" onClick={() => toggleBreak(guestIdx)} className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-green-400 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500">
                                                                                <Unlink className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                accumulatedSingles.push(block);
                                            }
                                        });
                                        if (accumulatedSingles.length > 0) {
                                            renderedElements.push(
                                                <div key="grid-last" className="flex w-full flex-col">
                                                    {renderedElements.length > 0 && (
                                                        <div className="relative my-0.5 flex h-4 w-full justify-center">
                                                            <div className="h-full w-0.5 bg-gray-300"></div>
                                                            <button type="button" onClick={() => toggleBreak(accumulatedSingles[0][0] - 1)} className="absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-0.5 shadow-sm hover:border-green-500 hover:text-green-600">
                                                                <LinkIcon className="h-2 w-2" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="flex min-h-[50px] flex-wrap justify-start gap-1.5 rounded-lg border border-blue-100 bg-white p-2">
                                                        {accumulatedSingles.map((singleGroup) => {
                                                            const guestIdx = singleGroup[0];
                                                            const isLastAbsolute = guestIdx === data.guest_count - 1;
                                                            return (
                                                                <div key={guestIdx} className="flex items-center">
                                                                    <div className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-[10px] font-bold transition-all hover:bg-green-500 ${guestIdx === 0 ? 'border-green-600 bg-green-600 text-white' : 'border-green-500 bg-green-50 text-green-500'}`}>
                                                                        {guestIdx + 1}
                                                                    </div>
                                                                    {!isLastAbsolute && (
                                                                        <button type="button" onClick={() => toggleBreak(guestIdx)} className="mx-0.5 p-0.5 text-green-300 transition-all hover:scale-125 hover:text-green-500">
                                                                            <LinkIcon className="h-3 w-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return renderedElements;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* ==================================================== */}
                        {/* COLUMNA DERECHA (EL SEMÁFORO Y REQUISITOS)           */}
                        {/* ==================================================== */}
                        <div className="flex h-full flex-col space-y-4 lg:col-span-8">
                            
                            {/* 1. EL SEMÁFORO PREDICTIVO (EL ARGUMENTO DEL RECEPCIONISTA) */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <Calendar className="w-16 h-16" />
                                </div>
                                <h3 className="text-gray-700 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                    Panorama para el {new Date(data.arrival_date + 'T00:00:00').toLocaleDateString()}
                                </h3>

                                {isLoadingAvailability ? (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                    </div>
                                ) : availabilityData ? (
                                    <div className="space-y-4">
                                        {/* Evaluador visual inteligente */}
                                        {(() => {
                                            const requestedRooms = data.details.length;
                                            const availableRooms = availabilityData.total_available;
                                            const isAvailable = requestedRooms <= availableRooms;
                                            const missingRooms = requestedRooms - availableRooms;

                                            return (
                                                <div className={`p-4 rounded-xl border-2 flex items-start gap-4 transition-all ${isAvailable ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50 shadow-inner'}`}>
                                                    <div className={`p-2 rounded-full mt-0.5 ${isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        {isAvailable ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className={`font-black text-sm uppercase tracking-wide ${isAvailable ? 'text-green-700' : 'text-red-700'}`}>
                                                            {isAvailable ? '¡Espacio Disponible!' : 'Capacidad Insuficiente'}
                                                        </h4>
                                                        
                                                        {isAvailable ? (
                                                            <p className="text-xs text-green-700 mt-1 font-medium">
                                                                El hotel tiene {availableRooms} habitaciones y el cliente pide {requestedRooms}. Puede proceder con la reserva con total seguridad.
                                                            </p>
                                                        ) : (
                                                            <div className="mt-2 space-y-1">
                                                                <p className="text-xs text-red-700 font-bold">
                                                                    No podemos cumplir la petición por completo.
                                                                </p>
                                                                <ul className="text-[11px] text-red-600 list-disc list-inside ml-2">
                                                                    <li>El cliente solicita: <b>{requestedRooms} habitaciones</b>.</li>
                                                                    <li>Solo tenemos: <b>{availableRooms} libres</b> proyectadas para esa fecha.</li>
                                                                    <li>Faltan: <b className="underline">{missingRooms} habitaciones</b>.</li>
                                                                </ul>
                                                                <p className="text-[10px] text-red-500 italic mt-2 bg-red-100 p-2 rounded-md">
                                                                    💡 Sugerencia al huésped: "Señor, para esa fecha el hotel estará muy lleno, solo me quedan {availableRooms} habitaciones. ¿Desea acomodarse en esas o cambiamos de fecha?"
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="grid grid-cols-3 gap-2 text-center mt-2">
                                            <div className="bg-white rounded-lg p-2 border border-gray-200">
                                                <span className="block text-[9px] uppercase font-bold text-gray-400">Libres Hoy</span>
                                                <span className="text-xl font-black text-gray-700">{availabilityData.currently_free}</span>
                                            </div>
                                            <div className="bg-white rounded-lg p-2 border border-gray-200">
                                                <span className="block text-[9px] uppercase font-bold text-gray-400">Saldrán para esa fecha</span>
                                                <span className="text-xl font-black text-gray-700">{availabilityData.will_be_freed}</span>
                                            </div>
                                            <div className="bg-purple-700 rounded-lg p-2 text-white shadow-sm">
                                                <span className="block text-[9px] uppercase font-bold text-purple-200">Total Proyectado</span>
                                                <span className="text-xl font-black">{availabilityData.total_available}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs font-medium text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                                        Selecciona una Fecha de Llegada válida para evaluar el calendario del hotel.
                                    </div>
                                )}
                            </div>

                            {/* 2. REQUISITOS DEL CLIENTE (SIN CUARTOS ASIGNADOS) */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mt-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase">
                                    <BedDouble className="h-5 w-5 text-blue-500" />
                                    3. Requisitos de la Reserva
                                </h3>
                                <div className="text-[10px] font-medium text-gray-400">
                                    {data.details.length} Requisito(s) de Habitación
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500">
                                Seleccione qué tipo de baño y habitación desea el huésped. El sistema calculará el precio, y usted le asignará el cuarto específico a su llegada en la pestaña de Recepción.
                            </p>

                            <div className="max-h-[250px] flex-1 space-y-3 overflow-y-auto p-1">
                                {data.details.map((detail, index) => (
                                    <div key={index} className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md animate-in fade-in slide-in-from-right-2">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                                                    {index + 1}
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 uppercase">
                                                    Para {detail._temp_pax_count} persona(s)
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                {/* 1. TIPO DE BAÑO */}
                                                <div>
                                                    <label className="mb-1 block text-[9px] font-bold text-gray-400 uppercase">Tipo de Baño</label>
                                                    <div className="relative">
                                                        <Bath className="absolute top-2 left-2 h-3.5 w-3.5 text-gray-400" />
                                                        <select
                                                            value={detail.requested_bathroom || ''}
                                                            onChange={(e) => updateDetailRow(index, 'requested_bathroom', e.target.value)}
                                                            className="w-full rounded-lg border-gray-300 py-1.5 pl-8 text-xs font-bold text-gray-700 uppercase focus:border-blue-500 focus:ring-blue-500"
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            <option value="private">Privado</option>
                                                            <option value="shared">Compartido</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* 2. TIPO DE HABITACIÓN */}
                                                <div>
                                                    <label className="mb-1 block text-[9px] font-bold text-gray-400 uppercase">Tipo de Hab.</label>
                                                    <div className="relative">
                                                        <select
                                                            value={detail.requested_room_type_id || ''}
                                                            onChange={(e) => updateDetailRow(index, 'requested_room_type_id', e.target.value)}
                                                            className="w-full rounded-lg border-gray-300 py-1.5 text-xs font-bold text-gray-700 uppercase focus:border-blue-500 focus:ring-blue-500"
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            {uniqueRoomTypes.map((type: any) => (
                                                                <option key={type.id} value={type.id}>{type.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* 3. PRECIO AUTOMÁTICO */}
                                                <div>
                                                    <label className="mb-1 block text-[9px] font-bold text-gray-400 uppercase">Precio Automático</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute top-2 left-2 h-3.5 w-3.5 text-green-600" />
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={detail.price > 0 ? detail.price : ''}
                                                            className={`w-full cursor-not-allowed rounded-lg py-1.5 pl-8 text-xs font-bold focus:ring-0 ${detail.price > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                                                            placeholder="0.00 Bs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 3. BLOQUE DE PAGO INFERIOR */}
                            <div className="mt-auto rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                <div className="flex flex-col gap-6 md:flex-row">
                                    <div className="relative -top-3 -mt-4 flex flex-1 animate-in flex-col gap-2 pt-6 duration-300 fade-in slide-in-from-top-2">
                                        <div className="flex gap-2">
                                            <div className="w-1/2">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">Método de Adelanto</label>
                                                <div className="flex rounded-lg bg-gray-200 p-0.5">
                                                    <button type="button" onClick={() => setData((prev) => ({ ...prev, payment_type: 'EFECTIVO', qr_bank: '' }))} className={`flex-1 rounded py-1 text-[9px] font-bold transition-all ${data.payment_type === 'EFECTIVO' ? 'bg-white text-green-700 shadow-sm ring-1 ring-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
                                                        EFECTIVO
                                                    </button>
                                                    <button type="button" onClick={() => setData('payment_type', 'QR')} className={`flex-1 rounded py-1 text-[9px] font-bold transition-all ${data.payment_type === 'QR' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
                                                        QR
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="w-1/2">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">Monto de Adelanto</label>
                                                <div className="relative">
                                                    <span className={`absolute inset-y-0 left-2 flex items-center text-[10px] font-bold ${data.advance_payment > 0 ? 'text-green-600' : 'text-gray-400'}`}>Bs</span>
                                                    <input type="number" step="0.50" min="0" value={data.advance_payment} onChange={(e) => setData('advance_payment', Number(e.target.value))} className="w-full rounded-lg border border-gray-400 py-1 pl-6 text-xs font-black text-gray-800 focus:border-green-500 focus:ring-green-500" placeholder="0.00" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`border-t border-gray-200 pt-1.5 transition-all duration-300 ${data.payment_type === 'QR' ? 'visible opacity-100' : 'invisible h-0 overflow-hidden opacity-0'}`}>
                                            <div className="mb-1 flex items-center justify-between">
                                                {data.qr_bank && (<span className="rounded bg-purple-100 px-1 text-[8px] font-bold text-purple-700">{data.qr_bank}</span>)}
                                            </div>
                                            <div className="grid grid-cols-4 gap-1">
                                                {[
                                                    { id: 'YAPE', label: 'YAPE', color: 'border-green-200 bg-green-50 text-green-700' },
                                                    { id: 'FIE', label: 'FIE', color: 'border-orange-200 bg-orange-50 text-orange-700' },
                                                    { id: 'BNB', label: 'BNB', color: 'border-blue-200 bg-blue-50 text-blue-700' },
                                                    { id: 'ECO', label: 'ECO', color: 'border-yellow-200 bg-yellow-50 text-yellow-700' },
                                                ].map((banco) => (
                                                    <button key={banco.id} type="button" onClick={() => setData('qr_bank', banco.id)} className={`rounded border px-0.5 py-1 text-[8px] font-bold transition-all active:scale-95 ${data.qr_bank === banco.id ? `ring-1 ring-purple-500 ring-offset-0 ${banco.color} scale-105 shadow-sm brightness-95` : `border-gray-300 bg-white text-gray-500 hover:bg-gray-100`}`}>
                                                        {banco.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col justify-center space-y-1 border-l border-gray-300 pl-6">
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Subtotal Noche:</span>
                                            <span>{totalPerNight} Bs</span>
                                        </div>
                                        <div className="flex justify-between text-base font-bold text-gray-800">
                                            <span>Total ({data.duration_days} noches):</span>
                                            <span>{grandTotal} Bs</span>
                                        </div>
                                        <div className="mt-1 flex justify-between border-t border-gray-300 pt-1 text-sm font-bold text-red-600">
                                            <span>Saldo Pendiente:</span>
                                            <span>{balance > 0 ? balance : 0} Bs</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100">
                            Cancelar
                        </button>
                        <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-blue-500 active:scale-95 disabled:opacity-50">
                            {processing ? 'Guardando...' : (
                                <>
                                    <Save className="h-4 w-4" /> {reservationToEdit ? 'Actualizar Requisitos' : 'Guardar Reserva'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}