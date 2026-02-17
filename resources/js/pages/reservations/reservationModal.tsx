import { useForm } from '@inertiajs/react';
import {
    Bath,
    BedDouble,
    Calendar,
    Clock,
    CreditCard,
    DollarSign,
    Save,
    User,
    Users,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useRef, useState } from 'react';

// --- Interfaces ---
interface Guest {
    id: number;
    name: string;
    last_name: string;
    full_name?: string;
    identification_number?: string;
}

interface Price {
    id: number;
    amount: number;
    bathroom_type: string;
}

interface Room {
    id: number;
    number: string;
    prices?: Price[];
    status: string;
    type?: { name: string };
}

interface Reservation {
    id: number;
    guest_id: number;
    guest_count: number;
    arrival_date: string;
    arrival_time: string;
    duration_days: number;
    advance_payment: number;
    payment_type: string;
    status: string;
    observation: string;
    details?: DetailItem[];
}

interface DetailItem {
    room_id: string;
    price_id: string;
    price: number;
    // Auxiliares visuales
    _temp_pax_count?: number;
    _temp_bathroom_filter?: string;
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
    // --- ESTADOS ---
    const [guestQuery, setGuestQuery] = useState('');
    const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null); // Referencia para click outside (opcional)

    // Control de rupturas/uniones entre huéspedes (true = separado, false = unido)
    const [breaks, setBreaks] = useState<boolean[]>([]);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            is_new_guest: false,
            guest_id: '',
            new_guest_name: '',
            new_guest_ci: '',

            guest_count: 1,
            arrival_date: new Date().toISOString().split('T')[0],
            arrival_time: '14:00',
            duration_days: 1,
            advance_payment: 0, // Inicia como número, pero el input lo maneja como string a veces
            payment_type: 'EFECTIVO',
            status: 'PENDIENTE',
            observation: '',
            details: [] as DetailItem[],
        });

    // --- EFECTOS DE INICIALIZACIÓN ---
    useEffect(() => {
        if (show) {
            if (reservationToEdit) {
                // Modo Edición (Simplificado: asume estructura plana 1 pax/habitación si no se reconstruye breaks)
                setData({
                    ...data,
                    ...reservationToEdit,
                    guest_id: reservationToEdit.guest_id.toString(),
                    details: reservationToEdit.details || [],
                    payment_type: reservationToEdit.payment_type || 'EFECTIVO',
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
                setBreaks(
                    new Array(
                        Math.max(0, reservationToEdit.guest_count - 1),
                    ).fill(true),
                );
            } else {
                // Modo Crear
                reset();
                setGuestQuery('');
                setBreaks([]);
                // Inicializar con 1 detalle para 1 persona
                setData((prev) => ({
                    ...prev,
                    guest_count: 1,
                    details: [
                        {
                            room_id: '',
                            price_id: '',
                            price: 0,
                            _temp_pax_count: 1,
                            _temp_bathroom_filter: '',
                        },
                    ],
                    arrival_date: new Date().toISOString().split('T')[0],
                }));
            }
            clearErrors();
            setIsGuestDropdownOpen(false);
        }
    }, [show, reservationToEdit]);

    // --- LÓGICA DE AGRUPACIÓN (CORE) ---
    const handleGuestCountChange = (newCount: number) => {
        const validCount = Math.max(1, newCount);
        setData('guest_count', validCount);

        // Reiniciar breaks: todos separados por defecto
        const newBreaks = new Array(Math.max(0, validCount - 1)).fill(true);
        setBreaks(newBreaks);

        recalculateDetails(newBreaks, validCount);
    };

    const toggleBreak = (index: number) => {
        const newBreaks = [...breaks];
        newBreaks[index] = !newBreaks[index]; // Switch
        setBreaks(newBreaks);
        recalculateDetails(newBreaks, data.guest_count);
    };

    const recalculateDetails = (currentBreaks: boolean[], count: number) => {
        const groups: number[] = [];
        let currentGroupSize = 1;

        for (let i = 0; i < currentBreaks.length; i++) {
            if (currentBreaks[i]) {
                groups.push(currentGroupSize);
                currentGroupSize = 1;
            } else {
                currentGroupSize++;
            }
        }
        groups.push(currentGroupSize);

        // Mapear a detalles preservando selecciones previas si es posible
        const newDetails: DetailItem[] = groups.map((groupSize, index) => {
            const existing = data.details[index];
            return {
                room_id: existing ? existing.room_id : '',
                price_id: existing ? existing.price_id : '',
                price: existing ? existing.price : 0,
                _temp_bathroom_filter: existing
                    ? existing._temp_bathroom_filter
                    : '',
                _temp_pax_count: groupSize, // DATO CLAVE: Cantidad de personas en esta fila
            };
        });

        setData('details', newDetails);
    };

    // --- MANEJO DEL HUÉSPED ---
    const filteredGuests = useMemo(() => {
        if (!guestQuery) return [];
        return guests.filter((g) => {
            const fullName = g.full_name || `${g.name} ${g.last_name}`;
            const ci = g.identification_number || '';
            return (
                fullName.toLowerCase().includes(guestQuery.toLowerCase()) ||
                ci.includes(guestQuery)
            );
        });
    }, [guests, guestQuery]);

    const selectGuest = (guest: Guest) => {
        setData('guest_id', guest.id.toString());
        setGuestQuery(guest.full_name || `${guest.name} ${guest.last_name}`);
        setIsGuestDropdownOpen(false);
    };

    // --- MANEJO DE DETALLES ---
    const updateDetailRow = (
        index: number,
        field: keyof DetailItem,
        value: any,
    ) => {
        const newDetails = [...data.details];
        // @ts-ignore
        newDetails[index][field] = value;

        // Reset cascada
        if (field === '_temp_bathroom_filter') {
            newDetails[index].room_id = '';
            newDetails[index].price_id = '';
            newDetails[index].price = 0;
        } else if (field === 'room_id') {
            newDetails[index].price_id = '';
            newDetails[index].price = 0;
        } else if (field === 'price_id') {
            // @ts-ignore
            const room = rooms.find(
                (r) => r.id.toString() === newDetails[index].room_id,
            );
            // @ts-ignore
            const selectedPrice = room?.prices?.find(
                (p: any) => p.id.toString() === value,
            );
            newDetails[index].price = selectedPrice
                ? Number(selectedPrice.amount)
                : 0;
        }

        setData('details', newDetails);
    };

    // Cálculos
    const totalPerNight = data.details.reduce(
        (acc, item) => acc + Number(item.price),
        0,
    );
    const grandTotal = totalPerNight * Number(data.duration_days);
    const balance = grandTotal - Number(data.advance_payment);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (reservationToEdit) {
            put(`/reservas/${reservationToEdit.id}`, options);
        } else {
            post('/reservas', options);
        }
    };

    if (!show) return null;

    // Construir grupos según los "breaks"
    const groups = [];
    let currentGroup = [1];

    for (let i = 0; i < data.guest_count - 1; i++) {
        if (!breaks[i]) {
            currentGroup.push(i + 2); // sigue unido
        } else {
            groups.push(currentGroup);
            currentGroup = [i + 2]; // se corta
        }
    }
    groups.push(currentGroup);

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            {/* Contenedor Principal con estilo PriceModal */}
            <div className="flex max-h-[95vh] w-full max-w-6xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
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

                {/* CONTENIDO SCROLLABLE */}
                <form
                    id="reservation-form"
                    onSubmit={submit}
                    className="flex-1 overflow-y-auto bg-white p-6"
                >
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                        {/* ================= COLUMNA IZQUIERDA (4 COLS) ================= */}
                        <div className="space-y-6 lg:col-span-4">
                            {/* --- SECCIÓN HUÉSPED TITULAR (Lógica CheckinModal) --- */}
                            <div
                                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                ref={dropdownRef}
                            >
                                <label className="mb-3 block border-b border-red-100 pb-2 text-center text-base font-bold tracking-wide text-red-700 uppercase">
                                    DATOS DEL HUESPED
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
                                        value={guestQuery} // Usamos el estado local guestQuery para el input visual
                                        onChange={(e) => {
                                            const newValue =
                                                e.target.value.toUpperCase();
                                            setGuestQuery(newValue);
                                            setIsGuestDropdownOpen(true);

                                            // Lógica de limpieza: Si el usuario edita, asumimos que puede ser un nuevo huésped
                                            // hasta que seleccione uno de la lista.
                                            if (data.guest_id) {
                                                setData('guest_id', ''); // Rompemos el vínculo si edita
                                            }

                                            // Si es nuevo, actualizamos el campo de nombre nuevo
                                            setData('new_guest_name', newValue);
                                            // Por defecto activamos el modo "nuevo" al escribir,
                                            // se desactivará si selecciona alguien de la lista.
                                            setData('is_new_guest', true);
                                        }}
                                        onFocus={() => {
                                            if (guestQuery.length > 0)
                                                setIsGuestDropdownOpen(true);
                                        }}
                                        autoComplete="off"
                                    />

                                    {/* Dropdown de Búsqueda */}
                                    {isGuestDropdownOpen &&
                                        filteredGuests.length > 0 && (
                                            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                {filteredGuests.map((g) => (
                                                    <div
                                                        key={g.id}
                                                        onClick={() => {
                                                            // AL SELECCIONAR:
                                                            setData(
                                                                'guest_id',
                                                                g.id.toString(),
                                                            ); // Guardamos ID
                                                            setData(
                                                                'is_new_guest',
                                                                false,
                                                            ); // Ya no es nuevo
                                                            setData(
                                                                'new_guest_name',
                                                                '',
                                                            ); // Limpiamos nombre nuevo

                                                            setGuestQuery(
                                                                g.full_name ||
                                                                    `${g.name} ${g.last_name}`,
                                                            ); // Visual
                                                            setIsGuestDropdownOpen(
                                                                false,
                                                            );
                                                        }}
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

                                    {/* Mensaje visual si es nuevo (Opcional, ayuda al usuario) */}
                                    {isGuestDropdownOpen &&
                                        guestQuery &&
                                        filteredGuests.length === 0 && (
                                            <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-center shadow-lg">
                                                <p className="text-xs font-bold text-green-600">
                                                    Se registrará como NUEVO
                                                    HUÉSPED
                                                </p>
                                            </div>
                                        )}
                                </div>

                                {/* Campo CI solo aparece si es nuevo (o si quieres mostrarlo siempre editable para nuevos) */}
                                {data.is_new_guest && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                            CI / DNI (Para Nuevo Registro)
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

                                {errors.guest_id && !data.is_new_guest && (
                                    <p className="mt-1 text-xs font-bold text-red-500">
                                        {errors.guest_id}
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-gray-100"></div>

                            {/* FECHAS Y PARAMETROS */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                            Fecha Llegada
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                            </div>
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
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                            </div>
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
                                            Estancia (Días)
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
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Users className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
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

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <h4 className="mb-4 text-center text-xs font-semibold tracking-wide text-gray-400 uppercase">
                                    Distribución de Huéspedes
                                </h4>

                                <div className="flex flex-col items-center">
                                    {groups.map((group, gIndex) => (
                                        <div
                                            key={gIndex}
                                            className="flex flex-col items-center"
                                        >
                                            {/* === GRUPO UNIDO (HORIZONTAL) === */}
                                            <div className="flex items-center">
                                                {group.map((guest, i) => (
                                                    <div
                                                        key={guest}
                                                        className="group flex items-center"
                                                    >
                                                        {/* Nodo */}
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-400 bg-blue-50 text-xs font-bold text-blue-700 transition-all">
                                                            {guest}
                                                        </div>

                                                        {/* Zona interactiva de separación */}
                                                        {i <
                                                            group.length -
                                                                1 && (
                                                            <div
                                                                onClick={() =>
                                                                    toggleBreak(
                                                                        guest -
                                                                            1,
                                                                    )
                                                                }
                                                                className="relative flex h-9 w-8 cursor-pointer items-center justify-center"
                                                            >
                                                                {/* Línea */}
                                                                <div className="h-[2px] w-full bg-blue-400 transition-all group-hover:bg-red-400" />

                                                                {/* Texto aparece SOLO en hover */}
                                                                <span className="absolute -bottom-5 text-base text-red-500 opacity-0 transition-opacity group-hover:opacity-100">
                                                                    Separar
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* === CONEXIÓN ENTRE GRUPOS (VERTICAL SOLO SI ESTÁN SEPARADOS) === */}
                                            {gIndex < groups.length - 1 && (
                                                <div className="group flex flex-col items-center">
                                                    {/* Línea vertical */}
                                                    <div className="h-8 w-[2px] bg-gray-300 transition-all group-hover:bg-green-400" />

                                                    {/* Zona UNIR (invisible hasta hover) */}
                                                    <div
                                                        onClick={() =>
                                                            toggleBreak(
                                                                group[
                                                                    group.length -
                                                                        1
                                                                ] - 1,
                                                            )
                                                        }
                                                        className="cursor-pointer px-2 py-1"
                                                    >
                                                        <span className="text-base text-green-400 transition-opacity group-hover:opacity-100">
                                                            Unir
                                                        </span>
                                                    </div>

                                                    <div className="h-8 w-[2px] bg-gray-300 transition-all group-hover:bg-green-500" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ================= COLUMNA DERECHA (8 COLS) ================= */}
                        <div className="flex h-full flex-col space-y-6 lg:col-span-8">
                            {/* TITULO SECCIÓN */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase">
                                    <BedDouble className="h-5 w-5 text-gray-400" />
                                    Configuración de Habitaciones
                                </h3>
                                <div className="text-xs font-medium text-gray-400">
                                    {data.details.length} Habitación(es)
                                    necesaria(s)
                                </div>
                            </div>

                            {/* LISTA DINÁMICA DE FILAS */}
                            <div className="max-h-[350px] flex-1 space-y-4 overflow-y-auto p-1">
                                {data.details.map((detail, index) => (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* BADGE CANTIDAD PERSONAS */}
                                            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                                                <span className="text-xl leading-none font-bold">
                                                    {detail._temp_pax_count}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase">
                                                    PERS.
                                                </span>
                                            </div>

                                            {/* FILTROS Y SELECTORES */}
                                            <div className="grid flex-1 grid-cols-3 gap-3">
                                                {/* 1. Tipo Baño */}
                                                <div>
                                                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">
                                                        Tipo Baño
                                                    </label>
                                                    <div className="relative">
                                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                                                            <Bath className="h-3.5 w-3.5 text-gray-400" />
                                                        </div>
                                                        <select
                                                            value={
                                                                detail._temp_bathroom_filter
                                                            }
                                                            onChange={(e) =>
                                                                updateDetailRow(
                                                                    index,
                                                                    '_temp_bathroom_filter',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full rounded-lg border-gray-300 py-1.5 pl-8 text-xs font-bold text-gray-700 uppercase focus:border-blue-500 focus:ring-blue-500"
                                                        >
                                                            <option value="">
                                                                Seleccionar...
                                                            </option>
                                                            <option value="Privado">
                                                                Privado
                                                            </option>
                                                            <option value="Compartido">
                                                                Compartido
                                                            </option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* 2. Habitación (Filtrada) */}
                                                <div>
                                                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">
                                                        Habitación
                                                    </label>
                                                    <select
                                                        value={detail.room_id}
                                                        onChange={(e) =>
                                                            updateDetailRow(
                                                                index,
                                                                'room_id',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={
                                                            !detail._temp_bathroom_filter
                                                        }
                                                        className="w-full rounded-lg border-gray-300 py-1.5 text-xs font-bold text-gray-700 uppercase focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                                                    >
                                                        <option value="">
                                                            Elegir...
                                                        </option>
                                                        {rooms
                                                            .filter(
                                                                (r) =>
                                                                    r.status ===
                                                                    'DISPONIBLE',
                                                            )
                                                            .filter((r) =>
                                                                r.prices?.some(
                                                                    (p) =>
                                                                        p.bathroom_type ===
                                                                        detail._temp_bathroom_filter,
                                                                ),
                                                            )
                                                            .map((r) => (
                                                                <option
                                                                    key={r.id}
                                                                    value={r.id}
                                                                >
                                                                    HAB.{' '}
                                                                    {r.number}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>

                                                {/* 3. Tarifa */}
                                                <div>
                                                    <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">
                                                        Precio Noche
                                                    </label>
                                                    <select
                                                        value={detail.price_id}
                                                        onChange={(e) =>
                                                            updateDetailRow(
                                                                index,
                                                                'price_id',
                                                                e.target.value,
                                                            )
                                                        }
                                                        disabled={
                                                            !detail.room_id
                                                        }
                                                        className="w-full rounded-lg border-gray-300 py-1.5 text-xs font-bold text-gray-700 uppercase focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                                                    >
                                                        <option value="">
                                                            ...
                                                        </option>
                                                        {/* @ts-ignore */}
                                                        {rooms
                                                            .find(
                                                                (r) =>
                                                                    r.id.toString() ===
                                                                    detail.room_id,
                                                            )
                                                            ?.prices?.filter(
                                                                (p: any) =>
                                                                    p.bathroom_type ===
                                                                    detail._temp_bathroom_filter,
                                                            )
                                                            .map((p: any) => (
                                                                <option
                                                                    key={p.id}
                                                                    value={p.id}
                                                                >
                                                                    {p.amount}{' '}
                                                                    Bs
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* PRECIO FINAL */}
                                            <div className="w-20 text-right">
                                                <label className="mb-1 block text-[10px] font-bold text-gray-400 uppercase">
                                                    Total
                                                </label>
                                                <div className="text-sm font-bold text-gray-800">
                                                    {detail.price} Bs
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* FOOTER DERECHO: PAGOS Y TOTALES */}
                            <div className="mt-auto rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                <div className="flex flex-col gap-6 md:flex-row">
                                    {/* INPUTS PAGO */}
                                    <div className="grid flex-1 grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                                Adelanto (Bs)
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <DollarSign className="h-4 w-4 text-green-600" />
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={data.advance_payment}
                                                    onChange={(e) =>
                                                        setData(
                                                            'advance_payment',
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-gray-300 py-2 pl-9 text-sm font-bold text-green-800 focus:border-green-500 focus:ring-green-500"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                                Método
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <CreditCard className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <select
                                                    value={data.payment_type}
                                                    onChange={(e) =>
                                                        setData(
                                                            'payment_type',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-gray-300 py-2 pl-9 text-sm text-gray-700 uppercase focus:border-green-500 focus:ring-green-500"
                                                >
                                                    <option value="EFECTIVO">
                                                        Efectivo
                                                    </option>
                                                    <option value="QR">
                                                        QR
                                                    </option>
                                                    <option value="TRANSFERENCIA">
                                                        Transferencia
                                                    </option>
                                                    <option value="TARJETA">
                                                        Tarjeta
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RESUMEN FINANCIERO */}
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

                                {/* Observaciones */}
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

                    {/* BOTONES DE ACCIÓN (FOOTER MODAL) */}
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
                                    <Save className="h-4 w-4" />
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
