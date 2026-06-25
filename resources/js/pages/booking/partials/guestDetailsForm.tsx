import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    AlertTriangle,
    ArrowLeft,
    Briefcase,
    CalendarDays,
    CreditCard,
    Globe,
    Heart,
    Mail,
    MapPin,
    Phone,
    User,
    X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
    NACIONALIDADES,
    DEPARTAMENTOS_BOLIVIA,
    esExtranjero,
    paisDe,
} from '@/lib/catalogos';

// ==========================================
// 📚 LISTAS DE AUTOCOMPLETADO
// ==========================================
const NATIONALITIES = [
    'BOLIVIANA',
    'ARGENTINA',
    'CHILENA',
    'PERUANA',
    'BRASILEÑA',
    'COLOMBIANA',
    'ECUATORIANA',
    'VENEZOLANA',
    'PARAGUAYA',
    'URUGUAYA',
    'MEXICANA',
    'ESTADOUNIDENSE',
    'ESPAÑOLA',
    'CUBANA',
    'DOMINICANA',
];

const PROFESSIONS = [
    'ESTUDIANTE',
    'COMERCIANTE',
    'INGENIERO/A',
    'MÉDICO/A',
    'ABOGADO/A',
    'PROFESOR/A',
    'CONTADOR/A',
    'ARQUITECTO/A',
    'ENFERMERO/A',
    'INDEPENDIENTE',
    'EMPRESARIO/A',
    'CHOFER',
    'AGRICULTOR/A',
    'JUBILADO/A',
    'EMPLEADO/A PÚBLICO/A',
    'ADMINISTRADOR/A',
    'POLICÍA',
    'MILITAR',
    'TURISTA',
];

