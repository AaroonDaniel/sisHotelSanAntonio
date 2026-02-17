import { useForm } from '@inertiajs/react';
import {
    Calendar,
    Users,
    DollarSign,
    Save,
    X,
    User,
    Clock,
    Plus,
    Trash2,
    CreditCard,
    FileText,
    Search,
    UserPlus,
    Check,
    ChevronsUpDown
} from 'lucide-react';
import { FormEventHandler, useEffect, useState, useMemo } from 'react';
import { User as UserType } from '@/types'; // Importamos tipos globales para evitar errores

// --- Interfaces Locales ---
interface Guest {
    id: number;
    name: string;
    last_name: string;
    full_name?: string; // Por si viene concatenado
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
    type?: { name: string };
}

interface Reservation {
    id: number;
    guest_id: number;
    details?: any[];
    // ... otros campos
    start_date: string;
    arrival_time: string;
    duration_days: number;
    guest_count: number;
    advance_payment: number;
    payment_type: string;
    status: string;
    observation: string;
}

interface DetailItem {
    room_id: string;
    price_id: string;
    price: number;
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
    // Estado local para el buscador de huéspedes
    const [guestQuery, setGuestQuery] = useState('');
    const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
    
    // Configuración del Formulario
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        // Lógica Híbrida (Nuevo vs Existente)
        is_new_guest: false,
        guest_id: '',           // ID si existe
        new_guest_name: '',     // Nombre si es nuevo
        new_guest_ci: '',       // CI si es nuevo
        
