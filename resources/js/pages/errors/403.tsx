import { Head, Link } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react'; // Asegúrate de tener lucide-react instalado, o cambia el icono

export default function Error403() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <Head title="Acceso Denegado" />
            
            <div className="text-center">
                <div className="flex justify-center mb-6">
                    <ShieldAlert className="w-24 h-24 text-red-500" strokeWidth={1.5} />
                </div>
                
                <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">403</h1>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    Acceso Denegado
                </h2>
                
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto text-lg">
                    No tienes permisos para acceder a esta sección. Contacta al Administrador.
                </p>
                
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                >
                    Volver al Inicio
                </Link>
            </div>
        </div>
    );
}