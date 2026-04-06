import { useForm } from '@inertiajs/react';
import { X, Save, ShieldCheck, AlertCircle } from 'lucide-react';
import { useEffect, FormEventHandler } from 'react';

interface RoleModalProps {
    show: boolean;
    onClose: () => void;
    RoleToEdit?: any | null;
    allPermissions: any[];
}

export default function RoleModal({ show, onClose, RoleToEdit, allPermissions }: RoleModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        permissions: [] as string[],
    });

    useEffect(() => {
        if (show) {
            if (RoleToEdit) {
                setData({
                    name: RoleToEdit.name,
                    permissions: RoleToEdit.permissions ? RoleToEdit.permissions.map((p: any) => p.name) : [],
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, RoleToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            }
        };

        if (RoleToEdit) {
            put(`/roles/${RoleToEdit.id}`, options);
        } else {
            post('/roles', options);
        }
    };

    const handlePermissionToggle = (permName: string) => {
        let current = [...data.permissions];
        if (current.includes(permName)) {
            current = current.filter(p => p !== permName);
        } else {
            current.push(permName);
        }
        setData('permissions', current);
    };

    const isProtected = RoleToEdit?.name === 'ADMINISTRADOR';

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 shrink-0">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        {RoleToEdit ? 'Editar Cargo' : 'Nuevo Cargo'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="space-y-6">
                            
                            {/* Nombre */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    Nombre del Cargo
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className={`w-full rounded-xl border border-gray-400 py-2.5 px-4 text-base text-black uppercase focus:border-blue-600 focus:ring-0 ${isProtected ? 'bg-gray-100 text-gray-500' : ''}`}
                                    placeholder="Ej: Auditor, Gerente"
                                    required
                                    disabled={isProtected}
                                    autoFocus={!RoleToEdit}
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-500 font-bold">{errors.name}</p>}
                                {isProtected && (
                                    <p className="mt-2 flex items-center text-xs font-bold text-orange-500">
                                        <AlertCircle className="h-4 w-4 mr-1" /> El nombre del Administrador está protegido.
                                    </p>
                                )}
                            </div>

                            {/* Permisos */}
                            <div>
                                <label className="mb-3 block text-sm font-semibold text-gray-700">
                                    Permisos Vinculados
                                </label>
                                {allPermissions.length === 0 ? (
                                     <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                        <p className="text-sm font-bold text-gray-500">No hay permisos creados.</p>
                                     </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {allPermissions.map((perm) => (
                                            <label key={perm.id} className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer ${data.permissions.includes(perm.name) ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-blue-300'} ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                                    checked={data.permissions.includes(perm.name)}
                                                    onChange={() => handlePermissionToggle(perm.name)}
                                                    disabled={isProtected}
                                                />
                                                <span className="ml-3 text-xs font-bold text-gray-700 uppercase">
                                                    {perm.name.replace(/_/g, ' ')}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 flex justify-end gap-3 border-t border-gray-100 p-4 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar Cargo</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}