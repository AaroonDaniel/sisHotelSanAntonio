import BackButton from '@/components/BackButton';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { BedDouble, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Props {
    auth: { user: User };
    /**
     * Día operativo con el que arrancó la página (ya resuelto en el
     * backend con ReportController::operationalToday() — antes de la hora
     * de checkout del Schedule activo, esto sigue siendo el día de
     * calendario anterior).
     */
    date: string;
}

/**
 * Historial de "Control de Hospedaje": NO existe ninguna tabla de
 * "reportes guardados" — el checklist se reconstruye al vuelo para
 * cualquier fecha desde `checkins` (ver
 * ReportController::generateLodgingControlPdf()). Esta página es solo un
 * selector de fecha con ese mismo PDF embebido, para revisar un día
 * pasado sin tener que pasar por Habitaciones.
 */
export default function LodgingControlHistory({ date }: Props) {
    const { auth } = usePage<{ auth: { user: User } }>().props;
    const [selectedDate, setSelectedDate] = useState(date);
    // El backend es quien manda de verdad sobre el tope (día operativo
    // según la hora de checkout del Schedule activo); `date` ya viene
    // recortado desde ahí. Acá solo evitamos mostrar la flecha "siguiente"
    // cuando ya no serviría de nada (backend la recortaría de vuelta).
    const [maxDate] = useState(date);

    const src = `/reports/lodging-control/pdf?date=${selectedDate}&t=${Date.now()}`;

    const shiftDate = (deltaDays: number) => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const next = new Date(y, m - 1, d + deltaDays);
        setSelectedDate(next.toISOString().slice(0, 10));
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Historial · Control de Hospedaje" />

            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
                                <BedDouble className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    Control de Hospedaje
                                </h1>
                                <p className="text-sm text-gray-400">
                                    Revisá el checklist de cualquier día
                                    anterior
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-2 py-2">
                            <button
                                onClick={() => shiftDate(-1)}
                                className="rounded-full p-1.5 text-gray-300 transition-colors hover:bg-gray-700"
                                title="Día anterior"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <input
                                type="date"
                                value={selectedDate}
                                max={maxDate}
                                onChange={(e) =>
                                    e.target.value &&
                                    setSelectedDate(e.target.value)
                                }
                                className="cursor-pointer rounded-lg border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500"
                                style={{ colorScheme: 'dark' }}
                            />

                            <button
                                onClick={() => shiftDate(1)}
                                disabled={selectedDate >= maxDate}
                                className="rounded-full p-1.5 text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Día siguiente"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <BackButton to="/status" />
                </div>

                {/* Visor PDF -- 🚀 sin scroll propio: el iframe se estira a
                    una altura fija generosa (en vez de encajarlo al alto
                    disponible de la pantalla) para que el documento entero
                    se vea de una, y sea la página la que se desplaza, no un
                    scroll interno separado dentro del PDF. */}
                <div className="flex-1 rounded-2xl border border-gray-700 bg-gray-300/50 p-2">
                    <iframe
                        key={src}
                        src={src}
                        className="h-[1600px] w-full rounded border border-gray-300 bg-white shadow-inner"
                        title="Control de Hospedaje"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
