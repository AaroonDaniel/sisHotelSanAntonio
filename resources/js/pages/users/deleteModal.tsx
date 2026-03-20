import { useForm } from '@inertiajs/react';
import { UserCheck, UserX } from 'lucide-react';
import { FormEventHandler } from 'react';
import { User } from './index'; // Importamos la interfaz User

interface DeleteModalProps {
    show: boolean;
    onClose: () => void;
    user: User | null; // Ahora recibimos el usuario completo en lugar de solo el ID
}

export default function DeleteModal({ show, onClose, user }: DeleteModalProps) {
    const { delete: destroy, processing } = useForm();

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (user) {
            destroy(`/usuarios/${user.id}`, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    };

    if (!show || !user) return null;

    // Determinamos la acción basados en el estado actual del usuario
    const isActivating = !user.is_active;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    {/* Icono Dinámico (Verde si habilita, Rojo si deshabilita) */}
                    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isActivating ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isActivating ? <UserCheck className="h-8 w-8" /> : <UserX className="h-8 w-8" />}
                    </div>
                    
                    {/* Título Dinámico */}
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        {isActivating ? '¿Habilitar usuario?' : '¿Deshabilitar usuario?'}
                    </h3>
                    
                    {/* Mensaje Dinámico */}
                    <p className="text-gray-500">
                        {isActivating 
                            ? `El usuario ${user.full_name} recuperará su acceso y podrá ingresar al sistema nuevamente.` 
                            : `El usuario ${user.full_name} perderá su acceso al sistema inmediatamente. No podrá iniciar sesión hasta ser habilitado de nuevo.`}
                    </p>
                    
                    <form onSubmit={submit} className="mt-8 flex justify-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </button>
                        
                        {/* Botón de Submit Dinámico */}
                        <button
                            type="submit"
                            disabled={processing}
                            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md active:scale-95 transition disabled:opacity-50 ${isActivating ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                        >
                            {processing 
                                ? (isActivating ? 'Habilitando...' : 'Deshabilitando...') 
                                : (isActivating ? <><UserCheck className="h-4 w-4" /> Sí, habilitar</> : <><UserX className="h-4 w-4" /> Sí, deshabilitar</>)
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}