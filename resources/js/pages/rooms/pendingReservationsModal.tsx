import { router, useForm } from '@inertiajs/react';
import {
    BedDouble,
    Calendar,
    CheckCircle,
    Clock,
    Info,
    User as UserIcon,
    X,
    XCircle
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

export interface PendingReservationsModalProps {
    show: boolean;
    onClose: () => void;
    reservations: any[]; // Recibe las reservas pendientes
}

export default function PendingReservationsModal({
    show,
    onClose,
    reservations,
}: PendingReservationsModalProps) {
    // Estado para manejar la vista de detalles
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

    // ESTRUCTURA INICIAL: useForm de Inertia
    const { data, setData, post, processing, reset, clearErrors } = useForm({
        reservation_id: '',
    });

    // CONSOLE LOG Y RESETEO SOLICITADO
    useEffect(() => {
        if (show) {
            console.log('📬 Reservas pendientes recibidas en el Modal:', reservations);
            reset();
            clearErrors();
            setSelectedReservation(null); // Limpiamos la selección al abrir
        }
    }, [show, reservations]);

    // IDEA INICIAL: Confirmar envía los datos para crear el Check-in
    const submitCheckin: FormEventHandler = (e) => {
        e.preventDefault();
        
        post('/checkins/from-reservation', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    // Función para manejar la selección de una fila
    const handleRowClick = (res: any) => {
        setSelectedReservation(res);
        setData('reservation_id', res.id.toString()); // Actualizamos el form internamente
    };

    // Mantenemos la lógica de cancelar directamente usando router
    const handleCancel = (id: number) => {
        if (confirm('¿Estás seguro de cancelar esta reserva? Las habitaciones quedarán LIBRES.')) {
            router.put(`/reservas/${id}`, { status: 'cancelado' }, {
                preserveScroll: true,
                onSuccess: () => {
                    if (selectedReservation?.id === id) {
                        setSelectedReservation(null);
                        reset();
                    }
                },
            });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            {/* Modal de tamaño idéntico al Checkin (max-w-7xl, h-[80vh]) */}
            <div className="flex h-[80vh] w-full max-w-7xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                
                {/* CABECERA */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide text-gray-800 uppercase">
                        <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                            <Calendar className="h-5 w-5" />
                        </div>
                        Gestión de Reservas Pendientes
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* CUERPO DIVIDIDO EN 2 PANELES */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* PANEL IZQUIERDO: TABLA DE RESERVAS */}
                    <div className="flex w-3/5 flex-col border-r border-gray-200 bg-white">
                        <div className="overflow-y-auto p-4">
                            {reservations && reservations.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center pt-20 text-gray-400">
                                    <CheckCircle className="mb-3 h-12 w-12 opacity-20" />
                                    <p className="text-sm font-medium">
                                        No hay reservas pendientes en este momento.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-bold tracking-wider text-gray-500 uppercase shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3">Huésped</th>
                                            <th className="px-4 py-3">Fecha y Estadía</th>
                                            <th className="px-4 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {reservations.map((res) => (
                                            <tr
                                                key={res.id}
                                                onClick={() => handleRowClick(res)}
                                                className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                                                    selectedReservation?.id === res.id
                                                        ? 'bg-blue-50 ring-1 ring-blue-200'
                                                        : ''
                                                }`}
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold ${
                                                                selectedReservation?.id === res.id
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-blue-100 text-blue-600'
                                                            }`}
                                                        >
                                                            {res.guest?.full_name?.charAt(0) || (
                                                                <UserIcon className="h-5 w-5" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">
                                                                {res.guest?.full_name || 'Sin Nombre'}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 uppercase">
                                                                CI: {res.guest?.identification_number || 'S/N'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 font-semibold text-gray-700">
                                                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                            {res.arrival_date || res.expected_check_in}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 uppercase">
                                                            <Clock className="h-3 w-3" />
                                                            {res.arrival_time || '14:00'} •{' '}
                                                            {res.duration_days || 1} Noche(s)
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    {/* BOTONES DE ACCIÓN RÁPIDA */}
                                                    <div
                                                        className="flex justify-end gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            onClick={() => handleCancel(res.id)}
                                                            className="group flex items-center justify-center rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-600 hover:text-white"
                                                            title="Cancelar Reserva"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* PANEL DERECHO: DETALLES DE LA RESERVA SELECCIONADA */}
                    <div className="w-2/5 overflow-y-auto bg-gray-50 p-6">
                        {!selectedReservation ? (
                            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                                <Info className="mb-4 h-12 w-12 opacity-20" />
                                <h3 className="text-lg font-bold text-gray-500">
                                    Detalles de Reserva
                                </h3>
                                <p className="mt-1 text-sm">
                                    Selecciona una reserva de la lista para ver las habitaciones y proceder al Check-in.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={submitCheckin} className="animate-in fade-in slide-in-from-right-4 flex h-full flex-col justify-between duration-300">
                                <div>
                                    <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-bold text-gray-800 uppercase">
                                        Habitaciones Reservadas ({selectedReservation.details?.length || 0})
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        {selectedReservation.details?.map((detail: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <BedDouble className="h-4 w-4 text-blue-500" />
                                                        <span className="font-bold text-blue-700">
                                                            HAB. {detail.room?.number || '?'}
                                                        </span>
                                                    </div>
                                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">
                                                        {detail.room?.room_type?.name || 'Tipo N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
                                                    <span>Precio asignado:</span>
                                                    <span className="font-bold text-gray-800">
                                                        {detail.price} Bs.
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Resumen Monetario Rápido */}
                                    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
                                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                                            <span>Adelanto pagado:</span>
                                            <span className="font-bold text-green-600">
                                                {selectedReservation.advance_payment || '0.00'} Bs.
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>Método:</span>
                                            <span className="uppercase">
                                                {selectedReservation.payment_type || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* BOTÓN DE SUBMIT QUE USA INERTIA USEFORM */}
                                <div className="mt-8 flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={processing || !data.reservation_id}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-500 hover:shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        {processing ? (
                                            'Procesando...'
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4" /> Realizar Check-in
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}