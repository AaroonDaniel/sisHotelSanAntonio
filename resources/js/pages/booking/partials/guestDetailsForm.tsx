import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function GuestDetailsForm({ bookingData, setBookingData, onNext, onBack }: any) {
    return (
        <div className="p-8 text-center bg-white rounded-sm border border-gray-200">
            <div className="flex items-center mb-4">
                <Button variant="ghost" onClick={onBack} className="text-gray-500">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Atrás
                </Button>
            </div>
            
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Paso 3: Datos de los Huéspedes</h2>
            <p className="text-gray-500 mb-8">Aquí irán los formularios con CI, Nombre, Apellido y el buscador automático.</p>
            
            <div className="flex justify-center">
                <Button onClick={onNext} className="bg-[#b3282d] hover:bg-[#921f24] text-white">
                    Ir al Resumen
                </Button>
            </div>
        </div>
    );
}