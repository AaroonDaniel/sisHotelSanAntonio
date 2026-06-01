import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForcePasswordChange() {
    const { data, setData, put, processing, errors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put('/cambiar-clave-obligatorio');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
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
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Nueva contraseña</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full rounded-lg border border-gray-400 px-3 py-2 text-black focus:border-green-500 focus:ring-green-500"
                            autoFocus
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs font-bold text-red-500">{errors.password}</p>
                        )}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700">Confirmar contraseña</label>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className="w-full rounded-lg border border-gray-400 px-3 py-2 text-black focus:border-green-500 focus:ring-green-500"
                        />
                    </div>
                    <p className="text-xs text-gray-500">Mínimo 8 caracteres, con mayúsculas, minúsculas y números.</p>
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        Guardar y continuar
                    </button>
                </form>
            </div>
        </div>
    );
}