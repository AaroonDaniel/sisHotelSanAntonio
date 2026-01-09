import { useForm } from '@inertiajs/react';
import { UtensilsCrossed, Save, X, Hash } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

// --- INTERFACES CORREGIDAS ---

interface Service { 
    id: number; 
    name: string; 
    // CORRECCIÓN 1: Permitir string o number para evitar el error de tipos
    price: number | string; 
}

interface CheckinDetail {
    id?: number;
    checkin_id: number;
    service_id: number;
    quantity: number;
}

interface CheckindetailModalProps {
    show: boolean;
    onClose: () => void;
    // CORRECCIÓN 2: Usar nombre estándar 'detailToEdit' para coincidir con Index.tsx
    detailToEdit?: CheckinDetail | null; 
    // Opcional, por si estamos creando uno nuevo desde una vista general
    checkinId?: number; 
    services: Service[]; 
}

export default function CheckindetailModal({
    show,
    onClose,
    detailToEdit, // Renombrado para consistencia
    checkinId = 0, // Valor por defecto
    services = [], 
}: CheckindetailModalProps) {
    
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            checkin_id: checkinId,
            service_id: '',
            quantity: 1, 
        });

    useEffect(() => {
        if (show) {
            if (detailToEdit) {
                // MODO EDICIÓN: Cargamos datos existentes
                setData({
                    checkin_id: detailToEdit.checkin_id,
                    service_id: detailToEdit.service_id.toString(),
                    quantity: detailToEdit.quantity,
                });
            } else {
                // MODO CREACIÓN: Reseteamos
                reset();
                // Si recibimos un checkinId desde el padre, lo usamos
                setData({
                    checkin_id: checkinId,
                    service_id: '',
                    quantity: 1,
                });
            }
            clearErrors();
        }
    }, [show, detailToEdit, checkinId]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const onSuccess = () => {
            reset();
            onClose();
        };

        if (detailToEdit && detailToEdit.id) {
            // Importante: Asegúrate de que la ruta en Laravel sea la correcta (put)
            // Usualmente resource usa: /ckecksdetails/{id}
            put(`/ckecksdetails/${detailToEdit.id}`, { onSuccess });
        } else {
            post('/ckecksdetails', { onSuccess });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <UtensilsCrossed className="h-5 w-5" />
                        </div>
                        {detailToEdit ? 'Editar Consumo' : 'Agregar Servicio'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        
                        {/* CAMPO OCULTO: ID DEL CHECKIN */}
                        {/* Si estamos en modo creación general y no hay checkinId, aquí deberías poner un Select de Checkins */}
                        {/* Por ahora asumimos que checkinId viene del padre o del detalle editado */}

                        {/* CAMPO 1: SELECCIONAR SERVICIO */}
                        <div>
                            <label className="text-xs font-bold text-gray-500">
                                Servicio
                            </label>
                            <div className="relative mt-1">
                                <select
                                    value={data.service_id}
                                    onChange={(e) => setData('service_id', e.target.value)}
                                    className="w-full rounded-lg border border-gray-400 py-2 pl-3 pr-8 text-sm text-black uppercase focus:border-gray-600 focus:ring-0"
                                >
                                    <option value="" disabled>-- Seleccione un Servicio --</option>
                                    {services.map((srv) => (
                                        <option key={srv.id} value={srv.id}>
                                            {srv.name} - ${srv.price}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.service_id && (
                                <p className="mt-1 text-xs text-red-500 font-bold">{errors.service_id}</p>
                            )}
                        </div>

                        {/* CAMPO 2: CANTIDAD */}
                        <div>
                            <label className="text-xs font-bold text-gray-500">
                                Cantidad
                            </label>
                            <div className="relative mt-1">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    value={data.quantity}
                                    onChange={(e) => setData('quantity', parseInt(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-gray-400 py-2 pl-10 pr-3 text-sm text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="Ej: 1"
                                />
                            </div>
                            {errors.quantity && (
                                <p className="mt-1 text-xs text-red-500 font-bold">{errors.quantity}</p>
                            )}
                        </div>

                    </div>

                    {/* Footer */}
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