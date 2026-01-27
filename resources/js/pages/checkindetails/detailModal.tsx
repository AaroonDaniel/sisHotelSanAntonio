import { router, useForm } from '@inertiajs/react';
import axios from 'axios'; // IMPORTANTE: Importar Axios
import {
    BedDouble,
    Car,
    CheckCircle2,
    Coffee,
    Loader2,
    Minus,
    Plus,
    ShoppingBag,
    Trash2,
    UtensilsCrossed,
    X,
    Store,
    ShoppingBasket,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// --- INTERFACES ---
interface Service {
    id: number;
    name: string;
    price: number;
}

interface Checkin {
    id: number;
    guest: { full_name: string };
    room: { number: string };
}

interface CheckinDetail {
    id?: number;
    checkin_id: number;
    service_id: number;
    quantity: number;
}

interface DetailModalProps {
    show: boolean;
    onClose: () => void;
    detailToEdit?: CheckinDetail | null;
    checkins: Checkin[];
    services: Service[];
    initialCheckinId?: number | null;
}

// Interfaz para la lista temporal
interface AddedItem {
    dbId: number; // ID real de la base de datos
    serviceId: number;
    name: string;
    price: number;
    quantity: number;
}

export default function DetailModal({
    show,
    onClose,
    detailToEdit,
    checkins = [],
    services = [],
    initialCheckinId = null,
}: DetailModalProps) {
    // Configuración del formulario
    const { data, setData, put, reset, clearErrors } = useForm({
        checkin_id: '',
        service_id: '',
        quantity: 1,
    });

    const [processing, setProcessing] = useState(false); // Estado de carga manual para axios
    const [searchTerm, setSearchTerm] = useState('');
    const [quickFilter, setQuickFilter] = useState<
        'ALL' | 'DESAYUNO' | 'GARAJE'
    >('ALL');

    // Lista visual de lo que acabamos de agregar (con IDs reales)
    const [recentlyAdded, setRecentlyAdded] = useState<AddedItem[]>([]);

    // --- 2. EFECTO AL ABRIR EL MODAL (Tu lógica original + Carga inicial) ---
    useEffect(() => {
        if (show) {
            setSearchTerm('');
            setQuickFilter('ALL');
            setRecentlyAdded([]); // Limpiamos la lista visualmente al abrir
            
            // A. Identificar si hay un ID de habitación para cargar sus datos YA
            const targetId = detailToEdit ? detailToEdit.checkin_id : initialCheckinId;
            
            if (targetId) {
                // Si abrimos editar o "agregar" desde una habitación específica, cargamos su lista
                fetchExistingDetails(targetId.toString());
            }

            // B. Configurar el formulario (Tu lógica original intacta)
            if (detailToEdit) {
                // MODO EDICIÓN
                setData({
                    checkin_id: detailToEdit.checkin_id.toString(),
                    service_id: detailToEdit.service_id.toString(),
                    quantity: detailToEdit.quantity,
                });
            } else {
                // MODO CREACIÓN
                reset();
                clearErrors();
                if (initialCheckinId) {
                    setData('checkin_id', initialCheckinId.toString());
                }
            }
        }
    }, [show, detailToEdit, initialCheckinId]);

    // --- 3. EFECTO AL CAMBIAR EL SELECT DE HABITACIÓN ---
    useEffect(() => {
        // Si el modal está abierto y hay un ID seleccionado en el formulario
        if (show && data.checkin_id) {
            fetchExistingDetails(data.checkin_id);
        }
    }, [data.checkin_id, show]);

    // Filtrar servicios
    const filteredServices = services.filter((s) => {
        const nameLower = s.name.toLowerCase();

        const isExcluded =
            (nameLower.includes('garaje') ||
                nameLower.includes('desayuno') ||
                nameLower.includes('estacionamiento')) &&
            quickFilter === 'ALL';

        const matchesSearch = nameLower.includes(searchTerm.toLowerCase());

        let matchesCategory = true;
        if (quickFilter === 'DESAYUNO')
            matchesCategory = nameLower.includes('desayuno');
        else if (quickFilter === 'GARAJE')
            matchesCategory =
                nameLower.includes('garaje') ||
                nameLower.includes('estacionamiento');

        return !isExcluded && matchesSearch && matchesCategory;
    });

    // --- FUNCIÓN PARA GUARDAR (USANDO AXIOS PARA OBTENER EL ID) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.service_id) return;

        setProcessing(true);
        const selectedService = services.find(
            (s) => s.id.toString() === data.service_id,
        );

        // Si es edición usamos el método put de Inertia (flujo normal)
        if (detailToEdit && detailToEdit.id) {
            put(`/checkin-details/${detailToEdit.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                    setProcessing(false);
                },
                onError: () => setProcessing(false),
            });
            return;
        }

        // Si es CREACIÓN usamos Axios para obtener el ID y mantenernos en el modal
        try {
            const response = await axios.post('/checkin-details', {
                checkin_id: data.checkin_id,
                service_id: data.service_id,
                quantity: data.quantity,
            });

            // El backend debe devolver el objeto creado (ver paso 1 del backend)
            const newDetail = response.data;

            if (selectedService && newDetail.id) {
                // Agregamos a la lista visual con el ID REAL de la BD
                setRecentlyAdded((prev) => [
                    {
                        dbId: newDetail.id, // <--- ID REAL PARA PODER BORRAR LUEGO
                        serviceId: selectedService.id,
                        name: selectedService.name,
                        price: selectedService.price,
                        quantity: data.quantity,
                    },
                    ...prev,
                ]);
            }

            // Refrescamos los datos de fondo de Inertia sin recargar la página completa
            router.reload({ only: ['checkindetails', 'checkins'] });

            // Reseteamos solo los campos de servicio para seguir agregando
            setData((prev) => ({ ...prev, service_id: '', quantity: 1 }));
        } catch (error) {
            console.error('Error al guardar', error);
            alert('Ocurrió un error al guardar el servicio.');
        } finally {
            setProcessing(false);
        }
    };

    // --- FUNCIÓN PARA ELIMINAR DE LA BD Y DE LA LISTA ---
    const handleDeleteItem = (dbId: number) => {
        if (!confirm('¿Eliminar este servicio de la cuenta?')) return;

        // Usamos router.delete de Inertia para borrar de la BD
        router.delete(`/checkin-details/${dbId}`, {
            preserveScroll: true,
            onSuccess: () => {
                // Si el backend borró con éxito, lo quitamos de la lista visual
                setRecentlyAdded((prev) =>
                    prev.filter((item) => item.dbId !== dbId),
                );
            },
            onError: () => {
                alert('No se pudo eliminar el servicio.');
            },
        });
    };

    // Lista de los servicios agregados recientemente
    // --- NUEVA FUNCIÓN: CARGAR DATOS EXISTENTES ---
    const fetchExistingDetails = async (checkinId: string) => {
        if (!checkinId) return;
        try {
            // Llama a la ruta API dedicada que creamos
            const response = await axios.get(`/api/checkin-details/${checkinId}`);
            
            // Transforma los datos que llegan del backend al formato visual de la lista
            const formattedItems: AddedItem[] = response.data.map((det: any) => ({
                dbId: det.id,
                serviceId: det.service_id,
                name: det.service?.name || 'Servicio',
                // Usa el precio guardado (selling_price) o el del servicio si no hay histórico
                price: Number(det.selling_price || det.service?.price || 0),
                quantity: det.quantity
            }));

            setRecentlyAdded(formattedItems);
        } catch (error) {
            console.error("Error al cargar detalles:", error);
        }
    };

    // Totales visuales
    const currentService = services.find(
        (s) => s.id.toString() === data.service_id,
    );
    const currentTotal = currentService
        ? currentService.price * data.quantity
        : 0;
    const sessionTotal = recentlyAdded.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
    );

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 zoom-in-95 fade-in">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* --- HEADER --- */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Store className="h-5 w-5" />
                        </div>
                        {detailToEdit ? 'Editar Consumo' : 'Agregar Consumos'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-1 flex-col overflow-hidden md:flex-row"
                >
                    {/* --- COLUMNA IZQUIERDA --- */}
                    <div className="relative flex min-h-0 w-full flex-col border-r border-gray-100 bg-gray-50 p-6 md:w-1/3">
                        {/* Selector de Habitación */}
                        <div className="mb-6 shrink-0">
                            <label className="mb-1.5 block text-xs font-bold text-gray-500 uppercase">
                                Habitación
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <BedDouble className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={data.checkin_id}
                                    onChange={(e) =>
                                        setData('checkin_id', e.target.value)
                                    }
                                    className="w-full rounded-xl border-gray-300 bg-white py-2.5 pr-4 pl-10 text-sm font-bold text-gray-800 focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                                    disabled={
                                        !!detailToEdit || !!initialCheckinId
                                    }
                                >
                                    <option value="" disabled>
                                        -- Seleccionar --
                                    </option>
                                    {checkins.map((chk) => (
                                        <option key={chk.id} value={chk.id}>
                                            Hab: {chk.room.number} -{' '}
                                            {chk.guest.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* LISTA DE AGREGADOS (CON SCROLL Y DELETE REAL) */}
                        <div className="flex min-h-0 flex-1 flex-col border-t border-gray-200 pt-4">
                            <h3 className="mb-3 flex shrink-0 items-center justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>Agregados ahora</span>
                                <span className="text-green-600">
                                    Total: Bs. {sessionTotal.toFixed(2)}
                                </span>
                            </h3>

                            <div className="max-h-[300px] flex-1 space-y-2 overflow-y-auto pr-2">
                                {recentlyAdded.length === 0 ? (
                                    <div className="flex h-full min-h-[100px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                                        <ShoppingBag className="mb-2 h-8 w-8 opacity-20" />
                                        <p className="text-center text-[10px]">
                                            Lista vacía
                                        </p>
                                    </div>
                                ) : (
                                    recentlyAdded.map((item) => (
                                        <div
                                            key={item.dbId}
                                            className="flex animate-in items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm duration-200 fade-in slide-in-from-left-2"
                                        >
                                            <div>
                                                <p className="text-sm leading-tight font-bold text-gray-800">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.quantity} x{' '}
                                                    {item.price} Bs.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm font-bold text-green-600">
                                                    {(
                                                        item.quantity *
                                                        item.price
                                                    ).toFixed(2)}
                                                </span>

                                                {/* BOTÓN ELIMINAR (Opcional) */}
                                                
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteItem(item.dbId)}
                                                    className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                    title="Eliminar de la base de datos"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Botón Guardar */}
                        <div className="mt-4 shrink-0 border-t border-gray-200 pt-4">
                            <div className="mb-2 flex items-end justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase">
                                    Item Actual
                                </span>
                                <span className="text-xl font-bold text-green-700">
                                    Bs. {currentTotal.toFixed(2)}
                                </span>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-3">
                                <button
                                    type="submit"
                                    disabled={processing || !data.service_id}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-green-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="h-5 w-5" />
                                            {detailToEdit
                                                ? 'Actualizar'
                                                : 'Agregar a la Cuenta'}
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA --- */}
                    <div className="flex min-h-0 w-full flex-col bg-white p-6 md:w-2/3">
                        {/* Filtros */}
                        <div className="mb-4 shrink-0 border-b border-gray-200 pb-4">
                            <div className="flex flex-col gap-3">
                                <span className="text-xs font-bold text-gray-500 uppercase">
                                    Buscador
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar productos..."
                                    className="w-full rounded-xl border-gray-400 bg-gray-50 py-2.5 pl-10 text-sm transition-all focus:border-green-500 focus:ring-green-500"
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Grid Productos */}
                        <div className="min-h-0 flex-1 overflow-y-auto pr-2 pb-2">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {filteredServices.map((service) => {
                                    const isSelected =
                                        data.service_id ===
                                        service.id.toString();
                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() =>
                                                setData(
                                                    'service_id',
                                                    service.id.toString(),
                                                )
                                            }
                                            className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3 transition-all active:scale-95 ${
                                                isSelected
                                                    ? 'border-green-500 bg-green-50/50 shadow-md ring-2 ring-green-500'
                                                    : 'border-gray-100 bg-white hover:border-green-400 hover:shadow-md'
                                            }`}
                                        >
                                            <div className="mb-3 flex items-center justify-center">
                                                <div
                                                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600'}`}
                                                >
                                                    {service.name
                                                        .toLowerCase()
                                                        .includes('garaje') ? (
                                                        <Car className="h-6 w-6" />
                                                    ) : service.name
                                                          .toLowerCase()
                                                          .includes(
                                                              'desayuno',
                                                          ) ? (
                                                        <Coffee className="h-6 w-6" />
                                                    ) : (
                                                        <ShoppingBasket className="h-6 w-6" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-center">
                                                <h4
                                                    className={`mb-1 text-xs leading-tight font-bold ${isSelected ? 'text-green-900' : 'text-gray-700'}`}
                                                >
                                                    {service.name}
                                                </h4>
                                                <span className="inline-block rounded-md border border-gray-100 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-500 shadow-sm">
                                                    Bs. {service.price}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 animate-in text-green-600 zoom-in">
                                                    <CheckCircle2 className="h-5 w-5 fill-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {filteredServices.length === 0 && (
                                <div className="flex h-full min-h-[150px] flex-col items-center justify-center text-gray-400">
                                    <p className="text-sm">
                                        No se encontraron productos.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Cantidad Flotante */}
                        {data.service_id && (
                            <div className="mt-4 shrink-0 animate-in duration-300 fade-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between rounded-xl bg-gray-900 p-2 text-white shadow-lg">
                                    <div className="flex items-center gap-3 px-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setData(
                                                    'quantity',
                                                    Math.max(
                                                        1,
                                                        data.quantity - 1,
                                                    ),
                                                )
                                            }
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 transition hover:bg-gray-600"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>

                                        <div className="min-w-[3rem] text-center">
                                            <span className="block text-xs font-bold text-gray-400 uppercase">
                                                Cant.
                                            </span>
                                            <span className="text-lg leading-none font-bold">
                                                {data.quantity}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setData(
                                                    'quantity',
                                                    data.quantity + 1,
                                                )
                                            }
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 transition hover:bg-gray-600"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setData((prev) => ({
                                                ...prev,
                                                service_id: '',
                                                quantity: 1,
                                            }))
                                        }
                                        className="mr-2 rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-red-400"
                                        title="Cancelar selección"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
