import OperatorSelector, {
    Operator as SharedOperator,
} from '@/components/OperatorSelector';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    Building2,
    Calendar,
    CheckCircle,
    Loader2,
    Save,
    Search,
    User,
    UserPlus,
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
}

export interface Reservation {
    id: number;
    guest_id: number;
    guest?: Guest;
    guest_count: number;
    arrival_date: string;
    duration_days: number;
    advance_payment: number;
    payment_type?: string;
    status: string;
    special_agreement?: {
        id: number;
        type: 'corporativo' | 'delegacion' | 'AJUSTE DE PRECIO';
    } | null;
    operator_id?: number | null;
    // Puente/historial (room_id se llena recién al confirmar) — de solo
    // lectura para este modal, pero lo siguen usando index.tsx (Tape
    // Chart, columna de habitaciones) para mostrar a qué cuarto quedó
    // ligada la reserva una vez confirmada.
    details?: {
        id?: number;
        room_id: number | null;
        room?: { number: string } | null;
    }[];
}

type ReservationType = 'estandar' | 'corporativo' | 'delegacion';

// Contrato EXACTO de lo que ReservationController::store()/update() acepta
// hoy (Fase 2 ya aplicada) — nada de precio, tipo de habitación, baño ni
// método de pago fijo en la reserva.
interface ReservationFormData {
    is_new_guest: boolean;
    guest_id: string;
    new_guest_name: string;
    new_guest_ci: string;
    guest_count: number | '';
    arrival_date: string;
    duration_days: number;
    type: ReservationType;
    advance_payment: number;
    payment_type: string;
    qr_bank: string;
    operator_id: string;
    // Placeholder fijo: la reserva ya no compromete habitaciones
    // específicas ni una cantidad explícita de ellas — room_id se llena
    // recién al confirmar. El backend sigue exigiendo details.min:1, así
    // que siempre viaja exactamente un detalle vacío.
    details: { room_id: null }[];
}

interface Props {
    show: boolean;
    onClose: () => void;
    reservationToEdit?: Reservation | null;
    guests: Guest[];
    operators?: SharedOperator[];
}

