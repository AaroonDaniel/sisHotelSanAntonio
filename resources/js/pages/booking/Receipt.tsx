import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Printer, Home } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';

export default function Receipt({ reservation }: any) {
    
    // Si por alguna razón no llega la reserva, evitamos que la página explote
    if (!reservation) return <div className="text-center p-10">Cargando recibo...</div>;

    const handlePrint = () => {
        window.print();
    };

    // ==========================================
    // 🧮 LÓGICA DE PAGOS Y SALDOS
    // ==========================================
    // 1. Sumamos el precio por noche de todas las habitaciones seleccionadas
    const totalRoomsPerNight = reservation.details?.reduce((acc: number, curr: any) => acc + Number(curr.price || 0), 0) || 0;
    
    // 2. Multiplicamos por la cantidad de noches para el costo total
    const durationDays = Number(reservation.duration_days) || 1;
    const totalAmount = totalRoomsPerNight * durationDays;
    
    // 3. Obtenemos el monto que ya adelantó mediante QR
    const advancePaid = reservation.payments && reservation.payments.length > 0 ? Number(reservation.payments[0].amount) : 0;
    
    // 4. Calculamos lo que falta pagar en recepción
    const balanceDue = totalAmount - advancePaid;

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 flex justify-center print:bg-white print:py-0 print:block">
            <Head title={`Comprobante #${reservation.id}`} />

            {/* Contenedor principal estrecho tipo Factura/Ticket (Mitad de hoja) */}
            <div className="w-full max-w-md print:max-w-[14cm] print:mx-0 print:w-full">
                
                {/* Botones de acción superiores (Ocultos al imprimir) */}
                <div className="flex justify-between items-center mb-4 print:hidden">
                    <Link href="/reservar">
                        <Button variant="outline" size="sm" className="text-[#1e3a5f] bg-white">
                            <Home className="w-4 h-4 mr-2" /> Inicio
                        </Button>
                    </Link>
                    <Button onClick={handlePrint} size="sm" className="bg-[#1e3a5f] hover:bg-[#152a46] text-white shadow-sm">
                        <Printer className="w-4 h-4 mr-2" /> Imprimir
                    </Button>
                </div>

                <Card className="border-t-8 border-t-[#28a745] shadow-lg bg-white print:shadow-none print:border-t-4 print:border-t-gray-800 rounded-sm">
                    
                    {/* ENCABEZADO DEL TICKET */}
                    <CardHeader className="text-center border-b border-dashed border-gray-300 pb-4 pt-6">
                        <div className="flex justify-center mb-2 print:hidden">
                            <CheckCircle2 className="w-12 h-12 text-[#28a745]" />
                        </div>
                        <h1 className="text-xl font-black text-gray-800 uppercase tracking-widest">Hotel San Antonio</h1>
                        <CardTitle className="text-base font-bold text-gray-600 mt-1">COMPROBANTE DE RESERVA</CardTitle>
                        <p className="text-sm font-mono text-gray-500 mt-1">N°: {String(reservation.id).padStart(5, '0')}</p>
                    </CardHeader>

                    <CardContent className="p-6">
                        
                        {/* DATOS DEL CLIENTE Y ESTADÍA */}
                        <div className="space-y-4 mb-6 text-sm text-gray-700">
                            <div>
                                <p className="font-bold text-[#1e3a5f] uppercase text-xs mb-1">Titular de la Reserva</p>
                                <p className="font-semibold text-base">{reservation.guest?.full_name}</p>
                                <p className="text-gray-500">CI/Pasaporte: {reservation.guest?.identification_number}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-sm print:bg-transparent print:p-0 print:border-y print:border-dashed print:border-gray-300 print:py-3">
                                <div>
                                    <p className="font-bold text-gray-500 uppercase text-[10px]">Ingreso (Check-in)</p>
                                    <p className="font-bold text-gray-800">{reservation.arrival_date}</p>
                                    <p className="text-xs text-gray-500">14:00 hrs</p>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-500 uppercase text-[10px]">Detalles de estadía</p>
                                    <p className="font-medium text-gray-800">{durationDays} Noche(s)</p>
                                    <p className="text-xs text-gray-500">{reservation.guest_count} Huésped(es)</p>
                                </div>
                            </div>
                        </div>

                        {/* HABITACIONES RESERVADAS */}
                        <div className="mb-6">
                            <p className="font-bold text-[#1e3a5f] uppercase text-xs mb-2 border-b border-gray-200 pb-1">Habitaciones Seleccionadas</p>
                            <div className="space-y-2 text-sm">
                                {reservation.details?.map((detail: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <div className="text-gray-800">
                                            {detail.room?.room_type?.name || 'Habitación'} {detail.room?.number ? `(${detail.room.number})` : ''}
                                        </div>
                                        <div className="text-gray-900 font-medium text-right">
                                            Bs. {Number(detail.price).toFixed(2)} <span className="text-[10px] text-gray-500 block -mt-1 font-normal">/noche</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DESGLOSE MATEMÁTICO DE PAGOS */}
                        <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Costo total ({durationDays} noches):</span>
                                <span>Bs. {totalAmount.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between text-green-700 font-bold bg-green-50 p-2 rounded-sm print:bg-transparent print:p-0">
                                <span>Adelanto Pagado (QR):</span>
                                <span>- Bs. {advancePaid.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-lg font-black text-gray-800 pt-2 border-t border-gray-200 mt-2">
                                <span>Saldo a Pagar:</span>
                                <span className="text-[#b3282d]">Bs. {balanceDue.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* PIE DEL TICKET */}
                        <div className="mt-8 text-center text-xs text-gray-500 print:mt-12">
                            <p className="font-semibold text-gray-700">Importante:</p>
                            <p className="italic mb-2">El saldo pendiente debe cancelarse en recepción al momento del ingreso.</p>
                            <p className="mt-4 font-bold tracking-widest uppercase">¡Gracias por su preferencia!</p>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}