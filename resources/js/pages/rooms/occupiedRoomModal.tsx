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
    ChevronDown,
    ArrowRightLeft,
    Heart,
    FileText
} from 'lucide-react';

interface ModalProps {
    show: boolean;
    onClose: () => void;
    checkin: any | null;
    onTransfer: () => void;
}

export default function OccupiedRoomModal({ show, onClose, checkin, onTransfer }: ModalProps) {
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

    const formatDate = (dateString: string) => {
        if (!dateString) return '---';
        const date = new Date(dateString);

        const day = date.getDate();
        const month = date.toLocaleDateString('es-BO', { month: 'long' });
        const time = date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: true });
        const weekday = date.toLocaleDateString('es-BO', { weekday: 'long' });
        const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);

        return `${day} ${month} ${time} ${weekdayCapitalized}`;
    };

    const hasCompanions = checkin.companions && checkin.companions.length > 0;

    return (
        <div className="fixed inset-0 z-[50] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in zoom-in-95">
            <div className="flex h-auto max-h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Habitación {checkin.room?.number}</h2>
                            <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                {checkin.room?.room_type?.name || 'Habitación'} • {' '}
                                {checkin.room?.price?.bathroom_type === 'private' ? 'BAÑO PRIVADO' : 'BAÑO COMPARTIDO'} • {' '} 
                                OCUPADA
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
                        
                        {/* COLUMNA IZQUIERDA: HUÉSPEDES */}
                        <div className="space-y-4">
                            <h3 className="mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                Huesped
                            </h3>
                            
                            {!hasCompanions ? (
                                // CASO 1: SOLO TITULAR -> Pasamos checkin.origin
                                <StaticGuestCard guest={checkin.guest} origin={checkin.origin} />
                            ) : (
                                <>
                                    {/* CASO 2: HAY ACOMPAÑANTES -> Titular expandible recibe origin */}
                                    <ExpandableGuestCard 
                                        guest={checkin.guest} 
                                        isTitular={true} 
                                        origin={checkin.origin} // <--- AQUÍ SE PASA EL DATO
                                        isExpanded={expandedGuestId === checkin.guest?.id}
                                        onToggle={() => toggleExpand(checkin.guest?.id)}
                                    />
                                    
                                    {/* Los acompañantes NO reciben origin (es undefined) porque la procedencia es del grupo/titular */}
                                    {checkin.companions?.map((comp: any) => (
                                        <ExpandableGuestCard 
                                            key={comp.id}
                                            guest={comp} 
                                            isTitular={false} 
                                            isExpanded={expandedGuestId === comp.id}
                                            onToggle={() => toggleExpand(comp.id)}
                                        />
                                    ))}
                                </>
                            )}
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

                            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                                <h3 className="mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Acciones Administrativas
                                </h3>
                                <button
                                    onClick={onTransfer}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
                                >
                                    <ArrowRightLeft className="h-4 w-4" />
                                    Transferir / Unir a Grupo
                                </button>
                                <p className="mt-2 text-center text-[10px] text-gray-400">
                                    Mueve al huésped a otra habitación o agrégalo a un grupo existente.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 bg-white p-4">
                    <button onClick={handleClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 uppercase">Cerrar</button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const calculateAge = (dateString?: string) => {
    if (!dateString) return '---';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age + ' Años';
};

/** Grilla de 3 Columnas con los Datos (CON TRADUCCIÓN DE ESTADO CIVIL) */
function GuestDataGrid({ guest, origin }: { guest: any; origin?: string }) {
    
    const translateStatus = (status: string) => {
        if (!status) return '---';
        const map: Record<string, string> = {
            'single': 'SOLTERO',
            'married': 'CASADO',
            'divorced': 'DIVORCIADO',
            'widowed': 'VIUDO',
            'separated': 'SEPARADO',
            'SINGLE': 'SOLTERO',
            'MARRIED': 'CASADO',
            'DIVORCED': 'DIVORCIADO',
            'WIDOWED': 'VIUDO',
            'SEPARATED': 'SEPARADO'
        };
        return map[status] || map[status.toLowerCase()] || status.toUpperCase();
    };

    return (
        <div className="grid grid-cols-3 gap-x-4 gap-y-4 py-2">
            <InfoBox label="CI / Documento" value={guest.identification_number || '---'} />
            <InfoBox label="Expedido" value={guest.issued_in || '---'} />
            <InfoBox label="Nacionalidad" value={guest.nationality || 'BOLIVIANA'} />

            <InfoBox label="Estado Civil" value={translateStatus(guest.civil_status)} />
            <InfoBox label="Edad" value={calculateAge(guest.birth_date)} />
            <InfoBox label="Profesión" value={guest.profession || '---'} />

            {/* Ahora sí mostrará el dato real o '---' si está vacío */}
            <InfoBox label="Procedencia" value={origin || '---'} />
            
            <div className="col-span-2">
                <InfoBox label="Teléfono" value={guest.phone || '---'} />
            </div>
        </div>
    );
}
function StaticGuestCard({ guest, origin }: { guest: any; origin?: string }) {
    if (!guest) return null;
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-cyan-300 transition-colors">
            <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-4">
                
                <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase">{guest.full_name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Huésped 
                    </p>
                </div>
            </div>
            <GuestDataGrid guest={guest} origin={origin} />
        </div>
    );
}

function ExpandableGuestCard({ guest, isTitular, isExpanded, onToggle, origin }: any) {
    
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
                {/* CAMBIO: Se eliminó el div con el ícono/inicial y clases flex innecesarias */}
                <div>
                    <p className={`font-bold uppercase transition-all duration-500 ${isExpanded ? 'text-lg text-black' : 'text-sm text-gray-700'}`}>
                        {guest.full_name}
                    </p>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-300 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-cyan-600 shadow-sm' : ''}`} />
            </div>

            <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="pt-4 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-500">
                        <GuestDataGrid guest={guest} origin={origin} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoBox({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">
                {label}
            </span>
            <span className="text-xs font-bold text-gray-800 uppercase break-words leading-tight">
                {value}
            </span>
        </div>
    );
}