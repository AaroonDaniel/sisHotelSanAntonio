import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Ban,
    BedDouble,
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Loader2,
    Save,
    Search,
    Tag,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import CancelModal from '@/components/cancelModal';
import ConfirmModal from '@/components/confirmModal';

export interface PendingReservationsModalProps {
    show: boolean;
    onClose: (val?: boolean) => void;
    reservations: any[];
    rooms: any[];
    onNewReservation?: () => void;
    initialReservationId?: number | null;
}

// --- FUNCIONES DE UTILIDAD ---
const isMatchingBathroom = (dbVal?: string, filterVal?: string) => {
    const db = dbVal?.toLowerCase() || '';
    const filter = filterVal?.toLowerCase() || '';
    if (!filter) return true;
    if (db === filter) return true;
    if (
        (filter === 'private' || filter === 'privado') &&
        (db === 'private' || db === 'privado')
    )
        return true;
    if (
        (filter === 'shared' || filter === 'compartido') &&
        (db === 'shared' || db === 'compartido')
    )
        return true;
    return false;
};

const getRoomBathroom = (r: any) => {
    if (r.price && !Array.isArray(r.price) && r.price.bathroom_type)
        return r.price.bathroom_type;
    if (r.prices && Array.isArray(r.prices) && r.prices.length > 0)
        return r.prices[0].bathroom_type;
    return 'N/A';
};

const translateBathroom = (bath: string) => {
    if (!bath) return 'Indiferente';
    const b = bath.toLowerCase();
    if (b === 'private' || b === 'privado') return 'Privado';
    if (b === 'shared' || b === 'compartido') return 'Compartido';
    return bath;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};

