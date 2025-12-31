import { useForm } from '@inertiajs/react';
import {
    Briefcase,
    Calendar,
    Flag,
    Globe,
    Hash,
    Heart,
    MapPin,
    Save,
    User,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

// --- Lista para el autocompletado ---
const countries = [
    'BOLIVIA',
    'ARGENTINA',
    'BRASIL',
    'CHILE',
    'COLOMBIA',
    'PERÚ',
    'ECUADOR',
    'PARAGUAY',
    'URUGUAY',
    'VENEZUELA',
    'MÉXICO',
    'ESTADOS UNIDOS',
    'ESPAÑA',
    'FRANCIA',
    'ALEMANIA',
    'ITALIA',
    'CHINA',
    'JAPÓN',
    'RUSIA',
];

interface Guest {
    id?: number;
    first_name: string;
    last_name: string;
    nationality: string;
    identification_number: string;
    issued_in: string;
    civil_status: string;
    age: number;
    profession: string;
    origin: string;
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
            first_name: '',
            last_name: '',
            nationality: '',
            identification_number: '',
            issued_in: '',
            civil_status: '',
            age: '', // String vacío inicial para input
            profession: '',
            origin: '',
        });

    // --- Lógica Autocompletado Nacionalidad ---
    const [filteredCountries, setFilteredCountries] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    // Cargar datos al editar
    useEffect(() => {
        if (show) {
            if (GuestToEdit) {
                setData({
                    first_name: GuestToEdit.first_name,
                    last_name: GuestToEdit.last_name,
                    nationality: GuestToEdit.nationality,
                    identification_number: GuestToEdit.identification_number,
                    issued_in: GuestToEdit.issued_in,
                    civil_status: GuestToEdit.civil_status,
                    age: GuestToEdit.age.toString(),
                    profession: GuestToEdit.profession,
                    origin: GuestToEdit.origin,
                });
            } else {
                reset();
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

    const handleNationalityChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const value = e.target.value;
        setData('nationality', value);
        if (value.length > 0) {
            setFilteredCountries(
                countries.filter((c) =>
                    c.toLowerCase().includes(value.toLowerCase()),
                ),
            );
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const onSuccess = () => {
            reset();
            onClose();
        };

        // NOTA: Usamos rutas manuales como en tu ejemplo de BlockModal
        if (GuestToEdit) {
            // EDITAR (PUT) -> /invitados/{id}
            put(`/invitados/${GuestToEdit.id}`, { onSuccess });
        } else {
            // CREAR (POST) -> /invitados
            post('/invitados', { onSuccess });
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
                        {/* Nombres */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Nombres
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.first_name}
                                    onChange={(e) =>
                                        setData('first_name', e.target.value.toUpperCase())
                                    }
                                    className="uppercase block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Juan"
                                />
                            </div>
                            {errors.first_name && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.first_name}
                                </p>
                            )}
                        </div>

                        {/* Apellidos */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Apellidos
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.last_name}
                                    onChange={(e) =>
                                        setData('last_name', e.target.value.toUpperCase())
                                    }
                                    className="uppercase block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Pérez"
                                />
                            </div>
                            {errors.last_name && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.last_name}
                                </p>
                            )}
                        </div>

                        {/* Nacionalidad (Con Autocompletado) */}
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
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="BOLIVIA"
                                    autoComplete="off"
                                />
                                {showSuggestions &&
                                    filteredCountries.length > 0 && (
                                        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                                            {filteredCountries.map((c, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        setData(
                                                            'nationality',
                                                            c,
                                                        );
                                                        setShowSuggestions(
                                                            false,
                                                        );
                                                    }}
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
                                />
                            </div>
                            {errors.identification_number && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.identification_number}
                                </p>
                            )}
                        </div>

                        {/* Expedido y Edad */}
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
                                            setData('issued_in', e.target.value.toUpperCase())
                                        }
                                        className="uppercase block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
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
                                    Edad
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        value={data.age}
                                        onChange={(e) =>
                                            setData('age', e.target.value)
                                        }
                                        className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                        placeholder="0"
                                    />
                                </div>
                                {errors.age && (
                                    <p className="mt-1 text-xs font-bold text-red-500">
                                        {errors.age}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Estado Civil */}
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
                                    {/* CAMBIO AQUÍ: Los 'value' deben coincidir con tu base de datos */}
                                    <option value="single">SOLTERO(A)</option>{' '}
                                    {/* Antes: "soltero" */}
                                    <option value="married">
                                        CASADO(A)
                                    </option>{' '}
                                    {/* Antes: "casado" */}
                                    <option value="divorced">
                                        DIVIRCIADO(A)
                                    </option>{' '}
                                    {/* Antes: "divorciado" */}
                                    <option value="widowed">
                                        VIUDO(A)
                                    </option>{' '}
                                    {/* Antes: "viudo" */}
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
                                        setData('profession', e.target.value.toUpperCase())
                                    }
                                    className="uppercase block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ingeniero"
                                />
                            </div>
                            {errors.profession && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.profession}
                                </p>
                            )}
                        </div>

                        {/* Procedencia */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Procedencia
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Globe className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.origin}
                                    onChange={(e) =>
                                        setData('origin', e.target.value.toUpperCase())
                                    }
                                    className="uppercase block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ciudad"
                                />
                            </div>
                            {errors.origin && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.origin}
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
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-black text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
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
