import { router } from '@inertiajs/react';
import { Link2, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AvailableEvent {
    id: number;
    code_label: string;
    description: string;
    start_at: string;
    status: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: number | null;
    invoiceNumber: string | null;
}

export default function AttachToEventModal({
    isOpen,
    onClose,
    invoiceId,
    invoiceNumber,
}: Props) {
    const [events, setEvents] = useState<AvailableEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [attaching, setAttaching] = useState(false);

    // Carga la lista cada vez que se abre el modal
    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        setSelectedId(null);

        fetch('/contingencias/disponibles-para-acople', {
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((data) => setEvents(data.events ?? []))
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const handleAttach = () => {
        if (!invoiceId || !selectedId) return;

        setAttaching(true);
        router.post(
            `/contingencias/${selectedId}/acoplar-factura`,
            { invoice_id: invoiceId },
            {
                preserveScroll: true,
                onFinish: () => setAttaching(false),
                onSuccess: () => onClose(),
            },
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Link2 className="h-5 w-5 text-amber-600" />
                        Acoplar Factura #{invoiceNumber} a Contingencia
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 transition hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="mb-4 text-sm text-gray-600">
                        Seleccione la contingencia a la que desea vincular esta
                        factura. Solo se muestran eventos que todavía no fueron
                        registrados en SIAT.
                    </p>

                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Cargando contingencias...
                        </div>
                    ) : events.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                            No hay contingencias disponibles para acople.
                            Primero cree una usando el botón "Crear Evento para
                            Facturas Huérfanas".
                        </div>
                    ) : (
                        <div className="max-h-80 space-y-2 overflow-y-auto">
                            {events.map((ev) => (
                                <label
                                    key={ev.id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                                        selectedId === ev.id
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="event"
                                        checked={selectedId === ev.id}
                                        onChange={() => setSelectedId(ev.id)}
                                        className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-gray-900">
                                                #{ev.id} — {ev.code_label}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                                    ev.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                {ev.status}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                                            {ev.description}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-400">
                                            Inicio: {ev.start_at}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAttach}
                            disabled={!selectedId || attaching}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {attaching ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Acoplando...
                                </>
                            ) : (
                                <>
                                    <Link2 className="h-4 w-4" />
                                    Acoplar Factura
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}