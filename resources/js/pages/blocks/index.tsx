import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Building2, Hash, MapPin, Pencil, Search, Trash2 } from 'lucide-react';

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

                    {/* Botón visual desactivado */}
                    <div className="group flex cursor-not-allowed items-center gap-2 rounded-xl bg-green-600/50 px-5 py-3 font-bold text-white/50 shadow-none">
                        <span>+ Nuevo Bloque</span>
                    </div>
                </div>

                {/* TABLA OSCURA */}
                <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-xl">
                    {/* Buscador */}
                    <div className="border-b border-gray-700 bg-gray-800/50 p-4">
                        <div className="relative max-w-md">
                            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full rounded-lg border border-gray-600 bg-gray-900 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-900/50 text-xs text-gray-200 uppercase">
                            <tr>
                                {/* --- 1. NUEVA COLUMNA ID --- */}
                                <th className="w-20 px-6 py-4">ID</th>
                                <th className="px-6 py-4">Código</th>
                                <th className="px-6 py-4">Descripción</th>
                                <th className="px-6 py-4 text-right">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {blocks.length > 0 ? (
                                blocks.map((block) => (
                                    <tr
                                        key={block.id}
                                        className="group transition duration-150 hover:bg-gray-700/50"
                                    >
                                        {/* --- 1. DATO ID --- */}
                                        <td className="px-6 py-7 font-mono text-base font-bold text-write-500">
                                            {block.id}
                                        </td>

                                        {/* DATO CÓDIGO */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                                                    <Hash className="h-4 w-4" />
                                                </div>
                                                <span className="text-base font-bold text-white">
                                                    {block.code}
                                                </span>
                                            </div>
                                        </td>

                                        {/* DATO DESCRIPCIÓN */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-400">
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
                                                    className="cursor-not-allowed p-2 text-gray-600"
                                                    disabled
                                                >
                                                    <Pencil className="h-5 w-5" />
                                                </button>
                                                <button
                                                    className="cursor-not-allowed p-2 text-gray-600"
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
