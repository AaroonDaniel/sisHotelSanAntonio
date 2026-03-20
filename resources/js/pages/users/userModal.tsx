import { useForm } from '@inertiajs/react';
import { KeyRound, MapPin, Phone, Save, UserCircle, X } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';
import { User } from './index';

interface UserModalProps {
    show: boolean;
    onClose: () => void;
    userToEdit?: User | null;
}

export default function UserModal({
    show,
    onClose,
    userToEdit,
}: UserModalProps) {
    const isEditing = !!userToEdit;

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            nickname: '',
            full_name: '',
            phone: '',
            address: '',
            password: '',
        });

    useEffect(() => {
        if (show) {
            if (userToEdit) {
                setData({
                    nickname: userToEdit.nickname || '',
                    full_name: userToEdit.full_name || '',
                    phone: userToEdit.phone || '',
                    address: userToEdit.address || '',
                    password: '', // En blanco por seguridad al editar
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, userToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (userToEdit) {
            put(`/usuarios/${userToEdit.id}`, options);
        } else {
            post('/usuarios', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <UserCircle className="h-5 w-5" />
                        </div>
                        {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        
                        {/* Campo Nombre Completo */}
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
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value.toUpperCase())}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="EJ: JUAN PEREZ"
                                />
                            </div>
                            {errors.full_name && <p className="mt-1 text-xs font-bold text-red-500">{errors.full_name}</p>}
                        </div>

                        {/* Fila: Nickname y Teléfono */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    Nickname
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 font-bold">
                                        @
                                    </div>
                                    <input
                                        type="text"
                                        value={data.nickname}
                                        onChange={(e) => setData('nickname', e.target.value.toLowerCase().replace(/\s/g, ''))}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-blue-600 font-semibold focus:border-gray-600 focus:ring-0"
                                        placeholder="jperez"
                                    />
                                </div>
                                {errors.nickname && <p className="mt-1 text-xs font-bold text-red-500">{errors.nickname}</p>}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    Teléfono
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                        placeholder="77123456"
                                    />
                                </div>
                                {errors.phone && <p className="mt-1 text-xs font-bold text-red-500">{errors.phone}</p>}
                            </div>
                        </div>

                        {/* Campo Dirección */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Dirección / Zona
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value.toUpperCase())}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="EJ: ZONA CENTRAL CALLE 1"
                                />
                            </div>
                            {errors.address && <p className="mt-1 text-xs font-bold text-red-500">{errors.address}</p>}
                        </div>

                        {/* Campo Contraseña */}
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Contraseña {isEditing && <span className="text-gray-400 font-normal text-xs">(Dejar en blanco para no cambiar)</span>}
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <KeyRound className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                    placeholder="********"
                                />
                            </div>
                            {errors.password && <p className="mt-1 text-xs font-bold text-red-500">{errors.password}</p>}
                        </div>

                    </div>

                    {/* Botones de Acción */}
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                'Guardando...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4" /> Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}