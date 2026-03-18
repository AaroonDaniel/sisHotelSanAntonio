import { useForm } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, Save } from 'lucide-react';
import { useEffect } from 'react';

export default function UserModal({ show, onClose, user }: any) {
    const isEditing = !!user;

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        nickname: '',
        full_name: '',
        phone: '',
        address: '',
        password: '',
    });

    useEffect(() => {
        if (show) {
            if (isEditing) {
                setData({
                    nickname: user.nickname || '',
                    full_name: user.full_name || '',
                    phone: user.phone || '',
                    address: user.address || '',
                    password: '', // Siempre vacío al editar por seguridad
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, user]);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isEditing) {
            // CAMBIAR AQUI: /usuarios/
            put(`/usuarios/${user.id}`, {
                onSuccess: () => onClose(),
            });
        } else {
            // CAMBIAR AQUI: /usuarios
            post('/usuarios', {
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <Dialog open={show} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modifica los datos del personal.' : 'Crea unas credenciales de acceso.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">Nombre Completo</label>
                            <input
                                type="text"
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value.toUpperCase())}
                                className="w-full rounded-lg border-gray-300 uppercase focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.full_name && <span className="text-xs text-red-500">{errors.full_name}</span>}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">Nickname (Usuario)</label>
                            <input
                                type="text"
                                value={data.nickname}
                                onChange={(e) => setData('nickname', e.target.value.toLowerCase().replace(/\s/g, ''))}
                                className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.nickname && <span className="text-xs text-red-500">{errors.nickname}</span>}
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">Teléfono</label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.phone && <span className="text-xs text-red-500">{errors.phone}</span>}
                        </div>

                        <div className="col-span-2">
                            <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">Dirección / Zona</label>
                            <input
                                type="text"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value.toUpperCase())}
                                className="w-full rounded-lg border-gray-300 uppercase focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.address && <span className="text-xs text-red-500">{errors.address}</span>}
                        </div>

                        <div className="col-span-2 rounded-lg bg-gray-50 p-3">
                            <label className="mb-1 block text-xs font-bold text-gray-600 uppercase">
                                Contraseña {isEditing && <span className="text-gray-400 font-normal">(Dejar en blanco para no cambiar)</span>}
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {processing ? 'Guardando...' : 'Guardar Usuario'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}