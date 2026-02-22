import { router, useForm } from '@inertiajs/react';
import {
    BedDouble,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Clock,
    Info,
    PlusCircle,
    Wallet,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

// 🚀 1. IMPORTAMOS LOS MODALES
import CancelModal from '@/components/cancelModal';
import ConfirmModal from '@/components/confirmModal';

export interface PendingReservationsModalProps {
    show: boolean;
    onClose: () => void;
    reservations: any[]; // Recibe las reservas pendientes
    onNewReservation?: () => void; // Función para abrir el modal de nueva reserva
}

export default function PendingReservationsModal({
    show,
    onClose,
    reservations,
    onNewReservation,
}: PendingReservationsModalProps) {
    // Estado para manejar la vista de detalles
    const [selectedReservation, setSelectedReservation] = useState<any | null>(
        null,
    );

    // ESTRUCTURA INICIAL: useForm de Inertia
    const { data, setData, post, processing, reset, clearErrors } = useForm({
        reservation_id: '',
    });

    // 🚀 2. ESTADOS PARA LOS MODALES DE ACCIÓN
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelingReservationId, setCancelingReservationId] = useState<number | null>(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmingReservationId, setConfirmingReservationId] = useState<number | null>(null);

    // Resetear al abrir/cerrar
    useEffect(() => {
        if (show) {
            reset();
            clearErrors();
            setSelectedReservation(null); // Limpiamos la selección al abrir
        }
    }, [show, reservations]);

    if (!show) return null;

    const handleClose = () => {
        setSelectedReservation(null);
        reset();
        onClose();
    };

    // Función para manejar la selección de una fila
    const handleRowClick = (res: any) => {
        setSelectedReservation(res);
        setData('reservation_id', res.id.toString());
    };

    const formatCurrency = (amount: number | string) =>
        new Intl.NumberFormat('es-BO', {
            style: 'currency',
            currency: 'BOB',
        }).format(parseFloat(amount?.toString() || '0'));

    const formatDate = (dateString: string) => {
        if (!dateString) return '---';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                {/* Contenedor Principal idéntico a checkinModal */}
                <div className="flex max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    {/* --- HEADER --- */}
                    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                <Calendar className="h-5 w-5" />
                            </div>
                            Reservas Pendientes
                            <span className="ml-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                                ({reservations?.length || 0} POR CONFIRMAR)
                            </span>
                        </h2>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClose}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* --- CUERPO DIVIDIDO EN 2 PANELES --- */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* PANEL IZQUIERDO: LISTA DE RESERVAS */}
                        <div className="relative flex w-[45%] flex-col overflow-y-auto border-r border-gray-100 bg-white p-6">
                            <label className="mb-4 block text-xs font-bold text-gray-500 uppercase">
                                Huéspedes Programados
                            </label>

                            {reservations && reservations.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center pb-10 text-gray-400">
                                    <CheckCircle2 className="mb-3 h-12 w-12 text-gray-400 opacity-20" />
                                    <p className="text-sm font-bold tracking-wider text-gray-500 uppercase">
                                        No hay reservas pendientes
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {reservations.map((res) => {
                                        const isSelected =
                                            selectedReservation?.id === res.id;
                                        return (
                                            <div
                                                key={res.id}
                                                onClick={() => handleRowClick(res)}
                                                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ease-in-out ${
                                                    isSelected
                                                        ? 'scale-[1.01] border-green-500 bg-green-50/60 shadow-lg ring-1 ring-green-500'
                                                        : 'border-gray-200 bg-white hover:border-green-300'
                                                } `}
                                            >
                                                {/* --- INFO PRINCIPAL --- */}
                                                <div className="mb-2 flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold transition-all ${
                                                                isSelected
                                                                    ? 'bg-green-600 text-white shadow-md'
                                                                    : 'bg-green-100 text-green-600'
                                                            } `}
                                                        >
                                                            {res.guest?.full_name?.charAt(
                                                                0,
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h3
                                                                className={`text-sm font-black uppercase ${isSelected ? 'text-gray-900' : 'text-gray-900'}`}
                                                            >
                                                                {res.guest
                                                                    ?.full_name ||
                                                                    'Sin Nombre'}
                                                            </h3>
                                                            <p className="text-[10px] font-bold tracking-widest text-gray-600 uppercase">
                                                                CI:{' '}
                                                                {res.guest
                                                                    ?.identification_number ||
                                                                    'S/N'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* --- DETALLES --- */}
                                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
                                                            Ingreso
                                                        </span>
                                                        <span className="flex items-center gap-1 text-xs font-bold text-gray-800">
                                                            <CalendarDays className="h-3 w-3 text-gray-400" />
                                                            {formatDate(
                                                                res.arrival_date ||
                                                                    res.expected_check_in,
                                                            )}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-bold tracking-wider text-gray-400 uppercase">
                                                            Estadía
                                                        </span>
                                                        <span className="flex items-center gap-1 text-xs font-bold text-gray-800">
                                                            <Clock className="h-3 w-3 text-green-500" />
                                                            {res.duration_days || 1}{' '}
                                                            Noche(s)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* --- ACCIONES (SOLO SI ESTA SELECCIONADO) --- */}
                                                <div
                                                    className={`grid transition-all duration-300 ease-in-out ${
                                                        isSelected
                                                            ? 'mt-4 grid-rows-[1fr] opacity-100'
                                                            : 'grid-rows-[0fr] opacity-0'
                                                    }`}
                                                >
                                                    <div className="overflow-hidden">
                                                        <div className="mt-1 flex w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                                            {/* BOTÓN CANCELAR */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCancelingReservationId(res.id);
                                                                    setIsCancelModalOpen(true);
                                                                }}
                                                                className="flex flex-1 items-center justify-center gap-2 bg-red-500 py-2 text-[11px] font-bold text-white uppercase transition hover:bg-red-600 active:scale-95"
                                                            >
                                                                Anular Reserva
                                                            </button>

                                                            {/* BOTÓN CONFIRMAR */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmingReservationId(res.id);
                                                                    setIsConfirmModalOpen(true);
                                                                }}
                                                                className="flex flex-1 items-center justify-center gap-2 bg-green-600 py-2 text-[11px] font-bold text-white uppercase transition hover:bg-green-500 active:scale-95"
                                                            >
                                                                Confirmar Reserva
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* PANEL DERECHO: DETALLES Y FORMULARIO */}
                        <div className="flex w-[55%] flex-col bg-gray-50">
                            <div className="flex-1 overflow-y-auto p-6">
                                {!selectedReservation ? (
                                    <div className="flex h-full flex-col items-center justify-center pb-10 text-center text-gray-400">
                                        <Info className="mb-4 h-12 w-12 opacity-20" />
                                        <h3 className="text-sm font-bold tracking-widest text-gray-500 uppercase">
                                            Detalles de Reserva
                                        </h3>
                                        <p className="mt-2 max-w-xs text-xs font-medium text-gray-400">
                                            Seleccione una reserva de la lista para
                                            ver sus detalles y proceder con el
                                            Check-in.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="animate-in space-y-6 duration-300 fade-in slide-in-from-right-4">
                                        {/* HABITACIONES */}
                                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                                <BedDouble className="h-4 w-4 text-green-500" />
                                                Habitaciones Asignadas (
                                                {selectedReservation.details
                                                    ?.length || 0}
                                                )
                                            </h3>

                                            <div className="grid gap-3">
                                                {selectedReservation.details?.map(
                                                    (detail: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                                                        >
                                                            <div>
                                                                <span className="block text-sm font-black text-gray-800 uppercase">
                                                                    HAB.{' '}
                                                                    {detail.room
                                                                        ?.number ||
                                                                        '?'}
                                                                </span>
                                                                <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                                                                    {detail.room
                                                                        ?.room_type
                                                                        ?.name ||
                                                                        'Tipo N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                                                                    Tarifa
                                                                </span>
                                                                <span className="font-bold text-gray-700 text-base">
                                                                    {formatCurrency(
                                                                        detail.price,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>

                                        {/* RESUMEN FINANCIERO */}
                                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-gray-400 uppercase">
                                                <Wallet className="h-4 w-4 text-green-600" />{' '}
                                                Resumen Monetario
                                            </h3>

                                            <div className="mb-4 space-y-3">
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span className="font-bold tracking-wider uppercase">
                                                        Adelanto Pagado:
                                                    </span>
                                                    <span className="text-base font-black text-green-600">
                                                        {formatCurrency(
                                                            selectedReservation.advance_payment ||
                                                                0,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span className="font-bold tracking-wider uppercase">
                                                        Método:
                                                    </span>
                                                    <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-bold text-gray-800 uppercase">
                                                        {selectedReservation.payment_type ||
                                                            'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* --- FOOTER DE BOTONES (ESTÁTICO AL FINAL, IDÉNTICO A CHECKINMODAL) --- */}
                            <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4">
                                <div className="flex items-center justify-end gap-3">
                                    {/* BOTÓN: Cerrar Modal */}
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                                    >
                                        Cerrar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onNewReservation}
                                        className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95"
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        Nueva Reserva
                                    </button>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🚀 3. RENDERIZACIÓN DE LOS MODALES */}
                <CancelModal 
                    show={isCancelModalOpen} 
                    onClose={() => setIsCancelModalOpen(false)} 
                    actionUrl={cancelingReservationId ? `/reservas/${cancelingReservationId}` : null} 
                />
                
                <ConfirmModal 
                    show={isConfirmModalOpen} 
                    onClose={() => {
                        setIsConfirmModalOpen(false);
                        onClose(); // Cerramos también la lista de pendientes para que inicie la apertura de modales ámbar
                    }} 
                    actionUrl={confirmingReservationId ? `/reservas/${confirmingReservationId}` : null} 
                />
            </div>
        </>
    );
}