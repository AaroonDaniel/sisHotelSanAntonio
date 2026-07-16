import { FileText, X } from 'lucide-react';
import { useMemo } from 'react';

interface ShiftPreviewModalProps {
    /** Caja puntual a previsualizar (panel gerencial: ya se sabe cuál). */
    cashRegisterId?: number | null;
    /**
     * URL ya armada (flujo del recepcionista en status.tsx: turno propio en
     * curso, filtrado por operador + rango de fechas, no por un
     * cash_register_id puntual). Si se pasa, tiene prioridad sobre
     * `cashRegisterId`.
     */
    url?: string | null;
    onClose: () => void;
}

/**
 * Modal único de "Reporte de Cobros": mismo componente que usa el
 * recepcionista en rooms/status.tsx ("Lista de Cobros") y el panel
 * gerencial de cajas (admin/shift-reports) — por decisión de negocio, no
 * hay una vista ni un PDF distintos para administración. Ambos reutilizan
 * el endpoint existente `/reports/financial/pdf`.
 */
export default function ShiftPreviewModal({
    cashRegisterId,
    url,
    onClose,
}: ShiftPreviewModalProps) {
    const isOpen = !!url || (cashRegisterId !== null && cashRegisterId !== undefined);

    // El cache-bust (`t=`) debe fijarse UNA sola vez por apertura, no en
    // cada render — si se recalculara con Date.now() en el cuerpo del
    // componente, el iframe recargaría el PDF en cada re-render ajeno.
    const src = useMemo(() => {
        if (url) return url;
        if (cashRegisterId !== null && cashRegisterId !== undefined) {
            return `/reports/financial/pdf?cash_register_id=${cashRegisterId}&t=${Date.now()}`;
        }
        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, cashRegisterId]);

    if (!isOpen || !src) return null;

    return (
        <div className="fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="flex h-[85vh] w-full max-w-4xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                            <FileText className="h-5 w-5" />
                        </div>
                        Caja (Informativo)
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Visor PDF */}
                <div className="flex-1 bg-gray-300/50 p-2">
                    <iframe
                        src={src}
                        className="h-full w-full rounded border border-gray-300 bg-white shadow-inner"
                        title="Vista Previa PDF"
                    />
                </div>

                {/* Footer de Acciones */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
