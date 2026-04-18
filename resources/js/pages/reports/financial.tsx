import CloseRegisterModal from '@/components/CloseRegisterModal';
import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    Calendar,
    FileSpreadsheet,
    FileText,
    Layers,
    Loader2,
    LogOut,
    Printer,
    QrCode,
    User as UserIcon,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Props {
    auth: {
        user: User;
        active_register?: any;
    };
    users?: User[];
    Filters?: {
        start_date?: string;
        end_date?: string;
        user_id?: string;
    };
}

export default function FinancialReport({ auth, users = [], Filters }: Props) {
    // Estados para el Modal de Cierre de Caja
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Estados del formulario
    const [fechaInicio, setFechaInicio] = useState(Filters?.start_date || '');
    const [fechaFin, setFechaFin] = useState(Filters?.end_date || '');
    const [userId, setUserId] = useState(
        Filters?.user_id || auth.user.id.toString(),
    );
    const [tipoRegistro, setTipoRegistro] = useState<
        'efectivo' | 'bancos' | 'ambos'
    >('ambos');
    const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf');

    // Estados de UI
    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFin('');
        setUserId(auth.user.id.toString());
        setTipoRegistro('ambos');
        setFormato('pdf');
    };

    const handleGenerar: FormEventHandler = (e) => {
        e.preventDefault();

        if (!fechaInicio || !fechaFin) return;

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
                window.location.href = `/reports/financial/excel?${params.toString()}`;
            }
        }, 600);
    };

    // Función que cierra caja y bota al Login
    {
        /* Donde antes tenías onClick={handleCerrarCaja} */
    }
    <button
        onClick={() => setIsCloseModalOpen(true)}
        className="tu-clase-del-boton-rojo"
    >
        Cerrar Caja
    </button>;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cierre de Caja" />

            <div className="mx-auto flex h-[calc(120vh-5rem)] max-w-7xl flex-col px-4 pb-10 sm:px-6 lg:px-7">
                {/* ENCABEZADO: Título y Volver (Ya sin el botón de cierre aquí) */}
                <div className="mb-4 flex-shrink-0 pt-0">
                    <button
                        onClick={() => window.history.back()}
                        className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-white"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 transition-all group-hover:bg-gray-700">
                            <ArrowLeft className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-400">Volver atrás</span>
                    </button>
                    <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                        Cierre de Caja
                    </h2>
                </div>

                {/* ZONA DE CONTENIDO CENTRAL */}
                <div className="flex flex-1 items-start justify-center overflow-hidden pb-4">
                    {/* VISTA PREVIA PDF (Paso 2: Donde ocurre el cierre real) */}
                    {pdfUrl && formato === 'pdf' ? (
                        <div className="flex h-full w-full animate-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl duration-200 zoom-in-95">
                            {/* Cabecera de la Vista Previa con las Acciones */}
                            <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    Paso 2: Revisa tu Parte Diario
                                </h2>

                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    <button
                                        onClick={() => setPdfUrl(null)}
                                        className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
                                    >
                                        <ArrowLeft className="h-4 w-4" /> Cerrar
                                    </button>

                                    {/* Botón definitivo para cerrar sesión, solo sale si la caja está abierta */}
                                    {auth.active_register && (
                                        <button
                                            type="button"
                                            // ✅ EL CAMBIO ESTÁ AQUÍ: Quitamos handleCerrarCaja y abrimos el modal
                                            onClick={() =>
                                                setIsCloseModalOpen(true)
                                            }
                                            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-500 active:scale-95"
                                        >
                                            <LogOut className="h-4 w-4" /> Todo
                                            en orden: Cerrar Caja y Salir
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Recordatorio de Impresión */}
                            <div className="flex items-center justify-center gap-2 border-b border-yellow-200 bg-yellow-50 px-6 py-2 text-sm text-yellow-800">
                                <Printer className="h-4 w-4" />
                                <p>
                                    No olvides <b>imprimir el PDF</b> usando el
                                    botón de la impresora dentro del visor antes
                                    de salir del sistema.
                                </p>
                            </div>

                            <div className="flex-1 bg-gray-300/50 p-2">
                                <iframe
                                    src={pdfUrl}
                                    className="h-full w-full rounded border border-gray-300 bg-white shadow-inner"
                                    title="Reporte PDF"
                                />
                            </div>
                        </div>
                    ) : (
                        /* TARJETA DEL FORMULARIO (Paso 1) */
                        <div className="flex max-h-full w-full max-w-2xl animate-in flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl duration-200 zoom-in-95">
                            {/* Header Formulario Fijo */}
                            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                    <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                        <Printer className="h-5 w-5" />
                                    </div>
                                    Paso 1: Generar Reporte
                                </h2>
                            </div>

                            {/* Body Formulario */}
                            <form
                                onSubmit={handleGenerar}
                                className="flex min-h-0 flex-1 flex-col"
                            >
                                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                                    {/* 0. Usuario */}
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
                                                    setUserId(e.target.value)
                                                }
                                                className="w-full appearance-none rounded-lg border border-gray-400 bg-white py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                            >
                                                <option value="todos">
                                                    Todos
                                                </option>
                                                {users && users.length > 0 ? (
                                                    users.map((user) => (
                                                        <option
                                                            key={user.id}
                                                            value={user.id}
                                                        >
                                                            {user.full_name ||
                                                                user.full_name}{' '}
                                                            {user.id ===
                                                            auth.user.id
                                                                ? '(Tú)'
                                                                : ''}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option
                                                        value={auth.user.id}
                                                    >
                                                        {auth.user.full_name}{' '}
                                                        (Tú)
                                                    </option>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 1. Fechas */}
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
                                                    type="date"
                                                    required
                                                    value={fechaInicio}
                                                    onChange={(e) =>
                                                        setFechaInicio(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
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
                                                    type="date"
                                                    required
                                                    value={fechaFin}
                                                    onChange={(e) =>
                                                        setFechaFin(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Tipo de Registro */}
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
                                                    Solo Efectivo
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

                                    {/* 3. Formato */}
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

                                {/* FOOTER DEL FORMULARIO */}
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
                                            !fechaFin
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
                    )}
                </div>
            </div>
            <CloseRegisterModal
                show={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
