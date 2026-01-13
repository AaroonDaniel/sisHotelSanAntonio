import { useForm } from '@inertiajs/react';
import { BedDouble, FileText, Hash, Plus, Save, ShoppingBag, User, X, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';

// --- INTERFACES ---
interface Service {
    id: number;
    name: string;
    price: number;
}

interface CheckinFormData {
    checkin_id: number;
    service_id: string;
    quantity: number;
}

interface Props {
    show: boolean;
    onClose: () => void;
    checkin: any;
    services: Service[];
}

export default function CheckinDetailsModal({ show, onClose, checkin, services = [] }: Props) {
    // 1. --- HOOKS SIEMPRE AL PRINCIPIO (Regla de Oro de React) ---
    
    // Usamos valores seguros (|| 0 o '') por si checkin es null al inicio
    const { data, setData, post, processing, reset, errors, clearErrors } = useForm<CheckinFormData>({
        checkin_id: checkin?.id || 0, 
        service_id: '',
        quantity: 1,
    });

    // 2. useEffect seguro: Dependemos del ID, no de todo el objeto (evita loops)
    useEffect(() => {
        if (checkin?.id) {
            setData('checkin_id', checkin.id);
            clearErrors();
        }
    }, [checkin?.id]); // Solo se dispara si cambia el ID del checkin

    // 3. Lógica de filtrado (Calculada siempre, es ligera)
    const filteredDetails = useMemo(() => {
        if (!checkin || !checkin.checkin_details) return [];
        
        const details = checkin.checkin_details;
        const ignoredServices = ['GARAGE', 'DESAYUNO'];

        return details.filter((detail: any) => {
            const name = detail.service?.name?.toUpperCase() || '';
            return !ignoredServices.some((ignored) => name.includes(ignored));
        });
    }, [checkin?.checkin_details, checkin?.id]); // Dependencias primitivas o seguras

    const totalConsumo = filteredDetails.reduce((acc: number, item: any) => {
        const price = item.selling_price ?? item.service?.price ?? 0;
        return acc + price * item.quantity;
    }, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/checkin-details', {
            preserveScroll: true,
            onSuccess: () => {
                reset('service_id', 'quantity');
                setData('quantity', 1);
                // Aseguramos que el ID se mantenga
                if (checkin?.id) setData('checkin_id', checkin.id);
            },
        });
    };

    // 4. --- CONDICIONAL DE RENDERIZADO AL FINAL ---
    // Recién ahora, después de que todos los hooks se han inicializado, decidimos si pintar o no.
    if (!show || !checkin) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* HEADER */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                            <FileText className="h-5 w-5" />
                        </div>
                        Gestión de Consumos
                    </h2>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* BODY PRINCIPAL */}
                <div className="flex flex-col md:flex-row">
                    
                    {/* COLUMNA IZQUIERDA: DATOS HUÉSPED (Solo Lectura) */}
                    <div className="relative flex-1 border-r border-gray-200 bg-white p-6">
                        <div className="mb-6 space-y-6">
                            {/* Tarjeta Info */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="block text-[24px] font-bold text-blue-600 uppercase">
                                        Hab. {checkin.room?.number}
                                    </span>
                                    <div className="rounded-full bg-white p-2 shadow-sm">
                                        <BedDouble className="h-6 w-6 text-blue-500" />
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                                            Huésped Titular
                                        </label>
                                        <div className="flex items-center gap-2 text-gray-800">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="font-bold">{checkin.guest?.full_name}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">
                                            Documento
                                        </label>
                                        <span className="font-medium text-gray-700">
                                            {checkin.guest?.identification_number || 'S/N'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Resumen Económico */}
                            <div className="rounded-xl border border-gray-300 bg-gray-100 p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-700 font-bold uppercase">Total Filtrado:</span>
                                    <span className="text-xl font-black text-gray-900">{totalConsumo.toFixed(2)} Bs</span>
                                </div>
                                <div className="text-[10px] text-gray-500 italic text-center border-t border-gray-300 pt-2">
                                    * No incluye Garage ni Desayuno
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: FORMULARIO Y LISTA */}
                    <div className="flex-[2] bg-gray-50 p-6 flex flex-col h-[550px]">
                        
                        {/* --- FORMULARIO "MÁS OSCURO" INTEGRADO --- */}
                        <div className="mb-5 rounded-xl border border-gray-300 bg-gray-200/80 p-4 shadow-inner">
                            <h3 className="mb-3 text-xs font-bold uppercase text-gray-700 flex items-center gap-2">
                                <Plus className="h-3 w-3" /> Agregar Nuevo Consumo
                            </h3>
                            
                            <form onSubmit={handleSubmit} className="flex items-start gap-3">
                                {/* Select Servicio */}
                                <div className="flex-1">
                                    <select
                                        value={data.service_id}
                                        onChange={(e) => setData('service_id', e.target.value)}
                                        className="w-full rounded-lg border-gray-400 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-900 uppercase focus:border-gray-800 focus:ring-gray-800 shadow-sm"
                                        required
                                    >
                                        <option value="">- SELECCIONAR SERVICIO -</option>
                                        {services.map((srv) => (
                                            <option key={srv.id} value={srv.id}>
                                                {srv.name} ({srv.price} Bs)
                                            </option>
                                        ))}
                                    </select>
                                    {errors.service_id && <p className="mt-1 text-[10px] font-bold text-red-600">{errors.service_id}</p>}
                                </div>

                                {/* Input Cantidad */}
                                <div className="w-24">
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Hash className="h-3 w-3 text-gray-500" />
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={data.quantity}
                                            onChange={(e) => setData('quantity', parseInt(e.target.value) || 1)}
                                            className="w-full rounded-lg border-gray-400 bg-white py-2 pl-8 pr-2 text-sm font-bold text-gray-900 focus:border-gray-800 focus:ring-gray-800 shadow-sm"
                                        />
                                    </div>
                                    {errors.quantity && <p className="mt-1 text-[10px] font-bold text-red-600">{errors.quantity}</p>}
                                </div>
                               
                                {/* Botón Guardar - AZUL Y CELESTE */}
                                <button
                                    type="submit"
                                    disabled={processing || !data.service_id}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-blue-400 active:scale-95 disabled:opacity-100 h-[38px]"
                                >
                                    {processing ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5" />
                                            <span className="hidden sm:inline">Agregar</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* --- LISTA DE DETALLES --- */}
                        <div className="flex items-center justify-between mb-2 border-b border-gray-300 pb-2">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-gray-600" />
                                Historial de Consumos
                            </h3>
                            <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded border border-gray-300">
                                {filteredDetails.length} ITEMS
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1">
                            {filteredDetails.length > 0 ? (
                                <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                                    <thead className="text-xs text-gray-500 uppercase sticky top-0 bg-gray-50 z-10">
                                        <tr>
                                            <th className="px-3 py-2">Detalle</th>
                                            <th className="px-3 py-2 text-center">Cant.</th>
                                            <th className="px-3 py-2 text-right">P. Unit</th>
                                            <th className="px-3 py-2 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-700">
                                        {filteredDetails.map((detail: any) => {
                                            const price = detail.selling_price ?? detail.service?.price ?? 0;
                                            const subtotal = price * detail.quantity;
                                            return (
                                                <tr key={detail.id} className="group hover:bg-white transition-colors">
                                                    <td className="rounded-l-lg border-y border-l border-transparent bg-white px-3 py-3 font-medium text-gray-800 group-hover:border-gray-200 shadow-sm">
                                                        {detail.service?.name}
                                                    </td>
                                                    <td className="border-y border-transparent bg-white px-3 py-3 text-center text-gray-600 group-hover:border-gray-200 shadow-sm">
                                                        {detail.quantity}
                                                    </td>
                                                    <td className="border-y border-transparent bg-white px-3 py-3 text-right text-gray-600 group-hover:border-gray-200 shadow-sm">
                                                        {Number(price).toFixed(2)}
                                                    </td>
                                                    <td className="rounded-r-lg border-y border-r border-transparent bg-white px-3 py-3 text-right font-bold text-gray-900 group-hover:border-gray-200 shadow-sm">
                                                        {subtotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                    <ShoppingBag className="h-16 w-16 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No hay consumos registrados.</p>
                                    <p className="text-xs">Utiliza el formulario superior para agregar.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex justify-end pt-4 border-t border-gray-300">
                            <button
                                onClick={onClose}
                                className="rounded-xl border border-gray-300 bg-white px-6 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
                            >
                                Cerrar Ventana
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}