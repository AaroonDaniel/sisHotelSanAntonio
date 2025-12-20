import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head ,Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Link as LinkIcon,
    MapPin,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';

// --- SOLUCIÓN ERROR ROUTE ---
//declare function route(name: string, params?: any, absolute?: boolean): string;
// ----------------------------

interface Block {
    id: number;
    code: string;
    description: string;
}

interface Props {
    auth: {
        user: User;
    };
    blocks: Block[];
}

export default function BlocksIndex({ auth, blocks }: Props) {
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Bloques" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => window.history.back()}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                {/* CABECERA */}
                <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-800 pb-6 sm:flex-row sm:items-end">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-gray-400">
                            <Building2 className="h-4 w-4" />
                            <span className="text-sm">/ Infraestructura</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white">
                            Bloques del Hotel
                        </h2>
                        <p className="mt-1 text-gray-400">
                            Listado de edificios y sectores registrados.
                        </p>
                    </div>
                </div>

                {/* TABLA BLANCA (LIGHT MODE) */}

                <div className="mx-auto w-fit overflow-visible rounded-2xl border border-gray-200 bg-white shadow-xl">
                    {/* Buscador */}
                    <div className="border-b border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-4">
                            {/* BUSCADOR */}
                            <input
                                type="text"
                                placeholder="Buscar bloque..."
                                className="w-72 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                            />

                            {/* BOTÓN NUEVO BLOQUE */}
                            <Link
                                href="/bloques/crear"
                                className="group flex shrink-0 items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nuevo Bloque</span>
                            </Link>
                        </div>
                    </div>

                    <table className="w-full text-left text-sm text-gray-600">
                        {/* Encabezado gris muy claro */}
                        <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                            <tr>
                                {/* --- 1. NUEVA COLUMNA ID --- */}
                                <th className="w-20 px-6 py-4 font-semibold">
                                    ID
                                </th>
                                <th className="px-6 py-4 font-semibold">
                                    Código
                                </th>
                                <th className="px-6 py-4 font-semibold">
                                    Descripción
                                </th>
                                <th className="px-6 py-4 text-right font-semibold">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {blocks.length > 0 ? (
                                blocks.map((block) => (
                                    <tr
                                        key={block.id}
                                        className="group transition duration-150 hover:bg-gray-50"
                                    >
                                        {/* --- 1. DATO ID --- */}
                                        <td className="px-6 py-7 font-mono text-base font-bold text-gray-900">
                                            {block.id}
                                        </td>

                                        {/* DATO CÓDIGO */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-base font-bold text-gray-900">
                                                    {block.code}
                                                </span>
                                            </div>
                                        </td>

                                        {/* DATO DESCRIPCIÓN */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <MapPin className="h-4 w-4 opacity-50" />
                                                <span>
                                                    {block.description ||
                                                        'Sin descripción'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* ACCIONES (Visuales) */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="cursor-not-allowed p-2 text-gray-400 hover:text-blue-600"
                                                    disabled
                                                >
                                                    <Pencil className="h-5 w-5" />
                                                </button>
                                                <button
                                                    className="cursor-not-allowed p-2 text-gray-400 hover:text-red-600"
                                                    disabled
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        No hay bloques registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
