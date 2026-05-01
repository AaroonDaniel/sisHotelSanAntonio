import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
// Importa tus componentes UI genéricos
import { Button } from '@/components/ui/button';

export default function OnlineBooking() {
    const [currentStep, setCurrentStep] = useState(1);
    const [bookingData, setBookingData] = useState({
        checkin_date: '',
        checkin_time: '', // Recordar usar formato de 24 horas (ej. 14:00) para la hora de llegada
        checkout_date: '',
        guests_count: 1,
        room_id: null,
        main_guest: {},
        companions: [],
    });

    const nextStep = () => setCurrentStep((prev) => prev + 1);
    const prevStep = () => setCurrentStep((prev) => prev - 1);

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title="Reservas en Línea - Hotel San Antonio" />

            {/* Cabecera pública simplificada (Logo y teléfono) */}
            <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                <div className="font-bold text-xl text-blue-900">Hotel San Antonio</div>
                <div>Contacto: +591 ...</div>
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                
                {/* Paso 1: Presentación del hotel y Buscador */}
                {currentStep === 1 && (
                    <div className="space-y-8">
                        {/* Aquí va el componente <HotelFeatures /> */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-2xl font-semibold mb-4">Descubre nuestras habitaciones disponibles</h2>
                            <p>Aquí mostraremos la galería y servicios del hotel...</p>
                        </div>


                        {/* Aquí va el componente <SearchForm /> */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-medium mb-4">¿Cuándo nos visitas?</h3>
                            {/* Formulario de fechas... */}
                            <Button onClick={nextStep}>Buscar Habitaciones</Button>
                        </div>
                    </div>
                )}

                {/* Paso 2: Selección de Habitación */}
                {currentStep === 2 && (
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Elige tu Habitación</h2>
                        {/* Aquí va el componente <RoomSelection /> */}
                        <div className="flex gap-4 mt-4">
                            <Button variant="outline" onClick={prevStep}>Atrás</Button>
                            <Button onClick={nextStep}>Continuar con la reserva</Button>
                        </div>
                    </div>
                )}

                {/* Paso 3: Datos de los Huéspedes y Hora de Llegada */}
                {currentStep === 3 && (
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Tus Datos</h2>
                        {/* Aquí va el componente <GuestDetailsForm /> */}
                        {/* IMPORTANTE: Incluir un input type="time" configurado para 24h para la hora estimada de llegada */}
                        
                        <div className="flex gap-4 mt-4">
                            <Button variant="outline" onClick={prevStep}>Atrás</Button>
                            <Button onClick={nextStep}>Ir al Pago</Button>
                        </div>
                    </div>
                )}

                {/* Paso 4: Pago y Confirmación */}
                {currentStep === 4 && (
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Resumen y Pago</h2>
                        {/* Aquí va el componente <PaymentSummary /> */}
                        <div className="flex gap-4 mt-4">
                            <Button variant="outline" onClick={prevStep}>Atrás</Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white">Confirmar y Pagar</Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}