import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Clock,
    User,
    Utensils,
    X,
    ChevronDown,
    ArrowRightLeft,
    Banknote, // Icono para dinero
    Wallet,   // Icono para saldo
    AlertCircle // Icono para alertas
} from 'lucide-react';

// Importamos los componentes de accesibilidad del Dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ModalProps {
    show: boolean;
    onClose: () => void;
    checkin: any | null;
    onTransfer: () => void;
}

export default function OccupiedRoomModal({ show, onClose, checkin, onTransfer }: ModalProps) {

    const [expandedGuestId, setExpandedGuestId] = useState<number | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // --- FORMULARIO DE ADELANTO ---
    const { data: paymentData, setData: setPaymentData, post: postPayment, processing: processingPayment, reset: resetPayment } = useForm({
        amount: '',
        payment_method: 'EFECTIVO',
        qr_bank: '' 
    });

    if (!show || !checkin) return null;

    const handleClose = () => {
        setExpandedGuestId(null);
        setShowPaymentForm(false);
        setShowConfirmModal(false);
        resetPayment();
        onClose();
    };

    const toggleExpand = (id: number) => {
        setExpandedGuestId(expandedGuestId === id ? null : id);
    };

    // --- LÓGICA FINANCIERA ---
    // Estos valores se recalculan automáticamente cada vez que 'checkin' cambia (al hacer un pago exitoso)
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);

    const checkInDate = new Date(checkin.check_in_date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const days = diffDays > 0 ? diffDays : 1;

    const oldDebt = parseFloat(checkin.carried_balance || 0);
    const currentRoomCost = days * (checkin.room?.price?.amount || 0);
    const servicesCost = checkin.services?.reduce((acc: number, s: any) => 
        acc + (parseFloat(s.pivot.selling_price) * s.pivot.quantity), 0) || 0;
    
    // Suma de pagos existentes
    const totalPaid = checkin.payments?.reduce((acc: number, p: any) => 
        acc + parseFloat(p.amount), 0) || 0;

    const grandTotal = oldDebt + currentRoomCost + servicesCost;
    const balanceDue = grandTotal - totalPaid;

    // --- MANEJADORES DE PAGO ---
    
    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountValue = parseFloat(paymentData.amount);
        if (!amountValue || amountValue <= 0) return;
        if (paymentData.payment_method === 'QR' && !paymentData.qr_bank) return;
        
        setShowConfirmModal(true);
    };

    const confirmPayment = () => {
        // Usamos la URL manual como pediste
        const url = `/checkins/${checkin.id}/add-payment`;

        postPayment(url, {
            preserveScroll: true, // Mantiene la posición del scroll
            preserveState: true,  // Mantiene el estado de otros componentes
            onSuccess: () => {
                console.log(`✅ Pago registrado: ${paymentData.amount} Bs`);
                // Al ser exitoso, Inertia recargará 'checkin', y los cálculos de arriba se actualizarán solos.
                resetPayment();
                setShowPaymentForm(false);
                setShowConfirmModal(false);
            },
            onError: (errors) => {
                console.error("Error backend:", errors);
                // Aquí podrías mostrar un toast de error si tienes uno
            },
            onFinish: () => setShowConfirmModal(false)
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '---';
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-BO', { month: 'long' });
        const time = date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
        const weekday = date.toLocaleDateString('es-BO', { weekday: 'long' });
        const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        return `${day} ${month} ${time} ${weekdayCapitalized}`;
    };

    const hasCompanions = checkin.companions && checkin.companions.length > 0;
    const isTitular = true; 

    return (
        <>
            {/* MODAL PRINCIPAL */}
            <Dialog open={show} onOpenChange={handleClose}>
                <DialogContent 
                    className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-gray-50/50"
                    aria-describedby="main-desc"
                >
                    {/* ACCESIBILIDAD: Header oculto obligatorio */}
                    <DialogHeader className="sr-only">
                        <DialogTitle>Detalle de Habitación {checkin.room?.number}</DialogTitle>
                        <DialogDescription id="main-desc">
                            Gestión completa de la habitación {checkin.room?.number}.
                        </DialogDescription>
                    </DialogHeader>

                    {/* HEADER VISUAL */}
                    <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 shadow-sm z-10">
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
                                    <StaticGuestCard guest={checkin.guest} origin={checkin.origin} />
                                ) : (
                                    <>
                                        <ExpandableGuestCard 
                                            guest={checkin.guest} 
                                            isTitular={true} 
                                            origin={checkin.origin} 
                                            isExpanded={expandedGuestId === checkin.guest?.id}
                                            onToggle={() => toggleExpand(checkin.guest?.id)}
                                        />
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
                                
                                {/* --- SECCIÓN DE ESTADÍA Y CUENTAS --- */}
                                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <CalendarDays className="h-4 w-4 text-green-600" /> Estadía y Cuentas
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4 border-b border-gray-100 pb-4">
                                        <div>
                                            <span className="block text-xs text-gray-400 uppercase tracking-tighter">Entrada</span>
                                            <span className="font-bold text-gray-800 capitalize">{formatDate(checkin.check_in_date)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-400 uppercase tracking-tighter">Duración Actual</span>
                                            <span className="flex items-center gap-1 font-bold text-gray-800">
                                                <Clock className="h-3 w-3 text-blue-500" /> {days} Noches
                                            </span>
                                        </div>
                                    </div>

                                    {/* Resumen Financiero */}
                                    <div className="space-y-1 mb-4">
                                        {oldDebt > 0 && (
                                            <div className="flex justify-between text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                                <span className="font-bold">DEUDA ANTERIOR (TRANSFERENCIA):</span>
                                                <span className="font-bold">{formatCurrency(oldDebt)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Hospedaje Actual ({days} noches):</span>
                                            <span>{formatCurrency(currentRoomCost)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Consumos / Servicios:</span>
                                            <span>{formatCurrency(servicesCost)}</span>
                                        </div>
                                        <div className="border-t border-dashed border-gray-200 my-1"></div>
                                        <div className="flex justify-between text-sm font-bold text-gray-800">
                                            <span>TOTAL CONSUMIDO:</span>
                                            <span>{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>

                                    {/* --- BARRA DE ESTADO DE PAGOS --- */}
                                    <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Adelantado</span>
                                                <span className="text-sm font-bold text-green-600">{formatCurrency(totalPaid)}</span>
                                            </div>
                                            <div className="h-8 w-px bg-gray-200 mx-2"></div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo Pendiente</span>
                                                <span className={`text-lg font-black ${balanceDue > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                                    {formatCurrency(balanceDue)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* --- BOTÓN / FORMULARIO DE ADELANTO --- */}
                                        {!showPaymentForm ? (
                                            <button 
                                                onClick={() => setShowPaymentForm(true)}
                                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 transition shadow-sm"
                                            >
                                                <Banknote className="h-4 w-4" /> REGISTRAR NUEVO ADELANTO
                                            </button>
                                        ) : (
                                            <form onSubmit={handlePreSubmit} className="animate-in fade-in slide-in-from-top-2 bg-white p-3 rounded-lg border border-green-200 shadow-inner">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-green-700 uppercase flex items-center gap-1">
                                                        <Wallet className="h-3 w-3" /> Nuevo Pago
                                                    </span>
                                                    <button type="button" onClick={() => setShowPaymentForm(false)} className="text-gray-400 hover:text-red-500">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>

                                                <div className="relative mb-3">
                                                    <div className="flex flex-col gap-2">
                                                        {/* FILA SUPERIOR: SELECCIÓN DE MÉTODO + MONTO */}
                                                        <div className="flex gap-2">
                                                            <div className="w-1/2">
                                                                <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">Método</label>
                                                                <div className="flex rounded-lg bg-gray-100 p-0.5">
                                                                    {['EFECTIVO', 'QR'].map((method) => (
                                                                        <button
                                                                            key={method}
                                                                            type="button"
                                                                            onClick={() => setPaymentData(prev => ({ 
                                                                                ...prev, 
                                                                                payment_method: method,
                                                                                qr_bank: method === 'QR' ? prev.qr_bank : '' 
                                                                            }))}
                                                                            className={`flex-1 rounded py-1 text-[8px] font-bold transition-all ${
                                                                                paymentData.payment_method === method
                                                                                    ? method === 'QR' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-green-700 shadow-sm ring-1 ring-gray-200'
                                                                                    : 'text-gray-400 hover:text-gray-600'
                                                                            }`}
                                                                        >
                                                                            {method}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="w-1/2">
                                                                <label className="mb-1 block text-[10px] font-bold text-gray-500 uppercase">Monto</label>
                                                                <div className="relative">
                                                                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-gray-400">Bs</span>
                                                                    <input
                                                                        type="number" step="0.50" min="0" autoFocus
                                                                        value={paymentData.amount}
                                                                        onChange={(e) => setPaymentData('amount', e.target.value)}
                                                                        className="w-full h-[26px] rounded border border-gray-300 pl-6 pr-2 text-xs font-bold text-gray-800 focus:border-green-500 focus:ring-green-500"
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* FILA INFERIOR: BANCO QR */}
                                                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${paymentData.payment_method === 'QR' ? 'max-h-20 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                                            <label className="text-[9px] font-bold text-purple-600 uppercase ml-1 mb-1 block">Banco (QR)</label>
                                                            <div className="grid grid-cols-4 gap-1">
                                                                {[{ id: 'YAPE', color: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500' }, { id: 'FIE', color: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500' }, { id: 'BNB', color: 'bg-green-50 text-green-700 border-green-200 ring-green-500' }, { id: 'ECO', color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500' }].map((banco) => (
                                                                    <button
                                                                        key={banco.id}
                                                                        type="button"
                                                                        onClick={() => setPaymentData('qr_bank', banco.id)}
                                                                        className={`rounded border px-0.5 py-1 text-[8px] font-bold transition-all active:scale-95 ${
                                                                            paymentData.qr_bank === banco.id
                                                                                ? `ring-1 ring-offset-0 scale-105 shadow-sm ${banco.color}`
                                                                                : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'
                                                                        }`}
                                                                    >
                                                                        {banco.id}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* ERROR VISUAL */}
                                                        {Number(paymentData.amount) > 0 && paymentData.payment_method === 'QR' && !paymentData.qr_bank && (
                                                            <div className="flex items-center justify-center gap-1 rounded bg-red-50 p-1 text-[9px] font-bold text-red-600 animate-pulse">
                                                                <AlertCircle className="h-3 w-3" />
                                                                Seleccione un banco
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <button 
                                                    type="submit" 
                                                    disabled={processingPayment || !paymentData.amount || (paymentData.payment_method === 'QR' && !paymentData.qr_bank)}
                                                    className="w-full rounded bg-green-600 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {processingPayment ? 'Guardando...' : 'CONFIRMAR PAGO'}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>

                                {/* --- SECCIÓN DE CONSUMOS --- */}
                                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <h3 className="mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <Utensils className="h-4 w-4 text-orange-500" /> Consumo Extra
                                    </h3>
                                    {checkin.services?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {checkin.services.map((service: any) => (
                                                <span key={service.id} className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800 shadow-sm">
                                                    {service.pivot.quantity > 1 && <span className="mr-1 rounded bg-orange-200 px-1 text-[10px]">{service.pivot.quantity}x</span>}
                                                    <CheckCircle2 className="h-3 w-3" /> {service.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm italic text-gray-400">Sin consumos adicionales.</p>
                                    )}
                                </div>

                                {/* --- ACCIONES ADMINISTRATIVAS --- */}
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

                    {/* FOOTER */}
                    <div className="flex justify-end gap-3 border-t border-gray-100 bg-white p-4">
                        <button onClick={handleClose} className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 uppercase">Cerrar</button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* --- MODAL DE CONFIRMACIÓN DE PAGO (ACCESIBILIDAD CORREGIDA) --- */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent 
                    className="sm:max-w-[380px] p-6 text-center bg-white rounded-2xl border-none shadow-2xl"
                    aria-describedby="confirm-desc"
                >
                    {/* Header Oculto para Accesibilidad */}
                    <DialogHeader className="sr-only">
                        <DialogTitle>Confirmar Adelanto</DialogTitle>
                        <DialogDescription id="confirm-desc">
                            Confirme que desea registrar un adelanto de {paymentData.amount} Bs.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border-2 border-green-100 shadow-sm">
                        <Banknote className="h-7 w-7 text-green-600" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800 tracking-tight">¿Confirmar Adelanto?</h3>
                    <p className="mb-6 text-sm text-gray-500 leading-relaxed">
                        Se registrará un pago de <br/>
                        <strong className="text-2xl text-slate-900 block my-2 tracking-tight">{formatCurrency(parseFloat(paymentData.amount || '0'))}</strong>
                        mediante <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 uppercase border border-gray-200">
                            {paymentData.payment_method} {paymentData.qr_bank ? `(${paymentData.qr_bank})` : ''}
                        </span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setShowConfirmModal(false)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmPayment}
                            className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 shadow-lg shadow-green-200 transition transform active:scale-[0.98]"
                        >
                            Sí, Registrar
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ============================================================================
// COMPONENTES AUXILIARES (SE MANTIENEN IGUAL)
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