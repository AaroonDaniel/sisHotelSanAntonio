import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { CalendarDays, BedDouble, Users, DollarSign, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Importamos los 4 pasos
import SearchForm from './partials/searchForm';
import RoomSelection from './partials/roomSelection';
import GuestDetailsForm from './partials/guestDetailsForm';
import PaymentSummary from './partials/paymentSummary';

// CORRECCIÓN: Recibimos los datos limpios que envía el OnlineBookingController
export default function BookingIndex({ availableRoomTypes = [], filters = {} }: any) {
    // Estado del Stepper
    const [currentStep, setCurrentStep] = useState(1);
    
    // Estado global de la reserva
    const [bookingData, setBookingData] = useState({
        check_in: filters.check_in || '',         
        check_out: filters.check_out || '',        
        guests: filters.guests || 1,
        duration_days: filters.duration_days || 1,
        selectedRooms: [], 
        guestDetails: [],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // 👇 Función principal que manda todo a Laravel 👇
    const submitBooking = () => {
        setIsSubmitting(true);
        
        // Enviamos toda la data de React hacia el Controller de Laravel
        // 👇 CAMBIO AQUÍ: Ahora apunta a '/reservar/confirmar' 👇
        router.post('/reservar/confirmar', bookingData, {
            forceFormData: true, 
            onSuccess: () => {
                console.log("¡Enviado con éxito!");
            },
            onError: (errors) => {
                console.error("Errores de validación:", errors);
                alert("Hubo un problema con la validación de tus datos. Revisa la consola.");
                setIsSubmitting(false); 
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    // Funciones de navegación del formulario
    const nextStep = () => setCurrentStep((prev) => prev + 1);
    const prevStep = () => setCurrentStep((prev) => prev - 1);

    // Función para el Scroll suave del Menú
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Configuración del Stepper (Adaptado para Hotel)
    const steps = [
        { id: 1, label: 'Fechas', icon: CalendarDays },
        { id: 2, label: 'Habitaciones', icon: BedDouble },
        { id: 3, label: 'Huéspedes', icon: Users },
        { id: 4, label: 'Pagar', icon: DollarSign },
    ];

    return (
        <div className="min-h-screen bg-[#f3f4f6] font-sans scroll-smooth flex flex-col">
            <Head title="Hotel San Antonio - Reservas" />

            {/* NAVBAR (Menú Básico) */}
            <nav className="bg-white shadow-md fixed w-full top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="text-3xl font-bold text-[#b3282d] italic">
                            <button onClick={() => scrollToSection('inicio')} >Hotel San Antonio</button>
                        </div>
                        <div className="hidden md:flex space-x-8">
                            <button onClick={() => scrollToSection('inicio')} className="text-gray-600 hover:text-[#b3282d] font-medium transition-colors">Inicio</button>
                            <button onClick={() => scrollToSection('servicios')} className="text-gray-600 hover:text-[#b3282d] font-medium transition-colors">Servicios</button>
                            <button onClick={() => scrollToSection('reservar')} className="text-gray-600 hover:text-[#b3282d] font-medium transition-colors">Reservar Ahora</button>
                        </div>
                        <div className="md:hidden">
                            <Button variant="ghost"><Menu className="w-6 h-6" /></Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* SECCIÓN INICIO (Hero) */}
            <section id="inicio" className="pt-24 pb-12 bg-[#b3282d] text-white text-center">
                <div className="max-w-4xl mx-auto px-4 mt-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Bienvenido a tu descanso ideal</h1>
                    <p className="text-lg text-red-100 mb-8">Disfruta de la mejor estadía con nosotros. Comodidad, seguridad y el mejor servicio a tu disposición.</p>
                    <Button 
                        onClick={() => scrollToSection('reservar')} 
                        className="bg-white text-[#b3282d] hover:bg-gray-100 font-bold px-8 py-6 rounded-sm text-lg shadow-lg"
                    >
                        Ver Disponibilidad
                    </Button>
                </div>
            </section>

            {/* SECCIÓN SERVICIOS */}
            <section id="servicios" className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-[#1e3a5f] mb-8">Nuestros Servicios</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="p-6 border border-gray-100 rounded-sm shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-red-50 text-[#b3282d] rounded-full flex items-center justify-center mx-auto mb-4">📶</div>
                            <h3 className="font-semibold text-gray-800">Wi-Fi Rápido</h3>
                            <p className="text-sm text-gray-500 mt-2">Conexión de alta velocidad en todo el establecimiento.</p>
                        </div>
                        <div className="p-6 border border-gray-100 rounded-sm shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-red-50 text-[#b3282d] rounded-full flex items-center justify-center mx-auto mb-4">☕</div>
                            <h3 className="font-semibold text-gray-800">Desayuno Incluido</h3>
                            <p className="text-sm text-gray-500 mt-2">Empieza tu día con nuestro delicioso desayuno buffet.</p>
                        </div>
                        <div className="p-6 border border-gray-100 rounded-sm shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-red-50 text-[#b3282d] rounded-full flex items-center justify-center mx-auto mb-4">🚗</div>
                            <h3 className="font-semibold text-gray-800">Parqueo Privado</h3>
                            <p className="text-sm text-gray-500 mt-2">Comodidad y seguridad para tu vehículo en todo momento.</p>
                        </div>
                        <div className="p-6 border border-gray-100 rounded-sm shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-red-50 text-[#b3282d] rounded-full flex items-center justify-center mx-auto mb-4">📺</div>
                            <h3 className="font-semibold text-gray-800">TV Cable</h3>
                            <p className="text-sm text-gray-500 mt-2">Entretenimiento garantizado en todas nuestras habitaciones.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN FORMULARIO DE RESERVAS (Stepper) */}
            <section id="reservar" className="py-16 flex-1">
                <div className="max-w-5xl mx-auto px-4">
                    
                    <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-8">
                        
                        {/* EL STEPPER VISUAL */}
                        <div className="relative mb-12 flex justify-between items-center w-full max-w-3xl mx-auto">
                            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-300 -z-10 transform -translate-y-1/2"></div>
                            
                            {steps.map((step) => {
                                const Icon = step.icon;
                                const isActive = currentStep === step.id;
                                const isPassed = currentStep > step.id;

                                return (
                                    <div key={step.id} className="flex flex-col items-center bg-white px-4">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-colors duration-300
                                            ${isActive 
                                                ? 'bg-[#b3282d] text-white border-[3px] border-dashed border-[#b3282d] ring-4 ring-white' 
                                                : isPassed
                                                    ? 'bg-white text-[#b3282d] border-2 border-[#b3282d]'
                                                    : 'bg-white text-gray-400 border-2 border-dotted border-gray-400'
                                            }`}
                                        >
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <span className={`text-sm font-medium ${isActive ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* RENDERIZADO DINÁMICO DE LOS PASOS */}
                        <div className="mt-8">
                            {currentStep === 1 && (
                                <SearchForm 
                                    bookingData={bookingData} 
                                    setBookingData={setBookingData} 
                                    onNext={nextStep} 
                                />
                            )}

                            {currentStep === 2 && (
                                <RoomSelection 
                                    bookingData={bookingData} 
                                    setBookingData={setBookingData} 
                                    onNext={nextStep} 
                                    onBack={prevStep} 
                                    availableRoomTypes={availableRoomTypes} 
                                />
                            )}

                            {currentStep === 3 && (
                                <GuestDetailsForm 
                                    bookingData={bookingData} 
                                    setBookingData={setBookingData} 
                                    onNext={nextStep} 
                                    onBack={prevStep} 
                                />
                            )}

                            {currentStep === 4 && (
                                <PaymentSummary 
                                    bookingData={bookingData} 
                                    setBookingData={setBookingData} 
                                    onBack={prevStep} 
                                    onSubmit={submitBooking} 
                                    isSubmitting={isSubmitting} 
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-[#333] text-gray-300 py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0 text-center md:text-left">
                        <span className="text-xl font-bold text-white italic tracking-wider">
                            Hotel San Antonio
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                            Tu descanso ideal en Potosí
                        </p>
                    </div>
                    <div className="text-sm text-gray-400">
                        © 2026 CodigoGM. Todos los derechos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
}