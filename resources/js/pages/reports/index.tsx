import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { 
    ArrowLeft, 
    CheckSquare, 
    Printer, 
    Search, 
    Square, 
    ArrowRightCircle,
    UserCheck,
    FileText,
    Calendar,
    Zap
} from 'lucide-react';
import { useState } from 'react';

interface Guest {
    id: number;
    full_name: string;
    age: number | string;
    nationality: string;
    profession: string;
    civil_status: string;
    origin: string;
    identification_number: string;
    issued_in: string;
    room_number: string;
    role: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    nickname: string;
    full_name: string;
}

interface Props {
    auth: { user: User; active_register?: any };
    Entrantes: Guest[];
    Quedantes: Guest[];
    Salientes: Guest[];
    TargetDate: string; 
}

const civilStatusTranslations: Record<string, string> = {
    SINGLE: 'SOLTERO',
    MARRIED: 'CASADO',
    DIVORCED: 'DIVORCIADO',
    WIDOWED: 'VIUDO',
};

export default function ReportsIndex({ auth, Entrantes = [], Quedantes = [], Salientes = [], TargetDate }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(TargetDate || new Date().toISOString().split('T')[0]);

    // Calcular Correlativo
    const baseDate = new Date(2026, 3, 18);
    const [y, m, d] = selectedDate.split('-');
    const todayForCalc = new Date(Number(y), Number(m) - 1, Number(d));
    const diffDays = Math.floor((todayForCalc.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const numeroSerie = (6608 + diffDays).toString().padStart(6, '0');

    // Cambiar fecha
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        setSelectedIds([]); 
        setPdfUrl(null);
        router.get('/reports', { date: newDate }, { preserveState: true, preserveScroll: true });
    };

    // Función de filtrado por búsqueda
    const filterBySearch = (guests: Guest[]) => {
        return guests.filter((guest) =>
            guest.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guest.identification_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guest.room_number.toString().includes(searchTerm),
        );
    };

    const filteredEntrantes = filterBySearch(Entrantes);
    const filteredQuedantes = filterBySearch(Quedantes);
    const filteredSalientes = filterBySearch(Salientes);
    const totalFiltered = filteredEntrantes.length + filteredQuedantes.length + filteredSalientes.length;

    // Lista total para la vista previa
    const allGuests = [...Entrantes, ...Quedantes, ...Salientes];
    
    // Filtro para vista previa de derecha
    const selectedEntrantes = Entrantes.filter((g) => selectedIds.includes(g.id));
    const selectedQuedantes = Quedantes.filter((g) => selectedIds.includes(g.id));
    const selectedSalientes = Salientes.filter((g) => selectedIds.includes(g.id));

    const toggleSelection = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((sid) => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (totalFiltered === 0) return;
        const allVisibleIds = [
            ...filteredEntrantes.map(g => g.id),
            ...filteredQuedantes.map(g => g.id),
            ...filteredSalientes.map(g => g.id)
        ];
        
        const allSelected = allVisibleIds.every((id) => selectedIds.includes(id));

        if (allSelected) {
            setSelectedIds(selectedIds.filter((id) => !allVisibleIds.includes(id)));
        } else {
            const newIds = [...selectedIds];
            allVisibleIds.forEach((id) => {
                if (!newIds.includes(id)) newIds.push(id);
            });
            setSelectedIds(newIds);
        }
    };

    const isAllSelected = totalFiltered > 0 && 
        [...filteredEntrantes, ...filteredQuedantes, ...filteredSalientes].every(g => selectedIds.includes(g.id));

    // ACCIÓN: Generar PDF Manual (Solo los chequeados)
    const handleGenerateManual = () => {
        if (selectedIds.length === 0) return;
        const idsQuery = selectedIds.join(',');
        setPdfUrl(`/reports/generate-pdf?ids=${idsQuery}&date=${selectedDate}&t=${Date.now()}`);
    };

    // ACCIÓN: Generar PDF Automático (Agarra a TODOS en la tabla)
    const handleGenerateAuto = () => {
        if (allGuests.length === 0) return;
        const allIds = allGuests.map(g => g.id).join(',');
        setPdfUrl(`/reports/generate-pdf?ids=${allIds}&date=${selectedDate}&t=${Date.now()}`);
    };

    // Componente auxiliar para pintar filas izquierdas
    const renderGuestRow = (guest: Guest) => {
        const isSelected = selectedIds.includes(guest.id);
        return (
            <tr
                key={guest.id}
                onClick={() => toggleSelection(guest.id)}
                className={`cursor-pointer transition-colors hover:bg-blue-50 ${isSelected ? 'bg-blue-50' : ''}`}
            >
                <td className="border-r px-4 py-2 text-center">
                    <div className="flex justify-center">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-gray-300" />}
                    </div>
                </td>
                <td className="border-r bg-gray-50 px-2 py-3 text-center font-bold text-gray-900">{guest.room_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[150px]" title={guest.full_name}>{guest.full_name}</td>
            </tr>
        );
    };

    // Componente auxiliar para pintar filas derechas (Vista Previa)
    const renderPreviewRow = (guest: Guest, index: number) => (
        <tr key={guest.id} className="hover:bg-emerald-50/30 transition-colors">
            <td className="border-r border-gray-100 px-2 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20">{index + 1}</td>
            <td className="border-r border-gray-100 bg-gray-50/50 px-3 py-3 text-center font-bold text-gray-900">{guest.room_number}</td>
            <td className="px-4 py-3 font-bold text-gray-900">{guest.full_name}</td>
            <td className="px-2 py-3 text-center font-mono">{guest.age}</td>
            <td className="px-4 py-3">{guest.nationality || '-'}</td>
            <td className="px-4 py-3">{guest.profession || '-'}</td>
            <td className="px-4 py-3">{guest.civil_status ? (civilStatusTranslations[guest.civil_status] || guest.civil_status) : '-'}</td>
            <td className="px-4 py-3 font-bold uppercase text-gray-700">{guest.origin || '-'}</td>
            <td className="px-4 py-3 font-mono text-emerald-700 font-medium">{guest.identification_number || '-'}</td>
            <td className="px-4 py-3">{guest.issued_in || '-'}</td>
        </tr>
    );

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reportes" />
            <div className="mx-auto max-w-[98%] px-4 sm:px-6 lg:px-8">
                <button onClick={() => window.history.back()} className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                        <h2 className="text-3xl font-bold text-white">Generador de Parte Diario</h2>
                        <div className="flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 shadow-sm">
                            <span className="text-sm font-black tracking-widest text-emerald-300">Nº {numeroSerie}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-white/10 p-2 pr-4 backdrop-blur-md shadow-md border border-white/5">
                        <Calendar className="h-5 w-5 text-emerald-400 ml-2" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            max={new Date().toISOString().split('T')[0]}
                            className="bg-transparent border-none text-white font-bold focus:ring-0 cursor-pointer"
                        />
                    </div>
                </div>

                <div className="py-6">
                    {pdfUrl ? (
                        <div className="flex h-[calc(100vh-10rem)] -mt-6 w-full animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 zoom-in-95">
                            <div className="flex flex-col items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-6 py-4 sm:flex-row">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
                                    <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    Paso 2: Revisa tu Parte Diario
                                </h2>
                                <button onClick={() => setPdfUrl(null)} className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100">
                                    <ArrowLeft className="h-4 w-4" /> Volver a Selección
                                </button>
                            </div>
                            <div className="flex items-center justify-center gap-2 border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
                                <Printer className="h-4 w-4" />
                                <p>No olvides <b>imprimir el PDF</b> usando el botón de la impresora dentro del visor.</p>
                            </div>
                            <div className="flex-1 bg-gray-300/50 p-2">
                                <iframe src={pdfUrl} className="h-full w-full rounded border border-gray-300 bg-white shadow-inner" title="Reporte PDF" />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                            {/* COLUMNA IZQUIERDA (SELECCIÓN) */}
                            <div className="lg:col-span-5 flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                                <div className="border-b border-gray-200 bg-gray-50 p-4">
                                    <h3 className="mb-4 text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <Search className="h-5 w-5 text-gray-500" />
                                        Buscar y Seleccionar
                                    </h3>
                                    <div className="relative w-full">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Buscar por nombre, CI o habitación..."
                                            className="block w-full rounded-xl border-gray-300 bg-white py-2.5 pl-10 text-sm text-black focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                                        />
                                    </div>
                                    <div className="mt-2 text-xs font-medium text-gray-500">
                                        {totalFiltered} huéspedes en total con datos completos
                                    </div>
                                </div>

                               <div className="flex-1">
                                    <table className="w-full text-left text-xs text-gray-600">
                                        <thead className="bg-gray-100 text-xs font-bold text-gray-700 uppercase sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="w-8 border-r px-4 py-3 text-center bg-gray-100">
                                                    <button onClick={toggleSelectAll}>
                                                        {isAllSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-gray-400" />}
                                                    </button>
                                                </th>
                                                <th className="border-r px-2 py-3 text-center bg-gray-100 w-16">Hab</th>
                                                <th className="px-4 py-3 bg-gray-100">Huésped</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredEntrantes.length > 0 && (
                                                <>
                                                    <tr className="bg-gray-200"><td colSpan={3} className="font-bold text-center py-2 text-gray-700 uppercase tracking-widest border-y border-gray-300">Entrantes</td></tr>
                                                    {filteredEntrantes.map(renderGuestRow)}
                                                </>
                                            )}
                                            {filteredQuedantes.length > 0 && (
                                                <>
                                                    <tr className="bg-gray-200"><td colSpan={3} className="font-bold text-center py-2 text-gray-700 uppercase tracking-widest border-y border-gray-300">Quedantes</td></tr>
                                                    {filteredQuedantes.map(renderGuestRow)}
                                                </>
                                            )}
                                            {filteredSalientes.length > 0 && (
                                                <>
                                                    <tr className="bg-gray-200"><td colSpan={3} className="font-bold text-center py-2 text-gray-700 uppercase tracking-widest border-y border-gray-300">Salientes</td></tr>
                                                    {filteredSalientes.map(renderGuestRow)}
                                                </>
                                            )}
                                            {totalFiltered === 0 && (
                                                <tr><td colSpan={3} className="p-8 text-center text-gray-500">Nadie con datos completos en esta fecha.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA (VISTA PREVIA) */}
                            <div className="lg:col-span-7 flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl ring-1 ring-emerald-100">
                                <div className="flex flex-col justify-between gap-4 border-b border-emerald-100 bg-emerald-50/50 p-4 xl:flex-row xl:items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                                            <UserCheck className="h-5 w-5 text-emerald-600" /> Vista Previa del Documento
                                        </h3>
                                        <p className="text-xs text-emerald-600 font-medium mt-1">{selectedIds.length} Huéspedes seleccionados</p>
                                    </div>

                                    {(auth as any).active_register && (
                                        <div className="flex items-center gap-2 xl:ml-auto">
                                            <button
                                                onClick={handleGenerateManual}
                                                disabled={selectedIds.length === 0}
                                                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap shadow-sm transition-all ${
                                                    selectedIds.length > 0 ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95' : 'cursor-not-allowed border-gray-300 bg-gray-400 text-white opacity-50'
                                                }`}
                                            >
                                                <Printer className="h-4 w-4" /> Selección Manual
                                            </button>
                                            
                                            {/* EL NUEVO BOTÓN AUTOMÁTICO */}
                                            <button
                                                onClick={handleGenerateAuto}
                                                disabled={allGuests.length === 0}
                                                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap shadow-sm transition-all ${
                                                    allGuests.length > 0 ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 ring-2 ring-indigo-300 ring-offset-1' : 'cursor-not-allowed border-gray-300 bg-gray-400 text-white opacity-50'
                                                }`}
                                            >
                                                <Zap className="h-4 w-4" /> Todo Automático
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 bg-white pb-4">
                                    {selectedIds.length > 0 ? (
                                        <table className="w-full text-left text-xs text-gray-600 whitespace-nowrap">
                                            <thead className="bg-emerald-50 text-xs font-bold text-emerald-800 uppercase sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="w-8 border-r border-emerald-100 px-2 py-3 text-center">#</th>
                                                    <th className="border-r border-emerald-100 px-3 py-3 text-center">Hab</th>
                                                    <th className="px-4 py-3">Nombre Completo</th>
                                                    <th className="px-2 py-3 text-center">Edad</th>
                                                    <th className="px-4 py-3">Nacionalidad</th>
                                                    <th className="px-4 py-3">Profesión</th>
                                                    <th className="px-4 py-3">Est. Civil</th>
                                                    <th className="px-4 py-3">Procedencia</th>
                                                    <th className="px-4 py-3">CI / Pasaporte</th>
                                                    <th className="px-4 py-3">Otorgado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedEntrantes.length > 0 && (
                                                    <>
                                                        <tr className="bg-gray-100"><td colSpan={10} className="font-bold text-center py-2 text-gray-700 tracking-widest border-y border-gray-200">ENTRANTES</td></tr>
                                                        {selectedEntrantes.map((guest, idx) => renderPreviewRow(guest, idx))}
                                                    </>
                                                )}
                                                {selectedQuedantes.length > 0 && (
                                                    <>
                                                        <tr className="bg-gray-100"><td colSpan={10} className="font-bold text-center py-2 text-gray-700 tracking-widest border-y border-gray-200">QUEDANTES</td></tr>
                                                        {selectedQuedantes.map((guest, idx) => renderPreviewRow(guest, idx))}
                                                    </>
                                                )}
                                                {selectedSalientes.length > 0 && (
                                                    <>
                                                        <tr className="bg-gray-100"><td colSpan={10} className="font-bold text-center py-2 text-gray-700 tracking-widest border-y border-gray-200">SALIENTES</td></tr>
                                                        {selectedSalientes.map((guest, idx) => renderPreviewRow(guest, idx))}
                                                    </>
                                                )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="flex h-full flex-col items-center justify-center p-10 text-center text-gray-400 min-h-[300px]">
                                            <div className="rounded-full bg-gray-100 p-4 mb-3">
                                                <ArrowRightCircle className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <p className="font-medium">Lista vacía</p>
                                            <p className="text-xs mt-1">Haga click en "Todo Automático" o seleccione huéspedes.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}