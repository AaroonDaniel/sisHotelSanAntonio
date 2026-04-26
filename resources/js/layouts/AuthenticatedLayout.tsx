import OpenRegisterModal from '@/components/OpenRegisterModal';
import { Link, router, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    Hotel,
    LogOut,
    Menu,
    User as UserIcon,
    X,
    AlertTriangle,
    Users // <-- IMPORTANTE: Importamos el icono Users
} from 'lucide-react';
import { PropsWithChildren, useState } from 'react';

// Definición de Tipos Globales
export interface User {
    id: number;
    nickname: string;
    full_name: string;
}

interface AuthenticatedLayoutProps {
    user: User;
}

export default function AuthenticatedLayout({
    user,
    children,
}: PropsWithChildren<AuthenticatedLayoutProps>) {
    const { url, props } = usePage();
    const { auth }: any = props;
    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLogoutWarning, setShowLogoutWarning] = useState(false);
    const getInitials = (name: string) =>
        name ? name.substring(0, 2).toUpperCase() : 'US';

    // Función normal de Cerrar Sesión (Exige cerrar caja)
    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();

        if (auth.active_register) {
            setShowLogoutWarning(true);
            setShowUserMenu(false);
        } else {
            // Si el suplente cierra sesión normal, eliminamos el pase libre por seguridad
            localStorage.removeItem('relay_mode_active');
            router.post('/logout');
        }
    };

    // FUNCIÓN ACTUALIZADA: Cambio de usuario rápido
    const handleSwitchUser = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowUserMenu(false);
        
        // ACTIVAMOS EL PASE LIBRE (Modo Relevo)
        localStorage.setItem('relay_mode_active', 'true');
        
        router.post('/logout');
    };
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
                                <Link
                                    href="/dashboard"
                                    className="mt-1 flex items-center gap-3"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 shadow-lg shadow-red-900/50">
                                        <Hotel className="h-5 w-5 text-white" />
                                    </div>
                                    <span className="hidden text-xl font-bold text-white md:block">
                                        Hotel San Antonio
                                    </span>
                                </Link>
                            </div>

                            {/* Links Escritorio */}
                            <div className="hidden h-full space-x-8 sm:-my-px sm:ml-10 sm:flex">
                                <Link
                                    href="/status"
                                    className={`inline-flex items-center border-b-4 px-1 pt-1 text-base font-semibold transition duration-150 ease-in-out ${
                                        url.startsWith('/status')
                                            ? 'border-red-500 text-white'
                                            : 'border-transparent text-white hover:border-white/50'
                                    }`}
                                >
                                    Habitaciones
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className={`inline-flex items-center border-b-4 px-1 pt-1 text-base font-semibold transition duration-150 ease-in-out ${
                                        url.startsWith('/dashboard')
                                            ? 'border-red-500 text-white'
                                            : 'border-transparent text-white hover:border-white/50'
                                    }`}
                                >
                                    Administración
                                </Link>

                                <Link
                                    href="/reservas"
                                    className={`inline-flex items-center border-b-4 px-1 pt-1 text-base font-semibold transition duration-150 ease-in-out ${
                                        url.startsWith('/reservas')
                                            ? 'border-red-500 text-white'
                                            : 'border-transparent text-white hover:border-white/50'
                                    }`}
                                >
                                    Reservas
                                </Link>
                                <Link
                                    href="/gastos"
                                    className={`inline-flex items-center border-b-4 px-1 pt-1 text-base font-semibold transition duration-150 ease-in-out ${
                                        url.startsWith('/gastos')
                                            ? 'border-red-500 text-white'
                                            : 'border-transparent text-white hover:border-white/50'
                                    }`}
                                >
                                    Gastos
                                </Link>
                            </div>
                        </div>

                        {/* Menú Usuario */}
                        <div className="hidden gap-4 sm:ml-6 sm:flex sm:items-center">
                            
                            {/* NUEVO BOTÓN: Cambio de Usuario */}
                            <button
                                onClick={handleSwitchUser}
                                className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-base font-bold text-white shadow-md transition-all hover:bg-red-500 hover:shadow-lg active:scale-95"
                                title="Cambiar de cuenta sin cerrar la caja actual"
                            >
                                <Users className="h-4 w-4" />
                                <span className="hidden md:block">Cambio de usuario</span>
                            </button>

                            <div className="relative ml-3">
                                <div
                                    onClick={() =>
                                        setShowUserMenu(!showUserMenu)
                                    }
                                >
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
                                        <div className="mb-1 border-b border-gray-700 px-4 py-3">
                                            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                                Conectado como
                                            </p>
                                            <p className="mt-1 truncate text-base font-bold text-white">
                                                {user.full_name}
                                            </p>
                                        </div>

                                        {/* Opción: Perfil */}
                                        <Link
                                            href="/user/profile"
                                            className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                                        >
                                            <UserIcon className="h-4 w-4 text-blue-500 group-hover:text-blue-400" />
                                            Perfil
                                        </Link>

                                        <div className="my-1 border-t border-gray-700" />

                                        {/* Opción: Cerrar Sesión */}
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            onClick={handleLogout}
                                            className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
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

            {/* --- BODY (Contenido Principal) --- */}
            <main className="relative z-10 py-10">
                {children}
                <OpenRegisterModal />
                {showLogoutWarning && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
                        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                                    <AlertTriangle className="h-8 w-8" />
                                </div>
                                <h3 className="mb-2 text-xl font-bold text-gray-800">¡Turno Aún Abierto!</h3>
                                <p className="text-gray-600  text-bold text-base leading-relaxed">
                                    <b className="text-gray-700">{user.nickname || auth?.user?.name}</b>, el sistema detecta que aún tienes dinero bajo tu responsabilidad. 
                                    No puedes abandonar el sistema sin antes imprimir tu <b className="text-red-500">Parte Diario</b> y cerrar la caja.
                                </p>
                                
                                <div className="mt-8 flex justify-center gap-3">
                                    <button
                                        onClick={() => setShowLogoutWarning(false)}
                                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                                    >
                                        Volver al sistema
                                    </button>
                                    <Link
                                        href="/reports/financial" 
                                        onClick={() => setShowLogoutWarning(false)}
                                        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-500 active:scale-95 transition"
                                    >
                                        <LogOut className="h-4 w-4" /> Ir a Cerrar Caja
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}