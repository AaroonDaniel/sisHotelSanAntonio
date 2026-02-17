import { useForm } from '@inertiajs/react';
import {
    Briefcase,
    Flag,
    Hash,
    Heart,
    MapPin,
    Phone,
    Save,
    User,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

// --- Lista para el autocompletado ---
const countries = [
    'BOLIVIANA',
    'ARGENTINA',
    'BRASILERA',
    'CHILENA',
    'COLOMBIANA',
    'PERÚANA',
    'ECUATORIANA',
    'PARAGUAYA',
    'URUGUAYA',
    'VENEZOLANA',
    'MÉXICANA',
    'ESTADOUNIDENSE',
    'ESPAÑOLA',
    'FRANCESA',
    'ALEMANA',
    'ITALIANA',
    'CHINA',
    'JAPÓNESA',
    'RUSA',
    'CANADIENSE',
    'INGLESA',
    'PORTUGUESA',
    'INDIA',
    'AUSTRALIANA',
    'CUBANA',
    'DOMINICANA',
    'GUATEMALTECA',
    'HONDUREÑA',
    'SALVADOREÑA',
    'NICARAGÜENSE',
    'COSTARRICENSE',
    'PANAMEÑA',
    'PUERTORRIQUEÑA',
    'HAITIANA',
    'TRINITARIA',
    'JAMAICANA',
    'OTRO',
];

// --- Mapeo de Códigos Telefónicos (AGREGADO) ---
const countryCodes: { [key: string]: string } = {
    BOLIVIANA: '+591',
    ARGENTINA: '+54',
    BRASILERA: '+55',
    CHILENA: '+56',
    COLOMBIANA: '+57',
    PERÚANA: '+51',
    ECUATORIANA: '+593',
    PARAGUAYA: '+595',
    URUGUAYA: '+598',
    VENEZOLANA: '+58',
    MÉXICANA: '+52',
    ESTADOUNIDENSE: '+1',
    ESPAÑOLA: '+34',
    FRANCESA: '+33',
    ALEMANA: '+49',
    ITALIANA: '+39',
    CHINA: '+86',
    JAPÓNESA: '+81',
    RUSA: '+7',
    CANADIENSE: '+1',
    INGLESA: '+44',
    PORTUGUESA: '+351',
    INDIA: '+91',
    AUSTRALIANA: '+61',
    CUBANA: '+53',
    DOMINICANA: '+1',
    GUATEMALTECA: '+502',
    HONDUREÑA: '+504',
    SALVADOREÑA: '+503',
    NICARAGÜENSE: '+505',
    COSTARRICENSE: '+506',
    PANAMEÑA: '+507',
    PUERTORRIQUEÑA: '+1',
    HAITIANA: '+509',
    TRINITARIA: '+1',
    JAMAICANA: '+1',
    OTRO: '',
};

// Función para calcular edad (robusta)
const calculateAge = (dateString: string): number | '' => {
    if (!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);

    // Validar fecha inválida
    if (isNaN(birthDate.getTime())) return '';

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    // Evitar edades negativas por error de selección
    return age < 0 ? 0 : age;
};

interface Guest {
    id?: number;
    //first_name: string;
    full_name: string;
    nationality: string;
    identification_number: string;
    issued_in: string;
    civil_status: string;
    birth_date?: string;
    age?: number;
    profession: string;
    origin?: string;
    phone?: string;
}

interface GuestModalProps {
    show: boolean;
    onClose: () => void;
    GuestToEdit?: Guest | null;
}

export default function GuestModal({
    show,
    onClose,
    GuestToEdit,
}: GuestModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            //first_name: '',
            full_name: '',
            nationality: '',
            identification_number: '',
            issued_in: '',
            civil_status: '',
            birth_date: '',
            profession: '',
            origin: '',
            phone: '',
        });

    // --- Lógica Autocompletado Nacionalidad ---
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    const [displayAge, setDisplayAge] = useState<number | string>('');

    // Calcular edad cuando cambia la fecha
    useEffect(() => {
        if (data.birth_date) {
            setDisplayAge(calculateAge(data.birth_date));
        } else {
            setDisplayAge('');
        }
    }, [data.birth_date]);

    // Cargar datos al editar
    useEffect(() => {
        if (show) {
            if (GuestToEdit) {
                setData({
                    //first_name: GuestToEdit.first_name,
                    full_name: GuestToEdit.full_name,
                    nationality: GuestToEdit.nationality,
                    identification_number: GuestToEdit.identification_number,
                    issued_in: GuestToEdit.issued_in,
                    civil_status: GuestToEdit.civil_status,
                    birth_date: GuestToEdit.birth_date || '',
                    profession: GuestToEdit.profession,
                    origin: GuestToEdit.origin || '',
                    phone: GuestToEdit.phone || '',
                });
            } else {
                reset();
                setDisplayAge(''); // Limpiar edad visual
            }
            clearErrors();
            setShowSuggestions(false);
        }
    }, [show, GuestToEdit]);

    // Cerrar sugerencias al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                suggestionRef.current &&
                !suggestionRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- LÓGICA DE ACTUALIZACIÓN (NACIONALIDAD -> TELÉFONO) ---
    const updateNationalityAndPhone = (nationalityValue: string) => {
        const upperValue = nationalityValue.toUpperCase();

        // 1. Buscar código telefónico
        let newPhone = data.phone;
        const code = countryCodes[upperValue];

        // 2. Comprobar si el campo teléfono está vacío o solo tiene un código anterior
        // (Para no borrar números que el usuario ya haya escrito)
        const currentPhoneClean = data.phone ? data.phone.trim() : '';
        const isJustCode = Object.values(countryCodes).some(
            (c) => c === currentPhoneClean,
        );

        if (code && (data.phone === '' || isJustCode)) {
            newPhone = code + ' ';
        }

        // 3. Actualizar el estado
        setData((prev) => ({
            ...prev,
            nationality: upperValue,
            phone: newPhone,
        }));

        // 4. Filtrar la lista de sugerencias
        if (upperValue.length > 0) {
            setFilteredCountries(
                countries.filter((c) => c.toUpperCase().includes(upperValue)),
            );
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    // Handler para el input de texto
    const handleNationalityChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        updateNationalityAndPhone(e.target.value);
    };

    // Handler para el clic en la lista
    const handleSelectNationality = (country: string) => {
        updateNationalityAndPhone(country);
        setShowSuggestions(false);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true, // <--- AGREGAR ESTO SIEMPRE
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (GuestToEdit) {
            put(`/invitados/${GuestToEdit.id}`, options);
        } else {
            post('/invitados', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-2xl animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <User className="h-5 w-5" />
                        </div>
                        {GuestToEdit ? 'Editar Huésped' : 'Nuevo Huésped'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={submit} className="p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Nombre completo */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Nombre completo
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.full_name}
                                    onChange={(e) =>
                                        setData(
                                            'full_name',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500"
                                    placeholder="JUAN PEREZ"
                                    required
                                />
                            </div>
                            {errors.full_name && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.full_name}
                                </p>
                            )}
                        </div>

                        {/* Nacionalidad */}
                        <div ref={suggestionRef}>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Nacionalidad
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Flag className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.nationality}
                                    onChange={handleNationalityChange}
                                    onFocus={() =>
                                        data.nationality &&
                                        setShowSuggestions(true)
                                    }
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500"
                                    placeholder="BOLIVIANA"
                                    autoComplete="off"
                                />
                                {showSuggestions &&
                                    filteredCountries.length > 0 && (
                                        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                            {filteredCountries.map((c, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() =>
                                                        handleSelectNationality(
                                                            c,
                                                        )
                                                    }
                                                    className="cursor-pointer px-4 py-2 text-sm text-black hover:bg-green-50 hover:text-green-700"
                                                >
                                                    {c}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>
                            {errors.nationality && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.nationality}
                                </p>
                            )}
                        </div>

                        {/* Documento (CI) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                N° Documento
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.identification_number}
                                    onChange={(e) =>
                                        setData(
                                            'identification_number',
                                            e.target.value,
                                        )
                                    }
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="1234567"
                                    required
                                />
                            </div>
                            {errors.identification_number && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.identification_number}
                                </p>
                            )}
                        </div>

                        {/* Expedido y Fecha Nacimiento */}
                        <div className="flex gap-4">
                            <div className="w-1/2">
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    Expedido
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={data.issued_in}
                                        onChange={(e) =>
                                            setData(
                                                'issued_in',
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500"
                                        placeholder="LP"
                                    />
                                </div>
                                {errors.issued_in && (
                                    <p className="mt-1 text-xs font-bold text-red-500">
                                        {errors.issued_in}
                                    </p>
                                )}
                            </div>

                            <div className="w-1/2">
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    Fecha Nac.
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={data.birth_date}
                                        onChange={(e) =>
                                            setData(
                                                'birth_date',
                                                e.target.value,
                                            )
                                        }
                                        className="block w-full rounded-xl border-gray-200 px-3 py-2.5 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                        required
                                    />
                                </div>
                                <span className="ml-1 text-[10px] font-medium text-gray-400">
                                    {displayAge !== ''
                                        ? `${displayAge} años`
                                        : ''}
                                </span>
                            </div>
                        </div>

                        {/* Estado Civil */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Estado Civil
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Heart className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={data.civil_status}
                                    onChange={(e) =>
                                        setData('civil_status', e.target.value)
                                    }
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="">Seleccionar</option>
                                    <option value="SINGLE">SOLTERO(A)</option>
                                    <option value="MARRIED">CASADO(A)</option>
                                    <option value="DIVORCED">
                                        DIVORCIADO(A)
                                    </option>
                                    <option value="WIDOWED">VIUDO(A)</option>
                                </select>
                            </div>
                            {errors.civil_status && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.civil_status}
                                </p>
                            )}
                        </div>

                        {/* Profesión */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Profesión
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.profession}
                                    onChange={(e) =>
                                        setData(
                                            'profession',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ingeniero"
                                />
                            </div>
                            {errors.profession && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.profession}
                                </p>
                            )}
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Teléfono
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.phone}
                                    onChange={(e) =>
                                        setData('phone', e.target.value)
                                    }
                                    disabled={!data.nationality}
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="#### ####"
                                />
                            </div>
                            {errors.phone && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.phone}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? (
                                'Guardando...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4" /> Guardar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
