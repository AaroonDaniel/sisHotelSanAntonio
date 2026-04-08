import { router } from '@inertiajs/react';
import {
    Banknote,
    Calendar,
    FileText,
    LogOut,
    Presentation,
    Trash2,
    User,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CancelAssignmentModal from '../checkins/cancelAssignmentModal';

interface EventOccupiedModalProps {
    show: boolean;
    onClose: (reload?: boolean) => void;
    checkinData: any;
}

export default function EventOccupiedModal({
    show,
    onClose,
    checkinData,
}: EventOccupiedModalProps) {
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [qrBank, setQrBank] = useState('');
    const [processing, setProcessing] = useState(false);

    // Estados para la cancelación
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Actualizar el reloj cada minuto para la regla de cancelación
    useEffect(() => {
        if (show) {
            const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
            return () => clearInterval(timer);
        }
    }, [show]);

    if (!show || !checkinData) return null;

    // Extracción de datos
    const guest = checkinData.guest || {};
    const room = checkinData.room || {};
    const total = Number(checkinData.agreed_price) || 0;
    const adelanto = Number(checkinData.advance_payment) || 0;
    const saldo = Math.max(0, total - adelanto);

    // Separamos las notas para que se vean ordenadas
    const notesArray = checkinData.notes
        ? checkinData.notes.split('|').map((n: string) => n.trim())
        : [];

    // Lista de bancos basada en tus imágenes
    const banks = [
        { id: 'BNB', name: 'BNB', logo: '/images/bancos/bnb.png' },
        { id: 'ECOFUTURO', name: 'Ecofuturo', logo: '/images/bancos/eco.png' },
        { id: 'FIE', name: 'Banco FIE', logo: '/images/bancos/fie.png' },
        { id: 'YAPE', name: 'Yape', logo: '/images/bancos/yape.png' },
    ];

    // 🚀 LÓGICA DE CANCELACIÓN (Permite anular si pasaron menos de 60 minutos)
    const canCancel = () => {
        if (!checkinData?.created_at) return false;
        const checkinTime = new Date(checkinData.created_at).getTime();
        const diffMinutes = (currentTime - checkinTime) / (1000 * 60);
        return diffMinutes <= 60; // Tienes 60 minutos para anular. Cámbialo si quieres más tiempo.
    };

    

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            {/* Contenedor principal con alto máximo para habilitar el scroll interno */}
            <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* 1. HEADER FIJO */}
                <div className="flex shrink-0 items-center justify-between border-b border-indigo-100 bg-indigo-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-indigo-800">
                        <div className="rounded-lg bg-indigo-200 p-1.5 text-indigo-700">
                            <Presentation className="h-5 w-5" />
                        </div>
                        Detalles del Evento en Curso - {room.number || 'SALÓN'}
                    </h2>
                    <button
                        onClick={() => onClose()}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 2. CUERPO CON SCROLL */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Responsable y Fecha */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <span className="mb-1 flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
                                <User className="h-3 w-3" /> Responsable
                            </span>
                            <div className="font-bold text-gray-800">
                                {guest.full_name || 'Sin Nombre'}
                            </div>
                            <div className="text-sm text-gray-500">
                                CI: {guest.identification_number || 'S/N'} |
                                Tel: {guest.phone || 'S/N'}
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <span className="mb-1 flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
                                <Calendar className="h-3 w-3" /> Registro
                            </span>
                            <div className="font-bold text-gray-800">
                                {new Date(
                                    checkinData.created_at,
                                ).toLocaleDateString('es-BO')}
                            </div>
                            <div className="text-sm text-gray-500">
                                Hora:{' '}
                                {new Date(
                                    checkinData.created_at,
                                ).toLocaleTimeString('es-BO', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Inventario y Logística (Notas) */}
                    <div className="mb-6">
                        <span className="mb-2 flex items-center gap-1 text-xs font-bold text-indigo-600 uppercase">
                            <FileText className="h-4 w-4" /> Logística e
                            Inventario Registrado
                        </span>
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                            {notesArray.length > 0 ? (
                                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {notesArray.map(
                                        (nota: string, i: number) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
                                            >
                                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>{' '}
                                                {nota}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            ) : (
                                <span className="text-sm text-gray-500">
                                    Sin detalles registrados.
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Resumen Financiero Claro */}
                    <div className="mb-6">
                        <span className="mb-2 flex items-center gap-1 text-xs font-bold text-gray-500 uppercase">
                            <Banknote className="h-4 w-4" /> Estado de Cuenta
                            del Evento
                        </span>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                                <span className="block text-[11px] font-bold text-gray-500 uppercase">
                                    Costo Total
                                </span>
                                <span className="text-2xl font-black text-gray-800">
                                    {total} Bs
                                </span>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm">
                                <span className="block text-[11px] font-bold text-emerald-600 uppercase">
                                    Adelanto Dejado
                                </span>
                                <span className="text-2xl font-black text-emerald-700">
                                    {adelanto} Bs
                                </span>
                            </div>
                            <div
                                className={`rounded-xl border p-4 text-center shadow-sm ${saldo > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}
                            >
                                <span
                                    className={`block text-[11px] font-bold uppercase ${saldo > 0 ? 'text-amber-700' : 'text-gray-500'}`}
                                >
                                    Saldo a Pagar
                                </span>
                                <span
                                    className={`text-2xl font-black ${saldo > 0 ? 'text-amber-600' : 'text-gray-400'}`}
                                >
                                    {saldo} Bs
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. FOOTER FIJO */}
                <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-4">
                    
                    {/* Botón de Cancelar a la izquierda */}
                    <div className="flex-1">
                        {canCancel() && (
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(true)}
                                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Anular Registro
                                </span>
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100"
                        >
                            Cerrar
                        </button>
                        
                    </div>
                </div>
            </div>

            {/* 🚀 MODAL EXTERNO DE CANCELACIÓN CON LA VARIABLE CORRECTA */}
            <CancelAssignmentModal
                show={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={() => onClose(true)}
                checkinId={checkinData?.id || null} 
            />
        </div>
    );
}