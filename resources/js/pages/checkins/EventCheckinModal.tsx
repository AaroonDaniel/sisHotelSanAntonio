import { useForm } from '@inertiajs/react';
import { CalendarDays, Presentation, Save, User, X } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

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
    initialRoomId?: number | null;
    checkinToEdit?: any | null; // Prop para recibir los datos existentes
}

export default function EventCheckinModal({
    show,
    onClose,
    guests,
    rooms,
    initialRoomId,
    checkinToEdit,
}: EventCheckinModalProps) {
    
    // Función para obtener la fecha y hora actual en formato exacto para <input type="datetime-local">
    const getNowLocal = () => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const now = getNowLocal();

    const [eventData, setEventData] = useState({
        chairs: 0,
        tables: 0,
        startDateTime: now, 
        endDateTime: '',    
        extraDetails: '',
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, put, processing, reset, transform } = useForm({
        guest_id: '' as string | null,
        room_id: '',
        check_in_date: now,
        duration_days: 1,
        agreed_price: '',
        advance_payment: '',
        payment_method: 'EFECTIVO',
        qr_bank: '',
        notes: '',
        full_name: '',
        identification_number: '',
        phone: '',
        // 👇 Los enviamos como null para que Laravel NO intente sobrescribir 
        // el perfil de los clientes antiguos
        nationality: null,
        profession: null,
        civil_status: null, 
        birth_date: null,
        issued_in: null, 
    });

    useEffect(() => {
        if (show) {
            if (checkinToEdit) {
                const notes = checkinToEdit.notes || '';
                const parts = notes.split('|').map((p: string) => p.trim());

                let extracted = {
                    chairs: 0,
                    tables: 0,
                    startDateTime: now,
                    endDateTime: '',
                    extraDetails: '',
                };

                parts.forEach((part: string) => {
                    if (part.includes('Horario:')) {
                        const timeStr = part.replace('[EVENTO] Horario:', '').trim();
                        const times = timeStr.split('a');
                        if (times.length === 2) {
                            const today = now.split('T')[0];
                            extracted.startDateTime = `${today}T${times[0].trim()}`;
                            extracted.endDateTime = `${today}T${times[1].trim()}`;
                        }
                    }
                    if (part.includes('Inicio:'))
                        extracted.startDateTime = part.replace('[EVENTO] Inicio:', '').trim();
                    if (part.includes('Fin:'))
                        extracted.endDateTime = part.replace('Fin:', '').trim();
                    
                    if (part.includes('Sillas:'))
                        extracted.chairs = parseInt(part.split(':')[1]) || 0;
                    if (part.includes('Mesas:'))
                        extracted.tables = parseInt(part.split(':')[1]) || 0;
                    if (part.includes('Detalle:'))
                        extracted.extraDetails = part.substring(part.indexOf('Detalle:') + 8).trim();
                });

                setEventData(extracted);

                setData({
                    guest_id: String(checkinToEdit.guest_id || ''),
                    room_id: String(checkinToEdit.room_id || ''),
                    check_in_date: checkinToEdit.check_in_date ? checkinToEdit.check_in_date.slice(0, 16) : now,
                    duration_days: checkinToEdit.duration_days || 1,
                    agreed_price: checkinToEdit.agreed_price || '',
                    advance_payment: checkinToEdit.advance_payment || '',
                    payment_method: checkinToEdit.payment_method || 'EFECTIVO',
                    qr_bank: checkinToEdit.qr_bank || '',
                    notes: notes,
                    full_name: checkinToEdit.guest?.full_name || '',
                    identification_number: checkinToEdit.guest?.identification_number || '',
                    phone: checkinToEdit.guest?.phone || '',
                });
            } else {
                reset();
                setEventData({
                    chairs: 0,
                    tables: 0,
                    startDateTime: now,
                    endDateTime: '',
                    extraDetails: '',
                });
                setData('room_id', initialRoomId ? String(initialRoomId) : '');
            }

            setTimeout(() => {
                if (nameInputRef.current) nameInputRef.current.focus();
            }, 200);
        }
    }, [show, initialRoomId, checkinToEdit]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredGuests =
        data.full_name.length > 1
            ? guests.filter((g) => {
                  const term = data.full_name.toLowerCase();
                  return (
                      g.full_name.toLowerCase().includes(term) ||
                      (g.identification_number &&
                          g.identification_number.includes(term))
                  );
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

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        // 🚀 BARRERA DE SEGURIDAD: Solo clientes registrados
        if (!data.guest_id) {
            alert('⚠️ ACCIÓN DENEGADA\n\nEl Salón de Eventos solo puede ser reservado por clientes que ya se encuentren registrados en la base de datos del hotel.\n\nPor favor, busque y seleccione un cliente de la lista.');
            if (nameInputRef.current) nameInputRef.current.focus();
            return; // 🛑 Detenemos la ejecución aquí
        }

        let diffDays = 1;
        if (eventData.startDateTime && eventData.endDateTime) {
            const start = new Date(eventData.startDateTime);
            const end = new Date(eventData.endDateTime);
            const diffMs = end.getTime() - start.getTime();
            if (diffMs > 0) {
                diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }
        }

        // Ya no enviamos Proyector ni Pizarras en la nota
        const notasCompiladas = `[EVENTO] Inicio: ${eventData.startDateTime || 'S/D'} | Fin: ${eventData.endDateTime || 'S/D'} | Sillas: ${eventData.chairs} | Mesas: ${eventData.tables} | Detalle: ${eventData.extraDetails}`;

        const checkInFormatted = eventData.startDateTime ? eventData.startDateTime.replace('T', ' ') : now.replace('T', ' ');

        transform((currentData) => ({
            ...currentData,
            check_in_date: checkInFormatted, 
            duration_days: diffDays,         
            notes: notasCompiladas,
            origin: 'POTOSI',
            agreed_price: currentData.agreed_price,
            discount: currentData.agreed_price,
            is_temporary: false,
        }));

        if (checkinToEdit) {
            put(`/checks/${checkinToEdit.id}`, {
                onSuccess: () => {
                    reset();
                    onClose(true);
                },
                onError: (err) => console.error(err),
            });
        } else {
            post('/checks', {
                onSuccess: () => {
                    reset();
                    onClose(true);
                },
                onError: (err) => console.error(err),
            });
        }
    };

    if (!show) return null;

    return (
       <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="flex max-h-[83vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Cabecera dinámica */}
                <div className="flex items-center justify-between border-b border-gray-200 bg-emerald-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-black text-emerald-900">
                        <div className="rounded-lg bg-emerald-200 p-1.5 text-emerald-800">
                            <Presentation className="h-5 w-5" />
                        </div>
                        {checkinToEdit
                            ? 'Editar Registro de Evento'
                            : 'Nuevo Registro de Salón / Evento'}
                    </h2>
                    <button
                        onClick={() => onClose(false)}
                        className="rounded-full p-1 text-gray-500 hover:bg-gray-300"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form
                    onSubmit={submit}
                    className="flex max-h-[80vh] flex-col overflow-y-auto md:flex-row"
                >
                    {/* IZQUIERDA: DATOS DEL TITULAR Y COBROS */}
                    <div className="flex-1 border-r border-gray-200 p-6">
                        <h3 className="mb-4 border-b-2 border-emerald-100 pb-2 text-sm font-black text-emerald-800 uppercase">
                            1. Encargado del salón
                        </h3>

                        <div className="relative mb-5" ref={dropdownRef}>
                            <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">
                                Nombre del Responsable
                            </label>
                            <div className="relative">
                                <User className="absolute top-2.5 left-3 h-5 w-5 text-gray-500" />
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    className="w-full rounded-xl border-2 border-slate-400 bg-white py-2.5 pl-11 text-base font-bold text-gray-900 shadow-sm uppercase focus:border-emerald-600 focus:ring-emerald-600"
                                    
                                    value={data.full_name}
                                    onChange={(e) => {
                                        const newName = e.target.value.toUpperCase();
                                        if (newName === '') {
                                            setData((prev) => ({
                                                ...prev,
                                                full_name: '',
                                                guest_id: null,
                                                identification_number: '',
                                                phone: '',
                                            }));
                                        } else {
                                            setData('full_name', newName);
                                            // Si el usuario edita el nombre manualmente, quitamos el guest_id para obligarlo a seleccionar de nuevo
                                            if (data.guest_id) {
                                                setData('guest_id', null);
                                            }
                                        }
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    required
                                />
                                {isDropdownOpen && data.full_name.length > 1 && (
                                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border-2 border-slate-300 bg-white shadow-xl">
                                        {filteredGuests.length > 0 ? (
                                            filteredGuests.map((g) => (
                                                <div
                                                    key={g.id}
                                                    onClick={() => handleSelectGuest(g)}
                                                    className="cursor-pointer border-b border-slate-100 p-3 text-sm hover:bg-emerald-50"
                                                >
                                                    <span className="block font-bold text-gray-900">
                                                        {g.full_name}
                                                    </span>
                                                    <span className="text-xs font-semibold text-gray-600">
                                                        CI: {g.identification_number}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm font-bold text-red-500 bg-red-50">
                                                ⚠️ Cliente no encontrado.<br/>Debe estar registrado en el sistema.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">
                                    Carnet / CI
                                </label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border-2 border-slate-400 bg-slate-100 p-2.5 text-base font-bold text-gray-900 shadow-sm uppercase focus:border-emerald-600 focus:ring-emerald-600"
                                    value={data.identification_number}
                                    readOnly 
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">
                                    Teléfono
                                </label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border-2 border-slate-400 bg-slate-100 p-2.5 text-base font-bold text-gray-900 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
                                    value={data.phone}
                                    readOnly 
                                />
                            </div>
                        </div>

                        <h3 className="mb-4 border-b-2 border-emerald-100 pb-2 text-sm font-black text-emerald-800 uppercase">
                            2. Costos y Pagos
                        </h3>

                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm">
                                <label className="mb-2 block text-xs font-black text-emerald-900 uppercase">
                                    Precio Total
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={data.agreed_price}
                                        onChange={(e) => setData('agreed_price', e.target.value)}
                                        className="w-full rounded-lg border-2 border-emerald-400 bg-white px-3 py-2 text-xl font-black text-emerald-950 shadow-inner focus:border-emerald-600 focus:ring-emerald-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <span className="ml-2 font-black text-emerald-800">
                                        Bs.
                                    </span>
                                </div>
                            </div>
                            <div className="rounded-xl border-2 border-slate-300 bg-slate-100 p-4 shadow-sm">
                                <label className="mb-2 block text-xs font-black text-slate-800 uppercase">
                                    A Cuenta (Adelanto)
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.advance_payment}
                                        onChange={(e) => setData('advance_payment', e.target.value)}
                                        className="w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-xl font-black text-gray-900 shadow-inner focus:border-slate-600 focus:ring-slate-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <span className="ml-2 font-black text-slate-600">
                                        Bs.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DERECHA: LOGÍSTICA DEL EVENTO */}
                    <div className="flex-1 bg-slate-50 p-6">
                        <h3 className="mb-4 border-b-2 border-emerald-100 pb-2 text-sm font-black text-emerald-800 uppercase">
                            3. Logística e Inventario
                        </h3>

                        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div>
                                <label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-slate-700 uppercase">
                                    <CalendarDays className="h-4 w-4" /> Ingreso (Fecha y Hora)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={eventData.startDateTime}
                                    onChange={(e) =>
                                        setEventData({
                                            ...eventData,
                                            startDateTime: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border-2 border-slate-400 bg-white p-2.5 text-sm font-bold text-gray-900 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 flex items-center gap-1 text-xs font-bold text-slate-700 uppercase">
                                    <CalendarDays className="h-4 w-4" /> Salida (Fecha y Hora)
                                </label>
                                <input
                                    type="datetime-local"
                                    value={eventData.endDateTime}
                                    onChange={(e) =>
                                        setEventData({
                                            ...eventData,
                                            endDateTime: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border-2 border-slate-400 bg-white p-2.5 text-sm font-bold text-gray-900 shadow-sm focus:border-emerald-600 focus:ring-emerald-600"
                                    required
                                />
                            </div>
                        </div>

                        {/* Aquí reducimos a 2 columnas (Sillas y Mesas) */}
                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div className="rounded-xl border-2 border-slate-300 bg-slate-100 p-3 text-center shadow-sm">
                                <label className="mb-2 block text-xs font-extrabold text-slate-700 uppercase">
                                    Sillas
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={eventData.chairs === 0 ? '' : eventData.chairs}
                                    onChange={(e) =>
                                        setEventData({
                                            ...eventData,
                                            chairs: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-lg border-2 border-slate-400 bg-white p-2 text-center text-xl font-black text-gray-900 shadow-inner focus:border-emerald-600 focus:ring-emerald-600"
                                    placeholder="0"
                                />
                            </div>
                            <div className="rounded-xl border-2 border-slate-300 bg-slate-100 p-3 text-center shadow-sm">
                                <label className="mb-2 block text-xs font-extrabold text-slate-700 uppercase">
                                    Mesas
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={eventData.tables === 0 ? '' : eventData.tables}
                                    onChange={(e) =>
                                        setEventData({
                                            ...eventData,
                                            tables: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-lg border-2 border-slate-400 bg-white p-2 text-center text-xl font-black text-gray-900 shadow-inner focus:border-emerald-600 focus:ring-emerald-600"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Detalles adicionales con más filas */}
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase">
                                Detalles Adicionales
                            </label>
                            <textarea
                                rows={5}
                                value={eventData.extraDetails}
                                onChange={(e) =>
                                    setEventData({
                                        ...eventData,
                                        extraDetails: e.target.value.toUpperCase(),
                                    })
                                }
                                
                                className="w-full rounded-xl border-2 border-slate-400 bg-white p-3 text-base font-semibold text-gray-900 shadow-sm uppercase focus:border-emerald-600 focus:ring-emerald-600"
                                
                            ></textarea>
                        </div>
                    </div>
                </form>

                {/* Footer Buttons dinámicos */}
                <div className="flex justify-end gap-3 border-t-2 border-slate-200 bg-slate-50 p-4">
                    <button
                        type="button"
                        onClick={() => onClose(false)}
                        className="rounded-xl border-2 border-slate-300 bg-white px-6 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={processing}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />
                        {checkinToEdit ? 'Actualizar Evento' : 'Confirmar Evento'}
                    </button>
                </div>
            </div>
        </div>
    );
}