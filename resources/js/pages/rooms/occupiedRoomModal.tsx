import React, { useState } from 'react';
import {
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Clock,
    CreditCard,
    User,
    Users,
    Utensils,
    X,
    Fingerprint,
    Globe,
    MapPin,
    Briefcase,
    Calendar,
    Phone,
    ChevronDown
} from 'lucide-react';

interface ModalProps {
    show: boolean;
    onClose: () => void;
    checkin: any | null;
}

export default function OccupiedRoomModal({ show, onClose, checkin }: ModalProps) {
    // Usamos el ID del huésped para controlar cuál está desplegado
    const [expandedGuestId, setExpandedGuestId] = useState<number | null>(null);

    if (!show || !checkin) return null;

    const handleClose = () => {
        setExpandedGuestId(null);
        onClose();
    };

    const toggleExpand = (id: number) => {
        setExpandedGuestId(expandedGuestId === id ? null : id);
    };

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
            <div className="flex h-auto max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300">
                
                {/* HEADER CIAN ORIGINAL */}
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
                    <button onClick={handleClose} className="rounded-full p-1 hover:bg-white/20 transition">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* CONTENIDO SCROLLABLE */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        
                        {/* COLUMNA IZQUIERDA: HUÉSPEDES CON DESPLIEGUE */}
                        <div className="space-y-4">
                            <h3 className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                Ocupantes Registrados
                            </h3>
                            
                            {/* TITULAR EXPANDIBLE */}
                            <ExpandableGuestCard 
                                guest={checkin.guest} 
                                isTitular={true} 
                                isExpanded={expandedGuestId === checkin.guest?.id}
                                onToggle={() => toggleExpand(checkin.guest?.id)}
                            />

                            {/* ACOMPAÑANTES EXPANDIBLES */}
                            {checkin.companions?.map((comp: any) => (
                                <ExpandableGuestCard 
                                    key={comp.id}
                                    guest={comp} 
                                    isTitular={false} 
                                    isExpanded={expandedGuestId === comp.id}
                                    onToggle={() => toggleExpand(comp.id)}
                                />
                            ))}
                        </div>

                        {/* COLUMNA DERECHA: ESTADÍA Y CONSUMOS */}
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <CalendarDays className="h-4 w-4 text-green-600" /> Estadía
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase tracking-tighter">Entrada</span>
                                        <span className="font-bold text-gray-800 capitalize">{formatDate(checkin.check_in_date)}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-gray-400 uppercase tracking-tighter">Duración</span>
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
                                            <span key={detail.id} className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800 shadow-sm">
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

                {/* FOOTER ORIGINAL */}
                <div className="flex justify-end gap-3 border-t border-gray-100 bg-white p-4">
                    <button onClick={handleClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 uppercase">Cerrar</button>
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

/** * COMPONENTE HIJO PARA MANEJAR LA EXPANSIÓN
 * Incluye la lógica de crecimiento del icono y grid-rows
 */
function ExpandableGuestCard({ guest, isTitular, isExpanded, onToggle }: any) {
    if (!guest) return null;

    return (
        <div 
            onClick={onToggle}
            className={`transition-all duration-500 ease-in-out border rounded-2xl cursor-pointer overflow-hidden ${
                isExpanded 
                ? 'bg-white border-cyan-500 shadow-xl p-6 scale-[1.01]' 
                : 'bg-white border-gray-200 p-4 hover:border-cyan-300'
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* ICONO DINÁMICO: Se hace grande al expandir */}
                    <div className={`flex items-center justify-center rounded-full font-bold transition-all duration-500 shadow-sm ${
                        isExpanded 
                        ? 'h-16 w-16 text-2xl bg-cyan-700 text-white' 
                        : 'h-10 w-10 text-sm bg-cyan-50 text-cyan-700'
                    }`}>
                        {isTitular ? (
                            <User className={isExpanded ? 'h-8 w-8' : 'h-5 w-5'} />
                        ) : (
                            <span>{guest.full_name.charAt(0)}</span>
                        )}
                    </div>
                    
                    <div>
                        <p className={`font-bold uppercase transition-all duration-500 ${isExpanded ? 'text-lg text-black' : 'text-sm text-gray-700'}`}>
                            {guest.full_name}
                        </p>
                    </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-300 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-cyan-600 shadow-sm' : ''}`} />
            </div>

            {/* CONTENEDOR DE DATOS DESPLEGABLE (Grid Rows Animation) */}
            <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-500">
                        <div className="space-y-4">
                            <InfoBox icon={<Fingerprint />} label="CI / Documento" value={`${guest.identification_number || '---'} ${guest.issued_in || ''}`} />
                            <InfoBox icon={<Globe />} label="Nacionalidad" value={guest.nationality || 'BOLIVIANA'} />
                            <InfoBox icon={<MapPin />} label="Procedencia" value={guest.origin || 'No registrada'} />
                        </div>
                        <div className="space-y-4">
                            <InfoBox icon={<Briefcase />} label="Profesión" value={guest.profession || 'No registrada'} />
                            <InfoBox icon={<Calendar />} label="Fecha Nac." value={guest.birth_date || '---'} />
                            <InfoBox icon={<Phone />} label="Teléfono" value={guest.phone || '---'} />
                        </div>
                    </div>
                    
                
                </div>
            </div>
        </div>
    );
}

/**
 * SUB-COMPONENTE PARA LOS DATOS DETALLADOS
 */
function InfoBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-cyan-600 scale-90 opacity-80">{icon}</div>
            <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">{label}</p>
                <p className="text-xs font-bold text-gray-800 uppercase leading-tight">{value}</p>
            </div>
        </div>
    );
}