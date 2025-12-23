import { useForm } from '@inertiajs/react';
// 1. CORRECCIÓN: Eliminé 'FileText' de aquí
import { X, Save, BedDouble, Building2, Layers, DollarSign, Info, Image as ImageIcon, Bath } from 'lucide-react'; 
import { useEffect, FormEventHandler, useState, useMemo } from 'react';

// --- INTERFACES ---
interface RoomType { id: number; name: string; }
interface Block { id: number; code: string; description?: string; }
interface Floor { id: number; name: string; }
interface Price { id: number; amount: number; bathroom_type: string; room_type_id: number; }

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

export default function RoomModal({ show, onClose, RoomToEdit, roomTypes, blocks, floors, prices }: RoomModalProps) {
    
    // Estado local para la UI
    const [selectedBathroomType, setSelectedBathroomType] = useState<string>('');
    const [preview, setPreview] = useState<string | null>(null);

    // Formulario de Inertia
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
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
        return prices.filter(p => p.bathroom_type === (selectedBathroomType === 'Privado' ? 'private' : 'shared'));
    }, [selectedBathroomType, prices]);

    const filteredRoomTypes = useMemo(() => {
        if (!selectedBathroomType) return roomTypes; 
        const availableTypeIds = filteredPrices.map(p => p.room_type_id);
        return roomTypes.filter(rt => availableTypeIds.includes(rt.id));
    }, [filteredPrices, roomTypes, selectedBathroomType]);

    // --- MANEJADORES ---
    const handleBathroomChange = (val: string) => {
        setSelectedBathroomType(val);
        // Reseteamos dependencias
        setData(prev => ({ ...prev, room_type_id: '', price_id: '' }));
    };

    const handleRoomTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const typeId = e.target.value;
        const foundPrice = filteredPrices.find(p => p.room_type_id === Number(typeId));
        
        setData(prev => ({
            ...prev,
            room_type_id: typeId,
            price_id: foundPrice ? foundPrice.id.toString() : '' 
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
    // El problema ocurría al setear estados inmediatamente. 
    // Ahora solo reaccionamos a cambios reales en la prop 'RoomToEdit' o 'show'.
    useEffect(() => {
        if (!show) return; // Si no se muestra, no hacemos nada

        clearErrors();

        if (RoomToEdit) {
            // --- MODO EDICIÓN ---
            
            // Calculamos valores auxiliares
            const currentPrice = prices.find(p => p.id === RoomToEdit.price_id);
            const initialBathType = currentPrice?.bathroom_type === 'private' ? 'Privado' : 'Compartido';
            
            // Actualizamos estados UI
            setSelectedBathroomType(initialBathType);
            setPreview(RoomToEdit.image_path ? `/storage/${RoomToEdit.image_path}` : null);

            // Actualizamos Formulario
            setData({
                number: RoomToEdit.number,
                block_id: RoomToEdit.block_id.toString(),
                floor_id: RoomToEdit.floor_id.toString(),
                price_id: RoomToEdit.price_id.toString(),
                room_type_id: RoomToEdit.room_type_id.toString(),
                status: RoomToEdit.status,
                notes: RoomToEdit.notes || '',
                is_active: RoomToEdit.is_active ?? true,
                image: null,
                _method: 'put',
            });
        } else {
            // --- MODO CREACIÓN ---
            
            // Limpiamos estados UI
            setSelectedBathroomType('');
            setPreview(null);
            
            // Limpiamos Formulario manualmente para asegurar que esté vacío
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
    // NOTA: Quitamos 'prices' y 'data' de las dependencias para evitar el bucle infinito que causaba el error.

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };
        if (RoomToEdit) {
            post(`/habitaciones/${RoomToEdit.id}`, { onSuccess });
        } else {
            post('/habitaciones', { onSuccess });
        }
    };

    if (!show) return null;

    // Calculamos el precio visual
    const displayAmount = prices.find(p => p.id.toString() === data.price_id)?.amount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        {RoomToEdit ? 'Editar Habitación' : 'Nueva Habitación'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        
                        {/* 1. Número */}
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Número / Nombre</label>
                            <div className="relative">
                                <Info className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={data.number}
                                    onChange={(e) => setData('number', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-1.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                    placeholder="Ej: 101, A-20, Suite Principal"
                                />
                            </div>
                            {errors.number && <p className="mt-1 text-xs text-red-500 font-bold">{errors.number}</p>}
                        </div>

                        {/* 2. Bloque */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Bloque</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                <select
                                    value={data.block_id}
                                    onChange={(e) => setData('block_id', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-1.5 pl-10 text-sm text-black bg-white focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {blocks.map(block => (
                                        <option key={block.id} value={block.id}>{block.code} - {block.description}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.block_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.block_id}</p>}
                        </div>

                        {/* 3. Piso */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Piso</label>
                            <div className="relative">
                                <Layers className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                <select
                                    value={data.floor_id}
                                    onChange={(e) => setData('floor_id', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-1.5 pl-10 text-sm text-black bg-white focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {floors.map(floor => (
                                        <option key={floor.id} value={floor.id}>{floor.name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.floor_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.floor_id}</p>}
                        </div>

                        {/* 4. FILTRO DE BAÑO */}
                        <div className="sm:col-span-2 border-t border-gray-100 pt-4 mt-2">
                            <label className="mb-1.5 block text-sm font-bold text-blue-800">1. ¿Qué tipo de baño tiene?</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleBathroomChange('Privado')}
                                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                                        selectedBathroomType === 'Privado' 
                                        ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500 ring-offset-1' 
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <Bath className="h-5 w-5" />
                                    <span className="font-semibold">Privado</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBathroomChange('Compartido')}
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
                                    <span className="font-semibold">Compartido</span>
                                </button>
                            </div>
                        </div>

                        {/* 5. TIPO DE HABITACIÓN (FILTRADO) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                2. Tipo de Habitación
                                {selectedBathroomType && <span className="ml-2 text-xs font-normal text-green-600">(Filtrado por baño {selectedBathroomType})</span>}
                            </label>
                            <div className="relative">
                                <BedDouble className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                <select
                                    value={data.room_type_id}
                                    onChange={handleRoomTypeChange}
                                    disabled={!selectedBathroomType} 
                                    className="block w-full rounded-xl border-gray-200 py-1.5 pl-10 text-sm text-black bg-white focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="" disabled>
                                        {!selectedBathroomType ? '← Seleccione baño primero' : 'Seleccionar tipo...'}
                                    </option>
                                    {filteredRoomTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.room_type_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.room_type_id}</p>}
                        </div>

                        {/* 6. PRECIO (AUTOMÁTICO) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">3. Precio (Automático)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-green-600 pointer-events-none" />
                                <input 
                                    type="text" 
                                    readOnly
                                    value={displayAmount ? `${displayAmount} Bs.` : ''}
                                    placeholder="Seleccione tipo..."
                                    className="block w-full rounded-xl border-gray-200 bg-green-50 py-1.5 pl-10 text-sm font-bold text-green-800 focus:border-green-500 focus:ring-green-500"
                                />
                                <input type="hidden" value={data.price_id} />
                            </div>
                            {errors.price_id && <p className="mt-1 text-xs text-red-500 font-bold">No hay tarifa configurada.</p>}
                        </div>

                        {/* 7. Estado */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Estado Actual</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="block w-full rounded-xl border-gray-200 py-1.5 px-3 text-sm text-black bg-white focus:border-green-500 focus:ring-green-500"
                            >
                                <option value="available">Libre</option>
                                <option value="occupied">Ocupado</option>
                                <option value="reserved">Reservado</option>
                                <option value="cleaning">Limpieza</option>
                                <option value="maintenance">Mantenimiento</option>
                                <option value="disabled">Inhabilitado</option>
                            </select>
                        </div>

                        {/* 8. Imagen */}
                        <div className="sm:col-span-2 border-t border-gray-100 pt-4">
                             <label className="mb-1.5 block text-sm font-semibold text-gray-700">Foto</label>
                             <div className="flex items-start gap-4">
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                    {preview ? (
                                        <img src={preview} alt="Previsualización" className="h-full w-full object-cover" />
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
                             {errors.image && <p className="mt-1 text-xs text-red-500 font-bold">{errors.image}</p>}
                        </div>

                        {/* Notas (Opcional - Reagregado sin icono FileText para evitar error) */}
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Notas Adicionales</label>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="block w-full rounded-xl border-gray-200 py-1.5 px-3 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                rows={2}
                                placeholder="Detalles sobre la habitación..."
                            />
                        </div>

                    </div>

                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
                        <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-1.5 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 transition disabled:opacity-50">
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}