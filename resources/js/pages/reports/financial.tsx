import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { 
    Printer, Calendar, Banknote, QrCode, Layers, FileText, 
    FileSpreadsheet, X, Loader2, ArrowLeft 
} from 'lucide-react';
import { useState, FormEventHandler } from 'react';

interface Props {
    auth: {
        user: User;
    };
    Filters?: {
        start_date?: string;
        end_date?: string;
    };
}

export default function FinancialReport({ auth, Filters }: Props) {
    const [fechaInicio, setFechaInicio] = useState(Filters?.start_date || '');
    const [fechaFin, setFechaFin] = useState(Filters?.end_date || '');
    const [tipoRegistro, setTipoRegistro] = useState<'efectivo' | 'bancos' | 'ambos'>('ambos');
    const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFin('');
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

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cierre de Caja" />
            
            {/* Contenedor principal ajustado para no generar scroll */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-4rem)]">
                
                {/* ENCABEZADO COMPACTO: Botón y título en la misma línea */}
                <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                    <button 
                        onClick={() => window.history.back()} 
                        className="group flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/50 transition-all hover:bg-gray-800"
                        title="Volver atrás"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-300 group-hover:text-white" />
                    </button>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        Cierre de Caja
                    </h2>
                </div>

                {/* ZONA DE CONTENIDO CENTRAL */}
                <div className="flex-1 flex justify-center items-start w-full">
                    
                    {/* VISTA PREVIA PDF */}
                    {pdfUrl && formato === 'pdf' ? (
                        <div className="w-full h-full flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                                <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
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
                            
                            <div className="flex-1 bg-gray-300/50 p-2 overflow-hidden">
                                <iframe
                                    src={pdfUrl}
                                    className="h-full w-full border border-gray-300 rounded shadow-inner bg-white"
                                    title="Reporte PDF"
                                />
                            </div>
                        </div>
                    ) : (
                        
                        /* TARJETA DEL FORMULARIO (Diseño amplio) */
                        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
                            
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <Printer className="h-5 w-5" />
                                    </div>
                                    Impresión de Reporte
                                </h2>
                            </div>

                            <form onSubmit={handleGenerar} className="p-6 md:p-8">
                                <div className="space-y-6">
                                    
                                    {/* Fechas */}
                                    <div className="flex flex-col sm:flex-row gap-5">
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
                                                    className="w-full rounded-lg border border-gray-400 py-2.5 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
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
                                                    className="w-full rounded-lg border border-gray-400 py-2.5 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tipo de Registro */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tipo de Registro</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setTipoRegistro('efectivo')}
                                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 transition-all ${tipoRegistro === 'efectivo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Banknote className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">Solo Efectivo</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTipoRegistro('bancos')}
                                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 transition-all ${tipoRegistro === 'bancos' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <QrCode className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">Bancos / QR</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTipoRegistro('ambos')}
                                                className={`flex items-center justify-center gap-2 rounded-xl border py-3 transition-all ${tipoRegistro === 'ambos' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Layers className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">Ambos</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Formato de Salida */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Formato de Salida</label>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormato('pdf')}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition-all ${formato === 'pdf' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileText className="h-5 w-5" />
                                                <span className="text-sm font-bold uppercase">Reporte PDF</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormato('excel')}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition-all ${formato === 'excel' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileSpreadsheet className="h-5 w-5" />
                                                <span className="text-sm font-bold uppercase">Formato Excel</span>
                                            </button>
                                        </div>
                                    </div>

                                </div>

                                <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-5">
                                    <button
                                        type="button"
                                        onClick={handleLimpiar}
                                        className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isGenerating || !fechaInicio || !fechaFin}
                                        className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
                                        ) : (
                                            <><Printer className="h-4 w-4" /> Generar Cierre</>
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