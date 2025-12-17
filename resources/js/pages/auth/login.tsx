import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Hotel, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface UserProps {
    id: number;
    nickname: string;
    full_name: string;
}

export default function LoginSelector({ users = [] }: { users: UserProps[] }) {
    const [selectedUser, setSelectedUser] = useState<UserProps | null>(null);
    const [password, setPassword] = useState('');
    const [processing, setProcessing] = useState(false);
    const passwordInputRef = useRef<HTMLInputElement>(null);

    // Enfocar automáticamente el input cuando se abre el modal
    useEffect(() => {
        if (selectedUser && passwordInputRef.current) {
            // Un pequeño retraso para permitir que la animación termine
            setTimeout(() => {
                passwordInputRef.current?.focus();
            }, 100);
        }
    }, [selectedUser]);

    const handleUserClick = (user: UserProps) => {
        setSelectedUser(user);
        setPassword('');
    };

    const handleBack = () => {
        setSelectedUser(null);
        setPassword('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || !selectedUser) return;

        setProcessing(true);

        // Enviamos 'nickname' porque configuramos Fortify para usarlo
        router.post(
            '/login',
            {
                nickname: selectedUser.nickname,
                password: password,
            },
            {
                onError: () => {
                    setProcessing(false);
                    setPassword('');
                    // Mantenemos el foco en el input si falla
                    passwordInputRef.current?.focus();
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const getInitials = (name: string) => {
        return name ? name.substring(0, 2).toUpperCase() : 'US';
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gray-900 font-sans text-gray-100 selection:bg-red-500 selection:text-white">
            <Head title="Acceso Hotel" />

            {/* FONDO */}
            <div
                className="absolute inset-0 z-0 scale-105 transform bg-cover bg-center bg-no-repeat opacity-60 blur-sm"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')",
                }}
            />
            <div className="absolute inset-0 z-0 bg-black/50" />

            {/* CONTENIDO PRINCIPAL */}
            <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
                {/* Logo y Título (Se desvanece un poco cuando hay usuario seleccionado) */}
                <div
                    className={`mb-8 text-center transition-all duration-500 ${selectedUser ? 'opacity-30 blur-[2px]' : 'opacity-100'}`}
                >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-900/50">
                        <Hotel className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">
                        Hotel San Antonio
                    </h1>
                </div>

                {/* GRID DE USUARIOS (Siempre visible, se desenfoca al seleccionar) */}
                <div
                    className={`w-full max-w-5xl transition-all duration-500 ${selectedUser ? 'pointer-events-none scale-95 blur-sm brightness-50' : 'scale-100 opacity-100'}`}
                >
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md md:p-12">
                        <h2 className="mb-8 text-center text-xl font-medium text-white/90">
                            ¿Quién está iniciando turno?
                        </h2>

                        <div className="grid grid-cols-2 justify-items-center gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleUserClick(user)}
                                    className="group flex flex-col items-center transition-transform hover:-translate-y-2 focus:outline-none"
                                >
                                    <div className="relative mb-3 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg transition-all group-hover:border-red-500 group-hover:shadow-red-500/50">
                                        <span className="text-2xl font-bold text-white transition-transform group-hover:scale-110">
                                            {getInitials(
                                                user.full_name || user.nickname,
                                            )}
                                        </span>
                                    </div>
                                    <span className="text-lg font-semibold text-white transition-colors group-hover:text-red-400">
                                        {user.nickname}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-12 text-center text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} Hotel San Antonio -
                        Sistema Interno
                    </div>
                </div>

                {/* MODAL DE CONTRASEÑA (Aparece encima) */}
                {selectedUser && (
                    <div className="absolute inset-0 z-50 flex animate-in items-center justify-center p-4 duration-200 zoom-in-95 fade-in">
                        {/* Backdrop invisible para cerrar al hacer clic fuera */}
                        <div
                            className="absolute inset-0"
                            onClick={handleBack}
                        ></div>

                        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-gray-900/90 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
                            {/* Botón cerrar */}
                            <button
                                onClick={handleBack}
                                className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="flex flex-col items-center">
                                {/* Avatar Grande */}
                                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-gray-800 bg-red-600 shadow-xl shadow-red-900/40">
                                    <span className="text-3xl font-bold text-white">
                                        {getInitials(
                                            selectedUser.full_name ||
                                                selectedUser.nickname,
                                        )}
                                    </span>
                                </div>

                                <h3 className="mb-1 text-2xl font-bold text-white">
                                    Hola, {selectedUser.nickname}
                                </h3>
                                <p className="mb-6 text-sm text-gray-400">
                                    Ingresa tu contraseña para acceder
                                </p>

                                <form
                                    onSubmit={handleSubmit}
                                    className="w-full space-y-4"
                                >
                                    <div className="group relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-red-500" />
                                        </div>
                                        <input
                                            ref={passwordInputRef}
                                            type="password"
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }
                                            className="block w-full rounded-lg border border-gray-600 bg-gray-800/50 py-3 pr-4 pl-10 text-white placeholder-gray-500 transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm"
                                            placeholder="Tu contraseña..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-red-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {processing ? (
                                            <span className="flex items-center gap-2">
                                                <svg
                                                    className="h-4 w-4 animate-spin text-white"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Verificando...
                                            </span>
                                        ) : (
                                            'Iniciar Sesión'
                                        )}
                                    </button>
                                </form>

                                <button
                                    onClick={handleBack}
                                    className="mt-6 flex items-center text-base text-gray-500 transition-colors hover:text-gray-300"
                                >
                                    <ArrowLeft className="mr-1 h-3 w-3" />{' '}
                                    Seleccionar otro usuario
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
