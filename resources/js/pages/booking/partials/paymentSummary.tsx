import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PaymentSummary({ bookingData, onBack }: any) {
    
    const handleConfirm = () => {
        alert("¡Reserva confirmada! Generando código QR...");
    };

    return (
        <div className="p-8 text-center bg-white rounded-sm border border-gray-200">
            <div className="flex items-center mb-4">
                <Button variant="ghost" onClick={onBack} className="text-gray-500">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Editar datos
                </Button>
            </div>
            
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Paso 4: Resumen y Pago</h2>
            <p className="text-gray-500 mb-8">Aquí mostraremos el total a pagar y el botón final.</p>
            
            <div className="flex justify-center">
                <Button onClick={handleConfirm} className="bg-[#1e3a5f] hover:bg-[#152a46] text-white">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Confirmar Reserva
                </Button>
            </div>
        </div>
    );
}