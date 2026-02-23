import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { 
    ArrowLeft, Printer, Calendar, Banknote, QrCode, TrendingUp, User, ArrowRightLeft, 
    BarChart3, X, PieChart, FileText, FileSpreadsheet, ChevronDown, Download, Building2
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Payment {
    id: number;
    user_name: string;
    amount: number;
    method: string;
    bank_name: string | null;
    type: string;
    date: string;
    time: string;
    room_number: string;
    guest_name: string;
}

interface Props {
    auth: { user: any };
    Payments: Payment[];
    Filters: {
        start_date: string;
        end_date: string;
    };
}

export default function FinancialReport({ auth, Payments, Filters }: Props) {
    const [startDate, setStartDate] = useState(Filters.start_date);
    const [endDate, setEndDate] = useState(Filters.end_date);
    const [showCharts, setShowCharts] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFilter = () => {
        router.get('/reports/financial', { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const handlePrintPDF = () => {
        setShowExportMenu(false);
        window.open(`/reports/financial/pdf?start_date=${startDate}&end_date=${endDate}`, '_blank');
    };

    const handleExportExcel = () => {
        setShowExportMenu(false);
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Fecha,Hora,Cajero,Habitacion,Huesped,Metodo,Entidad Bancaria,Tipo,Monto\n";
        
        Payments.forEach(p => {
            const guest = `"${p.guest_name.replace(/"/g, '""')}"`;
            const row = [
                p.date, 
                p.time, 
                `"${p.user_name}"`, 
                p.room_number, 
                guest, 
                p.method, 
                p.bank_name || 'N/A', 
                p.type, 
                p.type === 'DEVOLUCION' ? -p.amount : p.amount
            ];
            csvContent += row.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Cierre_Caja_${startDate}_al_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // --- CÁLCULOS ESTADÍSTICOS ---
    const calc = Payments.reduce(
        (acc, p) => {
            const monto = p.type === 'DEVOLUCION' ? -p.amount : p.amount;
            acc.total += monto;
            
            // Agrupación General (Efectivo vs QR)
            if (p.method === 'EFECTIVO') {
                acc.efectivo += monto;
            } else {
                acc.qr += monto;
                // 🚀 AGRUPACIÓN ESPECÍFICA POR BANCO (SOLO QR)
                if (monto > 0) {
                    const banco = p.bank_name ? p.bank_name.toUpperCase() : 'OTROS QR';
                    acc.bancos[banco] = (acc.bancos[banco] || 0) + monto;
                }
            }
            
            if (p.type === 'DEVOLUCION') acc.devoluciones += Math.abs(monto);

            if (!acc.porUsuario[p.user_name]) acc.porUsuario[p.user_name] = 0;
            acc.porUsuario[p.user_name] += monto;

            return acc;
        },
        { 
            total: 0, 
            efectivo: 0, 
            qr: 0, 
            devoluciones: 0, 
            porUsuario: {} as Record<string, number>, 
            bancos: {} as Record<string, number> 
        }
    );

    const totalMetodos = calc.efectivo + calc.qr;
    const pctEfectivo = totalMetodos > 0 ? (calc.efectivo / totalMetodos) * 100 : 0;
    const pctQr = totalMetodos > 0 ? (calc.qr / totalMetodos) * 100 : 0;
    
    // 🚀 VALOR MÁXIMO DEL BANCO QUE MÁS RECAUDÓ PARA CALCULAR LA BARRA AL 100%
    const maxBancoValue = Object.values(calc.bancos).length > 0 ? Math.max(...Object.values(calc.bancos)) : 1;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cierre de Caja" />
            <div className="mx-auto max-w-[98%] px-4 sm:px-6 lg:px-8 pb-12 pt-4">
                
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button onClick={() => window.history.back()} className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mb-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 transition-all group-hover:bg-gray-700">
                                <ArrowLeft className="h-4 w-4" />
                            </div>
                            <span>Volver atrás</span>
                        </button>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <TrendingUp className="h-7 w-7 text-emerald-400" />
                            </div>
                            Informe Financiero
                        </h2>
                    </div>
                </div>

                <div className="mb-6 flex flex-col lg:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-200/50">
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <div className="flex items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-bold uppercase text-gray-400 px-2">Desde</span>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 rounded-lg border-transparent bg-white text-sm font-medium text-gray-700 focus:border-emerald-500 focus:ring-emerald-500 shadow-sm" />
                        </div>
                        <div className="flex items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-bold uppercase text-gray-400 px-2">Hasta</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 rounded-lg border-transparent bg-white text-sm font-medium text-gray-700 focus:border-emerald-500 focus:ring-emerald-500 shadow-sm" />
                        </div>
                        <button onClick={handleFilter} className="flex h-12 items-center gap-2 rounded-xl bg-gray-900 px-6 text-sm font-bold text-white hover:bg-emerald-600 transition-colors shadow-sm ml-1">
                            <Calendar className="h-4 w-4" /> Consultar
                        </button>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        <button onClick={() => setShowCharts(!showCharts)} className={`flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-bold transition-all shadow-sm border ${showCharts ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                            {showCharts ? <X className="h-4 w-4" /> : <BarChart3 className="h-4 w-4 text-emerald-600" />}
                            {showCharts ? 'Cerrar Panel Visual' : 'Ver Estadísticas'}
                        </button>

                        <div className="relative" ref={exportMenuRef}>
                            <button onClick={() => setShowExportMenu(!showExportMenu)} disabled={Payments.length === 0} className={`flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition-all shadow-md ${Payments.length > 0 ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-gray-300 cursor-not-allowed text-gray-500'}`}>
                                <Download className="h-4 w-4" /> Exportar Datos <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                            </button>
                            
                            {showExportMenu && Payments.length > 0 && (
                                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-1.5">
                                        <button onClick={handlePrintPDF} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors">
                                            <div className="p-1.5 bg-red-100 text-red-600 rounded-lg"><FileText className="h-4 w-4" /></div> Reporte PDF
                                        </button>
                                        <button onClick={handleExportExcel} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                                            <div className="p-1.5 bg-green-100 text-green-600 rounded-lg"><FileSpreadsheet className="h-4 w-4" /></div> Formato Excel (CSV)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`grid grid-cols-1 ${showCharts ? 'lg:grid-cols-12' : ''} gap-6 transition-all duration-500 items-start`}>
                    
                    {/* IZQUIERDA: DASHBOARD VISUAL */}
                    {showCharts && (
                        <div className="lg:col-span-4 flex flex-col gap-6 animate-in slide-in-from-left-4 fade-in duration-500">
                            
                            {/* Tarjeta de Ingresos Totales */}
                            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-lg relative overflow-hidden">
                                <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Generado</p>
                                <p className="text-4xl font-black text-gray-900">{calc.total.toFixed(2)} <span className="text-lg text-emerald-700 font-bold">Bs</span></p>
                                
                                {calc.devoluciones > 0 && (
                                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-50/80 p-3 border border-red-100">
                                        <div className="bg-white rounded-full p-1 shadow-sm"><ArrowRightLeft className="h-3 w-3 text-red-500" /></div>
                                        <span className="text-xs font-bold text-red-700">Se devolvieron {calc.devoluciones.toFixed(2)} Bs</span>
                                    </div>
                                )}
                            </div>

                            {/* Dona: Macro Agrupación */}
                            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col items-center">
                                <h3 className="w-full mb-6 text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                                    <PieChart className="h-4 w-4" /> Físico vs Digital
                                </h3>
                                
                                <div className="flex w-full items-center justify-between px-2">
                                    <div className="relative h-28 w-28 rounded-full shadow-sm flex items-center justify-center" style={{ background: `conic-gradient(#10b981 0% ${pctEfectivo}%, #6366f1 ${pctEfectivo}% 100%)` }}>
                                        <div className="absolute h-16 w-16 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                                            <span className="text-[10px] font-bold text-gray-400">100%</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-4">
                                        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 min-w-[100px]">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500"><div className="h-2 w-2 rounded-full bg-emerald-500"></div>EFECTIVO</div>
                                            <p className="text-base font-black text-gray-800 mt-0.5">{pctEfectivo.toFixed(0)}%</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 min-w-[100px]">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500"><div className="h-2 w-2 rounded-full bg-indigo-500"></div>DIGITAL (QR)</div>
                                            <p className="text-base font-black text-gray-800 mt-0.5">{pctQr.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 🚀 EL APARTADO QUE PEDISTE: TOP ENTIDADES BANCARIAS QR */}
                            {Object.keys(calc.bancos).length > 0 && (
                                <div className="rounded-3xl border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/20 p-6 shadow-md relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-5"><Building2 className="h-24 w-24 text-indigo-500" /></div>
                                    <h3 className="mb-5 text-xs font-bold uppercase text-indigo-500 flex items-center gap-2">
                                        <QrCode className="h-4 w-4" /> Top Entidades Bancarias (QR)
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {Object.entries(calc.bancos)
                                            .sort(([, a], [, b]) => b - a) // 🚀 Ordena de mayor a menor automáticamente
                                            .map(([banco, monto], index) => {
                                                const pct = (monto / maxBancoValue) * 100;
                                                // El banco #1 (index 0) tiene un color más fuerte
                                                const isTop = index === 0;
                                                
                                                return (
                                                    <div key={banco} className="group relative z-10">
                                                        <div className="flex justify-between items-end mb-1">
                                                            <span className={`text-[11px] font-black tracking-wide ${isTop ? 'text-indigo-800' : 'text-gray-600'}`}>
                                                                {isTop && <span className="text-amber-500 mr-1">★</span>}
                                                                {banco}
                                                            </span>
                                                            <span className={`text-sm font-black ${isTop ? 'text-indigo-600' : 'text-gray-800'}`}>
                                                                {monto.toFixed(2)} Bs
                                                            </span>
                                                        </div>
                                                        <div className="h-2.5 w-full bg-gray-200/60 rounded-full overflow-hidden shadow-inner">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isTop ? 'bg-indigo-600' : 'bg-indigo-400/80'}`} 
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Rendimiento Recepcionistas */}
                            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                                <h3 className="mb-4 text-xs font-bold uppercase text-gray-400 flex items-center gap-2">
                                    <User className="h-4 w-4" /> Recaudado por Usuario
                                </h3>
                                <div className="space-y-2">
                                    {Object.entries(calc.porUsuario)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([nombre, monto]) => (
                                        <div key={nombre} className="flex justify-between items-center bg-gray-50/80 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                                            <span className="text-sm font-bold text-gray-700 truncate max-w-[150px]">{nombre}</span>
                                            <span className="text-sm font-black text-gray-900 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">{monto.toFixed(2)} Bs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DERECHA: TABLA MEJORADA */}
                    <div className={`${showCharts ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-500`}>
                        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden h-[780px] flex flex-col">
                            <div className="border-b border-gray-100 bg-white p-5 flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-emerald-600" />
                                    Registro de Movimientos
                                </h3>
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{Payments.length} registros</span>
                            </div>
                            
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left whitespace-nowrap">
                                    <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="px-6 py-4">Fecha / Hora</th>
                                            <th className="px-4 py-4 text-center">Hab</th>
                                            <th className="px-6 py-4">Huésped</th>
                                            <th className="px-6 py-4">Tipo de Pago</th>
                                            <th className="px-6 py-4 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Payments.length > 0 ? Payments.map((p) => {
                                            const isDevolucion = p.type === 'DEVOLUCION';
                                            return (
                                                <tr key={p.id} className={`transition-colors hover:bg-gray-50/80 ${isDevolucion ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900 text-sm">{p.date}</div>
                                                        <div className="text-[11px] text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                                                            <span>{p.time}</span> • <span>{p.user_name.split(' ')[0]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-xs font-bold text-gray-700 border border-gray-200">
                                                            {p.room_number}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-gray-800 truncate max-w-[180px]" title={p.guest_name}>
                                                            {p.guest_name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {p.method === 'EFECTIVO' ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60 shadow-sm">
                                                                <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                                                                EFECTIVO
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/60 shadow-sm">
                                                                <QrCode className="h-3.5 w-3.5 text-indigo-500" />
                                                                {p.method} {p.bank_name ? <span className="opacity-60 font-black tracking-wide">• {p.bank_name.toUpperCase()}</span> : ''}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right text-base font-black ${isDevolucion ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {isDevolucion && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mr-2 uppercase tracking-wide">Devol.</span>}
                                                        {isDevolucion ? '-' : ''}{p.amount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5}>
                                                    <div className="flex h-[400px] flex-col items-center justify-center p-10 text-center text-gray-400">
                                                        <div className="bg-gray-50 p-6 rounded-full mb-4">
                                                            <TrendingUp className="h-10 w-10 text-gray-300" />
                                                        </div>
                                                        <p className="text-lg font-bold text-gray-600">No se encontraron movimientos financieros</p>
                                                        <p className="text-sm mt-1 text-gray-400">Intente ampliando el rango de fechas en la parte superior.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}