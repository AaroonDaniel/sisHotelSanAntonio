import { Ban, CheckCircle2, X } from 'lucide-react';

interface ToleranceModalProps {
    show: boolean;
    onClose: () => void;
    type: 'allowed' | 'denied'; // 'allowed' = Verde (Éxito), 'denied' = Rojo (Error)
    data: {
        time: string;    // La hora oficial (Ej: 06:00 o 13:00)
        minutes: number; // Los minutos de tolerancia (Ej: 350 o 40)
        action: 'entry' | 'exit'; // Para personalizar el mensaje
        limitTime?: string;
    };
}

export default function ToleranceModal({ show, onClose, type, data }: ToleranceModalProps) {
    if (!show) return null;

    // Mensajes personalizados según Entrada o Salida
    const isEntry = data.action === 'entry';
    
    const config = {
        allowed: {
            colorBg: 'bg-emerald-100',
            colorText: 'text-emerald-600',
            btnColor: 'bg-emerald-600 hover:bg-emerald-500',
            icon: <CheckCircle2 className="h-8 w-8" />,
            title: '¡Tolerancia Permitida!',
            // Mensaje dinámico: Si es entrada dice "ajustará hora", si es salida dice "no se cobrará extra"
            message: isEntry
                ? `La hora está dentro del rango. Se ajustará el ingreso a las ${data.time} para evitar cobros erróneos.`
                : `Estás dentro del tiempo de tolerancia. No se cobrará penalización por salir antes de las ${data.limitTime || data.time}.`
        },
        denied: {
            colorBg: 'bg-red-100',
            colorText: 'text-red-600',
            btnColor: 'bg-red-600 hover:bg-red-500',
            icon: <Ban className="h-8 w-8" />,
            title: 'Fuera de Intervalo',
            message: `No es posible aplicar la tolerancia. La hora actual excede el límite de ${data.minutes} minutos permitidos.`
        }
    };

    const current = config[type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95">
                <div className="absolute top-3 right-3">
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 text-center">
                    <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${current.colorBg} ${current.colorText}`}>
                        {current.icon}
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-gray-900">{current.title}</h3>
                    <p className="mb-6 text-sm text-gray-500 leading-relaxed">
                        {current.message}
                    </p>
                    <button
                        onClick={onClose}
                        className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition active:scale-95 ${current.btnColor}`}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}