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

    // Separamos las notas para que se vean bonitas (Ej: Sillas: 50 | Mesas: 10)
    const notesArray = checkinData.notes ? checkinData.notes.split('|').map((n: string) => n.trim()) : [];

    const handleCheckout = () => {
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
                    onClose(true); // Cerramos y recargamos
                    window.open(`/checks/${checkinData.id}/checkout-receipt`, '_blank');
                },
                onError: () => setProcessing(false)
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-6 py-4">
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

                <div className="p-6">
                    {/* Responsable y Fecha */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <span className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase mb-1">
                                <User className="w-3 h-3" /> Responsable
                            </span>
                            <div className="font-bold text-gray-800">{guest.full_name || 'Sin Nombre'}</div>
                            <div className="text-sm text-gray-500">CI: {guest.identification_number || 'S/N'} | Tel: {guest.phone || 'S/N'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <span className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase mb-1">
                                <Calendar className="w-3 h-3" /> Fecha de Registro
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
                        <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 uppercase mb-2">
                            <FileText className="w-4 h-4" /> Logística e Inventario del Evento
                        </span>
                        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                            {notesArray.length > 0 ? (
                                <ul className="grid grid-cols-2 gap-2">
                                    {notesArray.map((nota: string, i: number) => (
                                        <li key={i} className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> {nota}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="text-sm text-gray-500">Sin detalles registrados.</span>
                            )}
                        </div>
                    </div>

                    {/* Finanzas */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        <div className="border border-gray-200 rounded-xl p-3 text-center">
                            <span className="block text-[10px] font-bold text-gray-500 uppercase">Costo Total</span>
                            <span className="text-xl font-black text-gray-800">{total} Bs</span>
                        </div>
                        <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50">
                            <span className="block text-[10px] font-bold text-gray-500 uppercase">A Cuenta (Adelanto)</span>
                            <span className="text-xl font-black text-gray-600">{adelanto} Bs</span>
                        </div>
                        <div className={`border rounded-xl p-3 text-center ${saldo > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                            <span className={`block text-[10px] font-bold uppercase ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                Saldo Pendiente
                            </span>
                            <span className={`text-xl font-black ${saldo > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {saldo} Bs
                            </span>
                        </div>
                    </div>

                    {/* Cobro del Saldo (Si existe) */}
                    {saldo > 0 && (
                        <div className="mb-4 bg-amber-50 rounded-xl border border-amber-200 p-4">
                            <label className="block text-xs font-bold text-amber-800 uppercase mb-2">Método de pago para el saldo ({saldo} Bs)</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => { setPaymentMethod('EFECTIVO'); setQrBank(''); }} className={`flex-1 py-2 rounded-lg font-bold text-sm border ${paymentMethod === 'EFECTIVO' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                                    EFECTIVO
                                </button>
                                <button type="button" onClick={() => { setPaymentMethod('QR'); setQrBank('BNB'); }} className={`flex-1 py-2 rounded-lg font-bold text-sm border ${paymentMethod === 'QR' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                                    QR
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="border-t border-gray-100 bg-gray-50 p-4 flex justify-end gap-3">
                    <button type="button" onClick={() => onClose()} className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
                        Cerrar
                    </button>
                    <button type="button" onClick={handleCheckout} disabled={processing} className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-red-500 disabled:opacity-50">
                        <LogOut className="h-4 w-4" />
                        {processing ? 'Procesando...' : 'Finalizar Evento'}
                    </button>
                </div>
            </div>
        </div>
    );
}