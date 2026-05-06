import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Minus, Plus, RefreshCcw, ArrowRight, Moon } from 'lucide-react';

export default function SearchForm({ bookingData, setBookingData, onNext }: any) {
    const [nights, setNights] = useState(0);

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (bookingData.checkIn && bookingData.checkOut) {
            const start = new Date(bookingData.checkIn);
            const end = new Date(bookingData.checkOut);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setNights(diffDays);
        } else {
            setNights(0);
        }
    }, [bookingData.checkIn, bookingData.checkOut]);

    const getMinCheckOutDate = () => {
        if (!bookingData.checkIn) return today;
        const checkInDate = new Date(bookingData.checkIn);
        checkInDate.setDate(checkInDate.getDate() + 1);
        return checkInDate.toISOString().split('T')[0];
    };

    const handleMinus = () => setBookingData({ ...bookingData, guests: Math.max(1, bookingData.guests - 1) });
    const handlePlus = () => setBookingData({ ...bookingData, guests: Math.min(10, bookingData.guests + 1) });

    const handleClear = () => {
        setBookingData({ ...bookingData, checkIn: '', checkOut: '', guests: 1 });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        
        
        // Hacemos la consulta a Laravel enviando las fechas y huéspedes
        router.get('/reservar', { 
            check_in: bookingData.check_in,
            check_out: bookingData.check_out, 
            guests: bookingData.guests 
        }, {
            preserveState: true, // Súper importante para que no se reinicie el Stepper
            preserveScroll: true,
            onSuccess: (page: any) => {
                // Obtenemos los datos agrupados EXACTAMENTE como vienen de Laravel
                const roomsFromLaravel = page.props.availableRoomTypes || page.props.initialRooms || [];
                
                // Guardamos la data original en el estado global (bookingData) sin modificarla
                setBookingData((prevData: any) => ({
                    ...prevData,
                    availableRooms: roomsFromLaravel // <--- ESTO ES LO QUE NECESITA EL PASO 2 AHORA
                }));
                
                // Recién ahora, cuando ya tenemos los datos, avanzamos al Paso 2
                onNext();
            }
        });
    };

    return (
        <Card className="w-full max-w-4xl mx-auto bg-white shadow-sm border border-gray-200 rounded-sm">
            <CardHeader className="relative flex-row justify-center items-center pb-4 pt-6">
                <CardTitle className="text-xl text-[#1e3a5f] font-semibold">Buscar Disponibilidad</CardTitle>
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClear} 
                    className="absolute right-4 top-5 text-[#b3282d] border-[#b3282d] hover:bg-red-50 rounded-sm h-8 px-3 text-xs"
                >
                    Limpiar
                </Button>
            </CardHeader>

            <CardContent className="px-6 pb-6">
                <form onSubmit={handleSearch} className="space-y-5">
                    
                    {/* Fila 1: Fechas y Pasajeros en la misma línea para optimizar espacio */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr] gap-4 items-end">
                        
                        {/* Fecha de Check-in */}
                        <div className="space-y-1.5">
                            <Label className="text-gray-600 text-sm">Fecha de ingreso</Label>
                            <Input 
                                type="date" 
                                required
                                min={today}
                                className="border-l-4 border-l-[#28a745] rounded-sm h-10 text-gray-700 w-full text-sm cursor-pointer"
                                value={bookingData.check_in} // 👈 CAMBIADO A check_in
                                onChange={(e) => setBookingData({...bookingData, check_in: e.target.value})} // 👈 CAMBIADO A check_in
                            />
                        </div>

                        <div className="flex justify-center pb-2.5 hidden md:flex">
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Fecha de Check-out */}
                        <div className="space-y-1.5">
                            <Label className="text-gray-600 text-sm">Fecha de salida</Label>
                            <Input 
                                type="date" 
                                required
                                min={getMinCheckOutDate()}
                                className="border-l-4 border-l-[#28a745] rounded-sm h-10 text-gray-700 w-full text-sm cursor-pointer"
                                value={bookingData.check_out} // 👈 CAMBIADO A check_out
                                onChange={(e) => setBookingData({...bookingData, check_out: e.target.value})} // 👈 CAMBIADO A check_out
                            />
                        </div>

                        {/* Pasajeros */}
                        <div className="space-y-1.5">
                            <Label className="text-gray-600 text-sm">Huéspedes (Máx. 10)</Label>
                            <div className="flex items-center border border-gray-200 rounded-sm h-10 overflow-hidden bg-gray-50">
                                <button type="button" onClick={handleMinus} disabled={bookingData.guests <= 1} className="px-3 h-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 border-r border-gray-200 text-gray-600">
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex-1 text-center text-sm text-gray-700 bg-white h-full flex items-center justify-center font-medium">
                                    {bookingData.guests}
                                </div>
                                <button type="button" onClick={handlePlus} disabled={bookingData.guests >= 10} className="px-3 h-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 border-l border-gray-200 text-gray-600">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Indicador de Noches */}
                    <div className="flex justify-center h-5">
                        {nights > 0 && (
                            <span className="flex items-center text-xs font-medium text-[#1e3a5f] bg-blue-50 px-2 py-0.5 rounded-full">
                                <Moon className="w-3.5 h-3.5 mr-1.5 text-[#1a73e8]" /> {nights} noche(s)
                            </span>
                        )}
                    </div>

                    {/* Fila 2: reCAPTCHA y Botón Buscar (Alineados horizontalmente) */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-2">
                        
                        {/* ReCAPTCHA Compacto */}
                        <div className="flex flex-col items-center">
                            <div className="bg-[#e0f2f1] text-[#006064] px-3 py-1 rounded-sm mb-2 text-[11px] w-full max-w-[260px] text-center">
                                Actualice el navegador si no carga el captcha
                            </div>
                            <div className="border border-gray-300 rounded-sm p-2 flex items-center gap-3 bg-[#f9f9f9] w-full max-w-[260px] border-l-4 border-l-[#b3282d] shadow-sm">
                                <div className="w-6 h-6 border-2 border-gray-300 rounded bg-white flex-shrink-0 cursor-pointer hover:border-gray-400 transition-colors"></div>
                                <span className="flex-1 text-xs text-gray-700 font-medium">No soy un robot</span>
                                <div className="flex flex-col items-center justify-center text-[9px] text-gray-500">
                                    <RefreshCcw className="w-4 h-4 text-[#1a73e8] mb-0.5" />
                                    reCAPTCHA
                                </div>
                            </div>
                        </div>

                        {/* Botón Buscar Compacto */}
                        <button type="submit" className="relative w-20 h-20 rounded-full border-2 border-[#b3282d] flex items-center justify-center bg-white group hover:scale-105 transition-transform duration-300 shadow-sm">
                            <div className="absolute inset-1 rounded-full bg-[#b3282d] flex flex-col items-center justify-center text-white group-hover:bg-[#921f24] transition-colors">
                                <Search className="w-6 h-6 mb-0.5" />
                                <span className="font-medium text-[11px]">Buscar</span>
                            </div>
                        </button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}