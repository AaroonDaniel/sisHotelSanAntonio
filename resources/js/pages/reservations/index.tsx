import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    DollarSign,
    Filter,
    Pencil,
    Plus,
    Search,
    Trash2,
    User as UserIcon,
    XCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import ReservationModal, { Guest, Reservation, Room } from './reservationModal';

interface Props {
    auth: { user: User };
    Reservations: Reservation[];
    Guests: Guest[];
    Rooms: Room[];
}

// --- COLORES DE ESTADO (Solo aquí aplicamos el Violeta) ---
const statusStyles: Record<string, string> = {
    // Aquí está el cambio solicitado: Violeta solo para este estado
    pendiente: 'bg-violet-100 text-violet-700 border border-violet-200',
    confirmado: 'bg-green-100 text-green-700 border border-green-200',
    cancelado: 'bg-red-50 text-red-600 border border-red-100 opacity-70',
    finalizado: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const statusLabels: Record<string, string> = {
    pendiente: 'RESERVADO',
    confirmado: 'CONFIRMADO',
    cancelado: 'CANCELADO',
    finalizado: 'FINALIZADO',
};

export default function ReservationsIndex({ auth, Reservations, Guests, Rooms }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

    useEffect(() => {
        if (editingReservation) {
            const updated = Reservations.find(r => r.id === editingReservation.id);
            if (updated) setEditingReservation(updated);
        }
    }, [Reservations]);

    const filteredReservations = Reservations.filter((res) => {
        const guestName = res.guest?.full_name || '';
        const searchLower = searchTerm.toLowerCase();
        
        const matchesSearch = 
            guestName.toLowerCase().includes(searchLower) ||
            (res.guest?.identification_number && res.guest.identification_number.includes(searchLower)) ||
            res.id.toString().includes(searchLower);
        
        const matchesStatus = statusFilter 
            ? res.status.toLowerCase() === statusFilter.toLowerCase() 
            : true;

        return matchesSearch && matchesStatus;
    });

    const openCreateModal = () => {
        setEditingReservation(null);
        setIsReservationModalOpen(true);
    };

    const openEditModal = (reservation: Reservation) => {
        setEditingReservation(reservation);
        setIsReservationModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de cancelar y eliminar esta reserva? Las habitaciones quedarán libres.')) {
            router.delete(`/reservas/${id}`, { preserveScroll: true });
        }
    };

    const updateStatus = (reservation: Reservation, newStatus: string) => {
        if(confirm(`¿Cambiar estado a ${newStatus.toUpperCase()}?`)) {
            router.put(`/reservas/${reservation.id}`, { 
                status: newStatus 
            }, { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reservas" />
            
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <button onClick={() => window.history.back()} className="group mb-6 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver al Panel</span>
                </button>

                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Reservas</h2>
                        <p className="mt-1 text-sm text-gray-400">Gestiona las reservas futuras y retenidas.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        
                    {/* BARRA DE HERRAMIENTAS */}
                    <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-6 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:w-72">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nombre, CI o ID..."
                                className="block w-full rounded-xl border-gray-300 bg-white py-2.5 pl-10 text-sm focus:border-green-500 focus:ring-green-500"
                            />
                        </div>

                        <div className="relative w-full sm:w-48">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Filter className="h-4 w-4 text-gray-400" />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="block w-full rounded-xl border-gray-300 bg-white py-2.5 pl-10 text-sm focus:border-green-500 focus:ring-green-500"
                            >
                                <option value="">Todos los Estados</option>
                                <option value="pendiente">Reservados</option>
                                <option value="confirmado">Confirmados</option>
                                <option value="cancelado">Cancelados</option>
                            </select>
                        </div>

                        <button onClick={openCreateModal} className="group ml-auto flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95">
                            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                            <span>Nueva Reserva</span>
                        </button>
                    </div>

                    {/* TABLA DE DATOS */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">ID / Huésped</th>
                                    <th className="px-6 py-4">Fechas y Estadía</th>
                                    <th className="px-6 py-4">Habitaciones</th>
                                    <th className="px-6 py-4">Adelanto</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredReservations.length > 0 ? (
                                    filteredReservations.map((res) => (
                                        <tr key={res.id} className={`transition-colors hover:bg-gray-50 ${res.status === 'cancelado' ? 'bg-gray-50 opacity-60' : ''}`}>
                                            
                                            {/* Columna 1: Huésped (Diseño estándar Azul) */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                                                        {res.guest?.full_name?.charAt(0) || <UserIcon className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{res.guest?.full_name || 'Sin Nombre'}</div>
                                                        <div className="text-xs text-gray-500">
                                                            CI: {res.guest?.identification_number || 'S/N'}
                                                        </div>
                                                        <div className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 text-[10px] font-bold text-gray-500">
                                                            ID: #{res.id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Columna 2: Fechas (Diseño estándar Gris) */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Calendar className="h-4 w-4 text-gray-400" />
                                                        <span className="font-semibold">{res.arrival_date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{res.arrival_time} • {res.duration_days} Noche(s)</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Columna 3: Habitaciones */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {res.details && res.details.length > 0 ? (
                                                        res.details.map((d, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm">
                                                                <span className="text-[10px] font-bold text-gray-400">HAB</span>
                                                                <span className="text-sm font-bold text-gray-800">{d.room?.number || '?'}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs italic text-gray-400">Sin asignar</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Columna 4: Adelanto */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${res.advance_payment > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                        <DollarSign className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold ${res.advance_payment > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                                            {res.advance_payment} Bs
                                                        </span>
                                                        <span className="text-[10px] uppercase text-gray-400">{res.payment_type}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Columna 5: Estado (AQUÍ ESTÁ EL VIOLETA) */}
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold uppercase shadow-sm ${statusStyles[res.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {statusLabels[res.status] || res.status}
                                                </span>
                                            </td>

                                            {/* Columna 6: Acciones */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => openEditModal(res)}
                                                        className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    {res.status !== 'cancelado' && (
                                                        <button 
                                                            onClick={() => updateStatus(res, 'cancelado')}
                                                            className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-orange-50 hover:text-orange-600"
                                                            title="Cancelar"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <button 
                                                        onClick={() => handleDelete(res.id)}
                                                        className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <Calendar className="h-12 w-12 opacity-20" />
                                                <p className="mt-2 text-sm font-medium">No se encontraron reservas.</p>
                                                <p className="text-xs">Intenta cambiar los filtros o crea una nueva.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <ReservationModal
                    show={isReservationModalOpen}
                    onClose={() => setIsReservationModalOpen(false)}
                    reservationToEdit={editingReservation}
                    guests={Guests}
                    rooms={Rooms}
                />
            </div>
        </AuthenticatedLayout>
    );
}