export default function ReservationModal({
    show,
    onClose,
    reservationToEdit,
    guests,
    operators = [],
}: Props) {
    // --- BUSCADOR DE HUÉSPED ---
    const [guestQuery, setGuestQuery] = useState('');
    const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
    const [showNewGuestForm, setShowNewGuestForm] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [availabilityData, setAvailabilityData] = useState<any>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [errorToast, setErrorToast] = useState<string | null>(null);

    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
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
        duration_days: 1,
        type: 'estandar',
        advance_payment: 0,
        payment_type: 'EFECTIVO',
        qr_bank: '',
        operator_id: '',
        details: [{ room_id: null }],
    });

    // --- BUSCADOR: resuelve a guest_id (o arma un huésped nuevo) ---
    const filteredGuests = useMemo(() => {
        if (!guestQuery) return [];
        const query = guestQuery.toLowerCase();
        return guests.filter((g) => {
            const fullName = g.full_name || `${g.name} ${g.last_name}`;
            const ci = g.identification_number || '';
            return fullName.toLowerCase().includes(query) || ci.includes(query);
        });
    }, [guests, guestQuery]);

    const selectGuest = (guest: Guest) => {
        setData((prev) => ({
            ...prev,
            guest_id: guest.id.toString(),
            is_new_guest: false,
            new_guest_name: '',
            new_guest_ci: '',
        }));
        setGuestQuery(guest.full_name || `${guest.name} ${guest.last_name}`);
        setIsGuestDropdownOpen(false);
        setShowNewGuestForm(false);
    };

    const startNewGuest = () => {
        setData((prev) => ({
            ...prev,
            guest_id: '',
            is_new_guest: true,
            new_guest_name: guestQuery,
        }));
        setShowNewGuestForm(true);
        setIsGuestDropdownOpen(false);
    };

    // Cierra el dropdown al hacer click afuera.
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsGuestDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Semáforo Predictivo (SIN TOCAR — misma lógica/endpoint de siempre).
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

    // Cargar datos al Editar o Crear
    useEffect(() => {
        if (show && reservationToEdit) {
            const tipoExistente = (reservationToEdit.special_agreement?.type ??
                'estandar') as ReservationType;

            setData((prev) => ({
                ...prev,
                guest_id: String(reservationToEdit.guest_id || ''),
                is_new_guest: false,
                new_guest_name: '',
                new_guest_ci: '',
                arrival_date: reservationToEdit.arrival_date || '',
                duration_days: Number(reservationToEdit.duration_days || 1),
                guest_count: Number(reservationToEdit.guest_count || 1),
                type: tipoExistente,
                advance_payment: Number(reservationToEdit.advance_payment || 0),
                payment_type: reservationToEdit.payment_type || 'EFECTIVO',
                operator_id: reservationToEdit.operator_id
                    ? String(reservationToEdit.operator_id)
                    : '',
            }));

            if (reservationToEdit.guest) {
                setGuestQuery(
                    reservationToEdit.guest.full_name ||
                        `${reservationToEdit.guest.name} ${reservationToEdit.guest.last_name}`,
                );
            }
            setShowNewGuestForm(false);
        } else if (show && !reservationToEdit) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');

            setData((prev) => ({
                ...prev,
                arrival_date: `${yyyy}-${mm}-${dd}`,
            }));
        } else if (!show) {
            reset();
            clearErrors();
            setGuestQuery('');
            setShowNewGuestForm(false);
        }
    }, [show, reservationToEdit]);

    const handleGuestCountChange = (val: string) => {
        if (val === '' || Number(val) <= 0) {
            setData('guest_count', '');
        } else {
            setData('guest_count', Number(val));
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!data.guest_id && !data.is_new_guest) {
            setErrorToast('Busque un huésped existente o cree uno nuevo.');
            return;
        }
        if (data.is_new_guest && !data.new_guest_name.trim()) {
            setErrorToast('Ingrese el nombre del huésped nuevo.');
            return;
        }
        if (Number(data.guest_count) <= 0 || isNaN(Number(data.guest_count))) {
            setErrorToast('Ingrese una cantidad de huéspedes válida.');
            return;
        }
        if (Number(data.advance_payment) > 0) {
            if (!data.operator_id) {
                setErrorToast('Seleccione quién está recibiendo el adelanto.');
                return;
            }
            if (!data.payment_type) {
                setErrorToast('Seleccione el método de pago del adelanto.');
                return;
            }
        }

        transform((currentData) => ({
            is_new_guest: currentData.is_new_guest,
            guest_id: currentData.guest_id,
            new_guest_name: currentData.new_guest_name,
            new_guest_ci: currentData.new_guest_ci,
            guest_count: Number(currentData.guest_count),
            arrival_date: currentData.arrival_date,
            duration_days: currentData.duration_days,
            type: currentData.type,
            advance_payment: Number(currentData.advance_payment) || 0,
            operator_id:
                Number(currentData.advance_payment) > 0
                    ? currentData.operator_id
                    : '',
            payment_type:
                Number(currentData.advance_payment) > 0
                    ? currentData.payment_type
                    : '',
            qr_bank:
                Number(currentData.advance_payment) > 0 &&
                currentData.payment_type === 'QR'
                    ? currentData.qr_bank
                    : '',
            details: [{ room_id: null }],
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setErrorToast(null);
                reset();
                onClose();
            },
            onError: (errs: Record<string, string>) => {
                const primer = Object.values(errs)[0];
                setErrorToast(
                    typeof primer === 'string'
                        ? primer
                        : 'Revise los datos del formulario.',
                );
                setTimeout(() => setErrorToast(null), 6000);
            },
        };

        if (reservationToEdit) {
            put(`/reservas/${reservationToEdit.id}`, options);
        } else {
            post('/reservas', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in">
            {errorToast && (
                <div className="pointer-events-none fixed top-24 right-8 z-[100] flex flex-row items-start justify-end gap-4">
                    <div className="pointer-events-auto flex w-80 animate-in flex-col gap-2 rounded-xl border border-red-300 bg-red-50 p-4 shadow-xl duration-300 slide-in-from-right-10 fade-in">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-red-200 p-2 text-red-700 shadow-sm">
                                <AlertTriangle className="h-5 w-5 animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-red-800">
                                    Reserva Bloqueada
                                </h3>
                                <p className="mt-1 text-xs leading-tight font-semibold text-red-600">
                                    {errorToast}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setErrorToast(null)}
                                className="text-red-400 transition-colors hover:text-red-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                        <Building2 className="h-6 w-6 text-green-600" />
                        {reservationToEdit ? 'Editar Reserva' : 'Nueva Reserva'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-red-100 hover:text-red-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form
                    onSubmit={submit}
                    className="flex-1 space-y-5 overflow-y-auto p-6"
                >
                    {/* SOLICITANTE */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                            Solicitante
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o CI..."
                                className="w-full rounded-xl border border-gray-400 py-2.5 pl-10 text-sm font-bold text-gray-700 uppercase focus:border-green-500 focus:ring-green-500"
                                value={guestQuery}
                                onChange={(e) => {
                                    const val = e.target.value.toUpperCase();
                                    setGuestQuery(val);
                                    setIsGuestDropdownOpen(true);
                                    setShowNewGuestForm(false);
                                    if (data.guest_id || data.is_new_guest) {
                                        setData((prev) => ({
                                            ...prev,
                                            guest_id: '',
                                            is_new_guest: false,
                                        }));
                                    }
                                }}
                                onFocus={() => {
                                    if (guestQuery.length > 0)
                                        setIsGuestDropdownOpen(true);
                                }}
                            />
                        </div>

                        {isGuestDropdownOpen && guestQuery.length > 0 && (
                            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                                {filteredGuests.map((g) => (
                                    <div
                                        key={g.id}
                                        onClick={() => selectGuest(g)}
                                        className="cursor-pointer border-b px-4 py-2.5 transition-colors hover:bg-green-50"
                                    >
                                        <div className="text-sm font-bold text-gray-800 uppercase">
                                            {g.full_name ||
                                                `${g.name} ${g.last_name}`}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            CI:{' '}
                                            {g.identification_number || 'S/N'}
                                        </div>
                                    </div>
                                ))}
                                <div
                                    onClick={startNewGuest}
                                    className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-bold text-green-700 transition-colors hover:bg-green-50"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Crear huésped nuevo: "{guestQuery}"
                                </div>
                            </div>
                        )}

                        

                        {/* Mini-formulario de alta rápida */}
                        {showNewGuestForm && (
                            <div className="mt-2 space-y-2 rounded-xl border border-green-200 bg-green-50 p-3">
                                <p className="flex items-center gap-1 text-xs font-bold text-green-700">
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Huésped nuevo
                                </p>
                                <input
                                    type="text"
                                    placeholder="Nombre completo"
                                    value={data.new_guest_name}
                                    onChange={(e) =>
                                        setData(
                                            'new_guest_name',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    className="w-full rounded-lg border border-green-300 py-2 text-sm font-bold text-gray-700 uppercase focus:border-green-500 focus:ring-green-500"
                                />
                                <input
                                    type="text"
                                    placeholder="CI (opcional)"
                                    value={data.new_guest_ci}
                                    onChange={(e) =>
                                        setData('new_guest_ci', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-green-300 py-2 text-sm font-bold text-gray-700 focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                        )}
                        {errors.guest_id && (
                            <p className="mt-1 text-xs font-bold text-red-600">
                                {errors.guest_id}
                            </p>
                        )}
                    </div>

                    {/* TIPO DE RESERVA + CONVENIO */}
                    <div>
                        <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                            Tipo de reserva
                        </label>
                        <div className="flex gap-1.5">
                            {(
                                [
                                    'estandar',
                                    'corporativo',
                                    'delegacion',
                                ] as ReservationType[]
                            ).map((tipo) => (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => setData('type', tipo)}
                                    className={`flex-1 rounded-lg px-3 py-1 text-base font-black uppercase transition-colors ${
                                        data.type === tipo
                                            ? tipo === 'delegacion'
                                                ? 'bg-green-600 text-white'
                                                : tipo === 'corporativo'
                                                  ? 'bg-green-600 text-white'
                                                  : 'bg-green-600 text-white'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {tipo === 'estandar' ? 'Normal' : tipo}
                                </button>
                            ))}
                        </div>
                        
                    </div>

                    {/* FECHA DE LLEGADA + NOCHES */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                Fecha de llegada
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    value={data.arrival_date}
                                    min={
                                        new Date().toISOString().split('T')[0]
                                    }
                                    onChange={(e) =>
                                        setData('arrival_date', e.target.value)
                                    }
                                    className="w-full rounded-xl border border-gray-400 py-2 pl-9 text-sm font-bold text-gray-700 focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            
                        </div>

                        <div>
                            <label className="mb-1 block text-center text-xs font-bold text-gray-600 uppercase">
                                Noches
                            </label>
                            <div className="flex items-center justify-center gap-3 rounded-xl border border-gray-400 py-1.5">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setData(
                                            'duration_days',
                                            Math.max(
                                                1,
                                                Number(data.duration_days) - 1,
                                            ),
                                        )
                                    }
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-700 transition hover:bg-gray-200"
                                >
                                    −
                                </button>
                                <span className="w-8 text-center text-xl font-black text-gray-800">
                                    {data.duration_days}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setData(
                                            'duration_days',
                                            Number(data.duration_days) + 1,
                                        )
                                    }
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-lg font-bold text-green-700 transition hover:bg-green-200"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* CANTIDAD DE PERSONAS */}
                    <div>
                        <label className="mb-1 block text-center text-xs font-bold text-gray-600 uppercase">
                            Cantidad de personas
                        </label>
                        <div className="flex items-center justify-center gap-4 rounded-xl border border-blue-300 bg-blue-50 py-2">
                            <button
                                type="button"
                                onClick={() =>
                                    handleGuestCountChange(
                                        String(
                                            Math.max(
                                                1,
                                                (Number(data.guest_count) ||
                                                    1) - 1,
                                            ),
                                        ),
                                    )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xl font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
                            >
                                −
                            </button>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <input
                                    type="number"
                                    min={1}
                                    value={data.guest_count}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            handleGuestCountChange('');
                                            return;
                                        }
                                        if (Number(value) >= 1) {
                                            handleGuestCountChange(value);
                                        }
                                    }}
                                    onBlur={() => {
                                        if (
                                            data.guest_count === '' ||
                                            Number(data.guest_count) < 1
                                        ) {
                                            handleGuestCountChange('1');
                                        }
                                    }}
                                    className="m-0 w-14 [appearance:textfield] rounded-md border border-blue-300 bg-white text-center text-2xl font-black text-blue-900 outline-none focus:border-blue-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    handleGuestCountChange(
                                        String(
                                            (Number(data.guest_count) || 1) + 1,
                                        ),
                                    )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xl font-bold text-blue-700 shadow-sm transition hover:bg-blue-100"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* ADELANTO */}
                    <div className="space-y-2 border-t border-gray-200 pt-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                Adelanto (opcional)
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-gray-400">
                                    Bs
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                        data.advance_payment === 0
                                            ? ''
                                            : data.advance_payment
                                    }
                                    placeholder="0"
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                            setData('advance_payment', 0);
                                            return;
                                        }
                                        setData(
                                            'advance_payment',
                                            Number(value),
                                        );
                                    }}
                                    className="block w-full rounded-xl border-2 border-gray-300 bg-white py-2 pr-3 pl-10 text-center text-base font-black text-gray-900 focus:border-green-500 focus:ring-green-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                            </div>
                        </div>

                        {Number(data.advance_payment) > 0 && (
                            <div className="animate-in space-y-3 fade-in slide-in-from-top-1">
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
                                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${data.payment_type === 'EFECTIVO' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        EFECTIVO
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setData('payment_type', 'QR')
                                        }
                                        className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${data.payment_type === 'QR' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        QR 
                                    </button>
                                </div>

                                {data.payment_type === 'QR' && (
                                    <div className="grid animate-in grid-cols-4 gap-1.5 fade-in slide-in-from-top-1">
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
                                                    setData(
                                                        'qr_bank',
                                                        banco.id,
                                                    )
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
                                                {data.qr_bank === banco.id && (
                                                    <div className="absolute -top-1.5 -right-1.5 rounded-full bg-green-500 text-white shadow-sm">
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* OPERADOR */}
                    {Number(data.advance_payment) > 0 && (
                        <div
                            className={`rounded-xl border-2 p-3 ${
                                data.operator_id
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-red-200 bg-red-50'
                            }`}
                        >
                            <p
                                className={`mb-2 text-center text-[11px] font-bold uppercase ${
                                    data.operator_id
                                        ? 'text-green-700'
                                        : 'text-red-700'
                                }`}
                            >
                                {data.operator_id
                                    ? 'Operador seleccionado'
                                    : '¿Quién recibe el adelanto?'}
                            </p>
                            <OperatorSelector
                                operators={operators}
                                value={data.operator_id}
                                onChange={(id) => setData('operator_id', id)}
                                error={errors.operator_id}
                                compact
                                size="lg"
                                label=""
                            />
                        </div>
                    )}
                </form>

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
                        disabled={processing}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-green-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:hover:translate-y-0"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />{' '}
                                Procesando...
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
