import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Hotel, Lock, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Login() {
    // Reemplazamos los useState manuales por el hook useForm nativo de Inertia
    const { data, setData, post, processing, errors, reset } = useForm({
        nickname: '',
        password: '',
    });

    // Estado para mostrar/ocultar la contraseña (toggle reutilizable)
    const [showPassword, setShowPassword] = useState(false);

    // Limpiamos la contraseña por seguridad si el componente se desmonta
    useEffect(() => {
        return () => {
            reset('password');
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Enviamos la petición POST; Inertia manejará las redirecciones o volcará los errores en el objeto 'errors'
        post('/login');
    };

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gray-900 font-sans text-gray-100 selection:bg-red-500 selection:text-white">
            <Head title="Acceso Hotel" />

            {/* Oculta el ícono nativo de revelar/limpiar del navegador (Edge/Chrome/IE) */}
            <style>{`
                .password-input::-ms-reveal,
                .password-input::-ms-clear {
                    display: none !important;
                }
                .password-input::-webkit-credentials-auto-fill-button,
                .password-input::-webkit-strong-password-auto-fill-button,
                .password-input::-webkit-caps-lock-indicator {
                    visibility: hidden !important;
                    display: none !important;
                    pointer-events: none !important;
                }
            `}</style>

            {/* FONDO AMBIENTAL (Mantenido del original) */}
            <div
                className="absolute inset-0 z-0 scale-105 transform bg-cover bg-center bg-no-repeat opacity-60 blur-sm"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')",
                }}
            />
            <div className="absolute inset-0 z-0 bg-black/60" />

            {/* CONTENIDO PRINCIPAL */}
            <div className="relative z-10 w-full max-w-md p-6">
                {/* Logo y Título */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-900/50">
                        <Hotel className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">
                        Hotel San Antonio
                    </h1>
                    <p className="mt-2 text-sm text-gray-300">
                        Acceso seguro al sistema operativo
                    </p>
                </div>

                {/* FORMULARIO DE ACCESO (Estructura atómica y accesible) */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Campo: Nickname */}
                        <div>
                            <label
                                htmlFor="nickname"
                                className="mb-2 block text-sm font-medium text-gray-300"
                            >
                                Nombre de usuario
                            </label>
                            <div className="group relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <UserIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-red-500" />
                                </div>
                                <input
                                    id="nickname"
                                    type="text"
                                    name="nickname"
                                    value={data.nickname}
                                    onChange={(e) => setData('nickname', e.target.value)}
                                    className={`block w-full rounded-lg border bg-gray-800/50 py-3 pl-10 pr-4 text-white placeholder-gray-400 transition-all focus:ring-1 sm:text-sm ${
                                        errors.nickname 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                        : 'border-gray-600 focus:border-red-500 focus:ring-red-500'
                                    }`}
                                    placeholder="Ingresa tu usuario"
                                    autoComplete="username"
                                    autoFocus
                                />
                            </div>
                            {/* Manejo de errores nativo de Inertia */}
                            {errors.nickname && (
                                <p className="mt-2 text-sm font-medium text-red-400">
                                    {errors.nickname}
                                </p>
                            )}
                        </div>

                        {/* Campo: Contraseña */}
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-gray-300"
                            >
                                Contraseña
                            </label>
                            <div className="group relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-red-500" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`password-input block w-full rounded-lg border bg-gray-800/50 py-3 pl-10 pr-10 text-white placeholder-gray-400 transition-all focus:ring-1 sm:text-sm ${
                                        errors.password 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                                        : 'border-gray-600 focus:border-red-500 focus:ring-red-500'
                                    }`}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-red-500 focus:outline-none"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-2 text-sm font-medium text-red-400">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Botón Submit */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-4 flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-red-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
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
                </div>
                
                {/* Footer */}
                <div className="mt-8 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} CodigoGM
                </div>
            </div>
        </div>
    );
}