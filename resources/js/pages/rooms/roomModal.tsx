import { useForm } from '@inertiajs/react';
import {
    Bath,
    BedDouble,
    Building2,
    DollarSign,
    Image as ImageIcon,
    Info,
    Layers,
    Save,
    X,
} from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

// --- INTERFACES ---
interface RoomType {
    id: number;
    name: string;
}
interface Block {
    id: number;
    code: string;
    description?: string;
}
interface Floor {
    id: number;
    name: string;
}
interface Price {
    id: number;
    amount: number;
    bathroom_type: string;
    room_type_id: number;
}

interface Room {
    id?: number;
    number: string;
    block_id: number;
    floor_id: number;
    price_id: number;
    room_type_id: number;
    status: string;
    notes?: string;
    image_path?: string;
    is_active?: boolean;
}

interface RoomModalProps {
    show: boolean;
    onClose: () => void;
    RoomToEdit?: Room | null;
    roomTypes: RoomType[];
    blocks: Block[];
    floors: Floor[];
    prices: Price[];
}

export default function RoomModal({
    show,
    onClose,
    RoomToEdit,
    roomTypes,
    blocks,
    floors,
    prices,
}: RoomModalProps) {
    // Estado local para la UI
    const [selectedBathroomType, setSelectedBathroomType] =
        useState<string>('');
    const [preview, setPreview] = useState<string | null>(null);

    // Formulario de Inertia
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            number: '',
            block_id: '',
            floor_id: '',
            price_id: '',
            room_type_id: '',
            status: 'available',
            notes: '',
            is_active: true,
            image: null as File | null,
            _method: 'post',
        });

    // --- LÓGICA DE FILTRADO (Memorizada para rendimiento) ---
    const filteredPrices = useMemo(() => {
        if (!selectedBathroomType) return [];
        return prices.filter(
            (p) =>
                p.bathroom_type ===
                (selectedBathroomType === 'Privado' ? 'private' : 'shared'),
        );
    }, [selectedBathroomType, prices]);

    const filteredRoomTypes = useMemo(() => {
        if (!selectedBathroomType) return roomTypes;
        const availableTypeIds = filteredPrices.map((p) => p.room_type_id);
        return roomTypes.filter((rt) => availableTypeIds.includes(rt.id));
    }, [filteredPrices, roomTypes, selectedBathroomType]);

    // --- MANEJADORES ---
    const handleBathroomChange = (val: string) => {
        setSelectedBathroomType(val);
        // Reseteamos dependencias
        setData((prev) => ({ ...prev, room_type_id: '', price_id: '' }));
    };

    const handleRoomTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const typeId = e.target.value;
        const foundPrice = filteredPrices.find(
            (p) => p.room_type_id === Number(typeId),
        );

        setData((prev) => ({
            ...prev,
            room_type_id: typeId,
            price_id: foundPrice ? foundPrice.id.toString() : '',
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('image', file);
            setPreview(URL.createObjectURL(file));
        }
    };

    // --- 2. CORRECCIÓN DEL USE EFFECT ---
    useEffect(() => {
        if (!show) return;

        clearErrors();

        if (RoomToEdit) {
            // --- MODO EDICIÓN ---

            // Calculamos valores auxiliares
            const currentPrice = prices.find(
                (p) => p.id === RoomToEdit.price_id,
            );
            const initialBathType =
                currentPrice?.bathroom_type === 'private'
                    ? 'Privado'
                    : 'Compartido';

            // TRADUCCIÓN INVERSA (BD -> Frontend)
            // La BD tiene 'LIBRE', el Frontend necesita 'available'
            const statusMapReverse: Record<string, string> = {
                LIBRE: 'available',
                OCUPADO: 'occupied',
                RESERVADO: 'reserved',
                LIMPIEZA: 'cleaning',
                MANTENIMIENTO: 'maintenance',
                INHABILITADO: 'disabled',
            };

            // Intentamos traducir, si no existe (raro), usamos 'available' por defecto
            const mappedStatus =
                statusMapReverse[RoomToEdit.status] || 'available';

            // Actualizamos estados UI
            setSelectedBathroomType(initialBathType);
            setPreview(
                RoomToEdit.image_path
                    ? `/storage/${RoomToEdit.image_path}`
                    : null,
            );

            // Actualizamos Formulario
            setData({
                number: RoomToEdit.number,
                block_id: RoomToEdit.block_id.toString(),
                floor_id: RoomToEdit.floor_id.toString(),
                price_id: RoomToEdit.price_id.toString(),
                room_type_id: RoomToEdit.room_type_id.toString(),
                status: mappedStatus, // <--- AQUI USAMOS EL VALOR TRADUCIDO
                notes: RoomToEdit.notes || '',
                is_active: RoomToEdit.is_active ?? true,
                image: null,
                _method: 'put',
            });
        } else {
            // --- MODO CREACIÓN ---
            setSelectedBathroomType('');
            setPreview(null);

            setData({
                number: '',
                block_id: '',
                floor_id: '',
                price_id: '',
                room_type_id: '',
                status: 'available',
                notes: '',
                is_active: true,
                image: null,
                _method: 'post',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, RoomToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true, // <--- AGREGAR ESTO SIEMPRE
            onSuccess: () => {
                reset();
                onClose();
            },
        };
        if (RoomToEdit) {
            // Importante: al usar _method: 'put', Inertia lo maneja correctamente
            post(`/habitaciones/${RoomToEdit.id}`, options);
        } else {
            post('/habitaciones', options);
        }
    };

    if (!show) return null;

    // ... (El resto del renderizado es idéntico a tu código)
    // Calculamos el precio visual
    const displayAmount = prices.find(
        (p) => p.id.toString() === data.price_id,
    )?.amount;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            <div className="max-h-[90vh] w-full max-w-2xl animate-in overflow-hidden overflow-y-auto rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        {RoomToEdit ? 'Editar Habitación' : 'Nueva Habitación'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* 1. Número */}
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Número / Nombre
                            </label>
                            <div className="relative">
                                <Info className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={data.number}
                                    onChange={(e) =>
                                        setData(
                                            'number',
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="Ej: 101, A-20, Suite Principal"
                                />
                            </div>
                            {errors.number && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.number}
                                </p>
                            )}
                        </div>

                        {/* 2. Bloque */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Bloque
                            </label>
                            <div className="relative">
                                <Building2 className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                <select
                                    value={data.block_id}
                                    onChange={(e) =>
                                        setData('block_id', e.target.value)
                                    }
                                    className="block w-full rounded-xl border-gray-200 bg-white py-1.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="" disabled>
                                        Seleccionar...
                                    </option>
                                    {blocks.map((block) => (
                                        <option key={block.id} value={block.id}>
                                            {block.code} - {block.description}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.block_id && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.block_id}
                                </p>
                            )}
                        </div>

                        {/* 3. Piso */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Piso
                            </label>
                            <div className="relative">
                                <Layers className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                <select
                                    value={data.floor_id}
                                    onChange={(e) =>
                                        setData('floor_id', e.target.value)
                                    }
                                    className="block w-full rounded-xl border-gray-200 bg-white py-1.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="" disabled>
                                        Seleccionar...
                                    </option>
                                    {floors.map((floor) => (
                                        <option key={floor.id} value={floor.id}>
                                            {floor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.floor_id && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.floor_id}
                                </p>
                            )}
                        </div>

                        {/* 4. FILTRO DE BAÑO */}
                        <div className="mt-2 border-t border-gray-100 pt-4 sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-bold text-blue-800">
                                1. ¿Qué tipo de baño tiene?
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleBathroomChange('Privado')
                                    }
                                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                                        selectedBathroomType === 'Privado'
                                            ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500 ring-offset-1'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <Bath className="h-5 w-5" />
                                    <span className="font-semibold">
                                        Privado
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleBathroomChange('Compartido')
                                    }
                                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                                        selectedBathroomType === 'Compartido'
                                            ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500 ring-offset-1'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex -space-x-2">
                                        <Bath className="h-5 w-5" />
                                        <Bath className="h-5 w-5 opacity-50" />
                                    </div>
                                    <span className="font-semibold">
                                        Compartido
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* 5. TIPO DE HABITACIÓN (FILTRADO) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                2. Tipo de Habitación
                                {selectedBathroomType && (
                                    <span className="ml-2 text-xs font-normal text-green-600">
                                        (Filtrado por baño{' '}
                                        {selectedBathroomType})
                                    </span>
                                )}
                            </label>
                            <div className="relative">
                                <BedDouble className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                                <select
                                    value={data.room_type_id}
                                    onChange={handleRoomTypeChange}
                                    disabled={!selectedBathroomType}
                                    className="block w-full rounded-xl border-gray-200 bg-white py-1.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="" disabled>
                                        {!selectedBathroomType
                                            ? '← Seleccione baño primero'
                                            : 'Seleccionar tipo...'}
                                    </option>
                                    {filteredRoomTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.room_type_id && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.room_type_id}
                                </p>
                            )}
                        </div>

                        {/* 6. PRECIO (AUTOMÁTICO) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                3. Precio (Automático)
                            </label>
                            <div className="relative">
                                <DollarSign className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-green-600" />
                                <input
                                    type="text"
                                    readOnly
                                    value={
                                        displayAmount
                                            ? `${displayAmount} Bs.`
                                            : ''
                                    }
                                    placeholder="Seleccione tipo..."
                                    className="block w-full rounded-xl border-gray-200 bg-green-50 py-1.5 pl-10 text-sm font-bold text-green-800 focus:border-green-500 focus:ring-green-500"
                                />
                                <input type="hidden" value={data.price_id} />
                            </div>
                            {errors.price_id && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    No hay tarifa configurada.
                                </p>
                            )}
                        </div>

                        {/* 7. Estado */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Estado Actual
                            </label>
                            <select
                                value={data.status}
                                onChange={(e) =>
                                    setData('status', e.target.value)
                                }
                                className="block w-full rounded-xl border-gray-200 bg-white px-3 py-1.5 text-sm text-black focus:border-green-500 focus:ring-green-500"
                            >
                                <option value="available">LIBRE</option>
                                <option value="occupied">OCUPADO</option>
                                <option value="reserved">RESERVADO</option>
                                <option value="cleaning">LIMPIEZA</option>
                                <option value="maintenance">
                                    MANTENIMIENTO
                                </option>
                                <option value="disabled">INHABILITADO</option>
                            </select>
                        </div>

                        {/* 8. Imagen */}
                        <div className="border-t border-gray-100 pt-4 sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Foto
                            </label>
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                    {preview ? (
                                        <img
                                            src={preview}
                                            alt="Previsualización"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                                            <ImageIcon className="h-6 w-6" />
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-green-50 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-green-700 hover:file:bg-green-100"
                                />
                            </div>
                            {errors.image && (
                                <p className="mt-1 text-xs font-bold text-red-500">
                                    {errors.image}
                                </p>
                            )}
                        </div>

                        {/* Notas */}
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Notas Adicionales
                            </label>
                            <textarea
                                value={data.notes}
                                onChange={(e) =>
                                    setData(
                                        'notes',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                className="block w-full rounded-xl border-gray-200 px-3 py-1.5 text-sm text-black uppercase focus:border-green-500 focus:ring-green-500"
                                rows={2}
                                placeholder="Detalles sobre la habitación..."
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-1.5 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
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
