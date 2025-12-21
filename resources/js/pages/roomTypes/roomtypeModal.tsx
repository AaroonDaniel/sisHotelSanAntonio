import { useForm } from '@inertiajs/react';
import { Building, Hash, Save, X, FileText } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

interface Roomtype {
    id?: number;
    name: string;
    capacity?: number;
    description?: string;
    status?: boolean;
}

interface RoomtypeModalProps {
    show: boolean;
    onClose: () => void;
    RoomtypeToEdit?: Roomtype | null;
}

export default function RoomtypeModal({
    show,
    onClose,
    RoomtypeToEdit,
}: RoomtypeModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            name: '',
            capacity: 1,
            description: '',
            status: true,
        });

    useEffect(() => {
        if (show) {
            if (RoomtypeToEdit) {
                setData({
                    name: RoomtypeToEdit.name,
                    capacity: RoomtypeToEdit.capacity || 1,
                    description: RoomtypeToEdit.description || '',
                    status:
                        RoomtypeToEdit.status !== undefined
                            ? RoomtypeToEdit.status
                            : true,
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, RoomtypeToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const onSuccess = () => {
            reset();
            onClose();
        };

        if (RoomtypeToEdit) {
            put(`/tipohabitacion/${RoomtypeToEdit.id}`, { onSuccess });
        } else {
            post('/tipohabitacion', { onSuccess });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Building className="h-5 w-5" />
                        </div>
                        {RoomtypeToEdit ? 'Editar Piso' : 'Nuevo Piso'}
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
                    <div className="space-y-4">
                        {/* Código / Nombre */}
                        <div>
                            {/* CORREGIDO: 'block' en lugar de 'Roomtype' */}
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Nombre / N° Piso
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    // CORREGIDO: 'block' en lugar de 'Roomtype'
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ej: Piso 1"
                                />
                            </div>
                            {errors.name && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>
                        {/* Capacidad */}
                        <div>
                            {/* CORREGIDO: 'block' en lugar de 'Roomtype' */}
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Capacidad
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Hash className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    value={data.capacity}
                                    onChange={(e) =>
                                        setData(
                                            'capacity',
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                    // CORREGIDO: 'block' en lugar de 'Roomtype'
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ej: 1"
                                />
                            </div>
                            {errors.capacity && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.capacity}
                                </p>
                            )}
                        </div>
                        {/* Descripción */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Descripción
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute top-3 left-3">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                </div>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    rows={3}
                                    className="block w-full rounded-xl border-gray-200 py-2.5 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Detalles del sector..."
                                />
                            </div>
                            {errors.description && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.description}
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
