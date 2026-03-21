import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock, // <-- Importado el icono del reloj
    KeyRound,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    UserCircle,
} from 'lucide-react';
import { FormEventHandler } from 'react';

// Interfaz local para evitar errores si no está en index.d.ts
export interface User {
    id: number;
    nickname: string;
    full_name: string;
    phone: string;
    address: string;
    shift?: string; // <-- Agregado a la interfaz
    is_active: boolean;
}

interface Props {
    auth: { user: User };
}

export default function ProfileIndex({ auth }: Props) {
    const user = auth.user;

    const {
        data: infoData,
        setData: setInfoData,
        patch: patchInfo,
        processing: infoProcessing,
        errors: infoErrors,
        recentlySuccessful: infoSuccessful,
    } = useForm({
        full_name: user.full_name || '',
        nickname: user.nickname || '',
        phone: user.phone || '',
        address: user.address || '',
        shift: user.shift || '', // <-- Agregado al estado del formulario
    });

    const {
        data: pwdData,
        setData: setPwdData,
        patch: patchPwd,
        processing: pwdProcessing,
        errors: pwdErrors,
        recentlySuccessful: pwdSuccessful,
        reset: resetPwd,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submitInfo: FormEventHandler = (e) => {
        e.preventDefault();
        patchInfo('/user/profile', { preserveScroll: true });
    };

    const submitPassword: FormEventHandler = (e) => {
        e.preventDefault();
        patchPwd('/user/password', {
            preserveScroll: true,
            onSuccess: () => resetPwd(),
        });
    };

    return (
        <AuthenticatedLayout user={user}>
            <Head title="Mi Perfil" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Botón Volver */}
                <button
                    onClick={() => window.history.back()}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span className='text-base'>Volver</span>
                </button>

                <div className="py-12">
                    <div className="mx-auto w-full max-w-4xl space-y-8">
                        {/* --- TARJETA 1: DATOS PERSONALES --- */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <UserCircle className="h-5 w-5" />
                                    </div>
                                    Información Personal
                                </h2>
                            </div>

                            <form onSubmit={submitInfo} className="p-6">
                                <div className="space-y-4">
                                    {/* Nombre Completo */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Nombre Completo
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <UserCircle className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={infoData.full_name}
                                                onChange={(e) => setInfoData('full_name', e.target.value.toUpperCase())}
                                                className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base text-black uppercase focus:border-green-500 focus:ring-green-500"
                                            />
                                        </div>
                                        {infoErrors.full_name && (
                                            <p className="mt-1 text-xs font-bold text-red-500">
                                                {infoErrors.full_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Fila: Nickname y Teléfono */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Nickname (Usuario de Acceso)
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-gray-400">
                                                    @
                                                </div>
                                                <input
                                                    type="text"
                                                    value={infoData.nickname}
                                                    onChange={(e) => setInfoData('nickname', e.target.value.toLowerCase().replace(/\s/g, ''))}
                                                    className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base font-semibold text-green-600 focus:border-green-500 focus:ring-green-500"
                                                />
                                            </div>
                                            {infoErrors.nickname && (
                                                <p className="mt-1 text-xs font-bold text-red-500">
                                                    {infoErrors.nickname}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Teléfono / Celular
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <Phone className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={infoData.phone}
                                                    onChange={(e) => setInfoData('phone', e.target.value)}
                                                    className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                                />
                                            </div>
                                            {infoErrors.phone && (
                                                <p className="mt-1 text-xs font-bold text-red-500">
                                                    {infoErrors.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dirección */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Dirección
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={infoData.address}
                                                onChange={(e) => setInfoData('address', e.target.value.toUpperCase())}
                                                className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base text-black uppercase focus:border-green-500 focus:ring-green-500"
                                            />
                                        </div>
                                        {infoErrors.address && (
                                            <p className="mt-1 text-xs font-bold text-red-500">
                                                {infoErrors.address}
                                            </p>
                                        )}
                                    </div>

                                    {/* Campo Turno Asignado */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Turno Asignado
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <select
                                                value={infoData.shift}
                                                onChange={(e) => setInfoData('shift', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                            >
                                                <option value="" disabled>SELECCIONAR TURNO...</option>
                                                <option value="DÍA">DÍA (08:00 a 20:00)</option>
                                                <option value="NOCHE">NOCHE (20:00 a 08:00)</option>
                                            </select>
                                        </div>
                                        
                                        {infoErrors.shift && <p className="mt-1 text-xs font-bold text-red-500">{infoErrors.shift}</p>}
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-4 border-t border-gray-100 pt-4">
                                    {infoSuccessful && (
                                        <span className="flex items-center gap-1 animate-in fade-in text-sm font-bold text-green-600 duration-300">
                                            <CheckCircle2 className="h-4 w-4" />{' '}
                                            ¡Guardado!
                                        </span>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={infoProcessing}
                                        className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" /> Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* --- TARJETA 2: CAMBIAR CONTRASEÑA --- */}
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-red-100 p-1.5 text-red-600">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    Seguridad y Contraseña
                                </h2>
                            </div>

                            <form onSubmit={submitPassword} className="p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Contraseña Actual */}
                                    <div className="md:col-span-2">
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Contraseña Actual
                                        </label>
                                        <div className="relative md:w-1/2">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <KeyRound className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={pwdData.current_password}
                                                onChange={(e) => setPwdData('current_password', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base text-black focus:border-red-500 focus:ring-red-500"
                                            />
                                        </div>
                                        {pwdErrors.current_password && (
                                            <p className="mt-1 text-xs font-bold text-red-500">
                                                {pwdErrors.current_password}
                                            </p>
                                        )}
                                    </div>

                                    {/* Nueva Contraseña */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <KeyRound className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={pwdData.password}
                                                onChange={(e) => setPwdData('password', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base text-black focus:border-red-500 focus:ring-red-500"
                                            />
                                        </div>
                                        {pwdErrors.password && (
                                            <p className="mt-1 text-xs font-bold text-red-500">
                                                {pwdErrors.password}
                                            </p>
                                        )}
                                    </div>

                                    {/* Confirmar Contraseña */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Confirmar Nueva Contraseña
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <KeyRound className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="password"
                                                value={pwdData.password_confirmation}
                                                onChange={(e) => setPwdData('password_confirmation', e.target.value)}
                                                className="w-full rounded-xl border border-gray-300 py-2.5 pr-3 pl-10 text-base text-black focus:border-red-500 focus:ring-red-500"
                                            />
                                        </div>
                                        {pwdErrors.password_confirmation && (
                                            <p className="mt-1 text-xs font-bold text-red-500">
                                                {pwdErrors.password_confirmation}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-4 border-t border-gray-100 pt-4">
                                    {pwdSuccessful && (
                                        <span className="flex items-center gap-1 animate-in fade-in text-sm font-bold text-green-600 duration-300">
                                            <CheckCircle2 className="h-4 w-4" />{' '}
                                            ¡Contraseña Actualizada!
                                        </span>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={pwdProcessing}
                                        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" /> Actualizar Contraseña
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}