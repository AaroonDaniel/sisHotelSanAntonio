import { Download, FileText, X } from 'lucide-react';

interface PdfPreviewModalProps {
    cashRegisterId: number | null;
    onClose: () => void;
}

export default function PdfPreviewModal({
    cashRegisterId,
    onClose,
}: PdfPreviewModalProps) {
    if (cashRegisterId === null) return null;

    const pdfUrl = `/admin/shift-reports/${cashRegisterId}/pdf`;

    return (
        <div className="fixed inset-0 z-[120] flex animate-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="flex w-full max-w-4xl animate-in flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900/95 shadow-2xl backdrop-blur-xl duration-200 zoom-in-95">
                {/* Cabecera oscura */}
                <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900/80 px-5 py-4">
                    <div className="flex items-center gap-2 text-gray-100">
                        <FileText className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-sm font-bold tracking-wide uppercase">
                            Reporte de Caja #{cashRegisterId}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-200 transition hover:bg-gray-700"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Abrir en pestaña
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-600 p-1.5 text-gray-300 transition hover:bg-gray-800 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Vista previa embebida */}
                <div className="bg-gray-950 p-4">
                    <iframe
                        src={pdfUrl}
                        title={`Reporte de Caja #${cashRegisterId}`}
                        className="h-[70vh] w-full rounded-xl border border-gray-700"
                    />
                </div>
            </div>
        </div>
    );
}
