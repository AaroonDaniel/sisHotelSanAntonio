import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { 
    ArrowLeft, 
    CheckSquare, 
    Printer, 
    Search, 
    Square, 
    ArrowRightCircle,
    UserCheck,
    FileText
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
    Guests: Guest[];
}

const civilStatusTranslations: Record<string, string> = {
    SINGLE: 'SOLTERO',
    MARRIED: 'CASADO',
    DIVORCED: 'DIVORCIADO',
    WIDOWED: 'VIUDO',
};

export default function ReportsIndex({ auth, Guests }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // CÁLCULO DEL CORRELATIVO: Base 006608 el 18 de Abril de 2026
    const baseDate = new Date(2026, 3, 18); // En JavaScript, los meses van de 0 a 11 (3 = Abril)
    baseDate.setHours(0, 0, 0, 0); // Ignorar la hora, solo nos importa el día
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculamos la diferencia en días
    const diffDays = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Sumamos los días al número base y rellenamos con ceros (ej. 006609)
    const baseNumber = 6608;
    const currentNumber = baseNumber + diffDays;
    const numeroSerie = currentNumber.toString().padStart(6, '0');
    
    // Filtro para la tabla izquierda (Búsqueda)
    const filteredGuests = Guests.filter(
        (guest) =>
            guest.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guest.identification_number
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            guest.room_number.toString().includes(searchTerm),
    );

    // Filtro para la tabla derecha (Solo seleccionados)
    const selectedGuestsList = Guests.filter((g) => selectedIds.includes(g.id));

    const toggleSelection = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((sid) => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (filteredGuests.length === 0) return;
        const allSelected = filteredGuests.every((g) =>
            selectedIds.includes(g.id),
        );

        if (allSelected) {
            const visibleIds = filteredGuests.map((g) => g.id);
            setSelectedIds(
                selectedIds.filter((id) => !visibleIds.includes(id)),
            );
        } else {
            const newIds = [...selectedIds];
            filteredGuests.forEach((g) => {
                if (!newIds.includes(g.id)) newIds.push(g.id);
            });
            setSelectedIds(newIds);
        }
    };

    const isAllSelected =
        filteredGuests.length > 0 &&
        filteredGuests.every((g) => selectedIds.includes(g.id));

    // ACCIÓN: Generar PDF
    const handleGenerateReport = () => {
        if (selectedIds.length === 0) return;
        const idsQuery = selectedIds.join(',');
        setPdfUrl(`/reports/generate-pdf?ids=${idsQuery}&t=${Date.now()}`);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reportes" />
            <div className="mx-auto max-w-[98%] px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => window.history.back()}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <h2 className="text-3xl font-bold text-white">
                        Generador de Parte Diario
                    </h2>
                    <div className="flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-3 py-1.5 shadow-sm">
                        <span className="text-sm font-black tracking-widest text-emerald-300">
                            Nº {numeroSerie}
                        </span>
                    </div>
                </div>

                <div className="py-6">
                    {pdfUrl ? (
                        /* VISTA PREVIA PDF */
                        <div className="flex h-[calc(100vh-10rem)] -mt-6 w-full animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 zoom-in-95">
                            <div className="flex flex-col items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-6 py-4 sm:flex-row">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
                                    <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    
                                </h2>

                                <button
                                    onClick={() => setPdfUrl(null)}
                                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Volver
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-2 border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
                                <Printer className="h-4 w-4" />
                                <p>
                                    No olvides <b>imprimir el PDF</b> usando el
                                    botón de la impresora dentro del visor.
                                </p>
                            </div>

                            <div className="flex-1 bg-gray-300/50 p-2">
                                <iframe
                                    src={pdfUrl}
                                    className="h-full w-full rounded border border-gray-300 bg-white shadow-inner"
                                    title="Reporte PDF"
                                />
                            </div>
                        </div>
                    ) : (
                        /* LAYOUT GRID DE DOS COLUMNAS */
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
                                        {filteredGuests.length} huéspedes encontrados
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto max-h-[600px]">
                                    <table className="w-full text-left text-xs text-gray-600">
                                        <thead className="bg-gray-100 text-xs font-bold text-gray-700 uppercase sticky top-0 z-10">
                                            <tr>
                                                <th className="w-8 border-r px-4 py-3 text-center bg-gray-100">
                                                    <button onClick={toggleSelectAll}>
                                                        {isAllSelected ? (
                                                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                                                        ) : (
                                                            <Square className="h-4 w-4 text-gray-400" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="border-r px-2 py-3 text-center bg-gray-100 w-16">Hab</th>
                                                <th className="px-4 py-3 bg-gray-100">Huésped</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredGuests.length > 0 ? (
                                                filteredGuests.map((guest) => {
                                                    const isSelected = selectedIds.includes(guest.id);
                                                    return (
                                                        <tr
                                                            key={`left-${guest.id}`}
                                                            onClick={() => toggleSelection(guest.id)}
                                                            className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                                                                isSelected ? 'bg-blue-50' : ''
                                                            }`}
                                                        >
                                                            <td className="border-r px-4 py-2 text-center">
                                                                <div className="flex justify-center">
                                                                    {isSelected ? (
                                                                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                                                                    ) : (
                                                                        <Square className="h-4 w-4 text-gray-300" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="border-r bg-gray-50 px-2 py-3 text-center font-bold text-gray-900">
                                                                {guest.room_number}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[150px]" title={guest.full_name}>
                                                                {guest.full_name}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="p-8 text-center text-gray-500">
                                                        Sin resultados.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA (VISTA PREVIA) */}
                            <div className="lg:col-span-7 flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl ring-1 ring-emerald-100">
                                <div className="flex flex-col justify-between gap-4 border-b border-emerald-100 bg-emerald-50/50 p-4 sm:flex-row sm:items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                                            <UserCheck className="h-5 w-5 text-emerald-600" />
                                            Vista Previa del Documento
                                        </h3>
                                        <p className="text-xs text-emerald-600 font-medium mt-1">
                                            {selectedIds.length} Huéspedes seleccionados
                                        </p>
                                    </div>

                                    {(auth as any).active_register && (
                                        <button
                                            onClick={handleGenerateReport}
                                            disabled={selectedIds.length === 0}
                                            className={`flex w-auto shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap shadow-sm transition-all xl:ml-auto ${
                                                selectedIds.length > 0
                                                    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
                                                    : 'cursor-not-allowed border-gray-300 bg-gray-400 text-white opacity-50'
                                            }`}
                                            title="Generar PDF con los huéspedes seleccionados"
                                        >
                                            <Printer className="h-5 w-5" />
                                            <span>Generar PDF</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-auto max-h-[600px] bg-white">
                                    {selectedGuestsList.length > 0 ? (
                                        <table className="w-full text-left text-xs text-gray-600 whitespace-nowrap">
                                            <thead className="bg-emerald-50 text-xs font-bold text-emerald-800 uppercase sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="w-8 border-r border-emerald-100 px-2 py-3 text-center bg-emerald-50">#</th>
                                                    <th className="border-r border-emerald-100 px-3 py-3 text-center bg-emerald-50">Hab</th>
                                                    <th className="px-4 py-3 bg-emerald-50">Nombre Completo</th>
                                                    <th className="px-2 py-3 text-center bg-emerald-50">Edad</th>
                                                    <th className="px-4 py-3 bg-emerald-50">Nacionalidad</th>
                                                    <th className="px-4 py-3 bg-emerald-50">Profesión</th>
                                                    <th className="px-4 py-3 bg-emerald-50">Est. Civil</th>
                                                    <th className="px-4 py-3 bg-emerald-50">Procedencia</th>
                                                    <th className="px-4 py-3 bg-emerald-50">CI / Pasaporte</th>
                                                    <th className="px-4 py-3 bg-emerald-50">Otorgado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedGuestsList.map((guest, index) => (
                                                    <tr key={`right-${guest.id}`} className="hover:bg-emerald-50/30 transition-colors">
                                                        <td className="border-r border-gray-100 px-2 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20">
                                                            {index + 1}
                                                        </td>
                                                        <td className="border-r border-gray-100 bg-gray-50/50 px-3 py-3 text-center font-bold text-gray-900">
                                                            {guest.room_number}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-gray-900">
                                                            {guest.full_name}
                                                        </td>
                                                        <td className="px-2 py-3 text-center font-mono">
                                                            {guest.age}
                                                        </td>
                                                        <td className="px-4 py-3">{guest.nationality || '-'}</td>
                                                        <td className="px-4 py-3">{guest.profession || '-'}</td>
                                                        <td className="px-4 py-3">
                                                            {guest.civil_status ? (civilStatusTranslations[guest.civil_status] || guest.civil_status) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold uppercase text-gray-700">{guest.origin || '-'}</td>
                                                        <td className="px-4 py-3 font-mono text-emerald-700 font-medium">
                                                            {guest.identification_number || '-'}
                                                        </td>
                                                        <td className="px-4 py-3">{guest.issued_in || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="flex h-full flex-col items-center justify-center p-10 text-center text-gray-400 min-h-[300px]">
                                            <div className="rounded-full bg-gray-100 p-4 mb-3">
                                                <ArrowRightCircle className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <p className="font-medium">Lista vacía</p>
                                            <p className="text-xs mt-1">Seleccione huéspedes de la lista izquierda.</p>
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