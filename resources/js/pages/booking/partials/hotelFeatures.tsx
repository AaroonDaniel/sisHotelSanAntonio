import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, Car, Coffee, Tv } from 'lucide-react';

export default function HotelFeatures() {
    return (
        <Card className="w-full bg-white shadow-sm border border-gray-200 rounded-sm h-full">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl text-[#1e3a5f] font-semibold">
                    Hotel San Antonio
                </CardTitle>
                <p className="text-sm text-gray-500">Tu descanso ideal en Potosí</p>
            </CardHeader>
            <CardContent>
                <div className="aspect-video w-full bg-gray-200 rounded-sm mb-6 overflow-hidden">
                    {/* Aquí puedes poner la foto real del hotel */}
                    <img 
                        src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop" 
                        alt="Fachada del Hotel" 
                        className="w-full h-full object-cover"
                    />
                </div>
                
                <h3 className="font-medium text-gray-700 mb-3">Servicios incluidos:</h3>
                <ul className="space-y-3">
                    <li className="flex items-center text-gray-600 text-sm">
                        <Wifi className="w-4 h-4 mr-3 text-[#b3282d]" /> Wi-Fi de alta velocidad
                    </li>
                    <li className="flex items-center text-gray-600 text-sm">
                        <Coffee className="w-4 h-4 mr-3 text-[#b3282d]" /> Desayuno buffet
                    </li>
                    <li className="flex items-center text-gray-600 text-sm">
                        <Car className="w-4 h-4 mr-3 text-[#b3282d]" /> Parqueo privado
                    </li>
                    <li className="flex items-center text-gray-600 text-sm">
                        <Tv className="w-4 h-4 mr-3 text-[#b3282d]" /> TV por cable
                    </li>
                </ul>
            </CardContent>
        </Card>
    );
}