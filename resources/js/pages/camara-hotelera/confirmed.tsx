import BackButton from '@/components/BackButton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Landmark, Search, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmedReportRow {
    id: number;
    numero_parte: string;
    report_date: string;
    guest_ids: number[];
    confirmed_by: string | null;
    confirmed_at: string | null;
}

interface Props {
    auth: { user: User };
    Reports: ConfirmedReportRow[];
}

const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

/**
 * "Ver Reportes de Cámara Hotelera de Potosí": SOLO los partes ya
 * confirmados (ver CamaraHoteleraController::confirmedIndex()) -- única
 * acción disponible es ver el PDF, nada de editar/anular/confirmar (eso
 * vive en /camara-hotelera, la pantalla de trabajo).
 */
export default function CamaraHoteleraConfirmed({ auth, Reports }: Props) {
    const [pdfPreviewReport, setPdfPreviewReport] =
        useState<ConfirmedReportRow | null>(null);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Reportes de Cámara Hotelera" />

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-write flex items-center gap-3 text-2xl font-bold">
                        <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                            <Landmark className="h-6 w-6" />
                        </div>
                        Reportes de Cámara Hotelera de Potosí
                    </h2>
                    <BackButton />
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Número
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Fecha
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Confirmado por
                                </TableHead>
                                <TableHead className="text-right text-xs font-bold text-gray-600 uppercase">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Reports.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="py-12 text-center text-sm text-gray-500"
                                    >
                                        <Landmark className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                                        Todavía no hay partes confirmados.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                Reports.map((r) => (
                                    <TableRow
                                        key={r.id}
                                        className="hover:bg-gray-50/60"
                                    >
                                        <TableCell className="font-bold text-gray-800">
                                            Nº {r.numero_parte}
                                        </TableCell>
                                        <TableCell className="text-gray-700">
                                            {formatDate(r.report_date)}
                                        </TableCell>
                                        <TableCell className="text-gray-700">
                                            {r.confirmed_by ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPdfPreviewReport(r)
                                                }
                                                className="group relative rounded-lg p-2 text-gray-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                                title="Ver Documento"
                                            >
                                                <Search className="h-4 w-4" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Portal a document.body: mismo motivo que en
                camara-hotelera/index.tsx (escapar del stacking context de
                <main> en AuthenticatedLayout, que tapa al topbar). */}
            {pdfPreviewReport &&
                createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={() => setPdfPreviewReport(null)}
                >
                    <div
                        className="flex h-[85vh] w-[92vw] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
                                <Landmark className="h-5 w-5" /> Parte Nº{' '}
                                {pdfPreviewReport.numero_parte} —{' '}
                                {formatDate(pdfPreviewReport.report_date)}
                            </h2>
                            <button
                                onClick={() => setPdfPreviewReport(null)}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden bg-gray-200/40 p-2">
                            <iframe
                                src={`/reports/generate-pdf?ids=${pdfPreviewReport.guest_ids.join(',')}&date=${pdfPreviewReport.report_date}&t=${Date.now()}`}
                                className="h-full w-full rounded border border-gray-300 bg-white"
                                title="Parte PDF"
                            />
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </AuthenticatedLayout>
    );
}
