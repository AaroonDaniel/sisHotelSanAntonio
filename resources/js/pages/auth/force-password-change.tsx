import { useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react'; // <-- 1. Importamos los íconos
import { FormEventHandler, useEffect, useState } from 'react';

export default function ForcePasswordChange() {
    // Estado para mostrar/ocultar ambas contraseñas
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put('/cambiar-clave-obligatorio');
    };

    // Limpieza de contraseña por seguridad si el componente se desmonta
    useEffect(() => {
        return () => {
            setData('password', '');
            setData('password_confirmation', ''); // También es buena práctica limpiar la confirmación
        };
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
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
            
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
                <h1 className="mb-2 text-xl font-bold text-gray-800">
                    Cambio de contraseña obligatorio
                </h1>
                <p className="mb-6 text-sm text-gray-600">
                    Has iniciado sesión con una contraseña temporal. Por
                    seguridad, debes crear una contraseña nueva y segura para
                    continuar.
                </p>
                <form onSubmit={submit} className="space-y-4">
                    
                    {/* Campo: Nueva Contraseña */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Nueva contraseña</label>
                        {/* 2. Envolvemos el input en un div relativo */}
                        <div className="relative group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="password-input w-full rounded-lg border border-gray-400 px-3 py-2 pr-10 text-black focus:border-green-500 focus:ring-green-500"
                                autoFocus
                            />
                            {/* 3. Agregamos el botón para alternar la visibilidad */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-green-600 focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1 text-xs font-bold text-red-500">{errors.password}</p>
                        )}
                    </div>
                    
                    {/* Campo: Confirmar Contraseña */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Confirmar contraseña</label>
                        <div className="relative group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                className="password-input w-full rounded-lg border border-gray-400 px-3 py-2 pr-10 text-black focus:border-green-500 focus:ring-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-green-600 focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    
                    <p className="text-xs text-gray-500">Mínimo 8 caracteres, con mayúsculas, minúsculas y números.</p>
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-lg bg-green-600 py-2 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                        Guardar y continuar
                    </button>
                </form>
            </div>
        </div>
    );
}