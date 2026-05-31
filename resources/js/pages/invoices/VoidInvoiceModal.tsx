import { useForm } from '@inertiajs/react';
import { Ban, X, AlertTriangle } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: number | null;
    invoiceNumber: string | null;
}

export default function VoidInvoiceModal({ isOpen, onClose, invoiceId, invoiceNumber }: Props) {
    const { data, setData, post, processing, reset, errors } = useForm({
        void_reason_code: 1, // Por defecto: 1 = Factura mal emitida
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!invoiceId) return;

        // Enviamos la petición POST a la ruta que creamos en Laravel
        post(`/facturacion/${invoiceId}/anular`, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Ban className="w-5 h-5 text-red-500" />
                        Anular Factura #{invoiceNumber}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6">
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <p className="text-sm text-red-800">
                                <strong>Atención:</strong> Esta acción es irreversible. La factura será anulada en los servidores de Impuestos Nacionales (SIAT).
                            </p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Motivo de Anulación (Catálogo SIAT)
                        </label>
                        <select
                            value={data.void_reason_code}
                            onChange={(e) => setData('void_reason_code', Number(e.target.value))}
                            className="w-full rounded-xl border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                            disabled={processing}
                        >
                            <option value={1}>1 - Factura mal emitida</option>
                            <option value={2}>2 - Nota de Crédito-Débito mal emitida</option>
                            <option value={3}>3 - Datos de emisión incorrectos</option>
                            <option value={4}>4 - Factura devuelta (Cancelación de Huésped)</option>
                        </select>
                        {errors.void_reason_code && (
                            <p className="mt-2 text-sm text-red-600">{errors.void_reason_code}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                            disabled={processing}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Anulando en SIAT...' : 'Confirmar Anulación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}