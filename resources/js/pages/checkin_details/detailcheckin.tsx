import { BedDouble, FileText, ShoppingBag, User, X } from 'lucide-react';
import React, { useMemo } from 'react';

interface Props {
    show: boolean;
    onClose: () => void;
    checkin: any; // O tu interfaz Checkin completa
}

export default function CheckinDetailsModal({ show, onClose, checkin }: Props) {
    if (!show || !checkin) return null;

    // --- LÓGICA DE FILTRADO ---
    // Filtramos los detalles para excluir Garage y Desayuno (insensible a mayúsculas/minúsculas)
    const filteredDetails = useMemo(() => {
        const details = checkin.checkin_details || [];
        const ignoredServices = ['GARAGE', 'DESAYUNO'];

        return details.filter((detail: any) => {
            const name = detail.service?.name?.toUpperCase() || '';
            // Si el nombre contiene alguna de las palabras prohibidas, lo sacamos
            return !ignoredServices.some((ignored) => name.includes(ignored));
        });
    }, [checkin]);

    // Calcular el total SOLO de los items filtrados
    const totalConsumo = filteredDetails.reduce((acc: number, item: any) => {
        const price = item.selling_price ?? item.service?.price ?? 0;
        return acc + price * item.quantity;
    }, 0);

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* HEADER (Mismo estilo que tu referencia) */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                            <FileText className="h-5 w-5" />
                        </div>
                        Detalle de Consumos Adicionales
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

                {/* BODY (Estructura de dos columnas similar al formulario de ingreso) */}
                <div className="flex flex-col md:flex-row">
                    
                    {/* IZQUIERDA - DATOS HUÉSPED (Solo Lectura) */}
                    <div className="relative flex-1 border-r border-gray-100 bg-white p-6">
                        <div className="mb-6 space-y-6">
                            
                            {/* Tarjeta de Información Principal */}
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

                            {/* Resumen Económico Rápido */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600 font-medium">Total Filtrado:</span>
                                    <span className="text-lg font-bold text-gray-900">{totalConsumo.toFixed(2)} Bs</span>
                                </div>
                                <div className="text-[10px] text-gray-400 italic text-center">
                                    * No incluye Garage ni Desayuno
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DERECHA - LISTA DE DETALLES */}
                    <div className="flex-[1.5] bg-gray-50 p-6">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-gray-500" />
                                Lista de Servicios
                            </h3>
                            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                {filteredDetails.length} items
                            </span>
                        </div>

                        <div className="h-[350px] overflow-y-auto pr-1">
                            {filteredDetails.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-xs text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 rounded-l-lg">Detalle</th>
                                            <th className="px-3 py-2 text-center">Cant.</th>
                                            <th className="px-3 py-2 text-right">P. Unit</th>
                                            <th className="px-3 py-2 text-right rounded-r-lg">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredDetails.map((detail: any) => {
                                            const price = detail.selling_price ?? detail.service?.price ?? 0;
                                            const subtotal = price * detail.quantity;
                                            return (
                                                <tr key={detail.id} className="hover:bg-white transition-colors">
                                                    <td className="px-3 py-3 font-medium text-gray-700">
                                                        {detail.service?.name}
                                                    </td>
                                                    <td className="px-3 py-3 text-center text-gray-600">
                                                        {detail.quantity}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-gray-600">
                                                        {Number(price).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-bold text-gray-800">
                                                        {subtotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                    <ShoppingBag className="h-12 w-12 mb-2 opacity-20" />
                                    <p className="text-sm">No hay consumos extras registrados.</p>
                                    <p className="text-xs opacity-60">(O fueron filtrados)</p>
                                </div>
                            )}
                        </div>

                        {/* Footer del Modal */}
                        <div className="mt-4 flex justify-end pt-4 border-t border-gray-200">
                            <button
                                onClick={onClose}
                                className="rounded-xl bg-gray-800 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-gray-900 active:scale-95"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}