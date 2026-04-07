import { useForm } from '@inertiajs/react';
import { X, Save, AlertTriangle, Hash, Wrench, AlignLeft, Camera } from 'lucide-react';
import { useEffect, FormEventHandler } from 'react';

interface MaintenanceModalProps {
    show: boolean;
    onClose: () => void;
    maintenanceToEdit?: any | null;
    rooms: any[];
}

export default function MaintenanceModal({ show, onClose, maintenanceToEdit, rooms }: MaintenanceModalProps) {
    const isEditing = !!maintenanceToEdit;

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        room_id: '',
        issue: '',
        description: '',
        photo: null as File | null,
        _method: isEditing ? 'put' : 'post',
    });

    useEffect(() => {
        if (show) {
            if (maintenanceToEdit) {
                setData({
                    room_id: maintenanceToEdit.room_id || '',
                    issue: maintenanceToEdit.issue || '',
                    description: maintenanceToEdit.description || '',
                    photo: null,
                    _method: 'put',
                });
            } else {
                reset();
                setData('_method', 'post');
            }
            clearErrors();
        }
    }, [show, maintenanceToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            }
        };

        if (isEditing) {
            post(`/maintenances/${maintenanceToEdit.id}`, options);
        } else {
            post('/maintenances', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-red-100 p-1.5 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        {isEditing ? 'Editar Reporte de Daño' : 'Nuevo Reporte de Falla'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        
                        {/* Habitación */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Habitación Afectada
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    required
                                    disabled={isEditing}
                                    value={data.room_id}
                                    onChange={(e) => setData('room_id', e.target.value)}
                                    className={`w-full rounded-lg border py-2 pr-3 pl-10 text-base focus:ring-0 ${isEditing ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-400 text-black focus:border-red-600'}`}
                                >
                                    <option value="">Seleccione una habitación...</option>
                                    {rooms?.map((room: any) => (
                                        <option key={room.id} value={room.id}>
                                            Hab. {room.number} ({room.type?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.room_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.room_id}</p>}
                        </div>

                        {/* Motivo / Falla */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Falla / Daño (Obligatorio)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Wrench className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={data.issue}
                                    onChange={(e) => setData('issue', e.target.value)}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-red-600 focus:ring-0"
                                    
                                />
                            </div>
                            {errors.issue && <p className="mt-1 text-xs text-red-500 font-bold">{errors.issue}</p>}
                        </div>

                        {/* Descripción */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Descripción Detallada
                            </label>
                            <div className="relative flex items-start">
                                <div className="absolute left-0 top-3 flex items-center pl-3 pointer-events-none">
                                    <AlignLeft className="h-4 w-4 text-gray-400" />
                                </div>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-red-600 focus:ring-0"
                                    
                                />
                            </div>
                        </div>

                        {/* Fotografía */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                {isEditing ? 'Actualizar Evidencia (Opcional)' : 'Fotografía de Evidencia (Opcional)'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Camera className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setData('photo', e.target.files ? e.target.files[0] : null)}
                                    className="w-full rounded-lg border border-gray-400 py-1.5 pr-3 pl-10 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-red-50 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-red-700 hover:file:bg-red-100 focus:border-red-600 focus:ring-0"
                                />
                            </div>
                            {errors.photo && <p className="mt-1 text-xs text-red-500 font-bold">{errors.photo}</p>}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-red-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}