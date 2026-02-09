import { AlertTriangle, ArrowRightLeft, CheckCircle2, X, Users } from 'lucide-react';

interface Props {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    type: 'individual' | 'group';
    guestName: string;
    targetRoomNumber: string;
    processing: boolean;
}

export default function ConfirmTransferModal({ 
    show, 
    onClose, 
    onConfirm, 
    type, 
    guestName, 
    targetRoomNumber,
    processing 
}: Props) {
    if (!show) return null;

    const isMerge = type === 'group';

    return (
        <div className="fixed inset-0 z-[80] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in zoom-in-95">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                
                {/* HEADER CON COLOR DINÁMICO */}
                <div className={`flex items-center justify-between px-6 py-4 text-white ${isMerge ? 'bg-red-600' : 'bg-red-600'}`}>
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                        {isMerge ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                        {isMerge ? 'Confirmar Fusión' : 'Confirmar Transferencia'}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-white/20">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* CONTENIDO DEL MENSAJE */}
                <div className="p-6">
                    <div className="mb-4 text-center">
                        <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${isMerge ? 'bg-blue-100 text-red-600' : 'bg-indigo-100 text-gray-900'}`}>
                            {isMerge ? <Users className="h-8 w-8" /> : <ArrowRightLeft className="h-8 w-8" />}
                        </div>
                        
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Vas a mover a
                        </p>
                        <h4 className="text-xl font-bold text-gray-800">
                            {guestName}
                        </h4>
                        <p className="mt-1 text-sm font-bold text-gray-400">
                             ➔ A la Habitación {targetRoomNumber}
                        </p>
                    </div>

                    {/* ALERTA DE CONSECUENCIAS */}
                    <div className={`rounded-xl border p-4 text-xs ${isMerge ? 'border-blue-100 bg-blue-50 text-gray-900' : 'border-blue-200 bg-blue-50 text-gray-900'}`}>
                        <p className="font-bold mb-1 uppercase">Consecuencias:</p>
                        <ul className="list-disc pl-4 space-y-1 opacity-90">
                            <li>La habitación actual pasará a estado <b>LIMPIEZA</b>.</li>
                            {isMerge ? (
                                <>
                                    <li>Se <b>CERRARÁ</b> la cuenta individual de este huésped.</li>
                                    <li>Se unirá como <b>Acompañante</b> a la cuenta de la Hab. {targetRoomNumber}.</li>
                                    <li>El cobro lo asumirá el titular de la nueva habitación.</li>
                                </>
                            ) : (
                                <>
                                    <li>Se mantendrá la cuenta y fecha de ingreso original.</li>
                                    <li>El costo diario se actualizará a la tarifa de la nueva habitación.</li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* BOTONES */}
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={processing}
                            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={processing}
                            className={`flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50 ${isMerge ? 'bg-red-600 hover:bg-red-500' : 'bg-red-600 hover:bg-red-500'}`}
                        >
                            {processing ? 'Procesando...' : 'Sí, Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}