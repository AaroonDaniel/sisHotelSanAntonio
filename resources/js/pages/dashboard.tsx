import { Head, Link, router } from '@inertiajs/react'; // 1. Quitamos usePage, agregamos router
import {
    BedDouble,
    Bell,
    CalendarDays,
    ChevronDown,
    ClipboardList,
    CreditCard,
    FileBarChart,
    Hotel,
    LogOut,
    Menu,
    Receipt,
    Search,
    Settings,
    SprayCan,
    Users,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';

// --- 2. DEFINICIÓN DE TIPOS (Solución al error de 'any') ---
interface User {
    id: number;
    nickname: string;
    full_name: string;
}

interface DashboardProps {
    auth: {
        user: User;
    };
}

// Configuración de Módulos (Igual que antes, actualizado con URLs)
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
            { name: 'Check-in / Out', icon: ClipboardList, url: '/checkin' },
        ],
    },
    {
        title: 'Administración & Caja',
        theme: 'blue',
        items: [
            { name: 'Facturación', icon: Receipt, url: '/invoices' },
            { name: 'Caja Chica', icon: CreditCard, url: '/petty-cash' },
            { name: 'Reportes', icon: FileBarChart, url: '/reports' },
            { name: 'Configuración', icon: Settings, url: '/settings' },
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
        ],
    },
];

// --- COMPONENTE PRINCIPAL ---
// 3. Aplicamos la interfaz DashboardProps en lugar de 'any'
export default function Dashboard({ auth }: DashboardProps) {
    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

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

    const getInitials = (name: string) =>
        name ? name.substring(0, 2).toUpperCase() : 'US';

    return (
        <div className="min-h-screen bg-gray-900 font-sans text-gray-100 selection:bg-red-500 selection:text-white">
            <Head title="Panel Principal" />

            {/* FONDO */}
            <div
                className="fixed inset-0 z-0 scale-105 transform bg-cover bg-center bg-no-repeat opacity-40 blur-sm"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')",
                }}
            />
            <div className="fixed inset-0 z-0 bg-black/60" />

            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            {/* Logo */}
                            <div className="flex shrink-1 items-center gap-3">
                                <Link href="/dashboard">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-900/50">
                                        <Hotel className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="hidden text-xl font-bold text-white md:block">
                                        Hotel San Antonio
                                    </span>
                                </Link>
                            </div>

                            {/* Links Escritorio */}
                            <div className="hidden space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center border-b-2 border-red-500 px-1 pt-1 text-sm font-medium text-white transition duration-150 ease-in-out"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() =>
                                        router.visit('/reservations')
                                    }
                                    className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-300 transition duration-150 ease-in-out hover:border-gray-300 hover:text-white"
                                >
                                    Reservas
                                </button>
                            </div>
                        </div>

                        {/* Menú Usuario */}
                        <div className="hidden gap-4 sm:ml-6 sm:flex sm:items-center">
                            <div className="relative hidden lg:block">
                                <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="h-9 w-64 rounded-full border border-white/10 bg-white/5 pr-4 pl-9 text-sm text-gray-200 placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                                />
                            </div>

                            <button className="rounded-full p-1 text-gray-400 hover:text-white focus:outline-none">
                                <Bell className="h-5 w-5" />
                            </button>

                            <div className="relative ml-3">
                                <div
                                    onClick={() =>
                                        setShowUserMenu(!showUserMenu)
                                    }
                                >
                                    <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm transition-all hover:bg-white/10">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-xs font-bold text-white">
                                            {getInitials(auth.user.nickname)}
                                        </div>
                                        <span className="hidden font-medium text-gray-200 md:block">
                                            {auth.user.nickname}
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>

                                {showUserMenu && (
                                    <div className="ring-opacity-5 absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md border border-gray-700 bg-gray-800 py-1 shadow-lg ring-1 ring-black focus:outline-none">
                                        <div className="border-b border-gray-700 px-4 py-2">
                                            <p className="text-xs text-gray-400">
                                                Conectado como
                                            </p>
                                            <p className="truncate text-sm font-medium text-white">
                                                {auth.user.full_name}
                                            </p>
                                        </div>
                                        <Link
                                            href="/user/profile"
                                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                        >
                                            Perfil
                                        </Link>
                                        <Link
                                            href="/settings"
                                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                        >
                                            Configuración
                                        </Link>

                                        {/* 4. AQUÍ USAMOS LogOut PARA ARREGLAR EL ERROR DE NO USADO */}
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            className="flex w-full items-center px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Cerrar Sesión
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botón Móvil */}
                        <div className="-mr-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (prev) => !prev,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 focus:outline-none"
                            >
                                {showingNavigationDropdown ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* DASHBOARD GRID */}
            <main className="relative z-10 py-10">
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
                            <div
                                key={groupIndex}
                                className="flex flex-col gap-6"
                            >
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
                                            onClick={() =>
                                                router.visit(item.url)
                                            }
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
            </main>
        </div>
    );
}
