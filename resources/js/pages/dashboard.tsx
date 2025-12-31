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
    Building,   // Para Bloques
    Layers,     // Para Pisos
    Tag,        // Para Precios
} from 'lucide-react';

// === CORRECCIÓN AQUÍ ===
// Agregamos 'nickname', 'full_name' y un comodín '[key: string]: any'
// para satisfacer lo que pide el AuthenticatedLayout.
interface User {
    id: number;
    name: string;
    email: string;
    nickname?: string;   // Agregado para corregir el error
    full_name?: string;  // Agregado para corregir el error
    [key: string]: any;  // Permite cualquier otra propiedad extra que pida el layout
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
            { name: 'Facturación', icon: Receipt, url: '/invoices' },
            { name: 'Limpieza', icon: SprayCan, url: '/housekeeping' },
            { name: 'Mantenimiento', icon: Wrench, url: '/maintenance' },
        ],
    },
    {
        title: 'Reportes',
        theme: 'amber',
        items: [
            { name: 'Estado Hotel', icon: Hotel, url: '/rooms/status' },
            { name: 'Reporte Gral.', icon: FileBarChart, url: '/reports' },
        ],
    },
];

export default function Dashboard({ auth }: DashboardProps) {
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

    return (
        <AuthenticatedLayout user={auth.user}>
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

                            {/* Contenedor de Botones: 2 Columnas internas */}
                            <div className="grid grid-cols-2 gap-3 px-2 pb-8">
                                {group.items.map((item, itemIndex) => (
                                    <button
                                        key={itemIndex}
                                        onClick={() => router.visit(item.url)}
                                        className={`group relative flex h-28 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 p-3 text-center backdrop-blur-md transition-all duration-300 hover:z-20 hover:scale-105 hover:shadow-2xl hover:brightness-110 ${getThemeClasses(group.theme)}`}
                                    >
                                        <div className="absolute -top-10 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:scale-150"></div>
                                        
                                        <div className="relative z-10 mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-white shadow-inner backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-12">
                                            <item.icon className="h-6 w-6" />
                                        </div>

                                        <div className="relative z-10 flex flex-col justify-center">
                                            <span className="text-sm leading-tight font-bold text-white drop-shadow-md">
                                                {item.name}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}