import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

// Se dispara desde app.tsx cuando Inertia recibe una respuesta 401/419,
// típicamente porque la sesión expiró por inactividad. Bloquea toda la
// pantalla: la única salida es "De acuerdo", que manda al login.
export default function SessionExpiredModal() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = () => setVisible(true);
        window.addEventListener('session-expired', handler);
        return () => window.removeEventListener('session-expired', handler);
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        Sesión finalizada por inactividad
                    </h3>
                    <p className="text-base leading-relaxed text-gray-600">
                        Ha estado inactivo durante demasiado tiempo. Por
                        seguridad, debe volver a loguearse para continuar.
                    </p>
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={() => {
                                window.location.href = '/login';
                            }}
                            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95"
                        >
                            De acuerdo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
