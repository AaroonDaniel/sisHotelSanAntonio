import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft, // Ícono para "Aplicar"
    CheckCircle2, // Ícono para "Aplicado"
    Pencil,
    Play,
    Plus,
    Power,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import DeleteModal from './deleteModal';
import ScheduleModal from './scheduleModal';

// Interfaz adaptada a Schedule
interface Schedule {
    id: number;
    name: string;
    check_in_time: string;
    check_out_time: string;
    entry_tolerance_minutes: number;
    exit_tolerance_minutes: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    auth: {
        user: User;
    };
    Schedules: Schedule[];
}

export default function SchedulesIndex({ auth, Schedules }: Props) {
    // --- 1. ESTADO PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para los modales
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(
        null,
    );
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(
        null,
    );

    // --- NUEVO: ESTADO DEL HORARIO APLICADO ---
    const [appliedScheduleId, setAppliedScheduleId] = useState<number | null>(
        null,
    );

    // Al cargar la página, verificamos si hay un horario "Aplicado" (Guardado en LocalStorage)
    useEffect(() => {
        const storedSchedule = localStorage.getItem('hotel_active_schedule');
        if (storedSchedule) {
            try {
                const parsed = JSON.parse(storedSchedule);
                setAppliedScheduleId(parsed.id);
            } catch (e) {
                console.error('Error leyendo horario activo', e);
            }
        }
    }, []);

    // --- 2. LÓGICA DE FILTRADO ---
    const filteredSchedules = Schedules.filter((schedule) =>
        schedule.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // --- 3. FUNCIÓN PARA CAMBIAR ESTADO ---
    const toggleStatus = (schedule: Schedule) => {
        router.patch(
            `/horarios/${schedule.id}/toggle`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    // --- 4. NUEVO: FUNCIÓN APLICAR HORARIO ---
    // Esta función "manda la señal" guardando los datos para que el Modal de Asignación los lea
    const applySchedule = (schedule: Schedule) => {
        // Guardamos todo el objeto schedule para tener las tolerancias disponibles
        localStorage.setItem('hotel_active_schedule', JSON.stringify(schedule));
        setAppliedScheduleId(schedule.id);

        // Opcional: Feedback visual o redirección
        // alert(`Horario "${schedule.name}" aplicado correctamente para futuras asignaciones.`);
    };

    // Funciones Helper
    const openCreateModal = () => {
        setEditingSchedule(null);
        setIsScheduleModalOpen(true);
    };

    const openEditModal = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setIsScheduleModalOpen(true);
    };

    const openDeleteModal = (id: number) => {
        setDeletingScheduleId(id);
        setIsDeleteModalOpen(true);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Horarios" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* --- BOTÓN VOLVER --- */}
                <button
                    onClick={() => window.history.back()}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                {/* --- TÍTULO PRINCIPAL --- */}
                <div>
                    <h2 className="text-3xl font-bold text-white">
                        Lista de Horarios
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                        Selecciona y "Aplica" un horario para activar las
                        tolerancias automáticas en Recepción.
                    </p>
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
                                    placeholder="Buscar horario..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>

                            <button
                                onClick={openCreateModal}
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Horario</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        {/* Columna nueva para indicar activo */}
                                        <th className="px-4 py-4 text-center">
                                            Uso
                                        </th>
                                        <th className="px-6 py-4">
                                            Nombre Turno
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            Entrada
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            Salida
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            Tolerancias (E/S)
                                        </th>
                                        <th className="px-6 py-4 text-center">
                                            Estado
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredSchedules.length > 0 ? (
                                        filteredSchedules.map((schedule) => {
                                            const isApplied =
                                                appliedScheduleId ===
                                                schedule.id;

                                            return (
                                                <tr
                                                    key={schedule.id}
                                                    className={`transition-colors hover:bg-gray-50 ${!schedule.is_active ? 'bg-gray-50 opacity-75' : ''} ${isApplied ? 'bg-indigo-50 hover:bg-indigo-100' : ''}`}
                                                >
                                                    {/* Botón Aplicar */}
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            onClick={() =>
                                                                applySchedule(
                                                                    schedule,
                                                                )
                                                            }
                                                            disabled={
                                                                !schedule.is_active
                                                            }
                                                            title={
                                                                isApplied
                                                                    ? 'Horario actualmente en uso'
                                                                    : 'Aplicar este horario para asignaciones'
                                                            }
                                                            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                                                                isApplied
                                                                    ? 'cursor-default bg-indigo-600 text-white shadow-md'
                                                                    : 'border border-gray-300 bg-white text-gray-400 hover:border-indigo-500 hover:text-indigo-600'
                                                            }`}
                                                        >
                                                            {isApplied ? (
                                                                <CheckCircle2 className="h-5 w-5" />
                                                            ) : (
                                                                <Play className="ml-0.5 h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </td>

                                                    {/* Nombre */}
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {schedule.name}
                                                        {isApplied && (
                                                            <span className="ml-2 text-xs font-normal text-indigo-600">
                                                                (En uso)
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Hora Entrada */}
                                                    <td className="px-6 py-4 text-center font-mono font-medium text-gray-700">
                                                        {schedule.check_in_time.substring(
                                                            0,
                                                            5,
                                                        )}
                                                    </td>

                                                    {/* Hora Salida */}
                                                    <td className="px-6 py-4 text-center font-mono font-medium text-gray-700">
                                                        {schedule.check_out_time.substring(
                                                            0,
                                                            5,
                                                        )}
                                                    </td>

                                                    {/* Tolerancias */}
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
                                                                -
                                                                {
                                                                    schedule.entry_tolerance_minutes
                                                                }
                                                                m
                                                            </span>
                                                            <span className="text-gray-300">
                                                                /
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-700/10 ring-inset">
                                                                +
                                                                {
                                                                    schedule.exit_tolerance_minutes
                                                                }
                                                                m
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Estado Badge */}
                                                    <td className="px-6 py-4 text-center">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                                schedule.is_active
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}
                                                        >
                                                            {schedule.is_active
                                                                ? 'Activo'
                                                                : 'Inactivo'}
                                                        </span>
                                                    </td>

                                                    {/* Acciones */}
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    toggleStatus(
                                                                        schedule,
                                                                    )
                                                                }
                                                                title={
                                                                    schedule.is_active
                                                                        ? 'Desactivar'
                                                                        : 'Activar'
                                                                }
                                                                className={`transition ${
                                                                    schedule.is_active
                                                                        ? 'text-green-600 hover:text-green-800'
                                                                        : 'text-gray-400 hover:text-gray-600'
                                                                }`}
                                                            >
                                                                <Power className="h-4 w-4" />
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        schedule,
                                                                    )
                                                                }
                                                                className="text-gray-400 transition hover:text-blue-600"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>

                                                            <button
                                                                onClick={() =>
                                                                    openDeleteModal(
                                                                        schedule.id,
                                                                    )
                                                                }
                                                                className="text-gray-400 transition hover:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron resultados.'
                                                    : 'No hay horarios registrados aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Modales */}
                <ScheduleModal
                    show={isScheduleModalOpen}
                    onClose={() => setIsScheduleModalOpen(false)}
                    ScheduleToEdit={editingSchedule}
                />

                <DeleteModal
                    show={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    scheduleId={deletingScheduleId}
                />
            </div>
        </AuthenticatedLayout>
    );
}
