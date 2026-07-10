import OperatorSelector from '@/components/OperatorSelector';
import { useCan } from '@/hooks/use-can';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    BedDouble,
    Clock,
    LogIn,
    LogOut,
    Pencil,
    Plus,
    Printer,
    Search,
    Trash2,
    User as UserIcon,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CheckinModal, { Operator } from './checkinModal';
import DeleteModal from './deleteModal';

// --- INTERFACES ---
interface Guest {
    id: number;
    full_name: string;
    identification_number: string;
}
interface Room {
    id: number;
    number: string;
    status: string;
    room_type?: {
        name: string;
        capacity: number;
    };
    price?: { amount: number };
}

interface Checkin {
    id: number;
    guest_id: number;
    room_id: number;
    check_in_date: string;

    actual_arrival_date?: string | null;
    schedule_id?: number | null;
    schedule?: { name: string };

    check_out_date?: string | null;
    duration_days: number;
    advance_payment: number;

    // 👇 AÑADIDOS PARA QUE COINCIDA CON EL MODAL
    agreed_price: number;
    discount?: number;
    payment_method?: string | null;
    qr_bank?: string | null;

    notes?: string;
    guest?: Guest;
    room?: Room;
    companions?: Guest[];
    created_at: string;
    origin?: string;
}

interface Props {
    auth: { user: User };
    Checkins: Checkin[];
    Guests: Guest[];
    Rooms: Room[];
    Schedules: any[];
    RoomTypes: any[];
    Operators: Operator[];
}
export interface CheckinData {
    id: number;
    guest_id: number;
    room_id: number;
    check_in_date: string;
    actual_arrival_date?: string | null;
    schedule_id?: number | null;
    duration_days: number;
    advance_payment: number;
    notes?: string;
    services?: string[];
    guest?: Guest;
    companions?: any[];
    created_at?: string;
}

