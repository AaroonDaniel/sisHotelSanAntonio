import BackButton from '@/components/BackButton';
import GuestSelectionGenerator, {
    Guest,
} from '@/components/GuestSelectionGenerator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    Calendar,
    CheckCircle2,
    Landmark,
    Pencil,
    Plus,
    Save,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface CamaraHoteleraReportRow {
    id: number;
    numero_parte: string;
    report_date: string;
    status: 'pendiente' | 'confirmado';
    guest_ids: number[];
    guest_count: number;
    created_by: string | null;
    confirmed_by: string | null;
    created_at: string | null;
}

interface Props {
    auth: { user: User };
    Reports: CamaraHoteleraReportRow[];
}

const statusBadge: Record<
    CamaraHoteleraReportRow['status'],
    { label: string; className: string }
> = {
    pendiente: {
        label: 'PENDIENTE',
        className: 'border-amber-300 bg-amber-100 text-amber-800',
    },
    confirmado: {
        label: 'CONFIRMADO',
        className: 'border-emerald-300 bg-emerald-100 text-emerald-800',
    },
};

const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

// Mismo correlativo determinístico que ReportController::numeroSerieForDate()
// -- solo para pintar el badge mientras se elige la fecha; el valor que
// realmente queda guardado lo calcula el backend al confirmar el POST/PUT.
const numeroSerieForDate = (dateStr: string) => {
    const baseDate = new Date(2026, 3, 18);
    const [y, m, d] = dateStr.split('-');
    const target = new Date(Number(y), Number(m) - 1, Number(d));
    const diffDays = Math.floor(
        (target.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return (6608 + diffDays).toString().padStart(6, '0');
};

type ModalState =
    | { kind: 'create' }
    | { kind: 'edit'; report: CamaraHoteleraReportRow }
    | null;

export default function CamaraHoteleraIndex({ auth, Reports }: Props) {
    const [modal, setModal] = useState<ModalState>(null);
    const [modalDate, setModalDate] = useState(
        new Date().toISOString().split('T')[0],
    );
    const [guests, setGuests] = useState<{
        entrantes: Guest[];
        quedantes: Guest[];
        salientes: Guest[];
    }>({ entrantes: [], quedantes: [], salientes: [] });
    const [loadingGuests, setLoadingGuests] = useState(false);
    const [pendingIds, setPendingIds] = useState<number[] | null>(null);
    const [savingModal, setSavingModal] = useState(false);
    const [pdfPreviewReport, setPdfPreviewReport] =
        useState<CamaraHoteleraReportRow | null>(null);
    const [voidTarget, setVoidTarget] =
        useState<CamaraHoteleraReportRow | null>(null);
    const [voiding, setVoiding] = useState(false);
    const [confirmTarget, setConfirmTarget] =
        useState<CamaraHoteleraReportRow | null>(null);
    const [confirmingStatus, setConfirmingStatus] = useState(false);

    // Carga Entrantes/Quedantes/Salientes de la fecha elegida por fetch
    // JSON (no navegación Inertia) -- así el modal se queda flotando sobre
    // esta pantalla en vez de saltar a /reports (ver
    // ReportController::guestsForDate()).
    useEffect(() => {
        if (!modal) return;
        setLoadingGuests(true);
        setPendingIds(modal.kind === 'edit' ? modal.report.guest_ids : null);
        fetch(`/reports/guests-for-date?date=${modalDate}`, {
            headers: { Accept: 'application/json' },
        })
            .then((res) => res.json())
            .then((data) =>
                setGuests({
                    entrantes: data.Entrantes ?? [],
                    quedantes: data.Quedantes ?? [],
                    salientes: data.Salientes ?? [],
                }),
            )
            .catch(() =>
                setGuests({ entrantes: [], quedantes: [], salientes: [] }),
            )
            .finally(() => setLoadingGuests(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modal, modalDate]);

    const openCreateModal = () => {
        setModalDate(new Date().toISOString().split('T')[0]);
        setModal({ kind: 'create' });
    };

    const openEditModal = (r: CamaraHoteleraReportRow) => {
        setModalDate(r.report_date);
        setModal({ kind: 'edit', report: r });
    };

    const closeModal = () => {
        setModal(null);
        setPendingIds(null);
    };

    const submitModal = () => {
        if (!pendingIds || pendingIds.length === 0 || !modal) return;
        setSavingModal(true);
        const payload = { report_date: modalDate, guest_ids: pendingIds };
        const options = {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onFinish: () => setSavingModal(false),
        };
        if (modal.kind === 'edit') {
            router.put(`/camara-hotelera/${modal.report.id}`, payload, options);
        } else {
            router.post('/camara-hotelera', payload, options);
        }
    };

    const confirmVoid = () => {
        if (!voidTarget) return;
        setVoiding(true);
        router.delete(`/camara-hotelera/${voidTarget.id}`, {
            preserveScroll: true,
            onFinish: () => {
                setVoiding(false);
                setVoidTarget(null);
            },
        });
    };

    const confirmGenerate = () => {
        if (!confirmTarget) return;
        setConfirmingStatus(true);
        router.patch(
            `/camara-hotelera/${confirmTarget.id}/confirm`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setConfirmingStatus(false);
                    setConfirmTarget(null);
                },
            },
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cámara Hotelera" />

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-write flex items-center gap-3 text-2xl font-bold">
                            <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                                <Landmark className="h-6 w-6" />
                            </div>
                            Cámara Hotelera Departamental de Potosí
                        </h2>
                        <Button
                            onClick={openCreateModal}
                            className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                        >
                            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                            <span>Agregar</span>
                        </Button>
                    </div>
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
                                    Estado
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
                                        Todavía no hay partes registrados.
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
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    statusBadge[r.status]
                                                        .className
                                                }
                                            >
                                                {statusBadge[r.status].label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPdfPreviewReport(r)
                                                    }
                                                    className="group relative rounded-lg p-2 text-gray-500 "
                                                    title="Ver Documento"
                                                >
                                                    <Search className="h-5 w-5" />
                                                </button>
                                                {r.status === 'pendiente' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setConfirmTarget(
                                                                    r,
                                                                )
                                                            }
                                                            className="group relative rounded-lg p-2 text-green-500"
                                                            title="Confirmar"
                                                        >
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    r,
                                                                )
                                                            }
                                                            className="group relative rounded-lg p-2 text-gray-500 "
                                                            title="Editar"
                                                        >
                                                            <Pencil className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setVoidTarget(r)
                                                            }
                                                            className="group relative rounded-lg p-2 text-gray-500 "
                                                            title="Anular"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* --- MODAL: AGREGAR / EDITAR PARTE (Generador reutilizado) ---
                Portal a document.body: AuthenticatedLayout renderiza
                {children} dentro de <main className="relative z-10">,
                que es SU PROPIO stacking context -- ningún z-index de acá
                adentro puede ganarle al <nav className="sticky z-50">
                del topbar (ver `main`/`nav` en AuthenticatedLayout.tsx).
                Sacar el modal al body con un portal lo pone en el
                stacking context raíz, donde z-[9999] sí gana. Mismo
                patrón que Reservationspopover.tsx. */}
            {modal &&
                createPortal(
                <div className="fixed inset-0 z-[9999] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
                    <div className="flex h-[85vh] w-full max-w-6xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-amber-100 p-1.5 text-amber-600">
                                        <Landmark className="h-5 w-5" />
                                    </div>
                                    {modal.kind === 'edit'
                                        ? 'Editar Parte — Cámara Hotelera'
                                        : 'Nuevo Parte — Cámara Hotelera'}
                                </h2>
                                <div className="flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5">
                                    <span className="text-sm font-black tracking-widest text-amber-700">
                                        Nº {numeroSerieForDate(modalDate)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 pr-3 shadow-sm">
                                    <Calendar className="ml-1 h-4 w-4 text-gray-500" />
                                    <input
                                        type="date"
                                        value={modalDate}
                                        onChange={(e) =>
                                            setModalDate(e.target.value)
                                        }
                                        max={
                                            new Date()
                                                .toISOString()
                                                .split('T')[0]
                                        }
                                        className="cursor-pointer border-none bg-transparent text-sm font-bold text-gray-800 focus:ring-0"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-6">
                            {loadingGuests ? (
                                <div className="flex items-center justify-center py-20 text-gray-400">
                                    Cargando huéspedes...
                                </div>
                            ) : (
                                <GuestSelectionGenerator
                                    key={
                                        modal.kind === 'edit'
                                            ? `edit-${modal.report.id}`
                                            : 'create'
                                    }
                                    entrantes={guests.entrantes}
                                    quedantes={guests.quedantes}
                                    salientes={guests.salientes}
                                    targetDate={modalDate}
                                    initialSelectedIds={
                                        modal.kind === 'edit'
                                            ? modal.report.guest_ids
                                            : undefined
                                    }
                                    onGenerated={(ids) => setPendingIds(ids)}
                                    footer={
                                        <button
                                            type="button"
                                            disabled={
                                                !pendingIds ||
                                                pendingIds.length === 0 ||
                                                savingModal
                                            }
                                            onClick={submitModal}
                                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                                        >
                                            <Save className="h-4 w-4" />
                                            {savingModal
                                                ? 'Guardando...'
                                                : 'Confirmar'}
                                        </button>
                                    }
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* --- MODAL: VER PDF --- (mismo portal, mismo motivo) */}
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

            {/* --- MODAL: ANULAR (confirmación, borra la fila) --- */}
            {voidTarget &&
                createPortal(
                <div className="fixed inset-0 z-[9999] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
                    <div className="flex w-full max-w-md animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-red-100 p-1.5 text-red-600">
                                    <Trash2 className="h-5 w-5" />
                                </div>
                               Anulación de Reporte
                            </h2>
                            <button
                                onClick={() => setVoidTarget(null)}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-2 p-6">
                            <p className="text-lg text-center text-gray-700 text-bold">
                                ¿Esta seguro de ANULAR el Reporte??
                            </p>
                            
                        </div>
                        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
                            <button
                                type="button"
                                onClick={() => setVoidTarget(null)}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={voiding}
                                onClick={confirmVoid}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {voiding ? 'Anulando...' : 'Sí, Anular'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* --- MODAL: CONFIRMAR (generar ante la Cámara) --- */}
            {confirmTarget &&
                createPortal(
                <div className="fixed inset-0 z-[9999] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
                    <div className="flex w-full max-w-md animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                Generar 
                            </h2>
                            <button
                                onClick={() => setConfirmTarget(null)}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-2 p-6">
                            <p className="text-lg text-center text-bold text-gray-700">
                                ¿Quiere generar el reporte para la Cámara
                                Hotelera de Potosí?
                            </p>
                            
                        </div>
                        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
                            <button
                                type="button"
                                onClick={() => setConfirmTarget(null)}
                                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={confirmingStatus}
                                onClick={confirmGenerate}
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {confirmingStatus
                                    ? 'Confirmando...'
                                    : 'Sí, generar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </AuthenticatedLayout>
    );
}
