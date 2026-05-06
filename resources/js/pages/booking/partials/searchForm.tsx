import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, CalendarDays, Users, ArrowRight } from 'lucide-react';

export default function SearchForm({ bookingData, setBookingData, onNext }: any) {
    
    // Obtenemos la fecha actual para bloquear fechas pasadas en el calendario
    const today = new Date().toISOString().split('T')[0];

    // Calcula la fecha mínima de salida (mínimo 1 día después del check-in)
    const getMinCheckOutDate = () => {
        if (!bookingData.check_in) return today;
        const checkInDate = new Date(bookingData.check_in);
        checkInDate.setDate(checkInDate.getDate() + 1);
        return checkInDate.toISOString().split('T')[0];
    };

    // Función que se ejecuta al darle al botón "Buscar Disponibilidad"
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();

        // Validamos que las fechas existan
        if (!bookingData.check_in || !bookingData.check_out) {
            alert("Por favor selecciona las fechas de ingreso y salida.");
            return;
        }

        // Enviamos la búsqueda al controlador de Laravel por GET o POST según lo tengas
        // Asegúrate de que tu ruta /reservar/buscar o /reservar esté correcta
        router.get('/reservar', {
            check_in: bookingData.check_in,
            check_out: bookingData.check_out,
            guests: bookingData.guests
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                // Si la búsqueda es exitosa, pasamos al Paso 2 (Elegir habitación)
                onNext();
            }
        });
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#1e3a5f]">Reserva tu Estadía</h2>
                <p className="text-gray-500 mt-2">Selecciona tus fechas para ver las habitaciones disponibles.</p>
            </div>

            <Card className="border-t-4 border-t-[#b3282d] shadow-lg rounded-sm">
                <CardContent className="p-6 sm:p-8">
                    <form onSubmit={handleSearch} className="flex flex-col gap-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr] gap-6 items-end">
                            
                            {/* Fecha de Check-in */}
                            <div className="space-y-1.5">
                                <Label className="text-gray-600 text-sm font-semibold flex items-center">
                                    <CalendarDays className="w-4 h-4 mr-1 text-[#b3282d]" /> Fecha de ingreso
                                </Label>
                                <Input 
                                    type="date" 
                                    required
                                    min={today}
                                    className="border-l-4 border-l-[#b3282d] rounded-sm h-12 text-gray-700 w-full text-base cursor-pointer focus:ring-[#1e3a5f]"
                                    value={bookingData.check_in || ''}
                                    onChange={(e) => setBookingData({...bookingData, check_in: e.target.value})}
                                />
                            </div>

                            <div className="flex justify-center pb-3 hidden md:flex">
                                <ArrowRight className="w-5 h-5 text-gray-400" />
                            </div>

                            {/* Fecha de Check-out */}
                            <div className="space-y-1.5">
                                <Label className="text-gray-600 text-sm font-semibold flex items-center">
                                    <CalendarDays className="w-4 h-4 mr-1 text-[#b3282d]" /> Fecha de salida
                                </Label>
                                <Input 
                                    type="date" 
                                    required
                                    min={getMinCheckOutDate()}
                                    className="border-l-4 border-l-[#b3282d] rounded-sm h-12 text-gray-700 w-full text-base cursor-pointer focus:ring-[#1e3a5f]"
                                    value={bookingData.check_out || ''}
                                    onChange={(e) => setBookingData({...bookingData, check_out: e.target.value})}
                                />
                            </div>

                            {/* Huéspedes */}
                            <div className="space-y-1.5">
                                <Label className="text-gray-600 text-sm font-semibold flex items-center">
                                    <Users className="w-4 h-4 mr-1 text-[#1e3a5f]" /> Huéspedes
                                </Label>
                                <Input 
                                    type="number" 
                                    required
                                    min="1"
                                    max="10"
                                    className="rounded-sm h-12 text-gray-700 w-full text-base focus:ring-[#1e3a5f]"
                                    value={bookingData.guests || 1}
                                    onChange={(e) => setBookingData({...bookingData, guests: parseInt(e.target.value) || 1})}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex justify-center md:justify-end">
                            <Button 
                                type="submit" 
                                className="w-full md:w-auto bg-[#1e3a5f] hover:bg-[#152a46] text-white px-8 h-12 text-lg rounded-sm shadow-md transition-colors flex items-center"
                            >
                                <Search className="w-5 h-5 mr-2" /> Buscar Disponibilidad
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}