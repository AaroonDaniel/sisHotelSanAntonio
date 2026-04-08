import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    Banknote,
    CheckCircle2,
    Clock,
    FileText,
    Save,
    User,
    X,
    Presentation,
    Users,
    MonitorPlay
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

// Reutilizamos tus interfaces base
export interface Guest {
    id: number;
    full_name: string;
    identification_number: string;
    phone?: string;
}

export interface Room {
    id: number;
    number: string;
    status: string;
}

interface EventCheckinModalProps {
    show: boolean;
    onClose: (isSuccess?: boolean) => void;
    guests: Guest[];
    rooms: Room[];
    initialRoomId?: number | null; // El ID del Salón
}

export default function EventCheckinModal({
    show,
    onClose,
    guests,
    rooms,
    initialRoomId,
}: EventCheckinModalProps) {
    // 1. Estados para el Inventario del Evento
    const [eventData, setEventData] = useState({
        chairs: 0,
        tables: 0,
        whiteboards: 0,
        projector: false,
        startTime: '',
        endTime: '',
        extraDetails: ''
    });

    // 2. Estado para el Buscador de Clientes
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const now = (() => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    })();

    // 3. Formulario principal (Inertia)
    const { data, setData, post, processing, reset, clearErrors, errors,transform } = useForm({
        guest_id: '' as string | null,
        room_id: '',
        check_in_date: now,
        duration_days: 1, // Por defecto 1 día
        agreed_price: '', // PRECIO TOTAL DEL EVENTO
        advance_payment: '', // ADELANTO (Si dejan seña)
        payment_method: 'EFECTIVO',
        qr_bank: '',
        notes: '', // Aquí guardaremos todo el texto del inventario
        full_name: '',
        identification_number: '',
        phone: '',
    });

    // Inicializar el modal
    useEffect(() => {
        if (show) {
            reset();
            setEventData({ chairs: 0, tables: 0, whiteboards: 0, projector: false, startTime: '', endTime: '', extraDetails: '' });
            setData('room_id', initialRoomId ? String(initialRoomId) : '');
            
            setTimeout(() => {
                if (nameInputRef.current) nameInputRef.current.focus();
            }, 200);
        }
    }, [show, initialRoomId]);

    // Cerrar buscador al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 4. Lógica de Búsqueda de Cliente (Igual que tu checkin normal)
    const filteredGuests = data.full_name.length > 1
        ? guests.filter((g) => {
              const term = data.full_name.toLowerCase();
              return g.full_name.toLowerCase().includes(term) || (g.identification_number && g.identification_number.includes(term));
          })
        : [];

    const handleSelectGuest = (guest: Guest) => {
        setData((prev) => ({
            ...prev,
            guest_id: String(guest.id),
            full_name: guest.full_name,
            identification_number: guest.identification_number || '',
            phone: guest.phone || '',
        }));
        setIsDropdownOpen(false);
    };

    // 5. Enviar el formulario
    // 5. Enviar el formulario
    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // CONSTRUIR LAS NOTAS AUTOMÁTICAMENTE
        const proyectorTexto = eventData.projector ? 'SÍ' : 'NO';
        const notasCompiladas = `[EVENTO] Horario: ${eventData.startTime || 'S/D'} a ${eventData.endTime || 'S/D'} | Sillas: ${eventData.chairs} | Mesas: ${eventData.tables} | Pizarras: ${eventData.whiteboards} | Proyector: ${proyectorTexto} | Detalle: ${eventData.extraDetails}`;

        // Usamos 'transform' para inyectar las notas en los datos justo antes de volar al servidor
        transform((currentData) => ({
            ...currentData,
            notes: notasCompiladas
        }));

        // Ahora enviamos limpiamente sin el error de TS
        post('/checks', {
            onSuccess: () => {
                reset();
                onClose(true);
            },
            onError: (err) => console.error(err)
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Cabecera */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-emerald-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-800">
                        <div className="rounded-lg bg-emerald-200 p-1.5 text-emerald-700">
                            <Presentation className="h-5 w-5" />
                        </div>
                        Registro de Salón / Evento
                    </h2>
                    <button onClick={() => onClose(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="flex flex-col md:flex-row max-h-[80vh] overflow-y-auto">
                    {/* IZQUIERDA: DATOS DEL TITULAR Y COBROS */}
                    <div className="flex-1 border-r border-gray-100 p-6">
                        <h3 className="text-sm font-bold text-emerald-700 uppercase mb-4 border-b pb-2">1. Titular del Evento</h3>
                        
                        {/* Buscador de cliente */}
                        <div className="relative mb-4" ref={dropdownRef}>
                            <label className="text-xs font-bold text-gray-800 uppercase mb-1 block">Nombre del Responsable</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    className="w-full rounded-xl border border-gray-800 py-2 pl-10 text-sm uppercase focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="BUSCAR O CREAR..."
                                    value={data.full_name}
                                    onChange={(e) => {
                                        setData('full_name', e.target.value.toUpperCase());
                                        if (e.target.value === '') setData('guest_id', null);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    required
                                />
                                {isDropdownOpen && filteredGuests.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border bg-white shadow-xl">
                                        {filteredGuests.map((g) => (
                                            <div key={g.id} onClick={() => handleSelectGuest(g)} className="cursor-pointer p-3 border-b hover:bg-emerald-50 text-sm">
                                                <span className="font-bold block">{g.full_name}</span>
                                                <span className="text-xs text-gray-500">CI: {g.identification_number}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CI y Teléfono */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Carnet / CI</label>
                                <input type="text" className="w-full rounded-xl border border-gray-400 p-2 text-sm uppercase focus:border-emerald-500" value={data.identification_number} onChange={(e) => setData('identification_number', e.target.value.toUpperCase())} required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Teléfono</label>
                                <input type="text" className="w-full rounded-xl border border-gray-400 p-2 text-sm focus:border-emerald-500" value={data.phone} onChange={(e) => setData('phone', e.target.value)} required />
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-emerald-700 uppercase mb-4 border-b pb-2">2. Costos y Pagos</h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {/* PRECIO ACORDADO (Lo que cuesta alquilar el salón) */}
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                <label className="text-xs font-black text-emerald-800 uppercase block mb-1">Precio Acordado Total</label>
                                <div className="flex items-center">
                                    <input type="number" required min="0" value={data.agreed_price} onChange={(e) => setData('agreed_price', e.target.value)} className="w-full rounded-lg border-emerald-300 text-lg font-black text-emerald-900 px-2 py-1" placeholder="Ej. 500" />
                                    <span className="ml-2 font-bold text-emerald-700">Bs.</span>
                                </div>
                            </div>
                            
                            {/* ADELANTO (Si deja algo de seña) */}
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Adelanto / A Cuenta</label>
                                <div className="flex items-center">
                                    <input type="number" min="0" value={data.advance_payment} onChange={(e) => setData('advance_payment', e.target.value)} className="w-full rounded-lg border-gray-300 text-lg font-bold text-gray-800 px-2 py-1" placeholder="Ej. 100" />
                                    <span className="ml-2 font-bold text-gray-500">Bs.</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* DERECHA: LOGÍSTICA DEL EVENTO */}
                    <div className="flex-1 bg-gray-50 p-6">
                        <h3 className="text-sm font-bold text-emerald-700 uppercase mb-4 border-b pb-2">3. Logística e Inventario</h3>
                        
                        {/* Horarios */}
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Hora Inicio</label>
                                <input type="time" value={eventData.startTime} onChange={(e) => setEventData({...eventData, startTime: e.target.value})} className="w-full rounded-xl border-gray-400 p-2 text-sm font-bold" required/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Hora Fin</label>
                                <input type="time" value={eventData.endTime} onChange={(e) => setEventData({...eventData, endTime: e.target.value})} className="w-full rounded-xl border-gray-400 p-2 text-sm font-bold" required/>
                            </div>
                        </div>

                        {/* Inventario */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Sillas</label>
                                <input type="number" min="0" value={eventData.chairs || ''} onChange={(e) => setEventData({...eventData, chairs: Number(e.target.value)})} className="w-full text-center text-lg font-bold border-b-2 border-t-0 border-l-0 border-r-0 border-gray-300 focus:border-emerald-500 bg-transparent p-0" placeholder="0" />
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Mesas</label>
                                <input type="number" min="0" value={eventData.tables || ''} onChange={(e) => setEventData({...eventData, tables: Number(e.target.value)})} className="w-full text-center text-lg font-bold border-b-2 border-t-0 border-l-0 border-r-0 border-gray-300 focus:border-emerald-500 bg-transparent p-0" placeholder="0" />
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Pizarras</label>
                                <input type="number" min="0" value={eventData.whiteboards || ''} onChange={(e) => setEventData({...eventData, whiteboards: Number(e.target.value)})} className="w-full text-center text-lg font-bold border-b-2 border-t-0 border-l-0 border-r-0 border-gray-300 focus:border-emerald-500 bg-transparent p-0" placeholder="0" />
                            </div>
                        </div>

                        {/* Proyector Toggle */}
                        <div className="mb-5 bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between cursor-pointer" onClick={() => setEventData({...eventData, projector: !eventData.projector})}>
                            <div className="flex items-center gap-2">
                                <MonitorPlay className={`w-5 h-5 ${eventData.projector ? 'text-emerald-500' : 'text-gray-400'}`} />
                                <span className="text-sm font-bold uppercase text-gray-700">Incluye Proyector</span>
                            </div>
                            <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${eventData.projector ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${eventData.projector ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        {/* Notas extra */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Detalles Adicionales del Evento</label>
                            <textarea rows={2} value={eventData.extraDetails} onChange={(e) => setEventData({...eventData, extraDetails: e.target.value.toUpperCase()})} className="w-full rounded-xl border-gray-400 p-2 text-sm uppercase focus:border-emerald-500" placeholder="Ej. Boda, Decoración, etc..."></textarea>
                        </div>

                    </div>
                </form>

                {/* Footer Buttons */}
                <div className="border-t border-gray-100 bg-white p-4 flex justify-end gap-3">
                    <button type="button" onClick={() => onClose(false)} className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95">
                        Cancelar
                    </button>
                    <button type="button" onClick={submit} disabled={processing} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50">
                        <Save className="h-4 w-4" />
                        Confirmar Evento
                    </button>
                </div>
            </div>
        </div>
    );
}