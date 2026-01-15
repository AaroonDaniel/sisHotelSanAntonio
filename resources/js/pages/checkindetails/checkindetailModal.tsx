import { useForm } from '@inertiajs/react';
import { UtensilsCrossed, Save, X, Hash } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

// --- INTERFACES ---
interface Service { 
    id: number; 
    name: string; 
    price: number; 
}

interface CheckinDetail {
    id?: number;
    checkin_id: number;
    service_id: number;
    quantity: number;
}

interface CheckinDetailModalProps {
    show: boolean;
    onClose: () => void;
    detailToEdit?: CheckinDetail | null;
    checkinId: number; // El ID del Checkin al que estamos agregando cosas
    services: Service[]; // Lista de servicios para el Select
}

export default function CheckinDetailModal({
    show,
    onClose,
    detailToEdit,
    checkinId,
    services = [], 
}: CheckinDetailModalProps) {
    
    // Configuración del formulario de Inertia
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            checkin_id: checkinId,
            service_id: '', // Inicializamos vacío (string para el select)
            quantity: 1,
        });

    // Efecto para cargar datos al abrir o cambiar modo (Edición vs Creación)
    useEffect(() => {
        if (show) {
            if (detailToEdit) {
                // MODO EDICIÓN: Cargar datos existentes
                setData({
                    checkin_id: detailToEdit.checkin_id,
                    service_id: detailToEdit.service_id.toString(), // Convertir a string para que el select lo detecte
                    quantity: detailToEdit.quantity,
                });
            } else {
                // MODO CREACIÓN: Resetear formulario
                reset();
                setData({
                    checkin_id: checkinId,
                    service_id: '',
                    quantity: 1,
                });
            }
            clearErrors();
        }
    }, [show, detailToEdit, checkinId]);

    // Función de envío del formulario
    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const onSuccess = () => {
            reset();
            onClose();
        };

        // --- LÓGICA SIN ZIGGY (Rutas Manuales) ---
        if (detailToEdit && detailToEdit.id) {
            // EDITAR: PUT /checkin-details/{id}
            put(`/checkin-details/${detailToEdit.id}`, { 
                onSuccess 
            });
        } else {
            // CREAR: POST /checkin-details
            post('/checkin-details', { 
                onSuccess 
            });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                
                {/* --- HEADER --- */}
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

                {/* --- BODY (FORMULARIO) --- */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        
                        {/* CAMPO 1: SELECCIONAR SERVICIO */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                Servicio
                            </label>
                            <div className="relative mt-1">
                                <select
                                    value={data.service_id}
                                    onChange={(e) => setData('service_id', e.target.value)}
                                    className="w-full rounded-lg border border-gray-400 py-2.5 pl-3 pr-8 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500"
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
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
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
                                    className="w-full rounded-lg border border-gray-400 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ej: 1"
                                />
                            </div>
                            {errors.quantity && (
                                <p className="mt-1 text-xs text-red-500 font-bold">{errors.quantity}</p>
                            )}
                        </div>

                    </div>

                    {/* --- FOOTER (BOTONES) --- */}
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
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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