export default function GuestDetailsForm({
    bookingData,
    setBookingData,
    onNext,
    onBack,
}: any) {


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

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [blockToast, setBlockToast] = useState<string | null>(null);
    const [natInput, setNatInput] = useState<string>(
        bookingData?.nationality || '',
    );
    const [showNat, setShowNat] = useState(false);

    // El toast de bloqueo desaparece solo a los 8 segundos.
    useEffect(() => {
        if (!blockToast) return;
        const t = setTimeout(() => setBlockToast(null), 8000);
        return () => clearTimeout(t);
    }, [blockToast]);

    // Helper para setear un campo del formulario y limpiar su error.
    const setField = (name: string, value: string) => {
        setBookingData({ ...bookingData, [name]: value });
        if (errors[name]) setErrors({ ...errors, [name]: '' });
    };

    // Calcula la edad exacta a partir de la fecha de nacimiento.
    const calculateAge = (fechaNac?: string): number => {
        if (!fechaNac) return 0;
        const hoy = new Date();
        const nacimiento = new Date(fechaNac);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;

        // Campos que siempre deben ir en mayúsculas según las reglas de la base de datos
        const upperCaseFields = [
            'full_name',
            'issued_in',
            'nationality',
            'profession',
        ];
        const newValue = upperCaseFields.includes(name)
            ? value.toUpperCase()
            : value;

        setBookingData({ ...bookingData, [name]: newValue });

        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleContinue = () => {
    const civilStatus = bookingData.civil_status || 'SINGLE';
    const newErrors: Record<string, string> = {};

    // 1. Detectar si es boliviano o extranjero (usa el catálogo, igual que el check-in)
    const esBoliviano =
        !!bookingData.nationality && !esExtranjero(bookingData.nationality);

    // Validaciones obligatorias
    if (!bookingData.full_name)
        newErrors.full_name = 'Tiene que completar este campo.';
    if (!bookingData.identification_number)
        newErrors.identification_number = 'Tiene que completar este campo.';
        
    // 🌟 SOLO EXIGIR EXPEDIDO SI ES BOLIVIANO
    if (esBoliviano && !bookingData.issued_in) {
        newErrors.issued_in = 'Indique dónde se expidió su documento (Ej: LP, SC).';
    }

    if (!bookingData.birth_date)
        newErrors.birth_date = 'La fecha de nacimiento es obligatoria.';
    // ... resto de tus validaciones (phone, nationality, profession, email)
        if (!bookingData.phone)
            newErrors.phone = 'Tiene que completar este campo.';
        if (!bookingData.nationality)
            newErrors.nationality = 'Tiene que completar este campo.';
        if (!bookingData.profession)
            newErrors.profession = 'Tiene que completar este campo.';

        // Validación del Email (Va a la tabla reservation_guests)
        if (!bookingData.guest_email) {
            newErrors.guest_email = 'Tiene que completar este campo.';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(bookingData.guest_email)) {
                newErrors.guest_email =
                    'Por favor ingresa un correo electrónico válido.';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // 🛑 BLOQUEO: el titular de la reserva debe ser mayor de edad.
        const edad = calculateAge(bookingData.birth_date);
        if (edad < 18) {
            setErrors({
                ...newErrors,
                birth_date: 'El titular debe ser mayor de edad.',
            });
            setBlockToast(
                'No se permite hacer esta reserva: Debe ser mayor de edad (18+).',
            );
            return;
        }

        // 🛑 BLOQUEO: datos evidentemente falsos (nombre demasiado corto / no real).
        const nombreLimpio = (bookingData.full_name || '').trim();
        if (nombreLimpio.length < 3 || !/[a-zA-ZÁÉÍÓÚÑáéíóúñ]/.test(nombreLimpio)) {
            setErrors({
                ...newErrors,
                full_name: 'Ingrese un nombre real válido.',
            });
            setBlockToast(
                'No se permite hacer esta reserva: los datos del titular no son válidos.',
            );
            return;
        }

        setBookingData({ ...bookingData, civil_status: civilStatus });
        onNext();
    };

    // Obtenemos la fecha máxima para la fecha de nacimiento (hoy menos 18 años por seguridad básica, aunque no es estricto)
    const maxBirthDate = new Date().toISOString().split('T')[0];

    return (
        <div className="mx-auto w-full max-w-4xl">
            {/* Toast rojo de reserva bloqueada (menor de edad / datos falsos) */}
            {blockToast && (
                <div className="fixed top-20 right-4 left-4 z-[100] w-auto sm:top-24 sm:right-8 sm:left-auto sm:w-[360px] animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-white p-4 shadow-2xl">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 animate-pulse items-center justify-center rounded-full bg-red-100 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-700">
                                Reserva Bloqueada
                            </p>
                            <p className="mt-0.5 text-xs text-gray-600">
                                {blockToast}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setBlockToast(null)}
                            className="text-gray-400 transition hover:text-gray-700"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="mb-6 flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="-ml-2 px-2 text-gray-500 hover:text-gray-800 sm:mr-2 sm:ml-0"
                >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    <span className="sm:hidden">Volver</span>
                    <span className="hidden sm:inline">
                        Volver a selección de habitaciones
                    </span>
                </Button>
            </div>

            <Card className="rounded-sm border border-gray-200 shadow-sm">
                <CardContent className="p-6 sm:p-8">
                    <p className="mb-8 text-sm text-gray-500 sm:text-base">
                        Ingresa los datos de la persona responsable de la
                        reserva. Todos los campos son obligatorios para el
                        registro hotelero.
                    </p>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* ================= DATOS PRINCIPALES ================= */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="flex items-center text-sm font-semibold text-gray-700">
                                <User className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                Nombre Completo *
                            </label>
                            <Input
                                type="text"
                                name="full_name"
                                value={bookingData.full_name || ''}
                                onChange={handleChange}
                            
                                className={`h-11 border-gray-300 uppercase ${errors.full_name ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.full_name && (
                                <p className="mt-1 text-xs font-medium text-red-500">
                                    {errors.full_name}
                                </p>
                            )}
                        </div>

                        {/* N° Documento */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="flex items-center text-sm font-semibold text-gray-700">
                                <CreditCard className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                N° Documento (CI/Pasaporte) *
                            </label>
                            <Input
                                type="text"
                                name="identification_number"
                                value={
                                    bookingData.identification_number || ''
                                }
                                onChange={handleChange}
                              
                                className={`h-11 border-gray-300 ${errors.identification_number ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.identification_number && (
                                <p className="mt-1 text-xs font-medium text-red-500">
                                    {errors.identification_number}
                                </p>
                            )}
                        </div>

                        {/* Fecha de Nacimiento */}
                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-semibold text-gray-700">
                                <CalendarDays className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                Fecha Nacimiento *
                            </label>
                            <Input
                                type="date"
                                name="birth_date"
                                max={maxBirthDate}
                                value={bookingData.birth_date || ''}
                                onChange={handleChange}
                                className={`h-11 border-gray-300 ${errors.birth_date ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.birth_date && (
                                <p className="mt-1 text-xs font-medium text-red-500">
                                    {errors.birth_date}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-semibold text-gray-700">
                                <Phone className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                Teléfono / Celular *
                            </label>
                            <Input
                                type="tel"
                                name="phone"
                                value={bookingData.phone || ''}
                                onChange={handleChange}
                              
                                className={`h-11 border-gray-300 ${errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.phone && (
                                <p className="mt-1 text-xs font-medium text-red-500">
                                    {errors.phone}
                                </p>
                            )}
                        </div>

                        {/* ====== NACIONALIDAD (combobox) + EXPEDIDO (condicional) ====== */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Nacionalidad PRIMERO */}
                            <div className="relative space-y-2">
                                <label className="flex items-center text-sm font-semibold text-gray-700">
                                    <Globe className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                    Nacionalidad *
                                </label>
                                <Input
                                    type="text"
                                    value={natInput}
                                 
                                    autoComplete="off"
                                    onFocus={() => {
                                        setNatInput('');
                                        setShowNat(true);
                                    }}
                                    onChange={(e) => {
                                        setNatInput(e.target.value.toUpperCase());
                                        setShowNat(true);
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setShowNat(false);
                                            setNatInput(
                                                bookingData.nationality || '',
                                            );
                                        }, 200);
                                    }}
                                    className={`h-11 border-gray-300 uppercase ${errors.nationality ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                />
                                {showNat && (
                                    <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg">
                                        {NACIONALIDADES.filter((n) => {
                                            const q = natInput.trim();
                                            if (!q) return true;
                                            return (
                                                n.includes(q) ||
                                                paisDe(n).includes(q)
                                            );
                                        }).map((n) => (
                                            <div
                                                key={n}
                                                onMouseDown={() => {
                                                    const foreign =
                                                        esExtranjero(n);
                                                    setBookingData({
                                                        ...bookingData,
                                                        nationality: n,
                                                        issued_in: foreign
                                                            ? paisDe(n)
                                                            : '',
                                                    });
                                                    setErrors({
                                                        ...errors,
                                                        nationality: '',
                                                        issued_in: '',
                                                    });
                                                    setNatInput(n);
                                                    setShowNat(false);
                                                }}
                                                className="flex cursor-pointer justify-between px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-blue-50"
                                            >
                                                <span>{n}</span>
                                                <span className="text-gray-400">
                                                    {paisDe(n)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {errors.nationality && (
                                    <p className="mt-1 text-xs font-medium text-red-500">
                                        {errors.nationality}
                                    </p>
                                )}
                            </div>

                            {/* Expedido DESPUÉS, según nacionalidad */}
                            <div className="space-y-2">
                                <label className="flex items-center text-sm font-semibold text-gray-700">
                                    <MapPin className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                    Expedido {!esExtranjero(bookingData.nationality) ? '*' : ''}
                                </label>
                                {esExtranjero(bookingData.nationality) ? (
                                    <Input
                                        type="text"
                                        value={bookingData.issued_in || ''}
                                        disabled
                                        readOnly
                                        title="Pasaporte: expedido en su país"
                                        className="h-11 border-gray-300 bg-gray-100 uppercase text-gray-500"
                                    />
                                ) : (
                                    <select
                                        name="issued_in"
                                        value={bookingData.issued_in || ''}
                                        onChange={(e) =>
                                            setField('issued_in', e.target.value)
                                        }
                                        className={`h-11 w-full rounded-md border bg-white px-3 text-sm uppercase ${errors.issued_in ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                    >
                                        <option value="">Seleccione...</option>
                                        {DEPARTAMENTOS_BOLIVIA.map((d) => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {errors.issued_in && (
                                    <p className="mt-1 text-xs font-medium text-red-500">
                                        {errors.issued_in}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-semibold text-gray-700">
                                <Briefcase className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                Profesión / Ocupación *
                            </label>
                            <Input
                                type="text"
                                name="profession"
                                list="profesiones"
                                value={bookingData.profession || ''}
                                onChange={handleChange}
                               
                                className={`h-11 border-gray-300 uppercase ${errors.profession ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                                autoComplete="off"
                            />
                            <datalist id="profesiones">
                                {PROFESSIONS.map((prof, index) => (
                                    <option
                                        key={`prof-${index}`}
                                        value={prof}
                                    />
                                ))}
                            </datalist>
                            {errors.profession && (
                                <p className="mt-1 text-xs font-medium text-red-500">
                                    {errors.profession}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center text-sm font-semibold text-gray-700">
                                <Heart className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                Estado Civil *
                            </label>
                            <select
                                name="civil_status"
                                value={bookingData.civil_status || 'Soltero'}
                                onChange={handleChange}
                                className="flex h-11 w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-[#1e3a5f] focus-visible:outline-none"
                            >
                                <option value="SINGLE">Soltero/a</option>
                                <option value="MARRIED">Casado/a</option>
                                <option value="DIVORCED">Divorciado/a</option>
                                <option value="WIDOWED">Viudo/a</option>
                            </select>
                        </div>

                        {/* ================= DATOS DE CONTACTO WEB ================= */}
                        <div className="mt-2 space-y-2 border-t border-gray-100 pt-6 md:col-span-2">
                            <label className="flex items-center text-sm font-semibold text-gray-700">
                                <Mail className="mr-2 h-4 w-4 text-[#b3282d]" />{' '}
                                Correo Electrónico *
                            </label>
                            <Input
                                type="email"
                                name="guest_email"
                                value={bookingData.guest_email || ''}
                                onChange={handleChange}
                                
                                className={`h-11 border-gray-300 ${errors.guest_email ? 'border-red-500 focus-visible:ring-red-500' : 'focus:border-[#1e3a5f] focus:ring-[#1e3a5f]'}`}
                            />
                            {errors.guest_email ? (
                                <p className="mt-1 text-xs font-medium text-red-500">
                                    {errors.guest_email}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-gray-400">
                                    Aquí enviaremos el comprobante y la
                                    confirmación de la reserva.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-10 flex justify-end">
                        <Button
                            onClick={handleContinue}
                            className="h-11 rounded-sm bg-[#b3282d] px-8 text-base text-white shadow-sm transition-colors hover:bg-[#921f24]"
                        >
                            Continuar al resumen final
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}