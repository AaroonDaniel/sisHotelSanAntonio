import CloseRegisterModal from '@/components/CloseRegisterModal';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    Banknote,
    Calendar,
    Eye,
    FileSpreadsheet,
    FileText,
    History,
    Layers,
    Loader2,
    LogOut,
    Printer,
    QrCode,
    User as UserIcon,
    X,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

/* ===================== TIPOS ===================== */

interface OperatorOption extends User {
    // ISO 8601, o null si el operador no tiene un turno ABIERTO ahora mismo.
    active_shift_opened_at: string | null;
}

interface HistoryShiftRow {
    id: number;
    operator_name: string;
    opened_at: string | null;
    closed_at: string | null;
}

interface Props {
    auth: {
        user: User;
        active_register?: any;
    };
    users?: OperatorOption[];
    Filters?: {
        start_date?: string;
        end_date?: string;
        user_id?: string | null;
    };
    CanViewAll?: boolean;
    HasMovements?: boolean;
}

/* ===================== HELPERS ===================== */
const formatDateTime = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

export default function FinancialReport({
    auth,
    users = [],
    Filters,
    CanViewAll = false,
    HasMovements = false,
}: Props) {
    // Modal de Cierre de Caja
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Historial de Turnos: modal con TODOS los turnos ya cerrados. Se
    // carga bajo demanda (no en cada visita a la pantalla) para no jalar
    // todo el histórico en cada carga de Cierre de Caja.
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyShifts, setHistoryShifts] = useState<HistoryShiftRow[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    // true cuando el PDF que se está mostrando viene del historial (por
    // cash_register_id), no del formulario de arriba: oculta el botón
    // "Cerrar Caja" (ese turno ya está cerrado) y ajusta el título.
    const [isHistoryPreview, setIsHistoryPreview] = useState(false);

    const openHistoryModal = () => {
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        axios
            .get('/reports/financial/history')
            .then((res) => setHistoryShifts(res.data.Shifts ?? []))
            .catch(() => setHistoryShifts([]))
            .finally(() => setLoadingHistory(false));
    };

    const viewHistoryShiftPdf = (shiftId: number) => {
        setIsHistoryModalOpen(false);
        setIsHistoryPreview(true);
        setFormato('pdf');
        setPdfUrl(
            `/reports/financial/pdf?cash_register_id=${shiftId}&record_type=ambos`,
        );
    };

    // Estados del formulario. En blanco hasta que se elija un operador
    // puntual (ver handleUserChange): ya no hay "hoy" por defecto, las
    // fechas se derivan siempre del turno real, nunca de un valor
    // adivinado.
    const [fechaInicio, setFechaInicio] = useState(Filters?.start_date || '');
    const [fechaFin, setFechaFin] = useState(Filters?.end_date || '');
    const [userId, setUserId] = useState(Filters?.user_id || '');

    // Con un operador puntual seleccionado, las fechas se autocompletan
    // desde su turno real y quedan bloqueadas (candado anti-trampa): no se
    // pueden escribir a mano. Solo con "Todos" (vista agregada, sin un
    // turno único del cual derivar nada) se habilitan para elegir un rango
    // manualmente, como ya funcionaba antes.
    const fechasBloqueadas = !!userId && userId !== 'todos';

    const [tipoRegistro, setTipoRegistro] = useState<
        'efectivo' | 'bancos' | 'ambos'
    >('ambos');
    const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf');

    // Estados de UI
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // La respuesta HasMovements/Filters del backend corresponde a la
    // consulta que ya se disparó (Filters.user_id). Si el operador
    // seleccionado en el <select> todavía no coincide con eso, los datos en
    // pantalla son de otra selección (o del estado inicial) y no hay que
    // mostrar la alerta de "turno vacío" todavía.
    const consultaAlDia = !!userId && Filters?.user_id === userId;
    const turnoVacio = consultaAlDia && userId !== 'todos' && !HasMovements;

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFin('');
        setUserId('');
        setTipoRegistro('ambos');
        setFormato('pdf');
    };

    /* Carga las transacciones en pantalla (Inertia recarga financialIndex) */
    const handleConsultar = (
        overrideInicio?: string,
        overrideFin?: string,
        overrideUserId?: string,
    ) => {
        const inicio = overrideInicio ?? fechaInicio;
        const fin = overrideFin ?? fechaFin;
        const uid = overrideUserId ?? userId;
        if (!inicio || !fin || !uid) return;
        router.get(
            '/reports/financial',
            {
                start_date: inicio,
                end_date: fin,
                user_id: uid,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    // 'YYYY-MM-DDTHH:mm:ssZ' (ISO, lo que manda el backend) -> 'YYYY-MM-DDTHH:mm'
    // (lo que exige el <input type="datetime-local">), en hora LOCAL del
    // navegador (new Date() ya hace esa conversión).
    const toDatetimeLocal = (isoString: string) => {
        const d = new Date(isoString);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Al elegir un operador puntual, autocompletamos "Fecha de Inicio" con
    // la fecha Y HORA exacta en que abrió su turno, y "Hasta qué fecha" con
    // el instante actual — y consultamos de inmediato. Sin turno abierto,
    // avisamos claramente en vez de dejar el formulario a medias.
    const handleUserChange = (newUserId: string) => {
        setUserId(newUserId);

        if (!newUserId || newUserId === 'todos') {
            setFechaInicio('');
            setFechaFin('');
            return;
        }

        const operator = users.find((u) => String(u.id) === newUserId);

        if (!operator?.active_shift_opened_at) {
            setFechaInicio('');
            setFechaFin('');
            alert('Este usuario no tiene un turno abierto actualmente.');
            return;
        }

        const inicio = toDatetimeLocal(operator.active_shift_opened_at);
        const fin = toDatetimeLocal(new Date().toISOString());
        setFechaInicio(inicio);
        setFechaFin(fin);
        handleConsultar(inicio, fin, newUserId);
    };

    const handleGenerar: FormEventHandler = (e) => {
        e.preventDefault();
        if (!fechaInicio || !fechaFin || !userId || turnoVacio) return;

        setIsGenerating(true);
        setPdfUrl(null);

        const params = new URLSearchParams({
            start_date: fechaInicio,
            end_date: fechaFin,
            user_id: userId,
            record_type: tipoRegistro,
        });

        setTimeout(() => {
            setIsGenerating(false);
            if (formato === 'pdf') {
                setPdfUrl(
                    `/reports/financial/pdf?${params.toString()}&t=${Date.now()}`,
                );
            } else {
                window.location.href = `/reports/financial/csv?${params.toString()}`;
            }
        }, 600);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cierre de Caja" />

            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-7">
                {/* ENCABEZADO */}
                <div className="mb-4 flex-shrink-0 pt-0">
                    <button
                        onClick={() => router.visit('/dashboard')}
                        className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-white"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 transition-all group-hover:bg-gray-700">
                            <ArrowLeft className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-400">Volver atrás</span>
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                            Cierre de Caja
                        </h2>
                        {/* Historial de Turnos: TODOS los cierres de caja
                            guardados hasta ahora (turno, operador, fechas).
                            Solo se muestra a quien tenga reportes.financiero,
                            mismo permiso que habilita la vista agregada
                            "Todos" en esta misma pantalla. */}
                        {CanViewAll && (
                            <button
                                type="button"
                                onClick={openHistoryModal}
                                className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-bold text-gray-200 shadow-sm transition hover:bg-gray-700"
                            >
                                <History className="h-4 w-4" />
                                Historial de Turnos
                            </button>
                        )}
                    </div>
                </div>

                {/* ============ VISTA PREVIA PDF ============ */}
                {pdfUrl && formato === 'pdf' ? (
                    <div className="flex w-full animate-in flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                {isHistoryPreview
                                    ? 'Turno del Historial'
                                    : 'Paso 2: Revisa tu Parte Diario'}
                            </h2>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={() => {
                                        setPdfUrl(null);
                                        setIsHistoryPreview(false);
                                    }}
                                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Cerrar
                                </button>
                                {!isHistoryPreview && userId !== 'todos' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsCloseModalOpen(true)
                                        }
                                        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95"
                                    >
                                        <LogOut className="h-4 w-4" /> Todo en
                                        orden: Cerrar Caja
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
                            <Printer className="h-4 w-4" />
                            <p>
                                No olvides <b>imprimir el PDF</b> usando el
                                botón de la impresora dentro del visor antes de
                                salir del sistema.
                            </p>
                        </div>

                        {/* min-h en píxeles (no h-auto/h-full, que el visor
                            de PDF nativo del navegador ignora) grande para
                            que quepa una hoja carta/A4 sin scroll propio: el
                            iframe se expande verticalmente con su contenido
                            y es la página la que scrollea, no una caja
                            interna. Sin overflow-hidden/overflow-y-auto en
                            ningún contenedor padre de este bloque. */}
                        <div className="bg-gray-300/50 p-2">
                            <iframe
                                src={pdfUrl}
                                className="min-h-[1200px] w-full rounded border-0 bg-white shadow-inner"
                                title="Reporte PDF"
                            />
                        </div>
                    </div>
                ) : (
                    /* ============ FORMULARIO DE CIERRE (único elemento de la vista) ============ */
                    <div className="flex flex-1 items-start justify-center py-6">
                        {/* ---------- TARJETA FORMULARIO ---------- */}
                        <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <Printer className="h-5 w-5" />
                                    </div>
                                    Generar Reporte
                                </h2>
                            </div>

                            <form
                                onSubmit={handleGenerar}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                                    {/* Usuario */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Usuario de Caja
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <UserIcon className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <select
                                                value={userId}
                                                onChange={(e) =>
                                                    handleUserChange(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full appearance-none rounded-lg border border-gray-400 bg-white py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                            >
                                                <option value="" disabled>
                                                    Selecciona un operador...
                                                </option>
                                                {CanViewAll && (
                                                    <option value="todos">
                                                        Todos
                                                    </option>
                                                )}
                                                {users && users.length > 0 ? (
                                                    users.map((user) => (
                                                        <option
                                                            key={user.id}
                                                            value={user.id}
                                                        >
                                                            {user.full_name}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>
                                                        No hay operadores
                                                        disponibles.
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                        {turnoVacio && (
                                            <p className="mt-2 text-sm font-bold text-red-600">
                                                ⚠️ No se registraron nuevos
                                                movimientos (ingresos/egresos)
                                                desde su último cierre. No hay
                                                nada que cerrar.
                                            </p>
                                        )}
                                    </div>

                                    {/* Fechas: se autocompletan del turno real del
                                        operador elegido y quedan bloqueadas —
                                        solo "Todos" las deja editables, al no
                                        haber un turno único del cual derivarlas. */}
                                    <div className="flex flex-col gap-4 sm:flex-row">
                                        <div className="w-full sm:w-1/2">
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Fecha de Inicio
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    readOnly={fechasBloqueadas}
                                                    value={fechaInicio}
                                                    onChange={(e) =>
                                                        !fechasBloqueadas &&
                                                        setFechaInicio(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-1/2">
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Hasta qué fecha
                                            </label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    readOnly={fechasBloqueadas}
                                                    value={fechaFin}
                                                    onChange={(e) =>
                                                        !fechasBloqueadas &&
                                                        setFechaFin(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0 read-only:cursor-not-allowed read-only:bg-gray-100 read-only:text-gray-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tipo de Registro */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Tipo de Registro
                                        </label>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTipoRegistro('efectivo')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'efectivo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Banknote className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Efectivo
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTipoRegistro('bancos')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'bancos' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <QrCode className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Bancos / QR
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTipoRegistro('ambos')
                                                }
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 transition-all ${tipoRegistro === 'ambos' ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <Layers className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Ambos
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Formato */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            Formato de Salida
                                        </label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormato('pdf')
                                                }
                                                className={`flex w-32 flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 transition-all sm:flex-none ${formato === 'pdf' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileText className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    PDF
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormato('excel')
                                                }
                                                className={`flex w-32 flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 transition-all sm:flex-none ${formato === 'excel' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <FileSpreadsheet className="h-4 w-4" />
                                                <span className="text-sm font-bold uppercase">
                                                    Excel
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={handleLimpiar}
                                        className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                                    >
                                        Limpiar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            isGenerating ||
                                            !fechaInicio ||
                                            !fechaFin ||
                                            !userId ||
                                            turnoVacio
                                        }
                                        className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />{' '}
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="h-4 w-4" />{' '}
                                                Generar y Revisar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <CloseRegisterModal
                show={isCloseModalOpen}
                operatorId={userId}
                operatorName={
                    users.find((u) => String(u.id) === String(userId))
                        ?.full_name
                }
                onClose={() => setIsCloseModalOpen(false)}
            />

            {/* ============ MODAL: HISTORIAL DE TURNOS ============ */}
            {isHistoryModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={() => setIsHistoryModalOpen(false)}
                >
                    <div
                        className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-gray-200 p-1.5 text-gray-700">
                                    <History className="h-5 w-5" />
                                </div>
                                Historial de Turnos
                            </h2>
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingHistory ? (
                                <div className="flex h-full items-center justify-center gap-2 text-gray-400">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Cargando historial...
                                </div>
                            ) : historyShifts.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-center text-gray-400">
                                    Todavía no hay turnos cerrados registrados.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Operador
                                                </th>
                                                <th className="px-4 py-3">
                                                    Fecha/Hora Inicio
                                                </th>
                                                <th className="px-4 py-3">
                                                    Fecha/Hora Cierre
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {historyShifts.map((s) => (
                                                <tr
                                                    key={s.id}
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-4 py-3 font-bold text-gray-800">
                                                        {s.operator_name}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {formatDateTime(
                                                            s.opened_at,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {formatDateTime(
                                                            s.closed_at,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                viewHistoryShiftPdf(
                                                                    s.id,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            Ver PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
