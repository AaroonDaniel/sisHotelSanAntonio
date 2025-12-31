import { Link, router } from '@inertiajs/react';
import {
    Bell,
    ChevronDown,
    Hotel,
    LogOut,
    Menu,
    Search,
    Settings, 
    User as UserIcon,
    X,
} from 'lucide-react';
import { useState, PropsWithChildren } from 'react';

// Definición de Tipos Globales
export interface User {
    id: number;
    nickname: string;
    full_name: string;
}

interface AuthenticatedLayoutProps {
    user: User;
}

export default function AuthenticatedLayout({ user, children }: PropsWithChildren<AuthenticatedLayoutProps>) {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const getInitials = (name: string) =>
        name ? name.substring(0, 2).toUpperCase() : 'US';

    return (
        /* CAMBIO AQUÍ: Se reemplazó selection:bg-red-500 por selection:bg-green-600 */
        <div className="min-h-screen bg-gray-900 font-sans text-gray-100 selection:bg-sky-600 selection:text-white">
            
            {/* --- FONDO (Background) --- */}
            <div
                className="fixed inset-0 z-0 scale-105 transform bg-cover bg-center bg-no-repeat opacity-40 blur-sm"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')",
                }}
            />
            <div className="fixed inset-0 z-0 bg-black/60" />

            {/* --- CABECERA (Header / Navbar) --- */}
            <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            {/* Logo */}
                            <div className="flex shrink-1 items-center gap-3">
                                <Link href="/dashboard" className="flex items-center gap-3 mt-1">
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
                                    href="/status"
                                    className="inline-flex items-center border-b-2 border-red-500 px-1 pt-1 text-sm font-medium text-white transition duration-150 ease-in-out"
                                >
                                    Habitaciones
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center border-b-2 border-red-500 px-1 pt-1 text-sm font-medium text-white transition duration-150 ease-in-out"
                                >
                                    Administracion
                                </Link>
                                
                            </div>
                        </div>

                        {/* Menú Usuario */}
                        <div className="hidden gap-4 sm:ml-6 sm:flex sm:items-center">
                            <div className="relative ml-3">
                                <div onClick={() => setShowUserMenu(!showUserMenu)}>
                                    <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm transition-all hover:bg-white/10">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-xs font-bold text-white">
                                            {getInitials(user.nickname)}
                                        </div>
                                        <span className="hidden font-medium text-gray-200 md:block">
                                            {user.nickname}
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>

                                {showUserMenu && (
                                    <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-gray-700 bg-gray-800 py-2 shadow-2xl ring-1 ring-black focus:outline-none">
                                        
                                        {/* Cabecera del Menú */}
                                        <div className="border-b border-gray-700 px-4 py-3 mb-1">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Conectado como</p>
                                            <p className="mt-1 truncate text-sm font-bold text-white">
                                                {user.full_name}
                                            </p>
                                        </div>

                                        {/* Opción: Perfil */}
                                        <Link
                                            href="/user/profile"
                                            className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                        >
                                            <UserIcon className="h-4 w-4 text-blue-500 group-hover:text-blue-400" />
                                            Perfil
                                        </Link>

                                        {/* Opción: Configuración */}
                                        <Link
                                            href="/settings"
                                            className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                        >
                                            <Settings className="h-4 w-4 text-amber-500 group-hover:text-amber-400" />
                                            Configuración
                                        </Link>

                                        <div className="my-1 border-t border-gray-700" />

                                        {/* Opción: Cerrar Sesión */}
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                                        >
                                            <LogOut className="h-4 w-4 text-red-500 group-hover:text-red-400" />
                                            Cerrar Sesión
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botón Móvil */}
                        <div className="-mr-2 flex items-center sm:hidden">
                            <button
                                onClick={() => setShowingNavigationDropdown((prev) => !prev)}
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

            {/* --- BODY (Contenido Principal) --- */}
            <main className="relative z-10 py-10">
                {children}
            </main>
        </div>
    );
}