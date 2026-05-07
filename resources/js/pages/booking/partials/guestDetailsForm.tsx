import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, CreditCard, Phone, Globe, Heart, Briefcase, MapPin, CalendarDays } from 'lucide-react';

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
        
        // Campos que siempre deben ir en mayúsculas según las reglas de la base de datos
        const upperCaseFields = ['full_name', 'issued_in', 'nationality', 'profession'];
        const newValue = upperCaseFields.includes(name) ? value.toUpperCase() : value;

        setBookingData({ ...bookingData, [name]: newValue });
        
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleContinue = () => {
        const civilStatus = bookingData.civil_status || 'Soltero';
        let newErrors: Record<string, string> = {};

        // Validaciones obligatorias usando los nombres exactos de la BD
        if (!bookingData.full_name) newErrors.full_name = "Tiene que completar este campo.";
        if (!bookingData.identification_number) newErrors.identification_number = "Tiene que completar este campo.";
        if (!bookingData.issued_in) newErrors.issued_in = "Indique dónde se expidió su documento (Ej: LP, SC).";
        if (!bookingData.birth_date) newErrors.birth_date = "La fecha de nacimiento es obligatoria.";
        if (!bookingData.phone) newErrors.phone = "Tiene que completar este campo.";
        if (!bookingData.nationality) newErrors.nationality = "Tiene que completar este campo.";
        if (!bookingData.profession) newErrors.profession = "Tiene que completar este campo.";
        
        // Validación del Email (Va a la tabla reservation_guests)
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

        setBookingData({ ...bookingData, civil_status: civilStatus });
        onNext();
    };

    // Obtenemos la fecha máxima para la fecha de nacimiento (hoy menos 18 años por seguridad básica, aunque no es estricto)
    const maxBirthDate = new Date().toISOString().split('T')[0];

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
                        Ingresa los datos de la persona responsable de la reserva. Todos los campos son obligatorios para el registro hotelero.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* ================= DATOS PRINCIPALES ================= */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <User className="w-4 h-4 mr-2 text-[#b3282d]" /> Nombre Completo *
                            </label>
                            <Input 
                                type="text" 
                                name="full_name" 
                                value={bookingData.full_name || ''}
                                onChange={handleChange} 
                                placeholder="Ej: JUAN PEREZ MORALES"
                                className={`h-11 border-gray-300 uppercase ${errors.full_name ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.full_name && <p className="text-xs text-red-500 mt-1 font-medium">{errors.full_name}</p>}
                        </div>

                        {/* CI y Expedido (Misma Fila en Pantallas Grandes) */}
                        <div className="flex flex-col sm:flex-row gap-4 md:col-span-2">
                            <div className="space-y-2 flex-1">
                                <label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2 text-[#b3282d]" /> N° Documento (CI/Pasaporte) *
                                </label>
                                <Input 
                                    type="text" 
                                    name="identification_number" 
                                    value={bookingData.identification_number || ''}
                                    onChange={handleChange} 
                                    placeholder="Ej: 12345678"
                                    className={`h-11 border-gray-300 ${errors.identification_number ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                />
                                {errors.identification_number && <p className="text-xs text-red-500 mt-1 font-medium">{errors.identification_number}</p>}
                            </div>

                            <div className="space-y-2 sm:w-1/3">
                                <label className="text-sm font-semibold text-gray-700 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-[#b3282d]" /> Expedido *
                                </label>
                                <Input 
                                    type="text" 
                                    name="issued_in" 
                                    value={bookingData.issued_in || ''}
                                    onChange={handleChange} 
                                    placeholder="Ej: LP"
                                    className={`h-11 border-gray-300 uppercase ${errors.issued_in ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                />
                                {errors.issued_in && <p className="text-xs text-red-500 mt-1 font-medium">{errors.issued_in}</p>}
                            </div>
                        </div>

                        {/* Fecha de Nacimiento */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <CalendarDays className="w-4 h-4 mr-2 text-[#b3282d]" /> Fecha Nacimiento *
                            </label>
                            <Input 
                                type="date" 
                                name="birth_date" 
                                max={maxBirthDate}
                                value={bookingData.birth_date || ''} 
                                onChange={handleChange} 
                                className={`h-11 border-gray-300 ${errors.birth_date ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.birth_date && <p className="text-xs text-red-500 mt-1 font-medium">{errors.birth_date}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-[#b3282d]" /> Teléfono / Celular *
                            </label>
                            <Input 
                                type="tel" 
                                name="phone" 
                                value={bookingData.phone || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: 71234567"
                                className={`h-11 border-gray-300 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.phone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone}</p>}
                        </div>

                        {/* ================= DATOS COMPLEMENTARIOS CON AUTOCOMPLETADO ================= */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Globe className="w-4 h-4 mr-2 text-[#b3282d]" /> Nacionalidad *
                            </label>
                            <Input 
                                type="text" 
                                name="nationality" 
                                list="nacionalidades"
                                value={bookingData.nationality || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: BOLIVIANA"
                                className={`h-11 border-gray-300 uppercase ${errors.nationality ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                autoComplete="off"
                            />
                            <datalist id="nacionalidades">
                                {NATIONALITIES.map((nac, index) => (
                                    <option key={`nac-${index}`} value={nac} />
                                ))}
                            </datalist>
                            {errors.nationality && <p className="text-xs text-red-500 mt-1 font-medium">{errors.nationality}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Briefcase className="w-4 h-4 mr-2 text-[#b3282d]" /> Profesión / Ocupación *
                            </label>
                            <Input 
                                type="text" 
                                name="profession" 
                                list="profesiones"
                                value={bookingData.profession || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: ESTUDIANTE"
                                className={`h-11 border-gray-300 uppercase ${errors.profession ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                autoComplete="off"
                            />
                            <datalist id="profesiones">
                                {PROFESSIONS.map((prof, index) => (
                                    <option key={`prof-${index}`} value={prof} />
                                ))}
                            </datalist>
                            {errors.profession && <p className="text-xs text-red-500 mt-1 font-medium">{errors.profession}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center">
                                <Heart className="w-4 h-4 mr-2 text-[#b3282d]" /> Estado Civil *
                            </label>
                            <select 
                                name="civil_status"
                                value={bookingData.civil_status || 'Soltero'}
                                onChange={handleChange}
                                className="flex h-11 w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
                            >
                                <option value="Soltero">Soltero/a</option>
                                <option value="Casado">Casado/a</option>
                                <option value="Divorciado">Divorciado/a</option>
                                <option value="Viudo">Viudo/a</option>
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