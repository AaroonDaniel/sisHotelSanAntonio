import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { ArrowLeft, CheckSquare, Printer, Search, Square } from 'lucide-react';
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
    auth: { user: User };
    Guests: Guest[];
}

export default function ReportsIndex({ auth, Guests }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const filteredGuests = Guests.filter((guest) =>
        guest.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.identification_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.room_number.toString().includes(searchTerm)
    );

    const toggleSelection = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (filteredGuests.length === 0) return;
        const allSelected = filteredGuests.every(g => selectedIds.includes(g.id));
        
        if (allSelected) {
            const visibleIds = filteredGuests.map(g => g.id);
            setSelectedIds(selectedIds.filter(id => !visibleIds.includes(id)));
        } else {
            const newIds = [...selectedIds];
            filteredGuests.forEach(g => {
                if (!newIds.includes(g.id)) newIds.push(g.id);
            });
            setSelectedIds(newIds);
        }
    };

    const isAllSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedIds.includes(g.id));

    // ACCIÓN: ABRIR EN NUEVA PESTAÑA
    const handleGenerateReport = () => {
        if (selectedIds.length === 0) return;
        const idsQuery = selectedIds.join(',');
        window.open(`/reports/generate-pdf?ids=${idsQuery}`, '_blank');
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

                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white">
                        Huéspedes en Casa
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        
                        {/* Header: Buscador y Botón */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-72">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre o CI..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-gray-500 font-medium">
                                    Total: {filteredGuests.length}
                                </div>
                                
                                {/* BOTÓN GENERAR REPORTE */}
                                <button
                                    onClick={handleGenerateReport}
                                    disabled={selectedIds.length === 0}
                                    className={`group flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 ${
                                        selectedIds.length > 0
                                            ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg'
                                            : 'bg-gray-400 cursor-not-allowed opacity-50'
                                    }`}
                                >
                                    <Printer className="h-5 w-5" />
                                    <span>
                                        Generar Reporte
                                        {selectedIds.length > 0 && ` (${selectedIds.length})`}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-bold">
                                    <tr>
                                        <th className="px-4 py-3 text-center border-r w-8">
                                            <button onClick={toggleSelectAll}>
                                                {isAllSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4" />}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-center border-r">Hab</th>
                                        <th className="px-4 py-3">Nombre Completo</th>
                                        <th className="px-2 py-3 text-center">Edad</th>
                                        <th className="px-4 py-3">Nacionalidad</th>
                                        <th className="px-4 py-3">Profesión</th>
                                        <th className="px-4 py-3">Est. Civil</th>
                                        <th className="px-4 py-3">Procedencia</th>
                                        <th className="px-4 py-3">CI / Pasap.</th>
                                        <th className="px-4 py-3">Otorgado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredGuests.length > 0 ? (
                                        filteredGuests.map((guest, index) => {
                                            const isSelected = selectedIds.includes(guest.id);
                                            return (
                                                <tr 
                                                    key={`${guest.id}-${index}`} 
                                                    onClick={() => toggleSelection(guest.id)} 
                                                    className={`cursor-pointer transition-colors hover:bg-blue-50 ${isSelected ? 'bg-blue-50' : ''}`}
                                                >
                                                    <td className="px-4 py-2 text-center border-r">
                                                        <div className="flex justify-center">
                                                            {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-gray-300" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-gray-900 bg-gray-50 border-r">
                                                        {guest.room_number}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                        {guest.full_name}
                                                    </td>
                                                    <td className="px-2 py-3 text-center">
                                                        {guest.age}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {guest.nationality || '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {guest.profession || '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {guest.civil_status || '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {guest.origin || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono font-medium text-gray-700">
                                                        {guest.identification_number || '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {guest.issued_in || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay huéspedes con datos completos.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}