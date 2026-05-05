import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, AlertCircle, UploadCloud, QrCode } from 'lucide-react';

export default function PaymentSummary({ bookingData, setBookingData, onSubmit, onBack, isSubmitting }: any) {
    
    const [voucher, setVoucher] = useState<File | null>(null);

    // ==========================================
    // 🧮 MATEMÁTICAS DEL PAGO
    // ==========================================
    const durationDays = Number(bookingData.duration_days) || 1;
    
    // Sumamos el precio de cada habitación seleccionada
    const totalPerNight = bookingData.selectedRooms.reduce((sum: number, room: any) => {
        return sum + (Number(room.price) || 0);
    }, 0);

    const totalAmount = totalPerNight * durationDays;
    
    // Configuramos el adelanto al 50% (puedes cambiar este multiplicador)
    const advanceAmount = totalAmount * 0.5; 
    const pendingAmount = totalAmount - advanceAmount;

    // Manejar subida del comprobante
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVoucher(e.target.files[0]);
            // Guardamos el archivo en el estado global para mandarlo a Laravel
            setBookingData({ ...bookingData, payment_voucher: e.target.files[0] });
        }
    };

    const handleSubmit = () => {
        if (!voucher) {
            alert("Por favor, sube el comprobante de transferencia o pago QR para confirmar tu reserva.");
            return;
        }
        onSubmit(); // Llama a la función del componente padre que envía todo a Laravel
    };

    return (
        <div className="w-full max-w-4xl mx-auto pb-10">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-800 mr-2 px-2" disabled={isSubmitting}>
                    <ArrowLeft className="w-5 h-5 mr-2" /> Volver a mis datos
                </Button>
                <h2 className="text-2xl font-bold text-[#1e3a5f]">Confirmación y Pago</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* ================= COLUMNA IZQUIERDA: RESUMEN ================= */}
                <div className="space-y-6">
                    <Card className="border border-gray-200 shadow-sm rounded-sm">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-[#1e3a5f] border-b pb-3 mb-4">Resumen de tu Reserva</h3>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Titular:</span>
                                    <span className="font-semibold text-gray-800 uppercase">{bookingData.guest_name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Check-in:</span>
                                    <span className="font-semibold text-gray-800">{bookingData.check_in}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Duración:</span>
                                    <span className="font-semibold text-gray-800">{durationDays} noche(s)</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Huéspedes:</span>
                                    <span className="font-semibold text-gray-800">{bookingData.guests} persona(s)</span>
                                </div>
                            </div>

                            <h4 className="font-semibold text-sm text-gray-700 mb-3">Habitaciones seleccionadas:</h4>
                            <div className="space-y-2 mb-6">
                                {bookingData.selectedRooms.map((room: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                        <span>{room.typeName} <span className="text-xs text-gray-400">({room.name})</span></span>
                                        <span className="font-medium">Bs. {Number(room.price).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* TOTALES */}
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-gray-600">
                                    <span>Total estadía:</span>
                                    <span className="font-bold">Bs. {totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[#b3282d] font-bold text-lg bg-red-50 p-3 rounded-sm border border-red-100 mt-2">
                                    <span>Adelanto requerido (50%):</span>
                                    <span>Bs. {advanceAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                                    <span>Saldo a pagar en recepción:</span>
                                    <span>Bs. {pendingAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 flex items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                            Para garantizar tu reserva, requerimos un adelanto del 50%. El saldo restante lo podrás cancelar al momento de hacer tu Check-in en el hotel.
                        </p>
                    </div>
                </div>

                {/* ================= COLUMNA DERECHA: PAGO QR ================= */}
                <div className="space-y-6">
                    <Card className="border border-[#1e3a5f] shadow-md rounded-sm overflow-hidden">
                        <div className="bg-[#1e3a5f] text-white p-4 flex items-center justify-center">
                            <QrCode className="w-5 h-5 mr-2" />
                            <h3 className="font-bold text-lg">Paga con QR Simple</h3>
                        </div>
                        
                        <CardContent className="p-6 flex flex-col items-center">
                            <p className="text-sm text-center text-gray-600 mb-4">
                                Escanea este código QR desde la aplicación de tu banco para transferir el adelanto exacto de <strong className="text-black">Bs. {advanceAmount.toFixed(2)}</strong>.
                            </p>
                            
                            {/* IMAGEN DEL QR (Usa la imagen que tienes en public/images/) */}
                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg mb-6 bg-white">
                                <img 
                                    src="/images/qrCop.png" 
                                    alt="Código QR de Pago" 
                                    className="w-48 h-48 object-contain"
                                />
                            </div>

                            {/* LOGOS DE BANCOS */}
                            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Bancos Soportados</p>
                            <div className="flex gap-3 justify-center mb-6 opacity-70">
                                <img src="/images/bancos/bnb.png" alt="BNB" className="h-6 object-contain" />
                                <img src="/images/bancos/eco.png" alt="Económico" className="h-6 object-contain" />
                                <img src="/images/bancos/fie.png" alt="Fie" className="h-6 object-contain" />
                                <img src="/images/bancos/yape.png" alt="Yape" className="h-6 object-contain" />
                            </div>

                            {/* UPLOAD COMPROBANTE */}
                            <div className="w-full border-t pt-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sube tu comprobante de pago *
                                </label>
                                <div className="flex items-center justify-center w-full">
                                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-sm cursor-pointer transition-colors ${voucher ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {voucher ? (
                                                <>
                                                    <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                                                    <p className="text-sm text-green-700 font-semibold">{voucher.name}</p>
                                                    <p className="text-xs text-green-600 mt-1">¡Comprobante cargado!</p>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para subir</span> o arrastra la imagen</p>
                                                    <p className="text-xs text-gray-400">PNG, JPG o PDF (Máx. 5MB)</p>
                                                </>
                                            )}
                                        </div>
                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="w-full bg-[#b3282d] hover:bg-[#921f24] text-white h-14 text-lg font-bold rounded-sm shadow-md transition-all"
                    >
                        {isSubmitting ? 'Procesando reserva...' : 'Confirmar Reserva y Enviar'}
                    </Button>
                </div>

            </div>
        </div>
    );
}