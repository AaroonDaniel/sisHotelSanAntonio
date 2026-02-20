import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Bath,
    BedDouble,
    Calendar,
    Clock,
    DollarSign,
    Info,
    Link as LinkIcon,
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
    prices?: Price[];
    room_type?: RoomType;
    room_type_id?: number;
}

export interface DetailItem {
    room_id: string;
    price_id: string;
    price: number;

    // Datos opcionales que vienen del backend al editar
    room?: {
        id: number;
        number: string;
        room_type?: { id: number; name: string };
        room_type_id?: number;
    };
    price_relation?: Price;

    // Temporales para el frontend
    _temp_pax_count?: number;
    _temp_bathroom_filter?: string;
    _temp_room_type_id?: string;
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

// Interface explícita para useForm
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
    observation: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    reservationToEdit?: Reservation | null;
    guests: Guest[];
    rooms: Room[];
}

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
            observation: '',
        });

    // Filtramos tipos de habitación disponibles basados en las habitaciones LIBRES
    const availableRoomTypes = useMemo(() => {
        const types = new Map();
        // Mapeamos tipos de todas las habitaciones que nos envió el backend
        // (El backend ya filtra available + reserved)
        rooms.forEach((room) => {
            if (room.room_type) {
                types.set(room.room_type.id, room.room_type);
            }
        });
        return Array.from(types.values());
    }, [rooms]);

    useEffect(() => {
        if (show) {
            if (reservationToEdit) {
                // LOGICA DE REHIDRATACIÓN
                const mappedDetails: DetailItem[] = (
                    reservationToEdit.details || []
                ).map((det: any) => {
                    // Recuperamos objetos anidados
                    const priceObj = det.price || det.price_relation;
                    const roomObj = det.room;

                    // Extraemos valores para los selectores
                    const bathroomType = priceObj?.bathroom_type || '';
                    const roomTypeId =
                        roomObj?.room_type?.id?.toString() ||
                        roomObj?.room_type_id?.toString() ||
                        '';

                    const finalPrice =
                        typeof det.price === 'object'
                            ? Number(det.price.amount)
                            : Number(det.price);

                    return {
                        room_id: det.room_id.toString(),
                        price_id: det.price_id ? det.price_id.toString() : '',
                        price: finalPrice,
                        _temp_pax_count: 1,
                        // Establecemos los filtros para que los selectores muestren el valor correcto
                        _temp_bathroom_filter: bathroomType,
                        _temp_room_type_id: roomTypeId,
                    };
                });

                // Calculamos grupos visuales
                const totalRooms = mappedDetails.length;
                const totalGuests = reservationToEdit.guest_count;
                const newBreaks = new Array(Math.max(0, totalGuests - 1)).fill(
                    false,
                );
                if (totalRooms > 1 && totalGuests > 1) {
                    // Si hay múltiples habitaciones, intentamos sugerir separación visual básica
                    for (let i = 0; i < totalRooms - 1; i++) {
                        if (i < newBreaks.length) newBreaks[i] = true;
                    }
                }
                setBreaks(newBreaks);

                setData({
                    is_new_guest: false,
                    new_guest_name: '',
                    new_guest_ci: '',
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
                    observation: '',
                });

                const currentGuest = guests.find(
                    (g) => g.id === reservationToEdit.guest_id,
                );
                if (currentGuest) {
                    setGuestQuery(
                        currentGuest.full_name ||
                            `${currentGuest.name} ${currentGuest.last_name}`,
                    );
                }
            } else {
                reset();
                setGuestQuery('');
                setBreaks([]);
                setData((prev) => ({
                    ...prev,
                    guest_count: 1,
                    arrival_date: new Date().toISOString().split('T')[0],
                    details: [
                        {
                            room_id: '',
                            price_id: '',
                            price: 0,
                            _temp_pax_count: 1,
                            _temp_bathroom_filter: '',
                            _temp_room_type_id: '',
                        },
                    ],
                }));
            }
            clearErrors();
            setIsGuestDropdownOpen(false);
        }
    }, [show, reservationToEdit]);

    // ... Funciones handleGuestCountChange, toggleBreak, recalculateDetails, filteredGuests, selectGuest (se mantienen igual) ...
    // Para abreviar, incluyo solo las que cambian o son críticas.

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

            const newDetails: DetailItem[] = groups.map((groupSize, index) => {
                const existing = prev.details[index];
                return {
                    room_id: existing ? existing.room_id : '',
                    price_id: existing ? existing.price_id : '',
                    price: existing ? existing.price : 0,
                    _temp_bathroom_filter: existing
                        ? existing._temp_bathroom_filter
                        : '',
                    _temp_room_type_id: existing
                        ? existing._temp_room_type_id
                        : '',
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

            const newDetails: DetailItem[] = groups.map((groupSize, idx) => {
                const existing = prev.details[idx];
                return {
                    room_id: existing ? existing.room_id : '',
                    price_id: existing ? existing.price_id : '',
                    price: existing ? existing.price : 0,
                    _temp_bathroom_filter: existing
                        ? existing._temp_bathroom_filter
                        : '',
                    _temp_room_type_id: existing
                        ? existing._temp_room_type_id
                        : '',
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

    const updateDetailRow = (index: number, field: keyof DetailItem, value: any) => {
    const newDetails = [...data.details];
    // @ts-ignore
    newDetails[index][field] = value;

    if (field === '_temp_bathroom_filter') {
        newDetails[index]._temp_room_type_id = '';
        newDetails[index].room_id = '';
        newDetails[index].price_id = '';
        newDetails[index].price = 0;
    } else if (field === '_temp_room_type_id') {
        newDetails[index].room_id = '';
        newDetails[index].price_id = '';
        newDetails[index].price = 0;
    } else if (field === 'room_id') {
        const roomId = value as string;
        // Normalizamos el tipo de baño a minúsculas para la comparación
        const bathroomType = newDetails[index]._temp_bathroom_filter?.toLowerCase();
        const room = rooms.find(r => r.id.toString() === roomId);
        
        if (room && bathroomType) {
            const availablePrices = room.prices || (room.room_type as any)?.prices || [];
            const priceObj = availablePrices.find((p: any) => p.bathroom_type?.toLowerCase() === bathroomType);
            
            if (priceObj) {
                newDetails[index].price_id = priceObj.id.toString();
                newDetails[index].price = Number(priceObj.amount);
            }
        }
    }
    setData('details', newDetails);
};

    const totalPerNight = data.details.reduce(
        (acc, item) => acc + Number(item.price),
        0,
    );
    const grandTotal = totalPerNight * Number(data.duration_days);
    const balance = grandTotal - Number(data.advance_payment);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (
            data.payment_type === 'QR' &&
            data.advance_payment > 0 &&
            !data.qr_bank
        ) {
            alert('Seleccione un banco para el pago QR.');
            return;
        }

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
            onError: (err: any) => console.error(err),
        };

        if (reservationToEdit)
            put(`/reservas/${reservationToEdit.id}`, options);
        else post('/reservas', options);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="flex max-h-[80vh] w-full max-w-6xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* HEADER */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Calendar className="h-5 w-5" />
                        </div>
                        {reservationToEdit ? 'Editar Reserva' : 'Nueva Reserva'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* BODY */}
                <form
                    id="reservation-form"
                    onSubmit={submit}
                    className="flex-1 overflow-y-auto bg-white p-6"
                >
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                        {/* COLUMNA IZQUIERDA (Igual que antes) */}
                        <div className="space-y-2 lg:col-span-4">
                            <div
                                className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                ref={dropdownRef}
                            >
                                <label className="mb-3 block border-b border-red-100 pb-2 text-center text-base font-bold tracking-wide text-red-700 uppercase">
                                    DATO DEL HUESPED
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
                                            const newValue =
                                                e.target.value.toUpperCase();
                                            setGuestQuery(newValue);
                                            setIsGuestDropdownOpen(true);
                                            if (data.guest_id)
                                                setData('guest_id', '');
                                            setData('new_guest_name', newValue);
                                            setData('is_new_guest', true);
                                        }}
                                        onFocus={() => {
                                            if (guestQuery.length > 0)
                                                setIsGuestDropdownOpen(true);
                                        }}
                                        autoComplete="off"
                                    />
                                    {isGuestDropdownOpen &&
                                        filteredGuests.length > 0 && (
                                            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                {filteredGuests.map((g) => (
                                                    <div
                                                        key={g.id}
                                                        onClick={() =>
                                                            selectGuest(g)
                                                        }
                                                        className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-green-50"
                                                    >
                                                        <div className="font-bold text-gray-800 uppercase">
                                                            {g.full_name ||
                                                                `${g.name} ${g.last_name}`}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span className="rounded bg-gray-100 px-1.5 py-0.5">
                                                                CI:{' '}
                                                                {g.identification_number ||
                                                                    'S/N'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>
                                {data.is_new_guest && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                            CI / DNI
                                        </label>
                                        <input
                                            type="text"
                                            value={data.new_guest_ci}
                                            onChange={(e) =>
                                                setData(
                                                    'new_guest_ci',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-xl border border-gray-400 px-3 py-2 text-sm focus:border-green-500 focus:ring-green-500"
                                            placeholder="Número de Documento"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-gray-100"></div>
                            {/* FECHAS Y ESTADÍA */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                            Llegada
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-gray-400" />
                                            <input
                                                type="date"
                                                disabled
                                                value={data.arrival_date}
                                                className="w-full cursor-not-allowed rounded-xl border border-gray-400 bg-gray-100 py-2 pl-10 text-sm text-gray-600 focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                            Hora Aprox.
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-gray-400" />
                                            <input
                                                type="time"
                                                value={data.arrival_time}
                                                onChange={(e) =>
                                                    setData(
                                                        'arrival_time',
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full rounded-xl border border-gray-400 py-2 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                            Estancia
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
                                            className="w-full rounded-xl border border-gray-400 py-2 text-center text-sm font-bold text-black focus:border-green-500 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                            Total Personas
                                        </label>
                                        <div className="relative">
                                            <Users className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-gray-400" />
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={data.guest_count}
                                                onChange={(e) =>
                                                    handleGuestCountChange(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-full rounded-xl border border-gray-400 py-2 pl-10 text-sm font-bold text-blue-600 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* VISUALIZADOR DE GRUPOS */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-blue-800 uppercase">
                                    <Info className="h-4 w-4" /> Distribución (
                                    {data.guest_count})
                                </h3>
                                <div className="space-y-2">
                                    {(() => {
                                        const visualBlocks = [];
                                        let currentBlock: number[] = [];
                                        for (
                                            let i = 0;
                                            i < data.guest_count;
                                            i++
                                        ) {
                                            currentBlock.push(i);
                                            if (
                                                breaks[i] &&
                                                i < data.guest_count - 1
                                            ) {
                                                visualBlocks.push(currentBlock);
                                                currentBlock = [];
                                            }
                                        }
                                        if (currentBlock.length > 0)
                                            visualBlocks.push(currentBlock);
                                        const renderedElements: any[] = [];
                                        let accumulatedSingles: number[][] = [];
                                        visualBlocks.forEach(
                                            (block, blockIndex) => {
                                                if (block.length > 1) {
                                                    if (
                                                        accumulatedSingles.length >
                                                        0
                                                    ) {
                                                        renderedElements.push(
                                                            <div
                                                                key={`grid-${blockIndex}`}
                                                                className="flex flex-wrap justify-start gap-1 rounded-lg border border-blue-100 bg-white p-2"
                                                            >
                                                                {accumulatedSingles.map(
                                                                    (
                                                                        singleGroup,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                singleGroup[0]
                                                                            }
                                                                            className="flex items-center"
                                                                        >
                                                                            <div
                                                                                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-[10px] font-bold transition-all hover:bg-blue-100 ${singleGroup[0] === 0 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                                                                            >
                                                                                {singleGroup[0] +
                                                                                    1}
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    toggleBreak(
                                                                                        singleGroup[0],
                                                                                    )
                                                                                }
                                                                                className="mx-0.5 text-gray-300 transition-colors hover:text-green-500"
                                                                            >
                                                                                <LinkIcon className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>,
                                                        );
                                                        accumulatedSingles = [];
                                                    }
                                                    renderedElements.push(
                                                        <div
                                                            key={`row-${blockIndex}`}
                                                            className="flex w-full animate-in flex-col items-center fade-in slide-in-from-left-2"
                                                        >
                                                            {blockIndex > 0 && (
                                                                <div className="relative my-0.5 flex h-4 w-0.5 items-center justify-center bg-gray-300">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            toggleBreak(
                                                                                block[0] -
                                                                                    1,
                                                                            )
                                                                        }
                                                                        className="absolute z-10 rounded-full border border-gray-300 bg-white p-0.5 shadow-sm hover:border-green-500 hover:text-green-600"
                                                                    >
                                                                        <LinkIcon className="h-2 w-2" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <div className="relative flex w-full flex-wrap items-center justify-start gap-2 rounded-lg border border-blue-200 bg-white p-2 shadow-sm">
                                                                <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-lg bg-blue-600"></div>
                                                                <span className="ml-2 text-[9px] font-bold text-gray-400">
                                                                    HAB
                                                                </span>
                                                                {block.map(
                                                                    (
                                                                        guestIdx,
                                                                        localIdx,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                guestIdx
                                                                            }
                                                                            className="flex items-center"
                                                                        >
                                                                            <div
                                                                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${guestIdx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                                                            >
                                                                                {guestIdx +
                                                                                    1}
                                                                            </div>
                                                                            {localIdx <
                                                                                block.length -
                                                                                    1 && (
                                                                                <div className="mx-1">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            toggleBreak(
                                                                                                guestIdx,
                                                                                            )
                                                                                        }
                                                                                        className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-400 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                                                                                    >
                                                                                        <Unlink className="h-3 w-3" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>,
                                                    );
                                                } else {
                                                    accumulatedSingles.push(
                                                        block,
                                                    );
                                                }
                                            },
                                        );
                                        if (accumulatedSingles.length > 0) {
                                            renderedElements.push(
                                                <div
                                                    key="grid-last"
                                                    className="flex w-full flex-col"
                                                >
                                                    {renderedElements.length >
                                                        0 && (
                                                        <div className="relative my-0.5 flex h-4 w-full justify-center">
                                                            <div className="h-full w-0.5 bg-gray-300"></div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleBreak(
                                                                        accumulatedSingles[0][0] -
                                                                            1,
                                                                    )
                                                                }
                                                                className="absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-300 bg-white p-0.5 shadow-sm hover:border-green-500 hover:text-green-600"
                                                            >
                                                                <LinkIcon className="h-2 w-2" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="flex min-h-[50px] flex-wrap justify-start gap-1.5 rounded-lg border border-blue-100 bg-white p-2">
                                                        {accumulatedSingles.map(
                                                            (singleGroup) => {
                                                                const guestIdx =
                                                                    singleGroup[0];
                                                                const isLastAbsolute =
                                                                    guestIdx ===
                                                                    data.guest_count -
                                                                        1;
                                                                return (
                                                                    <div
                                                                        key={
                                                                            guestIdx
                                                                        }
                                                                        className="flex items-center"
                                                                    >
                                                                        <div
                                                                            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-[10px] font-bold transition-all hover:bg-blue-100 ${guestIdx === 0 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                                                                        >
                                                                            {guestIdx +
                                                                                1}
                                                                        </div>
                                                                        {!isLastAbsolute && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    toggleBreak(
                                                                                        guestIdx,
                                                                                    )
                                                                                }
                                                                                className="mx-0.5 p-0.5 text-gray-300 transition-all hover:scale-125 hover:text-green-500"
                                                                            >
                                                                                <LinkIcon className="h-3 w-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>,
                                            );
                                        }
                                        return renderedElements;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA (HABITACIONES) */}
                        <div className="flex h-full flex-col space-y-1 lg:col-span-8">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase">
                                    <BedDouble className="h-5 w-5 text-gray-400" />{' '}
                                    Configuración de Habitaciones
                                </h3>
                                <div className="text-xs font-medium text-gray-400">
                                    {data.details.length} Habitación(es)
                                </div>
                            </div>
                            <div className="max-h-[380px] flex-1 space-y-4 overflow-y-auto p-1">
                                {data.details.map((detail, index) => (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="flex flex-col gap-4">
                                            {/* Header */}
                                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                                                    {index + 1}
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 uppercase">
                                                    Habitación para{' '}
                                                    {detail._temp_pax_count}{' '}
                                                    persona(s)
                                                </span>
                                            </div>

                                            {/* Grid */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
    {/* 1. BAÑO */}
    <div>
        <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">1. Baño</label>
        <div className="relative">
            <Bath className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
            <select 
                value={detail._temp_bathroom_filter} 
                onChange={(e) => updateDetailRow(index, '_temp_bathroom_filter', e.target.value)} 
                className="w-full rounded-lg border-gray-300 py-1.5 pl-8 text-xs font-bold uppercase text-gray-700 focus:border-blue-500 focus:ring-blue-500"
            >
                <option value="">Elegir...</option>
                <option value="private">Privado</option>
                <option value="shared">Compartido</option>
            </select>
        </div>
    </div>
    
    {/* 2. TIPO */}
    <div>
        <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">2. Tipo Hab.</label>
        <select 
            value={detail._temp_room_type_id} 
            onChange={(e) => updateDetailRow(index, '_temp_room_type_id', e.target.value)} 
            disabled={!detail._temp_bathroom_filter} 
            className="w-full rounded-lg border-gray-300 py-1.5 text-xs font-bold uppercase text-gray-700 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
        >
            <option value="">{detail._temp_bathroom_filter ? 'Elegir Tipo...' : '← Baño primero'}</option>
            {Array.from(new Map(
                rooms
                    .filter(r => {
                        // Tolera 'AVAILABLE', 'available' o 'Available'
                        const status = r.status?.toLowerCase() || '';
                        return status === 'available' || r.id.toString() === detail.room_id;
                    })
                    .filter(r => {
                        const prices = r.prices || (r.room_type as any)?.prices || [];
                        return prices.some((p: any) => p.bathroom_type?.toLowerCase() === detail._temp_bathroom_filter?.toLowerCase());
                    })
                    .filter(r => r.room_type)
                    .map(r => [r.room_type!.id, r.room_type!])
            ).values()).map((type: any) => (
                <option key={type.id} value={type.id}>{type.name}</option>
            ))}
        </select>
    </div>
    
    {/* 3. HABITACIÓN */}
    <div>
        <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">3. Habitación</label>
        <select 
            value={detail.room_id} 
            onChange={(e) => updateDetailRow(index, 'room_id', e.target.value)} 
            disabled={!detail._temp_room_type_id} 
            className="w-full rounded-lg border-gray-300 py-1.5 text-xs font-bold uppercase text-gray-700 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
        >
            <option value="">{detail._temp_room_type_id ? 'Elegir Hab...' : '← Tipo primero'}</option>
            {rooms
                .filter(r => {
                    const status = r.status?.toLowerCase() || '';
                    const isStatusValid = status === 'available' || r.id.toString() === detail.room_id;
                    const isTypeValid = r.room_type?.id.toString() === detail._temp_room_type_id;
                    
                    const prices = r.prices || (r.room_type as any)?.prices || [];
                    const hasCorrectBathroom = prices.some((p: any) => p.bathroom_type?.toLowerCase() === detail._temp_bathroom_filter?.toLowerCase());
                    
                    return isStatusValid && isTypeValid && hasCorrectBathroom;
                })
                .map(r => (<option key={r.id} value={r.id}>HAB. {r.number}</option>))
            }
        </select>
    </div>
    
    {/* 4. PRECIO */}
    <div>
        <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">4. Precio (Auto)</label>
        <div className="relative">
            <DollarSign className="absolute left-2 top-2 h-3.5 w-3.5 text-green-600" />
            <input type="text" readOnly value={detail.price > 0 ? detail.price : ''} className="w-full cursor-not-allowed rounded-lg border-gray-200 bg-green-50 py-1.5 pl-8 text-xs font-bold text-green-700 focus:ring-0" placeholder="0.00" />
        </div>
    </div>
</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-auto rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                <div className="flex flex-col gap-6 md:flex-row">
                                    <div className="relative -top-3 -mt-4 flex flex-1 animate-in flex-col gap-2 pt-6 duration-300 fade-in slide-in-from-top-2">
                                        <div className="flex gap-2">
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
                                                                payment_type:
                                                                    'EFECTIVO',
                                                                qr_bank: '',
                                                            }))
                                                        }
                                                        className={`flex-1 rounded py-1 text-[9px] font-bold transition-all ${data.payment_type === 'EFECTIVO' ? 'bg-white text-green-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        EFECTIVO
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setData(
                                                                'payment_type',
                                                                'QR',
                                                            )
                                                        }
                                                        className={`flex-1 rounded py-1 text-[9px] font-bold transition-all ${data.payment_type === 'QR' ? 'bg-white text-purple-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >
                                                        QR
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="w-1/2">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">
                                                    Adelanto
                                                </label>
                                                <div className="relative">
                                                    <span
                                                        className={`absolute inset-y-0 left-2 flex items-center text-[10px] font-bold ${data.advance_payment > 0 ? 'text-green-600' : 'text-gray-400'}`}
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
                                                        className="w-full rounded-lg border border-gray-400 py-1 pl-6 text-xs font-black text-gray-800 focus:border-green-500 focus:ring-green-500"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className={`border-t border-gray-100 pt-1.5 transition-all duration-300 ${data.payment_type === 'QR' ? 'visible opacity-100' : 'invisible h-0 overflow-hidden opacity-0'}`}
                                        >
                                            <div className="mb-1 flex items-center justify-between">
                                                {data.qr_bank && (
                                                    <span className="rounded bg-purple-100 px-1 text-[8px] font-bold text-purple-700">
                                                        {data.qr_bank}
                                                    </span>
                                                )}
                                            </div>
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
                                                        className={`rounded border px-0.5 py-1 text-[8px] font-bold transition-all active:scale-95 ${data.qr_bank === banco.id ? `ring-1 ring-purple-500 ring-offset-0 ${banco.color} scale-105 shadow-sm brightness-95` : `border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50`}`}
                                                    >
                                                        {banco.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {data.advance_payment > 0 &&
                                                !data.qr_bank && (
                                                    <div className="mt-1 flex animate-pulse items-center justify-center gap-0.5 text-[8px] font-bold text-red-500">
                                                        <AlertCircle className="h-2 w-2" />
                                                        <span>
                                                            Seleccione Banco
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col justify-center space-y-1 border-l border-gray-200 pl-6">
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Subtotal Noche:</span>
                                            <span>{totalPerNight} Bs</span>
                                        </div>
                                        <div className="flex justify-between text-base font-bold text-gray-800">
                                            <span>
                                                Total ({data.duration_days}{' '}
                                                noches):
                                            </span>
                                            <span>{grandTotal} Bs</span>
                                        </div>
                                        <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 text-sm font-bold text-red-600">
                                            <span>Saldo Pendiente:</span>
                                            <span>
                                                {balance > 0 ? balance : 0} Bs
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 border-t border-gray-200 pt-4">
                                    <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                        Observaciones
                                    </label>
                                    <textarea
                                        rows={1}
                                        value={data.observation}
                                        onChange={(e) =>
                                            setData(
                                                'observation',
                                                e.target.value,
                                            )
                                        }
                                        className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-500 focus:ring-gray-500"
                                        placeholder="Detalles adicionales..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                'Guardando...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />{' '}
                                    {reservationToEdit
                                        ? 'Actualizar'
                                        : 'Guardar Reserva'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
