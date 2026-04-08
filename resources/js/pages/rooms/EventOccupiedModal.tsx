import { router } from '@inertiajs/react';
import {
    Banknote,
    Calendar,
    Clock,
    FileText,
    LogOut,
    Presentation,
    User,
    X,
    Trash2,
    QrCode,
    CheckCircle2
} from 'lucide-react';
import { useState } from 'react';

interface EventOccupiedModalProps {
    show: boolean;
    onClose: (reload?: boolean) => void;
    checkinData: any;
}

export default function EventOccupiedModal({ show, onClose, checkinData }: EventOccupiedModalProps) {
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [qrBank, setQrBank] = useState('');
    const [processing, setProcessing] = useState(false);

    if (!show || !checkinData) return null;

    // Extracción de datos
    const guest = checkinData.guest || {};
    const room = checkinData.room || {};
    const total = Number(checkinData.agreed_price) || 0;
    const adelanto = Number(checkinData.advance_payment) || 0;
    const saldo = Math.max(0, total - adelanto);

    // Separamos las notas para que se vean ordenadas
    const notesArray = checkinData.notes ? checkinData.notes.split('|').map((n: string) => n.trim()) : [];

    // Lista de bancos basada en tus imágenes
    const banks = [
        { id: 'BNB', name: 'BNB', logo: '/images/bancos/bnb.png' },
        { id: 'ECOFUTURO', name: 'Ecofuturo', logo: '/images/bancos/eco.png' },
        { id: 'FIE', name: 'Banco FIE', logo: '/images/bancos/fie.png' },
        { id: 'YAPE', name: 'Yape', logo: '/images/bancos/yape.png' },
    ];

    const handleCheckout = () => {
        if (paymentMethod === 'QR' && !qrBank && saldo > 0) {
            alert('Por favor, selecciona a qué banco se hizo la transferencia QR.');
            return;
        }

        if (confirm('¿Estás seguro de FINALIZAR el evento? El salón pasará a Limpieza y se generará el recibo.')) {
            setProcessing(true);
            const payload = {
                check_out_date: new Date().toISOString(),
                payment_method: paymentMethod,
                qr_bank: qrBank,
            };

            router.put(`/checks/${checkinData.id}/checkout`, payload, {
                onSuccess: () => {
                    setProcessing(false);
                    onClose(true); 
                    window.open(`/checks/${checkinData.id}/checkout-receipt`, '_blank');
                },
                onError: () => setProcessing(false)
            });
        }
    };

    const handleCancel = () => {
        if (confirm('¿ESTÁS SEGURO DE ANULAR ESTE EVENTO? Se borrará el registro y el salón quedará libre inmediatamente.')) {
            setProcessing(true);
            router.delete(`/checks/${checkinData.id}`, {
                onSuccess: () => {
                    setProcessing(false);
                    onClose(true);
                },
                onError: () => setProcessing(false)
            });
        }
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
                    <button onClick={() => onClose()} className="rounded-full p-1 text-gray-400 hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 2. CUERPO CON SCROLL */}
                <div className="flex-1 overflow-y-auto p-6">
                    
                    {/* Responsable y Fecha */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-gray-500">
                                <User className="h-3 w-3" /> Responsable
                            </span>
                            <div className="font-bold text-gray-800">{guest.full_name || 'Sin Nombre'}</div>
                            <div className="text-sm text-gray-500">CI: {guest.identification_number || 'S/N'} | Tel: {guest.phone || 'S/N'}</div>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-gray-500">
                                <Calendar className="h-3 w-3" /> Registro
                            </span>
                            <div className="font-bold text-gray-800">
                                {new Date(checkinData.created_at).toLocaleDateString('es-BO')}
                            </div>
                            <div className="text-sm text-gray-500">
                                Hora: {new Date(checkinData.created_at).toLocaleTimeString('es-BO', {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </div>

                    {/* Inventario y Logística (Notas) */}
                    <div className="mb-6">
                        <span className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-indigo-600">
                            <FileText className="h-4 w-4" /> Logística e Inventario Registrado
                        </span>
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                            {notesArray.length > 0 ? (
                                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {notesArray.map((nota: string, i: number) => (
                                        <li key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div> {nota}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="text-sm text-gray-500">Sin detalles registrados.</span>
                            )}
                        </div>
                    </div>

                    {/* Resumen Financiero Claro */}
                    <div className="mb-6">
                        <span className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-gray-500">
                            <Banknote className="h-4 w-4" /> Estado de Cuenta del Evento
                        </span>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                                <span className="block text-[11px] font-bold uppercase text-gray-500">Costo Total</span>
                                <span className="text-2xl font-black text-gray-800">{total} Bs</span>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm">
                                <span className="block text-[11px] font-bold uppercase text-emerald-600">Adelanto Dejado</span>
                                <span className="text-2xl font-black text-emerald-700">{adelanto} Bs</span>
                            </div>
                            <div className={`rounded-xl border p-4 text-center shadow-sm ${saldo > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                                <span className={`block text-[11px] font-bold uppercase ${saldo > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                                    Saldo a Pagar Hoy
                                </span>
                                <span className={`text-2xl font-black ${saldo > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {saldo} Bs
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Apartado para Cobrar el Saldo (Si hay) */}
                    {saldo > 0 && (
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <label className="mb-3 block text-sm font-bold uppercase text-gray-700">
                                Método de pago para cobrar el saldo ({saldo} Bs)
                            </label>
                            
                            {/* Opciones Efectivo / QR */}
                            <div className="mb-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => { setPaymentMethod('EFECTIVO'); setQrBank(''); }} 
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${paymentMethod === 'EFECTIVO' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <Banknote className="h-5 w-5" /> Efectivo
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setPaymentMethod('QR'); }} 
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all ${paymentMethod === 'QR' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <QrCode className="h-5 w-5" /> Transferencia / QR
                                </button>
                            </div>

                            {/* Mostrar Bancos si elige QR */}
                            {paymentMethod === 'QR' && (
                                <div className="animate-in slide-in-from-top-2 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                                    <p className="mb-3 text-xs font-bold uppercase text-indigo-800">Seleccione a qué banco ingresó el dinero:</p>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        {banks.map((bank) => (
                                            <button
                                                key={bank.id}
                                                type="button"
                                                onClick={() => setQrBank(bank.id)}
                                                className={`relative flex h-16 flex-col items-center justify-center rounded-lg border-2 bg-white transition-all hover:border-indigo-400 ${qrBank === bank.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-gray-200'}`}
                                            >
                                                {qrBank === bank.id && (
                                                    <div className="absolute -right-2 -top-2 rounded-full bg-white text-indigo-600">
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    </div>
                                                )}
                                                <img src={bank.logo} alt={bank.name} className="max-h-8 max-w-[80%] object-contain" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. FOOTER FIJO */}
                <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50 p-4">
                    {/* Botón de Cancelar a la izquierda */}
                    <button 
                        type="button" 
                        onClick={handleCancel} 
                        disabled={processing}
                        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        Anular Evento
                    </button>

                    <div className="flex gap-3">
                        <button type="button" onClick={() => onClose()} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
                            Cerrar
                        </button>
                        <button type="button" onClick={handleCheckout} disabled={processing} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50">
                            <LogOut className="h-4 w-4" />
                            {processing ? 'Procesando...' : 'Finalizar y Cobrar'}
                        </button>
                    </div>
                </div>
                
            </div>
        </div>
    );
}