import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    BedDouble,
    CalendarDays,
    ClipboardList,
    FileBarChart,
    Hotel,
    Receipt,
    SprayCan,
    Users,
    Wrench,
    Building,
    Layers,
    Tag,
    BookDown,
    AlertTriangle, // Icono para modal de error
    X,             // Icono cerrar
    FileText,
    Briefcase,       // Icono archivo
} from 'lucide-react';
import { useState } from 'react';
import axios from 'axios'; // Importamos axios para la petición
import { url } from 'inspector';

// Interfaces Locales
interface User {
    id: number;
    name: string;
    email: string;
    nickname?: string;
    full_name?: string;
    [key: string]: any; 
}

interface DashboardProps {
    auth: {
        user: User;
    };
}

const hotelModules = [
    {
        title: 'Parámetros',
        theme: 'blue',
        items: [
            { name: 'Bloques', icon: Building, url: '/bloques' },
            { name: 'Pisos', icon: Layers, url: '/pisos' },
            { name: 'Tipos Hab.', icon: BedDouble, url: '/tipohabitacion' },
            { name: 'Precios', icon: Tag, url: '/precios' },
            { name: 'Habitaciones', icon: Hotel, url: '/habitaciones' },
            { name: 'Servicios', icon: ClipboardList, url: '/servicios' },
            { name: 'Huéspedes', icon: Users, url: '/invitados' },
        ],
    },
    {
        title: 'Procesos',
        theme: 'red',
        items: [
            { name: 'Nueva Reserva', icon: CalendarDays, url: '/reservations/create' },
            { name: 'Asignación', icon: BedDouble, url: '/checks' },
            { name: 'Detalles de asignación', icon: Briefcase, url: 'ckecksdetails/'},
            { name: 'Facturación', icon: Receipt, url: '/invoices' },
            { name: 'Limpieza', icon: SprayCan, url: '/housekeeping' },
            { name: 'Mantenimiento', icon: Wrench, url: '/maintenance' },
        ],
    },
    {
        title: 'Reportes',
        theme: 'amber',
        items: [
            // URL '#' porque interceptaremos el clic
            { name: 'Libro Diario', icon: BookDown, url: '#' }, 
            { name: 'Reporte Gral.', icon: FileBarChart, url: '/reports' },
        ],
    },
];

export default function Dashboard({ auth }: DashboardProps) {
    // --- ESTADOS PARA LA LÓGICA DE REPORTE ---
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorDetails, setErrorDetails] = useState<string[]>([]);

    const getThemeClasses = (theme: string) => {
        switch (theme) {
            case 'red':
                return 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-500/20 border-red-500/30';
            case 'blue':
                return 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-blue-500/20 border-blue-500/30';
            case 'amber':
                return 'bg-gradient-to-br from-amber-600 to-amber-800 shadow-amber-500/20 border-amber-500/30';
            default:
                return 'bg-gray-700';
        }
    };

    // --- FUNCIÓN PARA GENERAR EL LIBRO DIARIO (Misma lógica que en Reports) ---
    const handleGenerateDailyBook = async () => {
        setLoading(true);
        try {
            // 1. Validar datos en backend
            const response = await axios.get('/reports/check-daily-book');
            
            if (response.data.can_generate) {
                // 2. Si todo está bien, abrir PDF
                window.open('/reports/daily-book-pdf', '_blank');
            } else {
                // 3. Si faltan datos, mostrar modal
                setErrorDetails(response.data.details || []);
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error("Error validando libro diario", error);
            alert("Error de conexión al verificar los datos.");
        } finally {
            setLoading(false);
        }
    };

    // Manejador genérico de clicks
    const handleItemClick = (item: any) => {
        if (item.name === 'Libro Diario') {
            handleGenerateDailyBook();
        } else {
            router.visit(item.url);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user as any}>
            <Head title="Panel Principal" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header con Bienvenida */}
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            Panel de Control
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Bienvenido de nuevo, <span className="font-semibold text-gray-800 dark:text-gray-200">{auth.user.name}</span>.
                        </p>
                    </div>
                    <div className="hidden text-right sm:block">
                        <p className="text-sm text-gray-400">
                            Fecha del Sistema
                        </p>
                        <p className="font-mono text-lg font-bold text-white">
                            {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* Grid Principal */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {hotelModules.map((group, groupIndex) => (
                        <div key={groupIndex} className="flex flex-col gap-6">
                            {/* Título de Columna */}
                            <div className="flex items-center gap-4">
                                <div
                                    className={`h-8 w-1 rounded-full bg-${group.theme}-500 shadow-[0_0_10px_currentColor] text-${group.theme}-500`}
                                ></div>
                                <h3 className="text-xl font-bold tracking-wider text-white uppercase">
                                    {group.title}
                                </h3>
                            </div>

                            {/* Contenedor de Botones */}
                            <div className="grid grid-cols-2 gap-3 px-2 pb-8">
                                {group.items.map((item, itemIndex) => (
                                    <button
                                        key={itemIndex}
                                        onClick={() => handleItemClick(item)}
                                        disabled={loading && item.name === 'Libro Diario'}
                                        className={`group relative flex h-28 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 p-3 text-center backdrop-blur-md transition-all duration-300 hover:z-20 hover:scale-105 hover:shadow-2xl hover:brightness-110 ${getThemeClasses(group.theme)} disabled:opacity-70 disabled:cursor-wait`}
                                    >
                                        <div className="absolute -top-10 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:scale-150"></div>
                                        
                                        <div className="relative z-10 mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-white shadow-inner backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-12">
                                            {/* Si está cargando y es este item, mostramos un spinner simple (opcional), sino el icono */}
                                            <item.icon className={`h-6 w-6 ${loading && item.name === 'Libro Diario' ? 'animate-pulse' : ''}`} />
                                        </div>

                                        <div className="relative z-10 flex flex-col justify-center">
                                            <span className="text-sm leading-tight font-bold text-white drop-shadow-md">
                                                {loading && item.name === 'Libro Diario' ? 'Verificando...' : item.name}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
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