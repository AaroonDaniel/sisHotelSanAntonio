import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
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
import { useState } from 'react';
import CheckinModal from './checkinModal';
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
    check_out_date?: string | null;
    duration_days: number;
    advance_payment: number;
    notes?: string;
    guest?: Guest;
    room?: Room;
    companions?: Guest[]; // Aseguramos que use la interfaz Guest
}

interface Props {
    auth: { user: User };
    Checkins: Checkin[];
    Guests: Guest[];
    Rooms: Room[];
    Schedules: any[]; 
}

export interface CheckinData {
    id: number;
    guest_id: number;
    room_id: number;
    check_in_date: string;
    duration_days: number;
    advance_payment: number;
    notes?: string;
    services?: string[];
    guest?: Guest;
    
    // --- CAMBIO CLAVE AQUÍ ---
    // Cambia esto:
    // companions?: CompanionData[]; 
    
    // Por esto:
    companions?: any[]; 
}


export default function CheckinsIndex({
    auth,
    Checkins,
    Guests,
    Rooms,
    Schedules,
}: Props) {
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
        if (
            confirm(
                `¿Finalizar la estadía de la habitación ${checkin.room?.number}?`,
            )
        ) {
            router.patch(
                `/checks/${checkin.id}/checkout`,
                {},
                { preserveScroll: true },
            );
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

    // --- 3. HELPER PARA RENDERIZAR FILAS (Row Renderer) ---
    // Esto renderiza una fila idéntica sea titular o acompañante
    const RenderRow = ({
        checkin,
        person,
        type,
    }: {
        checkin: Checkin;
        person: Guest | undefined;
        type: 'TITULAR' | 'ACOMPAÑANTE';
    }) => {
        // Variable auxiliar para simplificar condiciones
        const isTitular = type === 'TITULAR';

        return (
            <tr className={`border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 ${!isTitular ? 'bg-gray-50/30' : ''}`}>
                
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
                        <span className={`uppercase ${isTitular ? 'font-bold text-gray-800' : 'text-sm font-medium text-gray-600'}`}>
                            {person?.full_name}
                        </span>
                    </div>
                    <div className={`${isTitular ? 'ml-6' : 'ml-10'} flex flex-col`}>
                        <span className="text-xs text-gray-500">
                            CI: {person?.identification_number || 'S/N'}
                        </span>
                        
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

                        {/* Botón Borrar Registro (SOLO TITULAR) */}
                        {isTitular && (
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
                    onClick={() => window.history.back()}
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
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    checkinId={deletingCheckinId}
                />
            </div>
        </AuthenticatedLayout>
    );
}
