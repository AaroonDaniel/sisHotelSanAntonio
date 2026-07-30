import { router } from '@inertiajs/react';
import { FaArrowLeft } from 'react-icons/fa';

interface BackButtonProps {
    to?: string;
    className?: string;
}

/**
 * Botón circular de "Volver", siempre al extremo derecho de la fila del
 * título de cada página (a la izquierda quedan el título y sus acciones).
 * Reemplaza el bloque duplicado que antes vivía suelto arriba del título
 * en cada página, con texto "Volver" + ícono de lucide-react.
 */
export default function BackButton({
    to = '/dashboard',
    className = '',
}: BackButtonProps) {
    return (
        <button
            type="button"
            onClick={() => router.visit(to)}
            title="Volver"
            className={`group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-300 transition-all hover:border-gray-500 hover:bg-gray-700 hover:text-white ${className}`}
        >
            <FaArrowLeft className="h-3.5 w-3.5" />
        </button>
    );
}
