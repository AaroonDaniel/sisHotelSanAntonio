import { CalendarClock } from 'lucide-react';

interface ActionModalProps {
    show: boolean;
    onClose: () => void;
    item: any; // Aquí recibimos la reserva (firstRes)
}

export default function ActionModal({ show, onClose, item }: ActionModalProps) {
    if (!show || !item) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    {/* Ícono central de advertencia/calendario */}
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <CalendarClock className="h-8 w-8" />
                    </div>
                    
                    <h3 className="mb-2 text-xl font-bold text-gray-800">
                        Reserva Anticipada
                    </h3>
                    
                    {/* El mensaje dinámico que antes estaba en el alert() */}
                    <p className="text-gray-800 leading-relaxed text-base">
                        Reserva de <span className="font-bold text-gray-800">{item.guest}</span> para el <span className="font-bold text-gray-800">{item.date}</span>. 
                        <br/>
                        Solo es asignable en esa fecha.
                    </p>
                    
                    {/* Único botón para cerrar */}
                    <div className="mt-8 flex justify-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto rounded-xl bg-amber-500 px-8 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-600 active:scale-95 transition"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}