import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    Eye,
    Pencil,
    Plus,
    Search,
    Trash2,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';

// Modales
import FinishMaintenanceModal from '@/components/finishMaintenanceModal';
import DeleteModal from './deleteModal';
import MaintenanceModal from './maintenanceModal';

export default function MaintenancesIndex({ auth, maintenances, rooms }: any) {
    // --- ESTADO PARA EL BUSCADOR ---
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de modales
    const [selectedRoomToFinish, setSelectedRoomToFinish] = useState<any>(null); // 👈 Ahora guarda la habitación
    const [modalData, setModalData] = useState<{ show: boolean; data: any }>({
        show: false,
        data: null,
    });
    const [deleteId, setDeleteId] = useState<number | null>(null);
    // --- LÓGICA DE FILTRADO ---
    // Filtra por el motivo del daño o por el número de habitación
    const filteredMaintenances = maintenances.data.filter(
        (m: any) =>
            m.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.room?.number.toString().includes(searchTerm),
    );

    const formatDate = (dateString: string) => {
        if (!dateString) return '---';
        return new Date(dateString).toLocaleString();
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Registro de Mantenimiento" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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

                {/* Título Principal */}
                <div>
                    <h2 className="flex items-center gap-3 text-3xl font-bold text-white">
                        <Wrench className="h-8 w-8 text-red-500" />
                        Registro de Mantenimiento
                    </h2>
                </div>

                <div className="py-8">
                    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
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
                                    placeholder="Buscar falla o habitación..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-red-500 focus:ring-red-500"
                                />
                            </div>

                            <button
                                onClick={() =>
                                    setModalData({ show: true, data: null })
                                }
                                className="group flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-red-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Reporte</span>
                            </button>
                        </div>

                        {/* Tabla */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">
                                            Habitación
                                        </th>
                                        <th className="px-6 py-4 font-bold">
                                            Falla / Motivo
                                        </th>
                                        <th className="px-6 py-4 font-bold">
                                            Fecha Reporte
                                        </th>
                                        <th className="px-6 py-4 font-bold">
                                            Estado
                                        </th>
                                        <th className="px-6 py-4 text-right font-bold">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredMaintenances.length > 0 ? (
                                        filteredMaintenances.map((m: any) => (
                                            <tr
                                                key={m.id}
                                                className={`transition-colors hover:bg-gray-50 ${!m.resolved_at ? 'bg-red-50/30' : ''}`}
                                            >
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    Hab. {m.room?.number}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-800">
                                                        {m.issue}
                                                    </p>
                                                    <p className="max-w-[200px] truncate text-xs text-gray-500">
                                                        {m.description ||
                                                            'Sin detalles'}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span className="block font-medium">
                                                        {formatDate(
                                                            m.created_at,
                                                        )}
                                                    </span>
                                                    <span className="block text-xs text-gray-400">
                                                        Por: {m.user?.name}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                            m.resolved_at
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'animate-pulse bg-red-100 text-red-800'
                                                        }`}
                                                    >
                                                        {m.resolved_at ? (
                                                            <CheckCircle className="h-3 w-3" />
                                                        ) : (
                                                            <AlertTriangle className="h-3 w-3" />
                                                        )}
                                                        {m.resolved_at
                                                            ? 'Reparado'
                                                            : 'En Mantenimiento'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        {/* Botón Ver Foto */}
                                                        {m.photo_path && (
                                                            <a
                                                                href={`/storage/${m.photo_path}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                title="Ver Evidencia"
                                                                className="text-gray-400 transition hover:text-blue-600"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </a>
                                                        )}

                                                        {/* Botón Finalizar (Solo si no está resuelto) */}
                                                        {!m.resolved_at && (
                                                            <button
                                                                onClick={() =>
                                                                    setSelectedRoomToFinish(
                                                                        m.room,
                                                                    )
                                                                }
                                                                title="Marcar como Solucionado"
                                                                className="text-gray-400 transition hover:text-green-600"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {/* Botón Editar */}
                                                        <button
                                                            onClick={() =>
                                                                setModalData({
                                                                    show: true,
                                                                    data: m,
                                                                })
                                                            }
                                                            title="Editar"
                                                            className="text-gray-400 transition hover:text-orange-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        {/* Botón Eliminar */}
                                                        <button
                                                            onClick={() =>
                                                                setDeleteId(
                                                                    m.id,
                                                                )
                                                            }
                                                            title="Eliminar"
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
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-gray-500"
                                            >
                                                {searchTerm
                                                    ? 'No se encontraron reportes con ese término.'
                                                    : 'No hay registros de mantenimiento aún.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Modales */}
                <MaintenanceModal
                    show={modalData.show}
                    onClose={() => setModalData({ show: false, data: null })}
                    maintenanceToEdit={modalData.data}
                    rooms={rooms}
                />

                <DeleteModal
                    show={deleteId !== null}
                    onClose={() => setDeleteId(null)}
                    maintenanceId={deleteId}
                />

                <FinishMaintenanceModal
                    show={!!selectedRoomToFinish}
                    onClose={() => setSelectedRoomToFinish(null)}
                    room={selectedRoomToFinish}
                />
            </div>
        </AuthenticatedLayout>
    );
}
