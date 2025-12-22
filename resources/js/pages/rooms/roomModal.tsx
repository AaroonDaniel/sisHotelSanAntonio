import { useForm } from '@inertiajs/react';
import { X, Save, BedDouble, Building2, Layers, DollarSign, FileText, Info } from 'lucide-react'; 
import { useEffect, FormEventHandler } from 'react';

// 1. Interfaces para los datos relacionados
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
    bathroom_type: string; // Para mostrar "Privado/Compartido" en el select
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
    // Recibimos todas las listas necesarias
    roomTypes: RoomType[];
    blocks: Block[];
    floors: Floor[];
    prices: Price[];
} 

export default function RoomModal({ show, onClose, RoomToEdit, roomTypes, blocks, floors, prices }: RoomModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        number: '',
        block_id: '',
        floor_id: '',
        price_id: '',
        room_type_id: '', 
        status: 'available', // Valor por defecto
        notes: '',
        is_active: true,
    });

    useEffect(() => {
        if (show) {
            if (RoomToEdit) {
                setData({
                    number: RoomToEdit.number,
                    block_id: RoomToEdit.block_id.toString(),
                    floor_id: RoomToEdit.floor_id.toString(),
                    price_id: RoomToEdit.price_id.toString(),
                    room_type_id: RoomToEdit.room_type_id.toString(),
                    status: RoomToEdit.status,
                    notes: RoomToEdit.notes || '',
                    is_active: RoomToEdit.is_active ?? true,
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, RoomToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };
        
        if (RoomToEdit) {
            put(`/habitaciones/${RoomToEdit.id}`, { onSuccess });
        } else {
            post('/habitaciones', { onSuccess });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
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

                <form onSubmit={submit} className="p-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        
                        {/* 1. Número de Habitación */}
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-base font-semibold text-gray-700">Número / Nombre</label>

                            <div className="relative">
                                <Info className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={data.number}
                                    onChange={(e) => setData('number', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
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
                                    className="block w-full rounded-xl border-gray-200 py-2 pl-10 text-base text-black bg-white focus:border-green-500 focus:ring-green-500"
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
                                    className="block w-full rounded-xl border-gray-200 py-2 pl-10 text-base text-black bg-white focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {floors.map(floor => (
                                        <option key={floor.id} value={floor.id}>{floor.name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.floor_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.floor_id}</p>}
                        </div>

                        {/* 4. Tipo de Habitación */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tipo</label>
                            <div className="relative">
                                <BedDouble className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                <select
                                    value={data.room_type_id}
                                    onChange={(e) => setData('room_type_id', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2 pl-10 text-base text-black bg-white focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {roomTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.room_type_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.room_type_id}</p>}
                        </div>

                        {/* 5. Tarifa (Precio) */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tarifa Asignada</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                <select
                                    value={data.price_id}
                                    onChange={(e) => setData('price_id', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2 pl-10 text-base text-black bg-white focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {prices.map(price => (
                                        <option key={price.id} value={price.id}>
                                            {price.amount} Bs. ({price.bathroom_type === 'private' ? 'Privado' : 'Compartido'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors.price_id && <p className="mt-1 text-xs text-red-500 font-bold">{errors.price_id}</p>}
                        </div>

                        {/* 6. Estado Inicial */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Estado</label>
                            <select
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                className="block w-full rounded-xl border-gray-200 py-2 px-3 text-base text-black bg-white focus:border-green-500 focus:ring-green-500"
                            >
                                <option value="available">Libre</option>
                                <option value="occupied">Ocupado</option>
                                <option value="reserved">Reservado</option>
                                <option value="cleaning">Limpieza</option>
                                <option value="maintenance">Mantenimiento</option>
                                <option value="disabled">Inhabilitado</option>
                            </select>
                            {errors.status && <p className="mt-1 text-xs text-red-500 font-bold">{errors.status}</p>}
                        </div>

                        {/* 7. Notas (Opcional) */}
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Notas Adicionales</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="block w-full rounded-xl border-gray-200 py-2 pl-10 text-base text-black focus:border-green-500 focus:ring-green-500"
                                    rows={2}
                                    placeholder="Detalles sobre la habitación..."
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer Buttons */}
                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
                        <button type="submit" disabled={processing} className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 transition disabled:opacity-50">
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}