export default function PendingReservationsModal({
    show,
    onClose,
    reservations,
    rooms,
    initialReservationId,
}: PendingReservationsModalProps) {
    // --- ESTADOS PRINCIPALES ---
    const [selectedReservation, setSelectedReservation] = useState<any | null>(
        null,
    );
    const [assignments, setAssignments] = useState<Record<number, string>>({});
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [tempSelectedRoom, setTempSelectedRoom] = useState<string | null>(
        null,
    );
    const [isFullyAssigned, setIsFullyAssigned] = useState(false);

    // --- ESTADOS DE FILTROS ---
    const [strictFilter, setStrictFilter] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBlock, setSelectedBlock] = useState<string>('');
    const [selectedRoomType, setSelectedRoomType] = useState<string>('');
    const [selectedBathroom, setSelectedBathroom] = useState<string>('');

    // --- ESTADOS DE MODALES Y CARGA ---
    const [isAssigning, setIsAssigning] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [cancelingReservationId, setCancelingReservationId] = useState<
        number | null
    >(null);

    // --- Estado para la seleccion de tipo de hab si fue completada o no
    const filteredReservations = useMemo(() => {
        if (!reservations) return [];
        if (initialReservationId) {
            return reservations.filter((r) => r.id === initialReservationId);
        }
        return reservations.filter((r) =>
            r.details?.some((d: any) => !d.room_id),
        );
    }, [reservations, initialReservationId]);

    const blocks: any[] = Array.from(
        new Set(rooms?.filter((r) => r.block).map((r) => r.block.id)),
    ).map((id) => rooms.find((r) => r.block?.id === id)?.block);
    const roomTypes: any[] = Array.from(
        new Set(rooms?.filter((r) => r.room_type).map((r) => r.room_type.id)),
    ).map((id) => rooms.find((r) => r.room_type?.id === id)?.room_type);

    useEffect(() => {
        if (show) {
            if (initialReservationId) {
                // Si abrimos el modal desde una habitación reservada, pre-seleccionar
                const res = reservations.find(
                    (r) => r.id === initialReservationId,
                );
                if (res) {
                    handleRowClick(res);
                    return; // Termina la ejecución aquí
                }
            }

            // Si no hay ID (se abrió desde el botón general), limpiar todo
            setSelectedReservation(null);
            resetWizard();
        }
    }, [show, initialReservationId]);

    const resetWizard = () => {
        setAssignments({});
        setCurrentStep(0);
        setTempSelectedRoom(null);
        setSearchQuery('');
        setSelectedBlock('');
        setSelectedRoomType('');
        setSelectedBathroom('');
        setIsFullyAssigned(false);
    };

    const handleClose = () => {
        resetWizard();
        onClose(false);
    };

    const handleRowClick = (res: any) => {
        setSelectedReservation(res);
        resetWizard();
        setStrictFilter(true);

        if (res.details && res.details.length > 0) {
            const allAssigned = res.details.every(
                (detail: any) => detail.room_id !== null,
            );
            if (allAssigned) {
                const currentAssignments: Record<number, string> = {};
                res.details.forEach((d: any) => {
                    currentAssignments[d.id] = String(d.room_id);
                });
                setAssignments(currentAssignments);
                setIsFullyAssigned(true);
            }
        }
    };

    const handleNext = () => {
        if (!currentDetail || !tempSelectedRoom) return;

        const newAssignments = {
            ...assignments,
            [currentDetail.id]: tempSelectedRoom,
        };
        setAssignments(newAssignments);

        const nextStepIndex = currentStep + 1;
        if (nextStepIndex < detailsCount) {
            setCurrentStep(nextStepIndex);
            const nextDetailId = selectedReservation.details[nextStepIndex].id;
            setTempSelectedRoom(newAssignments[nextDetailId] || null);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStep = currentStep - 1;
            setCurrentStep(prevStep);
            setTempSelectedRoom(
                assignments[selectedReservation.details[prevStep].id] || null,
            );
        }
    };

    const handleSelectRoom = (id: string) => {
        setTempSelectedRoom(id);
    };

    // 🚀 GUARDAR ASIGNACIÓN REACTIVAMENTE (Sin F5)
    const handleAssignRooms = async () => {
        if (!selectedReservation) return;
        const finalAssignments = { ...assignments };
        if (currentDetail && tempSelectedRoom)
            finalAssignments[currentDetail.id] = tempSelectedRoom;

        setIsAssigning(true);
        try {
            const response = await axios.post(
                `/reservas/${selectedReservation.id}/assign-rooms`,
                {
                    assignments: finalAssignments,
                },
            );
            if (response.data.success) {
                setAssignments(finalAssignments);
                setIsFullyAssigned(true);
                // 🔄 MAGIA INERTIA: Actualiza los cuartos al fondo sin recargar la página entera
                router.reload({ only: ['rooms', 'reservations'] });
            }
        } catch (error) {
            console.error('Error al asignar:', error);
            alert('Error de conexión al asignar habitaciones.');
        } finally {
            setIsAssigning(false);
        }
    };

    // 🚀 CONFIRMAR RESERVA DIRECTAMENTE (A prueba de validaciones)
    const handleConfirmReservation = () => {
        if (!selectedReservation) return;
        setIsConfirming(true);

        // 1. Copiamos TODOS los datos de la reserva y solo sobreescribimos el estado
        // De esta forma, Laravel recibe el guest_id, fechas, etc., y no se queja.
        const payload = {
            ...selectedReservation,
            status: 'confirmada',
        };

        // 2. Usamos router.put directamente
        router.put(`/reservas/${selectedReservation.id}`, payload, {
            onSuccess: () => {
                setIsConfirming(false);
                handleClose(); // Cerramos el modal limpiamente
            },
            onError: (errors) => {
                setIsConfirming(false);
                // Si Laravel rechaza algo, ahora lo imprimiremos en la consola para saber exactamente qué es
                console.error('🚨 ERRORES DE VALIDACIÓN DE LARAVEL:', errors);
                alert(
                    'Hubo un error de validación. Abre tu Consola (Clic derecho -> Inspeccionar) para ver qué dato falta.',
                );
            },
        });
    };
    const detailsCount = selectedReservation?.details?.length || 0;
    const currentDetail =
        selectedReservation && currentStep < detailsCount
            ? selectedReservation.details[currentStep]
            : null;
    const isReadyToAssign =
        selectedReservation &&
        detailsCount > 0 &&
        currentStep === detailsCount - 1 &&
        tempSelectedRoom !== null;
    const currentSelectedId = tempSelectedRoom;

    let requestedRoomTypeName = 'Desconocido';
    if (currentDetail && rooms) {
        const typeObj = rooms.find(
            (r) =>
                r.room_type?.id.toString() ===
                currentDetail.requested_room_type_id?.toString(),
        );
        requestedRoomTypeName = typeObj?.room_type?.name || 'Cualquier Tipo';
    }

    let filteredRooms =
        rooms?.filter((room) => {
            const isLibre = [
                'available',
                'disponible',
                'libre',
                'LIBRE',
            ].includes(room.status);
            const alreadyInWizard =
                Object.values(assignments).includes(String(room.id)) &&
                assignments[currentDetail?.id] !== String(room.id);

            if (!isLibre || alreadyInWizard) return false;
            if (
                searchQuery &&
                !String(room.number)
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase().trim())
            )
                return false;
            if (selectedBlock && String(room.block_id) !== selectedBlock)
                return false;
            if (
                selectedRoomType &&
                String(room.room_type_id) !== selectedRoomType
            )
                return false;
            if (selectedBathroom && getRoomBathroom(room) !== selectedBathroom)
                return false;

            if (strictFilter && currentDetail) {
                const isTypeMatch =
                    String(room.room_type_id) ===
                    String(currentDetail.requested_room_type_id);
                const isBathMatch = isMatchingBathroom(
                    getRoomBathroom(room),
                    currentDetail.requested_bathroom,
                );
                return isTypeMatch && isBathMatch;
            }
            return true;
        }) || [];

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity ${!show ? 'hidden' : 'animate-in duration-200 fade-in'}`}
        >
            <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* CABECERA */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold tracking-tighter text-gray-800 uppercase">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        Asignación de Reservas
                    </h2>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-1 text-gray-400 transition-all hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* PANEL IZQUIERDO: LISTA DE RESERVAS */}
                    <div className="relative flex w-[35%] flex-col overflow-y-auto border-r border-gray-100 bg-white p-6">
                        <label className="mb-4 block text-xs font-bold tracking-widest text-gray-800 uppercase">
                            Huéspedes Programados
                        </label>
                        <div className="space-y-3">
                            {filteredReservations.map((res) => {
                                const isSelected =
                                    selectedReservation?.id === res.id;

                                return (
                                    <div key={res.id} className="flex flex-col">
                                        <div
                                            onClick={() => handleRowClick(res)}
                                            className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${isSelected ? 'scale-[1.01] border-green-500 bg-green-50 shadow-md ring-1 ring-green-500' : 'border-gray-200 bg-white hover:border-green-300'}`}
                                        >
                                            <div className="mb-2 flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold ${isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'}`}
                                                    >
                                                        {res.guest?.full_name?.charAt(
                                                            0,
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm leading-tight font-black text-gray-800 uppercase">
                                                            {res.guest
                                                                ?.full_name ||
                                                                'Sin Nombre'}
                                                        </h3>
                                                        <p className="mt-0.5 text-[10px] font-bold text-gray-800 uppercase">
                                                            CI:{' '}
                                                            {res.guest
                                                                ?.identification_number ||
                                                                'S/N'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                        Ingreso
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-800">
                                                        {formatDate(
                                                            res.arrival_date ||
                                                                res.expected_check_in,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                        Estadía
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-800">
                                                        <Clock className="mr-1 inline h-3 w-3 text-green-500" />
                                                        {res.duration_days || 1}{' '}
                                                        Noche(s)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: GRILLA / RESUMEN */}
                    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
                        {selectedReservation &&
                            !isFullyAssigned &&
                            currentDetail && (
                                <div className="shrink-0 bg-white px-6 pt-6 pb-2">
                                    <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/80 p-4 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
                                                ASIGNACIÓN {currentStep + 1} de{' '}
                                                {detailsCount}
                                            </span>
                                            <span className="text-xl leading-none font-black text-blue-900">
                                                {requestedRoomTypeName}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handlePrev}
                                                disabled={currentStep === 0}
                                                className="rounded-lg border border-blue-200 bg-white p-2 shadow-sm transition-all disabled:opacity-30"
                                            >
                                                <ChevronLeft />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleNext}
                                                disabled={
                                                    currentStep ===
                                                        detailsCount - 1 ||
                                                    !tempSelectedRoom
                                                }
                                                className={`rounded-lg border p-2 shadow-sm transition-all ${currentStep === detailsCount - 1 || !tempSelectedRoom ? 'border-gray-300 bg-gray-200 text-gray-400' : 'border-blue-700 bg-blue-600 text-white'}`}
                                            >
                                                {currentStep ===
                                                detailsCount - 1 ? (
                                                    <Ban />
                                                ) : (
                                                    <ChevronRight />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        <div className="flex flex-1 flex-col overflow-hidden">
                            {!selectedReservation ? (
                                <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-gray-400">
                                    <ArrowLeft className="mb-4 h-16 w-16 animate-pulse opacity-20" />
                                    <h3 className="text-lg font-black tracking-widest uppercase">
                                        Seleccione una Reserva
                                    </h3>
                                </div>
                            ) : isFullyAssigned ? (
                                <div className="flex flex-1 animate-in flex-col items-center justify-center overflow-y-auto p-10 zoom-in-95">
                                    <div className="mb-4 rounded-full bg-green-100 p-5 shadow-inner">
                                        <CheckCircle2 className="h-16 w-16 text-green-600" />
                                    </div>
                                    <h2 className="mb-2 text-center text-2xl font-black text-gray-800 uppercase">
                                        ¡Todas las habitaciones asignadas!
                                    </h2>
                                    <div className="mb-4 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-sm shadow-sm">
                                        <h3 className="mb-4 border-b pb-3 text-xs font-black tracking-widest text-gray-600 uppercase">
                                            Resumen de Habitaciones:
                                        </h3>
                                        {selectedReservation.details.map(
                                            (d: any) => {
                                                const roomObj = rooms.find(
                                                    (r) =>
                                                        String(r.id) ===
                                                        String(
                                                            d.room_id ||
                                                                assignments[
                                                                    d.id
                                                                ],
                                                        ),
                                                );
                                                return (
                                                    <div
                                                        key={d.id}
                                                        className="mb-2 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black tracking-wider text-gray-700 uppercase">
                                                                {
                                                                    requestedRoomTypeName
                                                                }
                                                            </span>
                                                            <span className="text-[10px] text-gray-500">
                                                                (Baño{' '}
                                                                {translateBathroom(
                                                                    d.requested_bathroom,
                                                                )}
                                                                )
                                                            </span>
                                                            <span className="mt-1 text-xs font-bold text-green-700">
                                                                Bs{' '}
                                                                {d.price ||
                                                                    '0.00'}
                                                            </span>
                                                        </div>
                                                        <span className="rounded-md border border-green-200 bg-green-100 px-4 py-1.5 text-lg font-black text-green-700">
                                                            HAB.{' '}
                                                            {roomObj?.number ||
                                                                '?'}
                                                        </span>
                                                    </div>
                                                );
                                            },
                                        )}
                                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold tracking-tighter text-blue-500 uppercase">
                                                    Adelanto Registrado
                                                </span>
                                                <span className="text-xl font-black text-blue-900">
                                                    Bs{' '}
                                                    {selectedReservation.advance_payment ||
                                                        '0.00'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-blue-500 uppercase">
                                                    Método
                                                </span>
                                                <span className="rounded-md bg-blue-200 px-3 py-1 text-[11px] font-black tracking-widest text-blue-800 uppercase">
                                                    {selectedReservation.payment_type ||
                                                        'EFECTIVO'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* BARRA DE FILTROS */}
                                    <div className="z-10 shrink-0 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="relative min-w-[140px] flex-1">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <Search className="h-3.5 w-3.5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="BUSCAR HAB..."
                                                    value={searchQuery}
                                                    onChange={(e) =>
                                                        setSearchQuery(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 w-full rounded-lg border-gray-200 bg-gray-50 pr-2 pl-9 text-[10px] font-bold text-gray-900 uppercase focus:border-green-500 focus:ring-green-500"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Building2 className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                                <select
                                                    value={selectedBlock}
                                                    onChange={(e) =>
                                                        setSelectedBlock(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 cursor-pointer rounded-lg border-gray-200 bg-gray-50 pr-6 pl-8 text-[10px] font-bold text-gray-600 uppercase hover:bg-gray-100 focus:border-green-500 focus:ring-green-500"
                                                >
                                                    <option value="">
                                                        Bloques
                                                    </option>
                                                    {blocks.map(
                                                        (block: any) => (
                                                            <option
                                                                key={block?.id}
                                                                value={
                                                                    block?.id
                                                                }
                                                            >
                                                                {
                                                                    block?.description
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                            <div className="relative">
                                                <Tag className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                                <select
                                                    value={selectedRoomType}
                                                    onChange={(e) =>
                                                        setSelectedRoomType(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="h-8 cursor-pointer rounded-lg border-gray-200 bg-gray-50 pr-6 pl-8 text-[10px] font-bold text-gray-600 uppercase hover:bg-gray-100 focus:border-green-500 focus:ring-green-500"
                                                >
                                                    <option value="">
                                                        Tipos
                                                    </option>
                                                    {roomTypes.map(
                                                        (type: any) => (
                                                            <option
                                                                key={type?.id}
                                                                value={type?.id}
                                                            >
                                                                {type?.name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                            <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
                                                <button
                                                    onClick={() =>
                                                        setSelectedBathroom(
                                                            selectedBathroom ===
                                                                'private'
                                                                ? ''
                                                                : 'private',
                                                        )
                                                    }
                                                    className={`rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'private' ? 'border border-green-200 bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    Priv
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setSelectedBathroom(
                                                            selectedBathroom ===
                                                                'shared'
                                                                ? ''
                                                                : 'shared',
                                                        )
                                                    }
                                                    className={`rounded-md px-3 py-1 text-[9px] font-bold uppercase transition-all ${selectedBathroom === 'shared' ? 'border border-green-200 bg-white text-green-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    Comp
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GRILLA DE HABITACIONES */}
                                    <div className="flex-1 overflow-y-auto p-5">
                                        {filteredRooms.length === 0 ? (
                                            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-gray-400 shadow-sm">
                                                <BedDouble className="mb-3 h-12 w-12 opacity-20" />
                                                <p className="text-xs font-bold uppercase">
                                                    No hay habitaciones
                                                    disponibles.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                                {filteredRooms.map(
                                                    (roomItem) => {
                                                        const isSelected =
                                                            String(
                                                                roomItem.id,
                                                            ) ===
                                                            String(
                                                                currentSelectedId,
                                                            );
                                                        const roomBath =
                                                            getRoomBathroom(
                                                                roomItem,
                                                            );
                                                        const translatedBath =
                                                            roomBath ===
                                                            'private'
                                                                ? 'Privado'
                                                                : 'Compartido';
                                                        const isPerfectMatch =
                                                            roomItem.room_type?.id.toString() ===
                                                                currentDetail?.requested_room_type_id?.toString() &&
                                                            isMatchingBathroom(
                                                                roomBath,
                                                                currentDetail?.requested_bathroom,
                                                            );

                                                        return (
                                                            <button
                                                                key={
                                                                    roomItem.id
                                                                }
                                                                onClick={() =>
                                                                    handleSelectRoom(
                                                                        String(
                                                                            roomItem.id,
                                                                        ),
                                                                    )
                                                                }
                                                                className={`group relative flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center transition-all duration-200 outline-none ${isSelected ? 'scale-105 border-green-500 bg-white shadow-md ring-2 ring-green-200 ring-offset-1' : isPerfectMatch ? 'border-gray-200 bg-white shadow-sm hover:border-green-400 hover:bg-green-50' : 'border-dashed border-gray-300 bg-gray-50 opacity-60 hover:opacity-100'}`}
                                                            >
                                                                {isSelected && (
                                                                    <div className="absolute top-2 right-2 rounded-full bg-green-500 p-0.5 text-white shadow-sm">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                    </div>
                                                                )}
                                                                <span className="mb-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                                                    {
                                                                        roomItem
                                                                            .room_type
                                                                            ?.name
                                                                    }
                                                                </span>
                                                                <span
                                                                    className={`text-3xl font-black ${isSelected ? 'text-green-700' : 'text-gray-800'}`}
                                                                >
                                                                    {
                                                                        roomItem.number
                                                                    }
                                                                </span>
                                                                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                                                                    <span
                                                                        className={`rounded px-2 py-0.5 text-[9px] font-bold ${isSelected ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                                                                    >
                                                                        Baño{' '}
                                                                        {
                                                                            translatedBath
                                                                        }
                                                                    </span>
                                                                    <span
                                                                        className={`rounded border px-2 py-0.5 text-[9px] font-bold ${isSelected ? 'border-green-200 bg-green-100 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                                                                    >
                                                                        Bs{' '}
                                                                        {
                                                                            roomItem
                                                                                .price
                                                                                ?.amount
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* --- FOOTER GLOBAL (Todo a la derecha) --- */}
                        <div className="z-20 flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                            {selectedReservation && (
                                <button
                                    onClick={() => {
                                        setCancelingReservationId(
                                            selectedReservation.id,
                                        );
                                        setIsCancelModalOpen(true);
                                    }}
                                    className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-xs font-black tracking-wider text-red-600 uppercase transition-all hover:bg-red-50"
                                >
                                    Anular Reserva
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleClose}
                                className="rounded-xl px-5 py-2 text-sm font-bold text-gray-500 uppercase transition hover:bg-gray-100 hover:text-gray-700 active:scale-95"
                            >
                                Cerrar
                            </button>

                            {isReadyToAssign && !isFullyAssigned && (
                                <button
                                    onClick={handleAssignRooms}
                                    disabled={isAssigning}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black tracking-wider text-white uppercase shadow-md transition-all hover:bg-blue-700 active:scale-95"
                                >
                                    {isAssigning ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    Asignar Habitaciones
                                </button>
                            )}

                            {/* CÓDIGO NUEVO PARA EL BOTÓN */}
                            {isFullyAssigned && (
                                <button
                                    onClick={handleConfirmReservation}
                                    disabled={isConfirming}
                                    className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-[12px] font-black text-white uppercase shadow-md hover:bg-green-700 active:scale-95"
                                >
                                    {isConfirming ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    {isConfirming
                                        ? 'Confirmando...'
                                        : 'Confirmar Reserva'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CancelModal
                show={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                actionUrl={
                    cancelingReservationId
                        ? `/reservas/${cancelingReservationId}`
                        : null
                }
                onSuccess={handleClose} // 👈 cierra "Asignación de Reservas" y vuelve a la vista
            />

            {/* ConfirmModal envía el formulario usando useForm({ status: 'confirmada' }) 
                Como usa Inertia, al procesarse en tu Controlador y retornar el redirect()->route('rooms.status')->with('auto_open_checkins'),
                automáticamente cerrará este modal y te redirigirá a la vista de las habitaciones sin recargar la página. */}
            <ConfirmModal
                show={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                actionUrl={
                    selectedReservation
                        ? `/reservas/${selectedReservation.id}`
                        : null
                }
            />
        </div>
    );
}
