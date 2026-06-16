import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import {  Search, CalendarDays, Users, ArrowRight, Minus, Plus  } from 'lucide-react';
import Turnstile from '@/components/Turnstile'; // 👈 NUEVO

export default function SearchForm({ bookingData, setBookingData, onNext, turnstileSiteKey }: any) {

    useEffect(() => {
        const htmlElement = document.documentElement;
        
        // Verificamos si el modo oscuro estaba activo en el resto del sistema
        const wasDark = htmlElement.classList.contains('dark');

        // Eliminamos la clase que activa el modo oscuro en Tailwind
        htmlElement.classList.remove('dark');
        
        // (Opcional) Si tu sistema usa explícitamente la clase 'light', la forzamos:
        htmlElement.classList.add('light'); 

        // Cleanup: Restaurar el modo oscuro si el usuario sale de esta pantalla 
        // (Por ejemplo, si un recepcionista estaba viéndolo y vuelve al Dashboard)
        return () => {
            if (wasDark) {
                htmlElement.classList.remove('light');
                htmlElement.classList.add('dark');
            }
        };
    }, []);

    // Obtenemos la fecha actual para bloquear fechas pasadas en el calendario
    const today = new Date().toISOString().split('T')[0];

    // Contador de huéspedes (máximo interno, no se muestra)
    const MIN_GUESTS = 1;
    const MAX_GUESTS = 20;
    const guests = bookingData.guests || MIN_GUESTS;

    const incrementGuests = () => {
        setBookingData({ ...bookingData, guests: Math.min(guests + 1, MAX_GUESTS) });
    };

    const decrementGuests = () => {
        setBookingData({ ...bookingData, guests: Math.max(guests - 1, MIN_GUESTS) });
    };

    // ¿Ya pasó la verificación de Cloudflare?
    const tokenOk = true;//!!bookingData['cf-turnstile-response']; // 👈 NUEVO

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

        // 👇 NUEVO: Validamos que haya pasado el Cloudflare
        if (!tokenOk) {
            alert("Por favor, confirma que no eres un robot.");
            return;
        }

        router.get('/reservar', {
            check_in: bookingData.check_in,
            check_out: bookingData.check_out,
            guests: bookingData.guests
        }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
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

                            <div className="flex justify-center pb-3 md:flex">
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
                                <div className="flex items-center h-12 rounded-sm border border-input overflow-hidden bg-white">
                                    <button
                                        type="button"
                                        onClick={decrementGuests}
                                        disabled={guests <= MIN_GUESTS}
                                        aria-label="Disminuir huéspedes"
                                        className="h-full px-4 flex items-center justify-center text-[#1e3a5f] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <div className="flex-1 text-center text-base font-semibold text-gray-700 select-none">
                                        {guests}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={incrementGuests}
                                        disabled={guests >= MAX_GUESTS}
                                        aria-label="Aumentar huéspedes"
                                        className="h-full px-4 flex items-center justify-center text-[#b3282d] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 👇 NUEVO: WIDGET DE CLOUDFLARE TURNSTILE (debajo de las fechas) */}
                        {/*}<div className="flex justify-center">
                            <Turnstile
                                siteKey={turnstileSiteKey}
                                onVerify={(token: string) =>
                                    setBookingData({ ...bookingData, 'cf-turnstile-response': token })
                                }
                            />
                        </div>*/}

                        <div className="mt-2 flex justify-center md:justify-end">
                            <Button
                                type="submit"
                                disabled={!tokenOk} // 👈 NUEVO: bloqueado hasta validar el Cloudflare
                                className="w-full md:w-auto bg-[#1e3a5f] hover:bg-[#152a46] text-white px-8 h-12 text-lg rounded-sm shadow-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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