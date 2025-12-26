import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Briefcase,
    CreditCard,
    MapPin,
    Pencil,
    Plus,
    Power,
    Search,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import DeleteModal from './deleteModal';
import GuestModal from './guestModal';

// --- 1. INTERFAZ DE DATOS (Coincide con tu BD) ---
interface Guest {
    id: number;
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

interface Props {
    auth: { user: User };
    Guests: Guest[];
}

export default function GuestsIndex({ auth, Guests }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Modales
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingGuestId, setDeletingGuestId] = useState<number | null>(null);

    // --- 2. FILTRO AVANZADO ---
    const filteredGuests = Guests.filter((guest) => {
        const term = searchTerm.toLowerCase();
        const fullName = `${guest.first_name} ${guest.last_name}`.toLowerCase();
        
        return (
            fullName.includes(term) ||
            guest.identification_number.includes(term) ||
            guest.nationality.toLowerCase().includes(term) ||
            guest.profession.toLowerCase().includes(term)
        );
    });


    // Funciones de apertura de modales
    const openCreateModal = () => {
        setEditingGuest(null);
        setIsGuestModalOpen(true);
    };

    const openEditModal = (guest: Guest) => {
        setEditingGuest(guest);
        setIsGuestModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingGuestId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Huéspedes" />
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
                        Lista de Huéspedes
                    </h2>
                </div>

                <div className="py-12">
                    <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        
                        {/* Header: Buscador y Botón */}
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-72">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre, CI..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Huésped</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Huésped</th>
                                        <th className="px-6 py-4">Documento</th>
                                        <th className="px-6 py-4">Origen</th>
                                        <th className="px-6 py-4">Edad / Civil</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredGuests.length > 0 ? (
                                        filteredGuests.map((guest) => (
                                            <tr
                                                key={guest.id}
                                                className={`transition-colors hover:bg-gray-50 'bg-gray-50 opacity-75' : ''}`}
                                            >
                                                {/* Columna: Nombre y Profesión */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                                            <UserIcon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">
                                                                {guest.first_name} {guest.last_name}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <Briefcase className="h-3 w-3" />
                                                                {guest.profession || 'Sin profesión'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Columna: Documento */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1 font-mono font-medium text-gray-900">
                                                            <CreditCard className="h-3 w-3 text-gray-400" />
                                                            {guest.identification_number}
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            Exp: {guest.issued_in}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Columna: Origen y Nacionalidad */}
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{guest.nationality}</span>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <MapPin className="h-3 w-3" />
                                                            {guest.origin}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Columna: Edad y Estado Civil */}
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">
                                                        {guest.age} años
                                                    </div>
                                                    <div className="text-xs text-gray-500 capitalize">
                                                        {guest.civil_status}
                                                    </div>
                                                </td>


                                                {/* Columna: Acciones */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(guest)}
                                                            className="text-gray-400 transition hover:text-blue-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(guest.id)}
                                                            className="text-gray-400 transition hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados.' : 'No hay huéspedes registrados.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* --- MODALES CONECTADOS --- */}
                <GuestModal
                    show={isGuestModalOpen}
                    onClose={() => setIsGuestModalOpen(false)}
                    GuestToEdit={editingGuest}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    // Asegúrate que tu DeleteModal acepte 'guestId' o 'id'
                    guestId={deletingGuestId} 
                />
            </div>
        </AuthenticatedLayout>
    );
}