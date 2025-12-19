import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    Building2,  // Para Bloques
    Layers,     // Para Pisos
    Tags,       // Para Precios
    BedDouble,  // Para Habitaciones
    PlusCircle, // Icono de Añadir
    ArrowRight,
    ArrowLeft,
    LayoutDashboard
} from 'lucide-react';

interface Props {
    auth: { user: User };
}

export default function RoomsMenu({ auth }: Props) {
    
    // Configuración de las opciones de este menú
    const roomModules = [
        {
            title: 'Infraestructura',
            items: [
                { 
                    name: 'Bloques', 
                    description: 'Gestionar edificios y sectores',
                    icon: Building2, 
                    url: '/bloques',
                    color: 'text-blue-500'
                },
                { 
                    name: 'Pisos', 
                    description: 'Niveles y plantas del hotel',
                    icon: Layers, 
                    url: '/pisos',
                    color: 'text-purple-500' 
                },
            ]
        },
        {
            title: 'Gestión Comercial',
            items: [
                { 
                    name: 'Precios y Tarifas', 
                    description: 'Configurar costos por tipo',
                    icon: Tags, 
                    url: '/precios',
                    color: 'text-green-500'
                },
                { 
                    name: 'Inventario Habitaciones', 
                    description: 'Ver listado completo',
                    icon: BedDouble, 
                    url: '/habitaciones', // La tabla que hicimos antes
                    color: 'text-red-500'
                },
            ]
        }
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Gestión de Habitaciones" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                <button 
                    onClick={() => window.history.back()} 
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 border border-gray-700 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>
                
                {/* --- CABECERA CON BOTÓN VERDE --- */}
                <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-800 pb-6 sm:flex-row sm:items-end">
                    <div>
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <LayoutDashboard className="h-4 w-4" />
                            <span className="text-sm">/ Gestión de Habitaciones</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white">
                            Configuración de Alojamiento
                        </h2>
                        <p className="mt-1 text-gray-400">
                            Administra la estructura, precios y unidades del hotel.
                        </p>
                    </div>

                    {/* BOTÓN VERDE "AÑADIR HABITACIÓN" */}
                    <button
                        onClick={() => router.visit('/habitaciones/crear')}
                        className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white shadow-lg shadow-green-900/40 transition-all hover:scale-105 hover:bg-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        <PlusCircle className="h-5 w-5 transition-transform group-hover:rotate-90" />
                        Añadir Habitación
                    </button>
                </div>

                {/* --- GRID DE OPCIONES (Estilo Dashboard) --- */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {roomModules.map((section, index) => (
                        <div key={index} className="flex flex-col gap-4">
                            <h3 className="text-sm font-semibold tracking-wider text-gray-500 uppercase ml-1">
                                {section.title}
                            </h3>
                            
                            <div className="grid gap-4">
                                {section.items.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => router.visit(item.url)}
                                        className="group relative flex w-full items-center justify-between rounded-xl border border-gray-700 bg-gray-800 p-5 text-left shadow-lg transition-all duration-200 hover:border-gray-500 hover:bg-gray-750 hover:shadow-xl"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Icono con fondo oscuro suave */}
                                            <div className="rounded-lg bg-gray-900 p-3 border border-gray-700 group-hover:border-gray-600 transition-colors">
                                                <item.icon className={`h-6 w-6 ${item.color}`} />
                                            </div>
                                            
                                            <div>
                                                <span className="block text-lg font-bold text-gray-100 group-hover:text-white">
                                                    {item.name}
                                                </span>
                                                <span className="text-sm text-gray-500 group-hover:text-gray-400">
                                                    {item.description}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="rounded-full bg-gray-900 p-2 text-gray-500 transition-colors group-hover:text-white">
                                            <ArrowRight className="h-5 w-5" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}