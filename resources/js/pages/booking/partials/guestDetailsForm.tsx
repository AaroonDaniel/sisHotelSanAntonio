import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, CreditCard, Phone, Globe, Heart, Briefcase } from 'lucide-react';

// ==========================================
// 📚 LISTAS DE AUTOCOMPLETADO
// ==========================================
const NATIONALITIES = [
    "BOLIVIANA", "ARGENTINA", "CHILENA", "PERUANA", "BRASILEÑA", 
    "COLOMBIANA", "ECUATORIANA", "VENEZOLANA", "PARAGUAYA", "URUGUAYA", 
    "MEXICANA", "ESTADOUNIDENSE", "ESPAÑOLA", "CUBANA", "DOMINICANA"
];

const PROFESSIONS = [
    "ESTUDIANTE", "COMERCIANTE", "INGENIERO/A", "MÉDICO/A", "ABOGADO/A", 
    "PROFESOR/A", "CONTADOR/A", "ARQUITECTO/A", "ENFERMERO/A", "INDEPENDIENTE", 
    "EMPRESARIO/A", "CHOFER", "AGRICULTOR/A", "JUBILADO/A", "EMPLEADO/A PÚBLICO/A",
    "ADMINISTRADOR/A", "POLICÍA", "MILITAR", "TURISTA"
];

export default function GuestDetailsForm({ bookingData, setBookingData, onNext, onBack }: any) {
    
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBookingData({ ...bookingData, [name]: value });
        
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleContinue = () => {
        const civilStatus = bookingData.guest_civil_status || 'SOLTERO';
        let newErrors: Record<string, string> = {};

        if (!bookingData.guest_name) newErrors.guest_name = "Tiene que completar este campo.";
        if (!bookingData.guest_ci) newErrors.guest_ci = "Tiene que completar este campo.";
        if (!bookingData.guest_phone) newErrors.guest_phone = "Tiene que completar este campo.";
        if (!bookingData.guest_nationality) newErrors.guest_nationality = "Tiene que completar este campo.";
        if (!bookingData.guest_profession) newErrors.guest_profession = "Tiene que completar este campo.";
        
        if (!bookingData.guest_email) {
            newErrors.guest_email = "Tiene que completar este campo.";
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(bookingData.guest_email)) {
                newErrors.guest_email = "Por favor ingresa un correo electrónico válido.";
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setBookingData({ ...bookingData, guest_civil_status: civilStatus });
        onNext();
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-800 mr-2 px-2">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Volver a selección de habitaciones
                </Button>
                <h2 className="text-2xl font-bold text-[#1e3a5f]">Datos del Titular de la Reserva</h2>
            </div>

            <Card className="border border-gray-200 shadow-sm rounded-sm">
                <CardContent className="p-6 sm:p-8">
                    <p className="text-gray-500 mb-8 text-sm sm:text-base">
                        Ingresa los datos de la persona responsable de la reserva. Todos los campos son obligatorios.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* ================= DATOS PRINCIPALES ================= */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <User className="w-4 h-4 mr-2 text-[#b3282d]" /> Nombre Completo *
                            </label>
                            <Input 
                                type="text" 
                                name="guest_name" 
                                value={bookingData.guest_name || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: Juan Pérez Morales"
                                className={`h-11 border-gray-300 uppercase ${errors.guest_name ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.guest_name && <p className="text-xs text-red-500 mt-1 font-medium">{errors.guest_name}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <CreditCard className="w-4 h-4 mr-2 text-[#b3282d]" /> CI / Pasaporte *
                            </label>
                            <Input 
                                type="text" 
                                name="guest_ci" 
                                value={bookingData.guest_ci || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: 12345678"
                                className={`h-11 border-gray-300 ${errors.guest_ci ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.guest_ci && <p className="text-xs text-red-500 mt-1 font-medium">{errors.guest_ci}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-[#b3282d]" /> Teléfono / Celular *
                            </label>
                            <Input 
                                type="tel" 
                                name="guest_phone" 
                                value={bookingData.guest_phone || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: 71234567"
                                className={`h-11 border-gray-300 ${errors.guest_phone ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.guest_phone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.guest_phone}</p>}
                        </div>

                        {/* ================= DATOS COMPLEMENTARIOS CON AUTOCOMPLETADO ================= */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Globe className="w-4 h-4 mr-2 text-[#b3282d]" /> Nacionalidad *
                            </label>
                            {/* 👇 Se enlaza el input con la lista usando list="nacionalidades" */}
                            <Input 
                                type="text" 
                                name="guest_nationality" 
                                list="nacionalidades"
                                value={bookingData.guest_nationality || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: Boliviana"
                                className={`h-11 border-gray-300 uppercase ${errors.guest_nationality ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                autoComplete="off"
                            />
                            <datalist id="nacionalidades">
                                {NATIONALITIES.map((nac, index) => (
                                    <option key={`nac-${index}`} value={nac} />
                                ))}
                            </datalist>
                            {errors.guest_nationality && <p className="text-xs text-red-500 mt-1 font-medium">{errors.guest_nationality}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Briefcase className="w-4 h-4 mr-2 text-[#b3282d]" /> Profesión / Ocupación *
                            </label>
                            {/* 👇 Se enlaza el input con la lista usando list="profesiones" */}
                            <Input 
                                type="text" 
                                name="guest_profession" 
                                list="profesiones"
                                value={bookingData.guest_profession || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: Estudiante"
                                className={`h-11 border-gray-300 uppercase ${errors.guest_profession ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                autoComplete="off"
                            />
                            <datalist id="profesiones">
                                {PROFESSIONS.map((prof, index) => (
                                    <option key={`prof-${index}`} value={prof} />
                                ))}
                            </datalist>
                            {errors.guest_profession && <p className="text-xs text-red-500 mt-1 font-medium">{errors.guest_profession}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Heart className="w-4 h-4 mr-2 text-[#b3282d]" /> Estado Civil *
                            </label>
                            <select 
                                name="guest_civil_status"
                                value={bookingData.guest_civil_status || 'SOLTERO'}
                                onChange={handleChange}
                                className="flex h-11 w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
                            >
                                <option value="SOLTERO">Soltero/a</option>
                                <option value="CASADO">Casado/a</option>
                                <option value="DIVORCIADO">Divorciado/a</option>
                                <option value="VIUDO">Viudo/a</option>
                            </select>
                        </div>

                        {/* ================= DATOS DE CONTACTO WEB ================= */}
                        <div className="space-y-2 md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-[#b3282d]" /> Correo Electrónico *
                            </label>
                            <Input 
                                type="email" 
                                name="guest_email" 
                                value={bookingData.guest_email || ''} 
                                onChange={handleChange} 
                                placeholder="ejemplo@correo.com"
                                className={`h-11 border-gray-300 ${errors.guest_email ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.guest_email ? (
                                <p className="text-xs text-red-500 mt-1 font-medium">{errors.guest_email}</p>
                            ) : (
                                <p className="text-xs text-gray-400 mt-1">Aquí enviaremos el comprobante y la confirmación de la reserva.</p>
                            )}
                        </div>

                    </div>

                    <div className="mt-10 flex justify-end">
                        <Button 
                            onClick={handleContinue} 
                            className="bg-[#b3282d] hover:bg-[#921f24] text-white px-8 h-11 text-base rounded-sm shadow-sm transition-colors"
                        >
                            Continuar al resumen final
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}