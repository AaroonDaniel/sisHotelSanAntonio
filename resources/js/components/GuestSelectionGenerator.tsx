import {
    ArrowLeft,
    ArrowRightCircle,
    CheckSquare,
    Printer,
    Search,
    Square,
    UserCheck,
    Zap,
} from 'lucide-react';
import { ReactNode, useState } from 'react';

export interface Guest {
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

const civilStatusTranslations: Record<string, string> = {
    SINGLE: 'SOLTERO',
    MARRIED: 'CASADO',
    DIVORCED: 'DIVORCIADO',
    WIDOWED: 'VIUDO',
};

export interface GuestSelectionGeneratorProps {
    entrantes: Guest[];
    quedantes: Guest[];
    salientes: Guest[];
    // Fecha para la que se arma el PDF (?date=... en generate-pdf).
    targetDate: string;
    // Se dispara justo cuando se (re)genera una vista previa de PDF, con
    // los IDs de huéspedes usados -- lo consume el modal de Cámara
    // Hotelera (ver camara-hotelera/index.tsx) para saber qué guardar al
    // tocar "Confirmar". La página standalone de /reports no lo necesita.
    onGenerated?: (ids: number[]) => void;
    // Acción de confirmación del paso 2 (ej. el botón "Confirmar" del
    // modal de Cámara Hotelera). Cuando se pasa, reemplaza al botón
    // "Volver a Selección" de la cabecera -- un botón de Cancelar
    // separado es redundante ahí porque el modal que lo envuelve ya
    // tiene su propia X para cerrar/cancelar todo.
    footer?: ReactNode;
    // Modo edición: precarga la selección de un parte ya guardado (ver
    // "Editar" en camara-hotelera/index.tsx) para poder editar sobre lo
    // que ya estaba elegido en vez de arrancar de cero. Solo se lee al
    // montar -- el padre debe remontar el componente (ej. con `key`) si
    // necesita reiniciar la selección para otro parte.
    initialSelectedIds?: number[];
}

/**
 * Núcleo reutilizable del "Generador de Parte Diario": buscador +
 * selección de huéspedes Entrantes/Quedantes/Salientes, vista previa y
 * generación del PDF (manual o automática). Extraído de
 * `pages/reports/index.tsx` para que la pantalla de Cámara Hotelera
 * (Fase 1) lo reuse dentro de un modal sin duplicar esta UI -- ver
 * property `footer` para el botón "Confirmar" que se agrega ahí.
 *
 * Todo el estado de selección/búsqueda/PDF vive ACÁ (no en el padre): el
 * padre solo entrega los datos de la fecha (`entrantes/quedantes/
 * salientes/targetDate`) y opcionalmente escucha `onGenerated`.
 */
export default function GuestSelectionGenerator({
    entrantes,
    quedantes,
    salientes,
    targetDate,
    onGenerated,
    footer,
    initialSelectedIds,
}: GuestSelectionGeneratorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>(
        initialSelectedIds ?? [],
    );
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const filterBySearch = (guests: Guest[]) => {
        // 🚀 Check-in diferido: full_name puede llegar en null (huésped aún
        // sin datos completos) — sin el fallback, .toLowerCase() sobre null
        // tumba todo el filtro.
        return guests.filter(
            (guest) =>
                (guest.full_name ?? '')
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                guest.identification_number
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                guest.room_number.toString().includes(searchTerm),
        );
    };

    const filteredEntrantes = filterBySearch(entrantes);
    const filteredQuedantes = filterBySearch(quedantes);
    const filteredSalientes = filterBySearch(salientes);
    const totalFiltered =
        filteredEntrantes.length +
        filteredQuedantes.length +
        filteredSalientes.length;

    const allGuests = [...entrantes, ...quedantes, ...salientes];

    const selectedEntrantes = entrantes.filter((g) =>
        selectedIds.includes(g.id),
    );
    const selectedQuedantes = quedantes.filter((g) =>
        selectedIds.includes(g.id),
    );
    const selectedSalientes = salientes.filter((g) =>
        selectedIds.includes(g.id),
    );

    const toggleSelection = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((sid) => sid !== id)
                : [...prev, id],
        );
    };

    const toggleSelectAll = () => {
        if (totalFiltered === 0) return;
        const allVisibleIds = [
            ...filteredEntrantes.map((g) => g.id),
            ...filteredQuedantes.map((g) => g.id),
            ...filteredSalientes.map((g) => g.id),
        ];

        setSelectedIds((prev) => {
            const allSelected = allVisibleIds.every((id) => prev.includes(id));
            if (allSelected) {
                return prev.filter((id) => !allVisibleIds.includes(id));
            }
            const newIds = [...prev];
            allVisibleIds.forEach((id) => {
                if (!newIds.includes(id)) newIds.push(id);
            });
            return newIds;
        });
    };

    const isAllSelected =
        totalFiltered > 0 &&
        [
            ...filteredEntrantes,
            ...filteredQuedantes,
            ...filteredSalientes,
        ].every((g) => selectedIds.includes(g.id));

    const handleGenerateManual = () => {
        if (selectedIds.length === 0) return;
        setPdfUrl(
            `/reports/generate-pdf?ids=${selectedIds.join(',')}&date=${targetDate}&t=${Date.now()}`,
        );
        onGenerated?.(selectedIds);
    };

    const handleGenerateAuto = () => {
        if (allGuests.length === 0) return;
        const allIds = allGuests.map((g) => g.id);
        setPdfUrl(
            `/reports/generate-pdf?ids=${allIds.join(',')}&date=${targetDate}&t=${Date.now()}`,
        );
        onGenerated?.(allIds);
    };

    // Filas de la tabla izquierda (selección). `categoria` + índice
    // garantiza key única aunque el mismo huésped aparezca en más de una
    // categoría el mismo día (ej: sale de una habitación y queda en otra).
    const renderGuestRow = (guest: Guest, categoria: string, index: number) => {
        const isSelected = selectedIds.includes(guest.id);
        return (
            <tr
                key={`${categoria}-${guest.id}-${index}`}
                onClick={() => toggleSelection(guest.id)}
                className={`cursor-pointer transition-colors hover:bg-blue-50 ${isSelected ? 'bg-blue-50' : ''}`}
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
                <td
                    className="max-w-[150px] truncate px-4 py-3 font-medium text-gray-900"
                    title={guest.full_name}
                >
                    {guest.full_name}
                </td>
            </tr>
        );
    };

    // Filas de la tabla derecha (vista previa).
    const renderPreviewRow = (
        guest: Guest,
        index: number,
        categoria: string,
    ) => (
        <tr
            key={`${categoria}-${guest.id}-${index}`}
            className="transition-colors hover:bg-emerald-50/30"
        >
            <td className="border-r border-gray-100 bg-emerald-50/20 px-2 py-3 text-center font-bold text-emerald-600">
                {index + 1}
            </td>
            <td className="border-r border-gray-100 bg-gray-50/50 px-3 py-3 text-center font-bold text-gray-900">
                {guest.room_number}
            </td>
            <td className="px-4 py-3 font-bold text-gray-900">
                {guest.full_name}
            </td>
            <td className="px-2 py-3 text-center font-mono">{guest.age}</td>
            <td className="px-4 py-3">{guest.nationality || '-'}</td>
            <td className="px-4 py-3">{guest.profession || '-'}</td>
            <td className="px-4 py-3">
                {guest.civil_status
                    ? civilStatusTranslations[guest.civil_status] ||
                      guest.civil_status
                    : '-'}
            </td>
            <td className="px-4 py-3 font-bold text-gray-700 uppercase">
                {guest.origin || '-'}
            </td>
            <td className="px-4 py-3 font-mono font-medium text-emerald-700">
                {guest.identification_number || '-'}
            </td>
            <td className="px-4 py-3">{guest.issued_in || '-'}</td>
        </tr>
    );

    if (pdfUrl) {
        return (
            <div className="flex w-full animate-in flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="flex flex-col items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-6 py-4 sm:flex-row">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
                        <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        Paso 2: Revisa tu Parte Diario
                    </h2>
                    <div className="flex items-center gap-2">
                        {footer ? (
                            footer
                        ) : (
                            <button
                                onClick={() => setPdfUrl(null)}
                                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                            >
                                <ArrowLeft className="h-4 w-4" /> Volver a
                                Selección
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-center gap-2 border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
                    <Printer className="h-4 w-4" />
                    <p>
                        No olvides <b>imprimir el PDF</b> usando el botón de la
                        impresora dentro del visor.
                    </p>
                </div>
                <div className="bg-gray-300/50 p-2">
                    <iframe
                        src={pdfUrl}
                        className="min-h-[1200px] w-full rounded border-0 bg-white shadow-inner"
                        title="Reporte PDF"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* COLUMNA IZQUIERDA (SELECCIÓN) */}
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl lg:col-span-5">
                <div className="border-b border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
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
                            className="block w-full rounded-xl border-gray-300 bg-white py-2.5 pl-10 text-sm text-black shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="mt-2 text-xs font-medium text-gray-500">
                        {totalFiltered} huéspedes en total con datos completos
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="sticky top-0 z-10 bg-gray-100 text-xs font-bold text-gray-700 uppercase shadow-sm">
                            <tr>
                                <th className="w-8 border-r bg-gray-100 px-4 py-3 text-center">
                                    <button onClick={toggleSelectAll}>
                                        {isAllSelected ? (
                                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                            <Square className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>
                                </th>
                                <th className="w-16 border-r bg-gray-100 px-2 py-3 text-center">
                                    Hab
                                </th>
                                <th className="bg-gray-100 px-4 py-3">
                                    Huésped
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredEntrantes.length > 0 && (
                                <>
                                    <tr className="bg-gray-200">
                                        <td
                                            colSpan={3}
                                            className="border-y border-gray-300 py-2 text-center font-bold tracking-widest text-gray-700 uppercase"
                                        >
                                            Entrantes
                                        </td>
                                    </tr>
                                    {filteredEntrantes.map((g, i) =>
                                        renderGuestRow(g, 'entrantes', i),
                                    )}
                                </>
                            )}
                            {filteredQuedantes.length > 0 && (
                                <>
                                    <tr className="bg-gray-200">
                                        <td
                                            colSpan={3}
                                            className="border-y border-gray-300 py-2 text-center font-bold tracking-widest text-gray-700 uppercase"
                                        >
                                            Quedantes
                                        </td>
                                    </tr>
                                    {filteredQuedantes.map((g, i) =>
                                        renderGuestRow(g, 'quedantes', i),
                                    )}
                                </>
                            )}
                            {filteredSalientes.length > 0 && (
                                <>
                                    <tr className="bg-gray-200">
                                        <td
                                            colSpan={3}
                                            className="border-y border-gray-300 py-2 text-center font-bold tracking-widest text-gray-700 uppercase"
                                        >
                                            Salientes
                                        </td>
                                    </tr>
                                    {filteredSalientes.map((g, i) =>
                                        renderGuestRow(g, 'salientes', i),
                                    )}
                                </>
                            )}
                            {totalFiltered === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="p-8 text-center text-gray-500"
                                    >
                                        Nadie con datos completos en esta fecha.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Atajo al final de la tabla: evita tener que subir hasta
                    el botón "Todo Automático" de la columna derecha cuando
                    la lista de huéspedes es larga. */}
                <div className="flex shrink-0 justify-end border-t border-gray-200 bg-gray-50 p-3">
                    <button
                        onClick={handleGenerateManual}
                        disabled={selectedIds.length === 0}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap shadow-sm transition-all ${
                            selectedIds.length > 0
                                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
                                : 'cursor-not-allowed border-gray-300 bg-gray-400 text-white opacity-50'
                        }`}
                    >
                        <Printer className="h-4 w-4" /> Generar
                    </button>
                </div>
            </div>

            {/* COLUMNA DERECHA (VISTA PREVIA) */}
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl ring-1 ring-emerald-100 lg:col-span-7">
                <div className="flex flex-col justify-between gap-4 border-b border-emerald-100 bg-emerald-50/50 p-4 xl:flex-row xl:items-center">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
                            <UserCheck className="h-5 w-5 text-emerald-600" />{' '}
                            Vista Previa del Documento
                        </h3>
                        <p className="mt-1 text-xs font-medium text-emerald-600">
                            {selectedIds.length} Huéspedes seleccionados
                        </p>
                    </div>

                    <div className="flex items-center gap-2 xl:ml-auto">
                        <button
                            onClick={handleGenerateManual}
                            disabled={selectedIds.length === 0}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap shadow-sm transition-all ${
                                selectedIds.length > 0
                                    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
                                    : 'cursor-not-allowed border-gray-300 bg-gray-400 text-white opacity-50'
                            }`}
                        >
                            <Printer className="h-4 w-4" /> Selección Manual
                        </button>

                        <button
                            onClick={handleGenerateAuto}
                            disabled={allGuests.length === 0}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold whitespace-nowrap shadow-sm transition-all ${
                                allGuests.length > 0
                                    ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1 hover:bg-indigo-500 active:scale-95'
                                    : 'cursor-not-allowed border-gray-300 bg-gray-400 text-white opacity-50'
                            }`}
                        >
                            <Zap className="h-4 w-4" /> Todo Automático
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-white pb-4">
                    {selectedIds.length > 0 ? (
                        <table className="w-full text-left text-xs whitespace-nowrap text-gray-600">
                            <thead className="sticky top-0 z-10 bg-emerald-50 text-xs font-bold text-emerald-800 uppercase shadow-sm">
                                <tr>
                                    <th className="w-8 border-r border-emerald-100 px-2 py-3 text-center">
                                        #
                                    </th>
                                    <th className="border-r border-emerald-100 px-3 py-3 text-center">
                                        Hab
                                    </th>
                                    <th className="px-4 py-3">
                                        Nombre Completo
                                    </th>
                                    <th className="px-2 py-3 text-center">
                                        Edad
                                    </th>
                                    <th className="px-4 py-3">Nacionalidad</th>
                                    <th className="px-4 py-3">Profesión</th>
                                    <th className="px-4 py-3">Est. Civil</th>
                                    <th className="px-4 py-3">Procedencia</th>
                                    <th className="px-4 py-3">
                                        CI / Pasaporte
                                    </th>
                                    <th className="px-4 py-3">Otorgado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {selectedEntrantes.length > 0 && (
                                    <>
                                        <tr className="bg-gray-100">
                                            <td
                                                colSpan={10}
                                                className="border-y border-gray-200 py-2 text-center font-bold tracking-widest text-gray-700"
                                            >
                                                ENTRANTES
                                            </td>
                                        </tr>
                                        {selectedEntrantes.map((guest, idx) =>
                                            renderPreviewRow(
                                                guest,
                                                idx,
                                                'entrantes',
                                            ),
                                        )}
                                    </>
                                )}
                                {selectedQuedantes.length > 0 && (
                                    <>
                                        <tr className="bg-gray-100">
                                            <td
                                                colSpan={10}
                                                className="border-y border-gray-200 py-2 text-center font-bold tracking-widest text-gray-700"
                                            >
                                                QUEDANTES
                                            </td>
                                        </tr>
                                        {selectedQuedantes.map((guest, idx) =>
                                            renderPreviewRow(
                                                guest,
                                                idx,
                                                'quedantes',
                                            ),
                                        )}
                                    </>
                                )}
                                {selectedSalientes.length > 0 && (
                                    <>
                                        <tr className="bg-gray-100">
                                            <td
                                                colSpan={10}
                                                className="border-y border-gray-200 py-2 text-center font-bold tracking-widest text-gray-700"
                                            >
                                                SALIENTES
                                            </td>
                                        </tr>
                                        {selectedSalientes.map((guest, idx) =>
                                            renderPreviewRow(
                                                guest,
                                                idx,
                                                'salientes',
                                            ),
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-10 text-center text-gray-400">
                            <div className="mb-3 rounded-full bg-gray-100 p-4">
                                <ArrowRightCircle className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="font-medium">Lista vacía</p>
                            <p className="mt-1 text-xs">
                                Haga click en "Todo Automático" o seleccione
                                huéspedes.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
