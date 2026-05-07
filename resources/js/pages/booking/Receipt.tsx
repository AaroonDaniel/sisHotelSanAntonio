import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CalendarDays, User, CreditCard, Printer, Home } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';

export default function Receipt({ reservation }: any) {
    
    // Si por alguna razón no llega la reserva, evitamos que la página explote
    if (!reservation) return <div className="text-center p-10">Cargando recibo...</div>;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Head title={`Comprobante #${reservation.id}`} />

            <div className="max-w-3xl mx-auto">
                {/* Botones de acción superiores (No se imprimen) */}
                <div className="flex justify-between items-center mb-6 print:hidden">
                    <Link href="/reservar">
                        <Button variant="outline" className="text-[#1e3a5f]">
                            <Home className="w-4 h-4 mr-2" /> Nueva Reserva
                        </Button>
                    </Link>
                    <Button onClick={handlePrint} className="bg-[#1e3a5f] hover:bg-[#152a46] text-white">
                        <Printer className="w-4 h-4 mr-2" /> Imprimir Comprobante
                    </Button>
                </div>

                <Card className="border-t-8 border-t-[#28a745] shadow-lg bg-white">
                    <CardHeader className="text-center border-b border-gray-100 pb-6 pt-8">
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-16 h-16 text-[#28a745]" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-gray-800">¡Reserva Confirmada!</CardTitle>
                        <p className="text-gray-500 mt-2">
                            Tu reserva ha sido registrada con éxito. Por favor, presenta este comprobante en recepción.
                        </p>
                    </CardHeader>

                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Información de la Reserva */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-[#b3282d] border-b pb-2">Detalles de Estadía</h3>
                                <div className="flex items-center text-gray-700">
                                    <span className="font-semibold w-24">N° Reserva:</span> 
                                    <span className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{reservation.id}</span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <span className="font-semibold w-24">Ingreso:</span> 
                                    {reservation.arrival_date} (14:00)
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <span className="font-semibold w-24">Noches:</span> 
                                    {reservation.duration_days} noche(s)
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <span className="font-semibold w-24">Huéspedes:</span> 
                                    {reservation.guest_count} persona(s)
                                </div>
                            </div>

                            {/* Información del Titular */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-[#b3282d] border-b pb-2">Datos del Titular</h3>
                                <div className="flex items-center text-gray-700">
                                    <User className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{reservation.guest?.full_name}</span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>CI: {reservation.guest?.identification_number}</span>
                                </div>
                            </div>
                        </div>

                        {/* Habitaciones Reservadas */}
                        <div className="mt-8">
                            <h3 className="font-bold text-lg text-[#b3282d] border-b pb-2 mb-4">Habitaciones Seleccionadas</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                {reservation.details?.map((detail: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                {detail.room?.room_type?.name || 'Habitación'} - {detail.room?.number || `N° ${detail.room?.id}`}
                                            </p>
                                        </div>
                                        <div className="text-right font-medium text-gray-700">
                                            Bs. {detail.price} / noche
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pagos */}
                        <div className="mt-8 flex justify-end">
                            <div className="w-full md:w-1/2 bg-green-50 p-4 rounded-lg border border-green-100">
                                <h3 className="font-bold text-green-800 mb-2">Estado de Pago</h3>
                                {reservation.payments && reservation.payments.length > 0 ? (
                                    <div className="flex justify-between items-center text-green-700">
                                        <span>Adelanto pagado (QR):</span>
                                        <span className="font-bold text-lg">Bs. {reservation.payments[0].amount}</span>
                                    </div>
                                ) : (
                                    <p className="text-gray-600">Verificando comprobante...</p>
                                )}
                                <p className="text-xs text-green-600 mt-2">* Pago sujeto a verificación por recepción.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}