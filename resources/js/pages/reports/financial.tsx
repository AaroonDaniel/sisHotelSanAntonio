// 1. Importas el Layout y tipos necesarios
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react'; // <-- CAMBIO 1: Importamos router
import { 
    Printer, Calendar, Banknote, QrCode, Layers, FileText, 
    FileSpreadsheet, X, Loader2, ArrowLeft, User as UserIcon,
    LogOut // <-- Aseguramos que el ícono LogOut esté importado
} from 'lucide-react';
import { useState, FormEventHandler } from 'react';

interface Props {
    auth: {
        user: User;
        active_register?: any; // <-- CAMBIO 2: Agregamos esto para que TypeScript no de error
    };
    users?: User[]; // Lista de usuarios enviada desde el backend
    Filters?: {
        start_date?: string;
        end_date?: string;
        user_id?: string;
    };
}

export default function FinancialReport({ auth, users = [], Filters }: Props) {
    // Estados del formulario
    const [fechaInicio, setFechaInicio] = useState(Filters?.start_date || '');
    const [fechaFin, setFechaFin] = useState(Filters?.end_date || '');
    const [userId, setUserId] = useState(Filters?.user_id || auth.user.id.toString());
    const [tipoRegistro, setTipoRegistro] = useState<'efectivo' | 'bancos' | 'ambos'>('ambos');
    const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf');

    // Estados de UI
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFin('');
        setUserId(auth.user.id.toString());
        setTipoRegistro('ambos');
        setFormato('pdf');
    };

    const handleGenerar: FormEventHandler = (e) => {
        e.preventDefault();
        
        if (!fechaInicio || !fechaFin) return;

        setIsGenerating(true);
        setPdfUrl(null);

        const params = new URLSearchParams({
            start_date: fechaInicio,
            end_date: fechaFin,
            user_id: userId,
            record_type: tipoRegistro,
        });

        setTimeout(() => {
            setIsGenerating(false);
            
            if (formato === 'pdf') {
                setPdfUrl(`/reports/financial/pdf?${params.toString()}&t=${Date.now()}`);
            } else {
                window.location.href = `/reports/financial/excel?${params.toString()}`;
            }
        }, 600); 
    };

    // 👇 CAMBIO 3: Función que apaga el interruptor en la base de datos sin usar Ziggy 👇
    const handleCerrarCaja = () => {
        if (confirm('¿Estás seguro de cerrar tu caja? Esta acción registrará la hora actual y no podrás deshacerla.')) {
            
            // 👇 1. Mostramos la ALERTA VISUAL que pediste justo antes de salir 👇
            alert('✅ CAJA CERRADA EXITOSAMENTE.\n\nTu turno ha finalizado. El sistema cerrará tu sesión por seguridad. ¡Buen descanso!');

            // 2. Llamamos al backend (Que ahora nos deslogueará y mandará al Login)
            router.post('/cash-registers/close');
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cierre de Caja" />
            
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-7 pb-10 flex flex-col h-[calc(120vh-5rem)]">
                
                {/* ENCABEZADO: Título, Volver y BOTÓN DE CIERRE DE TURNO */}
                {/* CAMBIO 4: Modificamos este contenedor para que el botón rojo quede a la derecha */}
                <div className="mb-4 flex-shrink-0 pt-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <button 
                            onClick={() => window.history.back()} 
                            className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-white transition-colors mb-4"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 transition-all group-hover:bg-gray-700">
                                <ArrowLeft className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-gray-400">Volver atrás</span>
                        </button>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                            Cierre de Caja
                        </h2>
                    </div>

                    {/* 👇 CAMBIO 5: Mostramos el botón rojo SOLO si el usuario tiene una caja abierta 👇 */}
                    {auth.active_register && (
                        <button 
                            onClick={handleCerrarCaja}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-500 active:scale-95 transition"
                        >
                            <LogOut className="h-5 w-5" />
                            Confirmar Cierre de Turno
                        </button>
                    )}
                </div>

                {/* ZONA DE CONTENIDO CENTRAL */}
                <div className="flex-1 flex justify-center items-start overflow-hidden pb-4">
                    
                    {/* VISTA PREVIA PDF */}
                    {pdfUrl && formato === 'pdf' ? (
                        <div className="w-full h-full flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    Previsualización de Reporte
                                </h2>
                                <button 
                                    onClick={() => setPdfUrl(null)} 
                                    className="rounded-full p-1.5 text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 shadow-sm transition"
                                    title="Cerrar Reporte"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <div className="flex-1 bg-gray-300/50 p-2">
                                <iframe
                                    src={pdfUrl}
                                    className="h-full w-full border border-gray-300 rounded shadow-inner bg-white"
                                    title="Reporte PDF"
                                />
                            </div>
                        </div>
                    ) : (
                        
                        /* TARJETA DEL FORMULARIO */
                        <div className="w-full max-w-2xl flex flex-col max-h-full overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
                            
                            {/* Header Formulario Fijo */}
                            <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <Printer className="h-5 w-5" />
                                    </div>
                                    Impresión de Reporte
                                </h2>
                            </div>

                            {/* Body Formulario */}
                            <form onSubmit={handleGenerar} className="flex flex-col flex-1 min-h-0">
                                
                                {/* ZONA DE INPUTS (CON SCROLL SI ES NECESARIO) */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    
                                    {/* 0. Usuario */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Usuario de Caja</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <UserIcon className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <select
                                                value={userId}
                                                onChange={(e) => setUserId(e.target.value)}
                                                className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0 appearance-none bg-white"
                                            >
                                                <option value="todos">Todos</option>
                                                {users && users.length > 0 ? (
                                                    users.map(user => (
                                                        <option key={user.id} value={user.id}>
                                                            {user.full_name || user.full_name} {user.id === auth.user.id ? '(Tú)' : ''}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value={auth.user.id}>
                                                        {auth.user.full_name} (Tú)
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 1. Fechas */}
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="w-full sm:w-1/2">
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Fecha de Inicio</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    value={fechaInicio}
                                                    onChange={(e) => setFechaInicio(e.target.value)}
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="w-full sm:w-1/2">
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Hasta qué fecha</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    value={fechaFin}
                                                    onChange={(e) => setFechaFin(e.target.value)}
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Tipo de Registro */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tipo de Registro</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setTipoRegistro('efectivo')}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'efectivo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Banknote className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">Solo Efectivo</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTipoRegistro('bancos')}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'bancos' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <QrCode className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">Bancos / QR</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTipoRegistro('ambos')}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'ambos' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Layers className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">Ambos</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 3. Formato */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Formato de Salida</label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormato('pdf')}
                                                className={`flex flex-1 sm:flex-none w-32 items-center justify-center gap-2 rounded-lg border py-2.5 transition-all ${formato === 'pdf' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileText className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">PDF</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormato('excel')}
                                                className={`flex flex-1 sm:flex-none w-32 items-center justify-center gap-2 rounded-lg border py-2.5 transition-all ${formato === 'excel' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileSpreadsheet className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">Excel</span>
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                {/* FOOTER DEL FORMULARIO (BOTONES SIEMPRE VISIBLES) */}
                                <div className="flex-shrink-0 flex justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={handleLimpiar}
                                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isGenerating || !fechaInicio || !fechaFin}
                                        className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 transition disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
                                        ) : (
                                            <><Printer className="h-4 w-4" /> Generar</>
                                        )}
                                    </button>
                                </div>

                            </form>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}