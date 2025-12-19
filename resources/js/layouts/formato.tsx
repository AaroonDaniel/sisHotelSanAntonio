// 1. Importas el Layout
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { User } from '@/layouts/AuthenticatedLayout';
interface Props {
  auth: {
    user: User;
  };
}
export default function MiNuevaPagina({ auth }: Props) {
    return (
        // 2. Envuelves todo con el Layout y le pasas el usuario
        <AuthenticatedLayout user={auth.user}>
            <Head title="Título de la Página" />
            
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* 3. Tu contenido va aquí */}
                <h1 className="text-white text-2xl">Hola mundo</h1>
            </div>
        </AuthenticatedLayout>
    );
}