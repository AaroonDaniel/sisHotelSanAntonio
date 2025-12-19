import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout'; // Ajusta la ruta según donde guardaste el archivo anterior
import { Head, router } from '@inertiajs/react';
import {
    BedDouble,
    CalendarDays,
    ClipboardList,
    //CreditCard,
    FileBarChart,
    Hotel,
    Receipt,
    //Settings,
    SprayCan,
    Users,
    Wrench,
} from 'lucide-react';

interface DashboardProps {
    auth: {
        user: User;
    };
}

// Configuración de Módulos (Exactamente igual que antes)
const hotelModules = [
    {
        title: 'Recepción & Reservas',
        theme: 'red',
        items: [
            {
                name: 'Nueva Reserva',
                icon: CalendarDays,
                url: '/reservations/create',
            },
            { name: 'Asignación Hab.', icon: BedDouble, url: '/assignments' },
            { name: 'Huéspedes', icon: Users, url: '/guests' },
            //{ name: 'Check-in / Out', icon: ClipboardList, url: '/checkin' },
        ],
    },
    {
        title: 'Administración & Caja',
        theme: 'blue',
        items: [
            { name: 'Facturación', icon: Receipt, url: '/invoices' },
            //{ name: 'Caja Chica', icon: CreditCard, url: '/petty-cash' },
            { name: 'Reportes', icon: FileBarChart, url: '/reports' },
            //{ name: 'Configuración', icon: Settings, url: '/settings' },
        ],
    },
    {
        title: 'Pisos & Mantenimiento',
        theme: 'amber',
        items: [
            { name: 'Estado Habitaciones', icon: Hotel, url: '/rooms/status' },
            { name: 'Limpieza', icon: SprayCan, url: '/housekeeping' },
            { name: 'Mantenimiento', icon: Wrench, url: '/maintenance' },
            { name: 'Inventario', icon: ClipboardList, url: '/inventory' },
            {
                name: 'Gestión Habitaciones',
                icon: Hotel,
                url: '/gestion-habitaciones',
            },
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
        // Envolvemos todo en el Layout y pasamos el usuario
        <AuthenticatedLayout user={auth.user}>
            <Head title="Panel Principal" />

            {/* CONTENIDO DEL DASHBOARD (BODY) */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white">
                            Panel de Control
                        </h2>
                        <p className="mt-1 text-gray-400">
                            Bienvenido al sistema de gestión.
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

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {hotelModules.map((group, groupIndex) => (
                        <div key={groupIndex} className="flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`h-8 w-1 rounded-full bg-${group.theme}-500 shadow-[0_0_10px_currentColor] text-${group.theme}-500`}
                                ></div>
                                <h3 className="text-xl font-bold tracking-wider text-white uppercase">
                                    {group.title}
                                </h3>
                            </div>

                            <div className="flex flex-col gap-5 px-2 pb-8">
                                {group.items.map((item, itemIndex) => (
                                    <button
                                        key={itemIndex}
                                        onClick={() => router.visit(item.url)}
                                        className={`group relative flex h-28 w-full items-center justify-between overflow-hidden rounded-2xl border border-white/10 p-6 text-left backdrop-blur-md transition-all duration-300 hover:z-20 hover:scale-105 hover:shadow-2xl hover:brightness-110 ${getThemeClasses(group.theme)} ${itemIndex % 2 === 0 ? '-rotate-1' : 'rotate-1'} hover:rotate-0`}
                                    >
                                        <div className="absolute -top-10 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:scale-150"></div>
                                        <div className="relative z-10 flex flex-col justify-center">
                                            <span className="text-lg leading-tight font-bold text-white drop-shadow-md">
                                                {item.name}
                                            </span>
                                            <span className="mt-1 text-xs font-medium text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                                                Click para acceder &rarr;
                                            </span>
                                        </div>
                                        <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-black/20 text-white shadow-inner backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-12">
                                            <item.icon className="h-6 w-6" />
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
