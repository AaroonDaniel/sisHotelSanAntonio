import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { 
    BookDown, 
    FileBarChart, 
    AlertTriangle, 
    X,
    FileText
} from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

// --- INTERFACES ---
interface User {
    id: number;
    name: string;
}

interface Props {
    auth: { user: User };
}

export default function ReportsIndex({ auth }: Props) {
    // Estado para el modal de error
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorDetails, setErrorDetails] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // --- FUNCIÓN PRINCIPAL: GENERAR LIBRO DIARIO ---
    const handleGenerateDailyBook = async () => {
        setLoading(true);
        try {
            // 1. Consultamos al backend si es posible generar
            const response = await axios.get('/reports/check-daily-book');
            
            if (response.data.can_generate) {
                // 2. Si todo ok, abrimos el PDF en nueva pestaña
                window.open('/reports/daily-book-pdf', '_blank');
            } else {
                // 3. Si hay error, mostramos el modal con los detalles
                setErrorDetails(response.data.details || []);
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error("Error al verificar estado", error);
            alert("Ocurrió un error al verificar los datos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user as any}>
            <Head title="Reportes y Libros" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">Centro de Reportes</h2>
                    <p className="text-gray-500 mt-1">Generación de documentos oficiales y estadísticas.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    
                    {/* --- TARJETA 1: LIBRO DIARIO --- */}
                    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BookDown className="h-24 w-24 text-amber-600" />
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-amber-100 p-3 text-amber-600">
                                <BookDown className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Libro Diario</h3>
                            <p className="mt-2 text-sm text-gray-500 mb-6">
                                Genera el PDF oficial para la Cámara Hotelera. Requiere que todos los huéspedes ocupantes tengan sus datos completos.
                            </p>
                            
                            <button
                                onClick={handleGenerateDailyBook}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                            >
                                {loading ? 'Verificando...' : 'Generar PDF'}
                            </button>
                        </div>
                    </div>

                    {/* --- TARJETA 2: REPORTE GENERAL (Placeholder) --- */}
                    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FileBarChart className="h-24 w-24 text-blue-600" />
                        </div>
                        <div className="p-6">
                            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-blue-100 p-3 text-blue-600">
                                <FileBarChart className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Reporte General</h3>
                            <p className="mt-2 text-sm text-gray-500 mb-6">
                                Estadísticas de ocupación e ingresos del mes actual.
                            </p>
                            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-400 cursor-not-allowed">
                                Próximamente
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* --- MODAL FLOTANTE DE ERROR (DATOS FALTANTES) --- */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header Rojo */}
                        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-red-700">
                                <AlertTriangle className="h-6 w-6" />
                                No se puede generar
                            </h3>
                            <button onClick={() => setShowErrorModal(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                                    <FileText className="h-7 w-7 text-red-600" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-800">Datos Incompletos</h4>
                                <p className="mt-1 text-sm text-gray-500">
                                    Para generar el Libro Diario, debes completar la información de los siguientes huéspedes activos:
                                </p>
                            </div>

                            {/* Lista de habitaciones con problemas */}
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-red-100 bg-red-50/50 p-3">
                                <ul className="space-y-2">
                                    {errorDetails.map((detail, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm font-medium text-red-800 bg-white p-2 rounded-lg border border-red-100 shadow-sm">
                                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <button 
                                onClick={() => setShowErrorModal(false)} 
                                className="rounded-xl bg-gray-800 px-6 py-2 text-sm font-bold text-white hover:bg-gray-700 transition shadow-md"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </AuthenticatedLayout>
    );
}