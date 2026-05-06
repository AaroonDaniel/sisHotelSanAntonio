import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    QrCode,
    UploadCloud,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useState } from 'react';

export default function PaymentSummary({
    bookingData,
    setBookingData,
    onSubmit,
    onBack,
    isSubmitting,
}: any) {
    const [voucher, setVoucher] = useState<File | null>(null);

    // ==========================================
    // 🧮 MATEMÁTICAS DEL PAGO
    // ==========================================
    const durationDays = Number(bookingData.duration_days) || 1;

    // Sumamos el precio de cada habitación seleccionada
    const totalPerNight = bookingData.selectedRooms.reduce(
        (sum: number, room: any) => {
            return sum + (Number(room.price) || 0);
        },
        0,
    );

    const totalAmount = totalPerNight * durationDays;

    // Configuramos el adelanto al 50% (puedes cambiar este multiplicador)
    const advanceAmount = totalAmount * 0.5;
    const pendingAmount = totalAmount - advanceAmount;

    // Manejar subida del comprobante
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVoucher(e.target.files[0]);
            // Guardamos el archivo en el estado global para mandarlo a Laravel
            setBookingData({
                ...bookingData,
                payment_voucher: e.target.files[0],
            });
        }
    };

    const handleSubmit = () => {
        if (!voucher) {
            alert(
                'Por favor, sube el comprobante de transferencia o pago QR para confirmar tu reserva.',
            );
            return;
        }
        onSubmit(); // Llama a la función del componente padre que envía todo a Laravel
    };

    return (
        <div className="mx-auto w-full max-w-4xl pb-10">
            <div className="mb-6 flex items-center">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="mr-2 px-2 text-gray-500 hover:text-gray-800"
                    disabled={isSubmitting}
                >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Volver a mis datos
                </Button>
                <h2 className="text-2xl font-bold text-[#1e3a5f]">
                    Confirmación y Pago
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* ================= COLUMNA IZQUIERDA: RESUMEN ================= */}
                <div className="space-y-6">
                    <Card className="rounded-sm border border-gray-200 shadow-sm">
                        <CardContent className="p-6">
                            <h3 className="mb-4 border-b pb-3 text-lg font-bold text-[#1e3a5f]">
                                Resumen de tu Reserva
                            </h3>

                            <div className="mb-6 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Titular:
                                    </span>
                                    <span className="font-semibold text-gray-800 uppercase">
                                        {bookingData.guest_name}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Check-in:
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                        {bookingData.check_in}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Duración:
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                        {durationDays} noche(s)
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Huéspedes:
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                        {bookingData.guests} persona(s)
                                    </span>
                                </div>
                            </div>

                            <h4 className="mb-3 text-sm font-semibold text-gray-700">
                                Habitaciones seleccionadas:
                            </h4>
                            <div className="mb-6 space-y-2">
                                {bookingData.selectedRooms.map(
                                    (room: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded bg-gray-50 p-2 text-sm"
                                        >
                                            <span>
                                                {room.typeName}{' '}
                                                <span className="text-xs text-gray-400">
                                                    ({room.name})
                                                </span>
                                            </span>
                                            <span className="font-medium">
                                                Bs.{' '}
                                                {Number(room.price).toFixed(2)}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>

                            {/* TOTALES */}
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex justify-between text-gray-600">
                                    <span>Total estadía:</span>
                                    <span className="font-bold">
                                        Bs. {totalAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="mt-2 flex justify-between rounded-sm border border-red-100 bg-red-50 p-3 text-lg font-bold text-[#b3282d]">
                                    <span>Adelanto requerido (50%):</span>
                                    <span>Bs. {advanceAmount.toFixed(2)}</span>
                                </div>
                                <div className="mt-1 flex justify-between px-1 text-xs text-gray-500">
                                    <span>Saldo a pagar en recepción:</span>
                                    <span>Bs. {pendingAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-start rounded-sm border border-blue-200 bg-blue-50 p-4">
                        <AlertCircle className="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-blue-600" />
                        <p className="text-sm text-blue-800">
                            Para garantizar tu reserva, requerimos un adelanto
                            del 50%. El saldo restante lo podrás cancelar al
                            momento de hacer tu Check-in en el hotel.
                        </p>
                    </div>
                </div>

                {/* ================= COLUMNA DERECHA: PAGO QR ================= */}
                <div className="space-y-6">
                    <Card className="overflow-hidden rounded-sm border border-[#1e3a5f] shadow-md">
                        <div className="flex items-center justify-center bg-[#1e3a5f] p-4 text-white">
                            <QrCode className="mr-2 h-5 w-5" />
                            <h3 className="text-lg font-bold">
                                Paga con QR Simple
                            </h3>
                        </div>

                        <CardContent className="flex flex-col items-center p-6">
                            <p className="mb-4 text-center text-sm text-gray-600">
                                Escanea este código QR desde la aplicación de tu
                                banco para transferir el adelanto exacto de{' '}
                                <strong className="text-black">
                                    Bs. {advanceAmount.toFixed(2)}
                                </strong>
                                .
                            </p>
                            <div className="mb-6 w-full rounded-md bg-gray-50 p-4 border border-gray-100">
        <h4 className="font-bold text-[#1e3a5f] mb-3 text-center">Instrucciones de Pago:</h4>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside ml-2">
            <li>Abre la aplicación móvil de tu banco (Yape, BNB, Fie, etc.).</li>
            <li>Busca y selecciona la opción <strong>"Pagar con QR"</strong> o "QR Simple".</li>
            <li>Escanea la imagen de abajo e ingresa el monto exacto: <strong className="text-black text-base">Bs. {advanceAmount.toFixed(2)}</strong>.</li>
        </ol>
    </div>

                            {/* COMPONENTE QR DINÁMICO */}
                            <div className="mb-6 flex justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white p-4">
                                <QRCodeSVG
                                    // Aquí va el string de cobro de tu banco.
                                    // Si es fijo, pon el string del banco. Si es dinámico, pásalo por props.
                                    value="HaLH08F7JgjdPxdf+SzI8jOYBqB02TAHh84QIDhspmonocseECj0HFvwzBKQFUbUp54siKS2OaSdy2tsvlW9XK0XUbAM6MrL0z0phGyXvBy60A9kyMmYkk7+3Sn7HEhBDNkV6nxnSI2PhIj6gNr+gcx8IsXF4g+WBLdKAOti9oXJ1kICwMP9mYKGLcnHVvpJMFOQRnGcrMK8IBur23BgYpfFhYmD+1UdKtsXemGr6dIV2kLGCzUTRaORs+4XBBQKeTNpW1jbpcS/mUdqSDfYxumRJr4OWkxx6PxXpo+4NHm0jfYjegQIRUIeFV8GK7U+rHT8FL9Hn4xoh4SrAq0RTA==|0f209f67724e461ec596c4c2"
                                    size={192} // Equivalente a w-48 h-48
                                    level="H" // Alto nivel de corrección de errores (útil si luego le pones un logo en el medio)
                                    includeMargin={true}
                                />
                            </div>

                            

                            {/* UPLOAD COMPROBANTE */}
                            <div className="w-full border-t pt-6">
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Sube tu comprobante de pago *
                                </label>
                                <div className="flex w-full items-center justify-center">
                                    <label
                                        className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed transition-colors ${voucher ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {voucher ? (
                                                <>
                                                    <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                                                    <p className="text-sm font-semibold text-green-700">
                                                        {voucher.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-green-600">
                                                        ¡Comprobante cargado!
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud className="mb-2 h-8 w-8 text-gray-400" />
                                                    <p className="mb-2 text-sm text-gray-500">
                                                        <span className="font-semibold">
                                                            Haz clic para subir
                                                        </span>{' '}
                                                        o arrastra la imagen
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        PNG, JPG o PDF (Máx.
                                                        5MB)
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*,.pdf"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="h-14 w-full rounded-sm bg-[#b3282d] text-lg font-bold text-white shadow-md transition-all hover:bg-[#921f24]"
                    >
                        {isSubmitting
                            ? 'Procesando reserva...'
                            : 'Confirmar Reserva y Enviar'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
