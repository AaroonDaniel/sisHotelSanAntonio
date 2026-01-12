import { useForm } from '@inertiajs/react';
import { BedDouble, Hash, Save, ShoppingBag, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

// --- INTERFACES ---
interface Service {
    id: number;
    name: string;
}

interface Room {
    id: number;
    number: string;
}

interface Guest {
    id: number;
    full_name: string;
    identification_number: string;
}

interface CheckinSimple {
    id: number;
    check_out_date?: string | null;
    guest?: Guest;
    room?: Room;
}

interface Props {
    show: boolean;
    onClose: () => void;
    services: Service[];
    checkinId: number | null;
    availableCheckins?: CheckinSimple[];
}

export default function ServiceModal({
    show,
    onClose,
    services,
    checkinId,
    availableCheckins = [],
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const { data, setData, post, processing, reset, errors, clearErrors } =
        useForm({
            checkin_id: checkinId || '',
            service_id: '',
            quantity: 1,
        });

    // --- LOGICA DE FILTRADO ---
    // 1. Solo habitaciones OCUPADAS (sin check_out_date).
    // 2. Filtramos por el texto del buscador (nombre o número).
    const filteredCheckins = useMemo(() => {
        // Primero, solo las ocupadas
        let active = availableCheckins;

        // Si no hay texto de búsqueda, devolvemos todas las ocupadas
        if (!searchTerm) return active;

        const term = searchTerm.toLowerCase();
        return active.filter((c) => {
            const roomNumber = c.room?.number.toLowerCase() || '';
            const guestName = c.guest?.full_name.toLowerCase() || '';
            const guestId = c.guest?.identification_number.toLowerCase() || '';

            // Coincidencia por numero hab, nombre huesped o CI
            return (
                roomNumber.includes(term) ||
                guestName.includes(term) ||
                guestId.includes(term)
            );
        });
    }, [availableCheckins, searchTerm]);

    useEffect(() => {
        if (checkinId) {
            setData('checkin_id', checkinId);
        } else {
            setData('checkin_id', '');
            setSearchTerm('');
        }
        clearErrors();
    }, [checkinId, show]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/checkin-details', {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* HEADER (Estilo Idéntico al Referente) */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <ShoppingBag className="h-5 w-5" />
                        </div>
                        {checkinId ? 'AGREGAR CONSUMO' : 'NUEVO DETALLE'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* FORMULARIO */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        {/* --- ZONA DE SELECCIÓN DE HABITACIÓN (Solo si no viene predefinida) --- */}
                        {!checkinId && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                {/* 2. SELECTOR (Muestra resultados filtrados) */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                        Seleccionar Habitación
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <BedDouble className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <select
                                            value={data.checkin_id}
                                            onChange={(e) =>
                                                setData(
                                                    'checkin_id',
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full rounded-lg border border-gray-400 bg-white py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                        >
                                            <option value="">
                                                -- SELECCIONAR --
                                            </option>
                                            {filteredCheckins.map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    HAB {item.room?.number} -{' '}
                                                    {item.guest?.full_name}
                                                </option>
                                            ))}
                                            {filteredCheckins.length === 0 && (
                                                <option disabled>
                                                    NO SE ENCONTRARON RESULTADOS
                                                </option>
                                            )}
                                        </select>
                                    </div>
                                    {errors.checkin_id && (
                                        <p className="mt-1 text-xs font-bold text-red-500">
                                            Selecciona una habitación.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- CAMPO SERVICIO --- */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Servicio o Producto
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <ShoppingBag className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={data.service_id}
                                    onChange={(e) =>
                                        setData('service_id', e.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {services.map((service) => (
                                        <option
                                            key={service.id}
                                            value={service.id}
                                        >
                                            {service.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.service_id && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.service_id}
                                </p>
                            )}
                        </div>

                        {/* --- CAMPO CANTIDAD --- */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Cantidad
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.quantity}
                                    onChange={(e) =>
                                        setData(
                                            'quantity',
                                            parseInt(e.target.value),
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="Ej: 1"
                                />
                            </div>
                            {errors.quantity && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.quantity}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* FOOTER DE BOTONES */}
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
                                    <Save className="h-4 w-4" /> Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
