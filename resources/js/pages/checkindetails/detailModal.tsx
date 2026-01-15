import { useForm } from '@inertiajs/react';
import {
    UtensilsCrossed,
    Save,
    X,
    Hash,
    BedDouble,
    User,
    ShoppingBag,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

// --- INTERFACES ---
interface Service {
    id: number;
    name: string;
    price: number;
}

interface Checkin {
    id: number;
    guest: { full_name: string };
    room: { number: string };
}

interface CheckinDetail {
    id?: number;
    checkin_id: number;
    service_id: number;
    quantity: number;
}

// Interfaz de propiedades actualizada
interface DetailModalProps {
    show: boolean;
    onClose: () => void;
    detailToEdit?: CheckinDetail | null;
    checkins: Checkin[];
    services: Service[];
    initialCheckinId?: number | null; // <--- Importante para recibir el ID desde status
}

// --- COMPONENTE RENOMBRADO A DetailModal ---
export default function DetailModal({
    show,
    onClose,
    detailToEdit,
    checkins = [],
    services = [],
    initialCheckinId = null, 
}: DetailModalProps) {

    // Configuración del formulario
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            checkin_id: '',
            service_id: '',
            quantity: 1,
        });

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (show) {
            setSearchTerm('');
            if (detailToEdit) {
                // MODO EDICIÓN
                setData({
                    checkin_id: detailToEdit.checkin_id.toString(),
                    service_id: detailToEdit.service_id.toString(),
                    quantity: detailToEdit.quantity,
                });
            } else {
                // MODO CREACIÓN
                reset();
                clearErrors();
                // SI VIENE DE STATUS CON UN ID PRESELECCIONADO
                if (initialCheckinId) {
                    setData('checkin_id', initialCheckinId.toString());
                }
            }
        }
    }, [show, detailToEdit, initialCheckinId]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => {
            reset();
            onClose();
        };
        if (detailToEdit && detailToEdit.id) {
            put(`/checkin-details/${detailToEdit.id}`, { onSuccess });
        } else {
            post('/checkin-details', { onSuccess });
        }
    };

    // Cálculos visuales
    const selectedService = services.find(s => s.id.toString() === data.service_id);
    const totalCost = selectedService ? (selectedService.price * data.quantity).toFixed(2) : '0.00';
    
    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const hasErrors = Object.keys(errors).length > 0;

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in zoom-in-95">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <UtensilsCrossed className="h-5 w-5" />
                        </div>
                        {detailToEdit ? 'Editar Consumo' : 'Registrar Consumo'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* --- ALERTA DE ERRORES --- */}
                {hasErrors && (
                    <div className="border-b border-red-100 bg-red-50 px-6 py-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Por favor, revise los errores.</span>
                        </div>
                    </div>
                )}
                <form onSubmit={submit} className="flex flex-col md:flex-row h-[600px] md:h-auto">                    
                    {/* --- COLUMNA IZQUIERDA --- */}
                    <div className="relative w-full md:w-1/3 border-r border-gray-100 bg-white p-6 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                    Habitación / Huésped
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <BedDouble className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <select
                                        value={data.checkin_id}
                                        onChange={(e) => setData('checkin_id', e.target.value)}
                                        className={`w-full rounded-xl border ${errors.checkin_id ? 'border-red-300' : 'border-gray-400'} py-2.5 pl-10 pr-4 text-sm text-black focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100`}
                                        disabled={!!detailToEdit} 
                                    >
                                        <option value="" disabled>-- Seleccionar --</option>
                                        {checkins.map((chk) => (
                                            <option key={chk.id} value={chk.id}>
                                                Hab: {chk.room.number} - {chk.guest.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.checkin_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.checkin_id}</p>}
                            </div>

                            {data.checkin_id && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm">
                                        <User className="h-4 w-4" />
                                        Datos del Huésped
                                    </div>
                                    {(() => {
                                        const selected = checkins.find(c => c.id.toString() === data.checkin_id);
                                        return selected ? (
                                            <div className="text-sm text-blue-900">
                                                <p><span className="font-semibold">Nombre:</span> {selected.guest.full_name}</p>
                                                <p><span className="font-semibold">Habitación:</span> {selected.room.number}</p>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            )}

                            <div className="mt-8 rounded-2xl bg-gray-50 p-6 text-center border border-gray-100">
                                <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Total a Pagar</span>
                                <div className="flex items-center justify-center gap-1 text-3xl font-bold text-green-600">
                                    <span className="text-lg text-green-500">Bs.</span>
                                    {totalCost}
                                </div>
                                {selectedService && (
                                    <div className="mt-2 text-xs text-gray-400">
                                        {data.quantity} x {selectedService.name}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA --- */}
                    <div className="flex-1 bg-gray-50 p-6 flex flex-col">
                        <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-bold text-gray-800 flex justify-between items-center">
                            <span>Catálogo de Servicios</span>
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                className="w-40 rounded-lg border-gray-300 py-1 px-2 text-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </h3>

                        <div className="flex-1 overflow-y-auto pr-2 min-h-[300px]">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {filteredServices.map((service) => {
                                    const isSelected = data.service_id === service.id.toString();
                                    return (
                                        <button
                                            key={service.id}
                                            type="button"
                                            onClick={() => setData('service_id', service.id.toString())}
                                            className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                                                isSelected 
                                                    ? 'border-green-500 bg-white ring-2 ring-green-500' 
                                                    : 'border-gray-200 bg-white hover:border-green-400'
                                            }`}
                                        >
                                            <div className="mb-2 flex items-center justify-between w-full">
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 group-hover:bg-green-50 group-hover:text-green-500'}`}>
                                                    <ShoppingBag className="h-4 w-4" />
                                                </div>
                                                {isSelected && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                            </div>
                                            <div>
                                                <h4 className={`text-xs font-bold ${isSelected ? 'text-green-800' : 'text-gray-700'}`}>
                                                    {service.name}
                                                </h4>
                                                <span className="text-[10px] font-bold text-gray-500">
                                                    Bs. {service.price}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.service_id && <p className="mt-2 text-center text-xs text-red-500 font-bold">Debes seleccionar un servicio.</p>}
                        </div>

                        <div className="mt-6 border-t border-gray-200 pt-4">
                            <div className="mb-4 flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                                <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                    Cantidad:
                                </label>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setData('quantity', Math.max(1, data.quantity - 1))} className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold">-</button>
                                    <input type="number" value={data.quantity} onChange={(e) => setData('quantity', Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center border-none font-bold text-lg focus:ring-0 p-0" />
                                    <button type="button" onClick={() => setData('quantity', data.quantity + 1)} className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold">+</button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50">
                                    {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> {detailToEdit ? 'Actualizar' : 'Agregar'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}