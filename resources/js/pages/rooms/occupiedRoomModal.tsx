import React from 'react';
import {
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Clock,
    CreditCard,
    FileText,
    User,
    Users,
    Utensils,
    X,
} from 'lucide-react';

interface ModalProps {
    show: boolean;
    onClose: () => void;
    checkin: any | null;
}

export default function OccupiedRoomModal({ show, onClose, checkin }: ModalProps) {
    if (!show || !checkin) return null;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('es-BO', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });

    return (
        <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in zoom-in-95">
            <div className="flex h-auto max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* HEADER CIAN */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-cyan-700 px-6 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-white/20 p-2">
                            <BedDouble className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Habitación {checkin.room?.number}</h2>
                            <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                                {checkin.room?.room_type?.name || 'Habitación'} • OCUPADA
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-white/20 transition">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        
                        {/* COLUMNA IZQUIERDA: HUÉSPEDES */}
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <User className="h-4 w-4 text-cyan-600" /> Huésped Titular
                                </h3>
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 font-bold text-xl uppercase">
                                        {checkin.guest?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-800 uppercase">{checkin.guest?.full_name}</p>
                                        <div className="mt-1 flex flex-col text-sm text-gray-500 font-mono">
                                            <span>CI: {checkin.guest?.identification_number} {checkin.guest?.issued_in}</span>
                                            {checkin.guest?.origin && <span className="text-xs">Procedencia: {checkin.guest.origin}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {checkin.companions?.length > 0 && (
                                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <Users className="h-4 w-4 text-purple-500" /> Acompañantes ({checkin.companions.length})
                                    </h3>
                                    <div className="divide-y divide-gray-100">
                                        {checkin.companions.map((comp: any, i: number) => (
                                            <div key={comp.id} className="flex items-center gap-3 py-3">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50 text-[10px] font-bold text-purple-600">{i + 1}</span>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700 uppercase">{comp.full_name}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono">CI: {comp.identification_number}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* COLUMNA DERECHA: ESTADÍA Y CONSUMOS */}
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <CalendarDays className="h-4 w-4 text-green-600" /> Detalles de Estadía
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase">Entrada</span>
                                        <span className="font-bold text-gray-800 capitalize">{formatDate(checkin.check_in_date)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase">Duración</span>
                                        <span className="flex items-center gap-1 font-bold text-gray-800"><Clock className="h-3 w-3" /> {checkin.duration_days} Noches</span>
                                    </div>
                                </div>
                                <div className="flex justify-between rounded-xl bg-green-50 px-4 py-3 border border-green-100">
                                    <span className="text-xs font-bold text-green-800 uppercase flex items-center gap-2"><CreditCard className="h-4 w-4"/> Adelanto</span>
                                    <span className="text-lg font-black text-green-700">{formatCurrency(checkin.advance_payment)}</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <Utensils className="h-4 w-4 text-orange-500" /> Consumo Extra
                                </h3>
                                {checkin.checkin_details?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {checkin.checkin_details.map((detail: any) => (
                                            <span key={detail.id} className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
                                                {detail.quantity > 1 && <span className="mr-1 rounded bg-orange-200 px-1 text-[10px]">{detail.quantity}x</span>}
                                                <CheckCircle2 className="h-3 w-3" /> {detail.service?.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm italic text-gray-400">Sin consumos adicionales.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex justify-end gap-3 border-t border-gray-100 bg-white p-4">
                    <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 uppercase">Cerrar</button>
                    <button 
                        onClick={() => window.open(`/checks/${checkin.id}/receipt`, '_blank')}
                        className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-bold text-white hover:bg-gray-800 uppercase"
                    >
                        Imprimir Recibo
                    </button>
                </div>
            </div>
        </div>
    );
}