        // Datos Reserva
        guest_count: 1,
        arrival_date: new Date().toISOString().split('T')[0],
        arrival_time: '12:00',
        duration_days: 1,
        advance_payment: 0,
        payment_type: 'EFECTIVO',
        status: 'PENDIENTE',
        observation: '',
        details: [] as DetailItem[]
    });

    // Efecto al abrir/cerrar modal o editar
    useEffect(() => {
        if (show) {
            if (reservationToEdit) {
                // Modo Edición: Cargar datos existentes
                setData({
                    ...data, // Mantener defaults
                    ...reservationToEdit, // Sobreescribir con datos de reserva
                    is_new_guest: false,
                    guest_id: reservationToEdit.guest_id.toString(),
                    details: reservationToEdit.details || [],
                    // Asegurar que payment_type tenga valor
                    payment_type: reservationToEdit.payment_type || 'EFECTIVO' 
                });
                
                // Pre-llenar el buscador con el nombre del huésped actual
                const currentGuest = guests.find(g => g.id === reservationToEdit.guest_id);
                if (currentGuest) {
                    setGuestQuery(currentGuest.full_name || `${currentGuest.name} ${currentGuest.last_name}`);
                }
            } else {
                // Modo Crear: Resetear todo
                reset();
                setGuestQuery('');
                setData(prev => ({ ...prev, details: [] })); // Limpiar detalles
            }
            clearErrors();
            setIsGuestDropdownOpen(false);
        }
    }, [show, reservationToEdit]);

    // --- LÓGICA DE BÚSQUEDA DE HUÉSPED ---
    const filteredGuests = useMemo(() => {
        if (!guestQuery) return [];
        return guests.filter((g) => {
            const fullName = g.full_name || `${g.name} ${g.last_name}`;
            const ci = g.identification_number || '';
            return fullName.toLowerCase().includes(guestQuery.toLowerCase()) || 
                   ci.includes(guestQuery);
        });
    }, [guests, guestQuery]);

    const selectGuest = (guest: Guest) => {
        setData('guest_id', guest.id.toString());
        setGuestQuery(guest.full_name || `${guest.name} ${guest.last_name}`);
        setIsGuestDropdownOpen(false);
    };

    // --- LÓGICA DE HABITACIONES (DETALLES) ---
    const addRoomRow = () => {
        const currentDetails = data.details || [];
        setData('details', [...currentDetails, { room_id: '', price_id: '', price: 0 }]);
    };

    const removeRoomRow = (index: number) => {
        const newDetails = [...data.details];
        newDetails.splice(index, 1);
        setData('details', newDetails);
    };

    const updateRoomRow = (index: number, field: keyof DetailItem, value: any) => {
        const newDetails = [...data.details];
        
        if (field === 'room_id') {
            newDetails[index].room_id = value;
            newDetails[index].price_id = '';
            newDetails[index].price = 0;
        } else if (field === 'price_id') {
            newDetails[index].price_id = value;
            // @ts-ignore
            const room = rooms.find(r => r.id.toString() === newDetails[index].room_id);
            // @ts-ignore
            const selectedPrice = room?.prices?.find((p: any) => p.id.toString() === value);
            newDetails[index].price = selectedPrice ? Number(selectedPrice.amount) : 0;
        } else {
            // @ts-ignore
            newDetails[index][field] = value;
        }
        setData('details', newDetails);
    };

    // --- CÁLCULOS DE PRECIOS ---
    const totalPerNight = data.details.reduce((acc, item) => acc + Number(item.price), 0);
    const grandTotal = totalPerNight * Number(data.duration_days);
    const balance = grandTotal - Number(data.advance_payment);

    // --- ENVÍO ---
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

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            {/* Modal Ancho para 2 Columnas */}
            <div className="w-full max-w-5xl animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95 flex flex-col max-h-[90vh]">
                
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 flex-shrink-0">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Calendar className="h-5 w-5" />
                        </div>
                        {reservationToEdit ? 'Editar Reserva' : 'Nueva Reserva'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* --- BODY (FORMULARIO GRID) --- */}
                <form id="reservation-form" onSubmit={submit} className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        {/* ================= COLUMNA IZQUIERDA: DATOS GENERALES ================= */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                <User className="h-5 w-5 text-blue-500" />
                                <h3 className="font-bold text-gray-700">Información del Huésped</h3>
                            </div>

                            {/* SELECTOR DE MODO (EXISTENTE / NUEVO) */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                                <button
                                    type="button"
                                    onClick={() => setData('is_new_guest', false)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!data.is_new_guest ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Buscar Existente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setData('is_new_guest', true)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${data.is_new_guest ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    + Nuevo Huésped
                                </button>
                            </div>

                            {/* CAMPOS DE HUÉSPED SEGÚN MODO */}
                            {!data.is_new_guest ? (
                                // MODO BÚSQUEDA
                                <div className="relative">
                                    <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">Buscar Huésped</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Nombre o CI..."
                                            value={guestQuery}
                                            onChange={(e) => {
                                                setGuestQuery(e.target.value);
                                                setIsGuestDropdownOpen(true);
                                                if(e.target.value === '') setData('guest_id', '');
                                            }}
                                            onFocus={() => setIsGuestDropdownOpen(true)}
                                            className="w-full rounded-lg border-gray-300 pl-9 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                        {/* Dropdown de resultados */}
                                        {isGuestDropdownOpen && guestQuery && (
                                            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                                                {filteredGuests.length > 0 ? (
                                                    filteredGuests.map((g) => (
                                                        <div
                                                            key={g.id}
                                                            onClick={() => selectGuest(g)}
                                                            className="cursor-pointer px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="font-bold">{g.full_name || `${g.name} ${g.last_name}`}</div>
                                                            <div className="text-xs text-gray-400">CI: {g.identification_number || 'S/N'}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                        No encontrado. <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => setData('is_new_guest', true)}>¿Crear nuevo?</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {errors.guest_id && !data.is_new_guest && <p className="text-xs text-red-500 mt-1">{errors.guest_id}</p>}
                                </div>
                            ) : (
                                // MODO NUEVO HUÉSPED
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-3 rounded-xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="md:col-span-2">
                                        <label className="mb-1.5 block text-xs font-bold text-green-700 uppercase">Nombre Completo</label>
                                        <div className="relative">
                                            <UserPlus className="absolute left-3 top-2.5 h-4 w-4 text-green-500" />
                                            <input
                                                type="text"
                                                value={data.new_guest_name}
                                                onChange={(e) => setData('new_guest_name', e.target.value)}
                                                className="w-full rounded-lg border-green-300 pl-9 text-sm focus:border-green-500 focus:ring-green-500 bg-white uppercase"
                                                placeholder="EJ: JUAN PEREZ"
                                            />
                                        </div>
                                        {errors.new_guest_name && <p className="text-xs text-red-500 mt-1">{errors.new_guest_name}</p>}
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-bold text-green-700 uppercase">CI / DNI</label>
                                        <input
                                            type="text"
                                            value={data.new_guest_ci}
                                            onChange={(e) => setData('new_guest_ci', e.target.value)}
                                            className="w-full rounded-lg border-green-300 text-sm focus:border-green-500 focus:ring-green-500 bg-white"
                                            placeholder="1234567"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* FECHAS Y TIEMPOS */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Fecha Llegada</label>
                                    <input
                                        type="date"
                                        value={data.arrival_date}
                                        onChange={(e) => setData('arrival_date', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Hora Aprox.</label>
                                    <input
                                        type="time"
                                        value={data.arrival_time}
                                        onChange={(e) => setData('arrival_time', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Días Estancia</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.duration_days}
                                            onChange={(e) => setData('duration_days', Number(e.target.value))}
                                            className="w-full rounded-lg border-gray-300 pl-9 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Total Personas</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.guest_count}
                                            onChange={(e) => setData('guest_count', Number(e.target.value))}
                                            className="w-full rounded-lg border-gray-300 pl-9 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ================= COLUMNA DERECHA: HABITACIONES Y PAGOS ================= */}
                        <div className="space-y-6 flex flex-col h-full">
                            
                            {/* SECCIÓN HABITACIONES */}
                            <div className="flex-1 flex flex-col">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
                                    <div className="flex items-center gap-2">
                                        <ChevronsUpDown className="h-5 w-5 text-blue-500" />
                                        <h3 className="font-bold text-gray-700">Habitaciones</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addRoomRow}
                                        className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-100 transition"
                                    >
                                        <Plus className="h-3 w-3" /> AGREGAR
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                    {data.details.length === 0 && (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                            <p className="text-sm text-gray-400">No hay habitaciones asignadas.</p>
                                            <p className="text-xs text-gray-400 mt-1">Haz clic en "Agregar" para reservar.</p>
                                        </div>
                                    )}

                                    {data.details.map((detail, index) => (
                                        <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                            {/* Select Habitación */}
                                            <div className="w-1/3">
                                                <select
                                                    value={detail.room_id}
                                                    onChange={(e) => updateRoomRow(index, 'room_id', e.target.value)}
                                                    className="w-full rounded-md border-gray-200 text-xs py-1.5 focus:ring-0 uppercase font-medium"
                                                >
                                                    <option value="">Hab...</option>
                                                    {rooms.map(r => (
                                                        <option key={r.id} value={r.id}>{r.number} - {r.type?.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Select Tarifa */}
                                            <div className="w-1/3">
                                                <select
                                                    value={detail.price_id}
                                                    onChange={(e) => updateRoomRow(index, 'price_id', e.target.value)}
                                                    disabled={!detail.room_id}
                                                    className="w-full rounded-md border-gray-200 text-xs py-1.5 focus:ring-0 uppercase"
                                                >
                                                    <option value="">Tarifa...</option>
                                                    {/* @ts-ignore */}
                                                    {rooms.find(r => r.id.toString() === detail.room_id)?.prices?.map((p:any) => (
                                                        <option key={p.id} value={p.id}>{p.amount} Bs - {p.bathroom_type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {/* Precio Display */}
                                            <div className="flex-1 text-right font-bold text-gray-700 text-sm">
                                                {detail.price} Bs
                                            </div>
                                            {/* Botón Eliminar */}
                                            <button
                                                type="button"
                                                onClick={() => removeRoomRow(index)}
                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-full hover:text-red-600 transition"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {errors.details && <p className="text-xs text-red-500 mt-2 text-right">Selecciona al menos una habitación.</p>}
                            </div>

                            {/* SECCIÓN ADELANTO (Box Verde) */}
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-emerald-200/50">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                    <h3 className="font-bold text-emerald-800 text-sm">Adelanto / Pago</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Monto (Bs)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.advance_payment}
                                            onChange={(e) => setData('advance_payment', Number(e.target.value))}
                                            className="w-full rounded-lg border-emerald-300 py-1.5 px-2 text-sm font-bold text-emerald-900 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">Método</label>
                                        <select
                                            value={data.payment_type}
                                            onChange={(e) => setData('payment_type', e.target.value)}
                                            className="w-full rounded-lg border-emerald-300 py-1.5 px-2 text-xs focus:ring-emerald-500 focus:border-emerald-500 uppercase"
                                        >
                                            <option value="EFECTIVO">Efectivo</option>
                                            <option value="QR">QR</option>
                                            <option value="TRANSFERENCIA">Transferencia</option>
                                            <option value="TARJETA">Tarjeta</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-2 border-t border-emerald-200">
                                    <div className="flex justify-between text-xs text-emerald-800">
                                        <span>Total por noche:</span>
                                        <span>{totalPerNight} Bs</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-emerald-900">
                                        <span>Total ({data.duration_days} noches):</span>
                                        <span>{grandTotal} Bs</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-red-600 mt-1">
                                        <span>Saldo Pendiente:</span>
                                        <span>{balance > 0 ? balance : 0} Bs</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* --- OBSERVACIONES (ANCHO COMPLETO ABAJO) --- */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">Observaciones</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <textarea
                                rows={2}
                                value={data.observation}
                                onChange={(e) => setData('observation', e.target.value)}
                                className="w-full rounded-lg border-gray-300 pl-9 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Notas adicionales sobre la reserva..."
                            />
                        </div>
                    </div>
                </form>

                {/* --- FOOTER --- */}
                <div className="mt-auto flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="reservation-form"
                        disabled={processing}
                        className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                    >
                        {processing ? 'Guardando...' : (
                            <>
                                <Save className="h-4 w-4" /> {reservationToEdit ? 'Actualizar Reserva' : 'Confirmar Reserva'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}