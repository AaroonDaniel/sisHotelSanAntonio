import { Head, Link } from '@inertiajs/react';
import { ShieldX, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
    return (
        <>
            <Head title="Acceso denegado" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-center">
                <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-md">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                        <ShieldX className="h-10 w-10" />
                    </div>

                    <p className="text-sm font-bold tracking-widest text-red-400 uppercase">
                        Error 403
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-white">
                        Acceso denegado
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-gray-300">
                        No tienes permiso para acceder a esta sección. Si crees
                        que es un error, contacta con el administrador del
                        sistema.
                    </p>

                    <Link
                        href="/dashboard"
                        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500 active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a mi panel
                    </Link>
                </div>
            </div>
        </>
    );
}