import { useForm } from '@inertiajs/react';
import { AlertTriangle, LifeBuoy, WifiOff, X } from 'lucide-react';
import { FormEventHandler } from 'react';

interface EventCodeOption {
    value: number;
    label: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    orphanedCount: number;
    siatOnline: boolean;
    eventCodes: EventCodeOption[];
}

export default function RescueOrphansModal({
    isOpen,
    onClose,
    orphanedCount,
    siatOnline,
    eventCodes,
}: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        event_code: 1,
        description: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/contingencias/rescate-huerfanas', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <LifeBuoy className="h-5 w-5 text-amber-600" />
                        Crear Contingencia para Rescate
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 transition hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6">
                    {/* Resumen */}
                    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm text-amber-900">
                            Se vincularán <strong>{orphanedCount}</strong>{' '}
                            factura{orphanedCount === 1 ? '' : 's'} offline al
                            nuevo Evento Significativo. Describa el motivo real
                            (será enviado al SIAT al cerrar el evento).
                        </p>
                    </div>

                    {/* Aviso de conexión SIAT */}
                    {!siatOnline && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-50 p-4">
                            <WifiOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
                            <div className="text-sm text-orange-900">
                                <strong>No hay conexión con SIAT.</strong> Se
                                creará el evento localmente de todos modos para
                                rescatar las facturas. Cuando vuelva la
                                conexión, ciérrelo desde Contingencias para
                                registrarlo y enviar el paquete.
                            </div>
                        </div>
                    )}

                    {/* Tipo de evento */}
                    <div className="mb-4">
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            Tipo de Evento Significativo
                        </label>
                        <select
                            value={data.event_code}
                            onChange={(e) =>
                                setData('event_code', Number(e.target.value))
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        >
                            {eventCodes.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.value} — {c.label}
                                </option>
                            ))}
                        </select>
                        {errors.event_code && (
                            <p className="mt-1 text-xs text-red-600">
                                {errors.event_code}
                            </p>
                        )}
                    </div>

                    {/* Descripción */}
                    <div className="mb-5">
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            Descripción del caso{' '}
                            <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            rows={4}
                            placeholder="Ej.: El día 22/05 entre 14:00 y 16:30 hubo un corte de internet del ISP que impidió enviar las facturas al SIAT en tiempo real..."
                            className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                        {errors.description && (
                            <p className="mt-1 text-xs text-red-600">
                                {errors.description}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                            Mínimo 10 caracteres. Este texto se envía al SIAT.
                        </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? (
                                <>
                                    <AlertTriangle className="h-4 w-4 animate-pulse" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <LifeBuoy className="h-4 w-4" />
                                    Crear y Rescatar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}