export default function CheckinsIndex({
    auth,
    Checkins,
    Guests,
    Rooms,
    Schedules,
    RoomTypes,
    Operators,
}: Props) {
    const { hasRole } = useCan();
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [editingCheckin, setEditingCheckin] = useState<Checkin | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    //Variable para editar el usuario
    const [targetGuestId, setTargetGuestId] = useState<number | null>(null);

    const [deletingCheckinId, setDeletingCheckinId] = useState<number | null>(
        null,
    );

    // Confirmación de checkout: bajo Terminal Compartida, cualquier acción
    // que mueva dinero exige elegir el operador (avatar) que la ejecuta.
    const [checkoutTarget, setCheckoutTarget] = useState<Checkin | null>(null);
    const [checkoutOperatorId, setCheckoutOperatorId] = useState('');
    const [checkoutProcessing, setCheckoutProcessing] = useState(false);

    useEffect(() => {
        if (editingCheckin) {
            // Buscamos el checkin actualizado en la lista nueva que llegó del servidor
            const freshCheckin = Checkins.find(
                (c) => c.id === editingCheckin.id,
            );

            // Si existe (no fue eliminado), actualizamos el estado del modal
            if (freshCheckin) {
                setEditingCheckin(freshCheckin);
            }
        }
    }, [Checkins]);

    // --- 1. LÓGICA DE FILTRADO MEJORADA ---
    // Ahora busca también en los nombres de los acompañantes
    const filteredCheckins = Checkins.filter((checkin) => {
        const term = searchTerm.toLowerCase();

        // Buscar por titular
        const guestName = checkin.guest
            ? `${checkin.guest.full_name}`.toLowerCase()
            : '';
        const guestCi = (
            checkin.guest?.identification_number || ''
        ).toLowerCase();
        // Buscar por habitación
        const roomNumber = checkin.room
            ? checkin.room.number.toLowerCase()
            : '';

        // Buscar por acompañantes (NUEVO)
        const companionsMatch = checkin.companions?.some(
            (comp) =>
                comp.full_name.toLowerCase().includes(term) ||
                comp.identification_number.toLowerCase().includes(term),
        );

        return (
            guestName.includes(term) ||
            guestCi.includes(term) ||
            roomNumber.includes(term) ||
            companionsMatch
        );
    });

    // --- 2. ACCIONES ---
    const handleCheckout = (checkin: Checkin) => {
        setCheckoutOperatorId('');
        setCheckoutTarget(checkin);
    };

    // El endpoint /checks/{id}/checkout siempre responde JSON crudo (no
    // Inertia), igual que en rooms/status.tsx: por eso se usa axios en vez
    // de router.put/patch (Inertia trataría la respuesta como una página
    // inválida). El método registrado en el backend es PUT.
    const confirmCheckout = async () => {
        if (!checkoutTarget) return;
        if (!checkoutOperatorId) return;

        setCheckoutProcessing(true);
        try {
            await axios.put(`/checks/${checkoutTarget.id}/checkout`, {
                checkout_operator_id: checkoutOperatorId,
            });
            const finishedId = checkoutTarget.id;
            setCheckoutTarget(null);
            router.reload({ only: ['Checkins'] });
            window.open(`/checks/${finishedId}/checkout-receipt`, '_blank');
        } catch (error: any) {
            alert(
                error?.response?.data?.message ||
                    'Error al procesar la salida.',
            );
        } finally {
            setCheckoutProcessing(false);
        }
    };

    const openCreateModal = () => {
        setEditingCheckin(null);
        setIsCheckinModalOpen(true);
    };

    const openEditModal = (checkin: Checkin, guestIdToFocus?: number) => {
        setEditingCheckin(checkin);
        setTargetGuestId(guestIdToFocus || null); // Guardamos a quién se hizo clic
        setIsCheckinModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingCheckinId(id);
        setIsDeleteModalOpen(true);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-BO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-BO', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Formato de hora:
    const formatDateOnly = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-BO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatTimeOnly = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('es-BO', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // --- 3. HELPER PARA RENDERIZAR FILAS (Row Renderer) ---
    // Esto renderiza una fila idéntica sea titular o acompañante
    const RenderRow = ({
        checkin,
        person,
        type,
        origin,
    }: {
        checkin: Checkin;
        person: Guest | undefined;
        type: 'TITULAR' | 'ACOMPAÑANTE';
        origin?: string | null;
    }) => {
        // Variable auxiliar para simplificar condiciones
        const isTitular = type === 'TITULAR';

        return (
            <tr
                className={`border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 ${!isTitular ? 'bg-gray-50/30' : ''}`}
            >
                {/* 1. Habitación (SOLO TITULAR) */}
                <td className="px-6 py-4">
                    {isTitular && (
                        <>
                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                <div className="rounded bg-green-100 p-1 text-green-600">
                                    <BedDouble className="h-4 w-4" />
                                </div>
                                {checkin.room?.number || 'S/N'}
                            </div>
                            <span className="ml-7 text-xs text-gray-500 uppercase">
                                {checkin.room?.room_type?.name}
                            </span>
                        </>
                    )}
                </td>

                {/* 2. Huésped (SIEMPRE VISIBLE) */}
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        {isTitular ? (
                            <UserIcon className="h-4 w-4 text-blue-500" />
                        ) : (
                            // Pequeña sangría visual para acompañantes
                            <div className="ml-4 flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                            </div>
                        )}
                        <span
                            className={`uppercase ${isTitular ? 'font-bold text-gray-800' : 'text-sm font-medium text-gray-600'}`}
                        >
                            {person?.full_name}
                        </span>
                    </div>
                    <div
                        className={`${isTitular ? 'ml-6' : 'ml-10'} flex flex-col`}
                    >
                        <span className="text-xs text-gray-500">
                            CI: {person?.identification_number || 'S/N'}
                        </span>
                        {isTitular && origin && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
                                <span>{origin}</span>
                            </div>
                        )}
                    </div>
                </td>

                {/* 3. Fechas (SOLO TITULAR) */}
                <td className="px-6 py-4">
                    {isTitular && (
                        <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1 text-green-700">
                                <LogIn className="h-3 w-3" />
                                {formatDate(checkin.check_in_date)}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-3 w-3" />
                                {checkin.duration_days} días
                            </div>
                        </div>
                    )}
                </td>

                {/* 4. Pago (SOLO TITULAR) */}
                <td className="px-6 py-4 font-mono font-medium text-green-700">
                    {isTitular && (
                        <>Bs. {Number(checkin.advance_payment).toFixed(2)}</>
                    )}
                </td>

                {/* 5. Acciones */}
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        {/* Botones Globales (Imprimir/Checkout) SOLO TITULAR */}
                        {isTitular && (
                            <>
                                <button
                                    onClick={() =>
                                        window.open(
                                            `/checks/${checkin.id}/receipt`,
                                            '_blank',
                                        )
                                    }
                                    className="text-gray-400 transition hover:text-purple-600"
                                    title="Imprimir Recibo"
                                >
                                    <Printer className="h-4 w-4" />
                                </button>

                                {!checkin.check_out_date && (
                                    <button
                                        onClick={() => handleCheckout(checkin)}
                                        title="Finalizar Estadía (Check-out)"
                                        className="text-green-600 transition hover:text-green-800"
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        )}

                        {/* Botón Editar (SIEMPRE VISIBLE) */}
                        <button
                            onClick={() => openEditModal(checkin, person?.id)}
                            className="text-gray-400 transition hover:text-blue-600"
                            title="Editar Huésped"
                        >
                            <Pencil className="h-4 w-4" />
                        </button>

                        {/* Botón Borrar Registro (SOLO ADMIN) */}
                        {isTitular && hasRole('administrador') && (
                            <button
                                onClick={() => openDeleteModal(checkin.id)}
                                className="text-gray-400 transition hover:text-red-600"
                                title="Eliminar Registro Completo"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Hospedajes" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Botón Volver */}
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div>
                    <h2 className="text-3xl font-bold text-white">
                        Recepción y Check-in
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {/* Header: Buscador y Botón Crear */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-72">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    placeholder="Buscar huésped, acompañante o habitación..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Ingreso</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">
                                            Habitación
                                        </th>
                                        <th className="px-6 py-4">Huésped</th>
                                        <th className="px-6 py-4">
                                            Entrada / Salida
                                        </th>
                                        <th className="px-6 py-4">Adelanto</th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                {/* Aquí empieza la magia: Múltiples TBODY */}
                                {filteredCheckins.length > 0 ? (
                                    filteredCheckins.map((checkin) => (
                                        <tbody
                                            key={checkin.id}
                                            className="border-b border-gray-200 hover:bg-gray-50/30"
                                        >
                                            {/* 1. Fila del Titular */}
                                            <RenderRow
                                                checkin={checkin}
                                                person={checkin.guest}
                                                type="TITULAR"
                                                origin={checkin.origin}
                                            />

                                            {/* 2. Filas de Acompañantes (si existen) */}
                                            {checkin.companions?.map(
                                                (companion) => (
                                                    <RenderRow
                                                        key={companion.id}
                                                        checkin={checkin}
                                                        person={companion}
                                                        type="ACOMPAÑANTE"
                                                    />
                                                ),
                                            )}
                                        </tbody>
                                    ))
                                ) : (
                                    <tbody>
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados.'
                                                    : 'No hay registros activos.'}
                                            </td>
                                        </tr>
                                    </tbody>
                                )}
                            </table>
                        </div>
                    </div>
                </div>

                {/* Modales */}
                <CheckinModal
                    show={isCheckinModalOpen}
                    onClose={() => setIsCheckinModalOpen(false)}
                    checkinToEdit={editingCheckin}
                    guests={Guests}
                    rooms={Rooms}
                    schedules={Schedules}
                    operators={Operators}
                    isReceptionView={false}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    checkinId={deletingCheckinId}
                />

                {checkoutTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                            <h3 className="mb-1 text-lg font-bold text-gray-800">
                                ¿Finalizar estadía?
                            </h3>
                            <p className="mb-4 text-sm text-gray-500">
                                Habitación{' '}
                                <strong>{checkoutTarget.room?.number}</strong>.
                                Selecciona quién está haciendo el checkout.
                            </p>

                            <OperatorSelector
                                operators={Operators}
                                value={checkoutOperatorId}
                                onChange={setCheckoutOperatorId}
                                compact
                                size="md"
                                label=""
                            />

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCheckoutTarget(null)}
                                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={
                                        !checkoutOperatorId ||
                                        checkoutProcessing
                                    }
                                    onClick={confirmCheckout}
                                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 disabled:opacity-50"
                                >
                                    {checkoutProcessing
                                        ? 'Procesando...'
                                        : 'Confirmar salida'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
