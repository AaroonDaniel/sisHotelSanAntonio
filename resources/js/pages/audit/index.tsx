import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    BedDouble,
    Lock,
    Pencil,
    Save,
    ShieldAlert,
    Wallet,
    X,
    Banknote,
} from 'lucide-react';
import { useState } from 'react';
import GodModeCheckinModal, {
    CashRegisterOption,
    CheckinAudit,
    OperatorOption,
} from './GodModeCheckinModal';

// --- INTERFACES ---
interface CashRegisterAudit {
    id: number;
    user_id: number;
    user_name: string;
    opening_amount: number;
    status: string;
    opened_at: string | null;
    closed_at: string | null;
}

interface Props {
    auth: { user: User };
    CashRegisters: CashRegisterAudit[];
    Checkins: CheckinAudit[];
    Operators: OperatorOption[];
    AllCashRegisters: CashRegisterOption[];
}

type TabKey = 'cajas' | 'estadias' | 'finanzas';

interface CashRegisterEditForm {
    opening_amount: string;
    status: string;
    opened_at: string;
    closed_at: string;
}

// La app entera trabaja en hora de La Paz (config/app.php: America/La_Paz).
// Convertimos el ISO que manda el backend al formato que exige un
// <input type="datetime-local"> respetando esa zona horaria.
const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date
        .toLocaleString('sv-SE', { timeZone: 'America/La_Paz' })
        .replace(' ', 'T')
        .slice(0, 16);
};

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'cajas', label: 'Cajas y Turnos', icon: Wallet },
    { key: 'estadias', label: 'Estadías (Check-ins/outs)', icon: BedDouble },
    { key: 'finanzas', label: 'Finanzas (Pagos/Gastos)', icon: Banknote },
];

export default function DataAuditIndex({
    auth,
    CashRegisters,
    Checkins,
    Operators,
    AllCashRegisters,
}: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>('cajas');

    // --- Modal God Mode de Check-ins ---
    const [checkinToEdit, setCheckinToEdit] = useState<CheckinAudit | null>(
        null,
    );

    // --- Edición en línea de Cajas ---
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<CashRegisterEditForm>({
        opening_amount: '',
        status: 'ABIERTA',
        opened_at: '',
        closed_at: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const startEdit = (cr: CashRegisterAudit) => {
        setEditingId(cr.id);
        setEditForm({
            opening_amount: String(cr.opening_amount ?? 0),
            status: cr.status,
            opened_at: formatDateForInput(cr.opened_at),
            closed_at: formatDateForInput(cr.closed_at),
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = (id: number) => {
        setIsSaving(true);
        router.put(
            `/admin/god-mode/cash-registers/${id}`,
            {
                opening_amount: editForm.opening_amount,
                status: editForm.status,
                opened_at: editForm.opened_at,
                closed_at: editForm.closed_at || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingId(null),
                onFinish: () => setIsSaving(false),
            },
        );
    };

    const forceClose = (cr: CashRegisterAudit) => {
        if (
            !confirm(
                `¿Forzar el cierre de la caja #${cr.id} (${cr.user_name})? Se marcará como CERRADA con la fecha/hora actual.`,
            )
        ) {
            return;
        }
        router.put(
            `/admin/god-mode/cash-registers/${cr.id}`,
            {
                opening_amount: cr.opening_amount,
                status: 'CERRADA',
                opened_at: cr.opened_at,
                closed_at: new Date().toISOString(),
            },
            { preserveScroll: true },
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="God Mode · Auditoría de Datos" />

            <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4 rounded-2xl border border-red-900/50 bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 p-5 shadow-xl">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                        <ShieldAlert className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
                            God Mode
                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                                Acceso exclusivo
                            </span>
                        </h1>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
                            <Lock className="h-3.5 w-3.5" />
                            Auditoría de Datos: corrige cajas, estadías y
                            finanzas cuando los reportes no cuadran. Cada
                            cambio queda registrado en la bitácora.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex gap-2 border-b border-gray-800">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                                    isActive
                                        ? 'border-b-2 border-red-500 bg-gray-900 text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* --- TAB: CAJAS Y TURNOS --- */}
                {activeTab === 'cajas' && (
                    <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
                        <div className="border-b border-gray-800 px-5 py-4">
                            <h2 className="text-sm font-bold text-gray-200">
                                Cajas abiertas o con inconsistencias
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Se listan las cajas en estado ABIERTA y
                                cualquier registro con fechas inconsistentes
                                (cierre antes de apertura, sin fecha de
                                cierre, etc.)
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-800/60 text-xs tracking-wider text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Usuario</th>
                                        <th className="px-4 py-3">
                                            Monto apertura
                                        </th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Apertura</th>
                                        <th className="px-4 py-3">Cierre</th>
                                        <th className="px-4 py-3 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {CashRegisters.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-4 py-8 text-center text-gray-500"
                                            >
                                                No hay cajas abiertas ni con
                                                errores. Todo cuadra. ✅
                                            </td>
                                        </tr>
                                    )}

                                    {CashRegisters.map((cr) => {
                                        const isEditing = editingId === cr.id;

                                        if (!isEditing) {
                                            return (
                                                <tr
                                                    key={cr.id}
                                                    className="hover:bg-gray-800/40"
                                                >
                                                    <td className="px-4 py-3 font-mono text-gray-400">
                                                        #{cr.id}
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-white">
                                                        {cr.user_name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        Bs{' '}
                                                        {cr.opening_amount.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                                                cr.status ===
                                                                'ABIERTA'
                                                                    ? 'bg-amber-500/20 text-amber-400'
                                                                    : 'bg-emerald-500/20 text-emerald-400'
                                                            }`}
                                                        >
                                                            {cr.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {cr.opened_at
                                                            ? new Date(
                                                                  cr.opened_at,
                                                              ).toLocaleString(
                                                                  'es-BO',
                                                              )
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {cr.closed_at
                                                            ? new Date(
                                                                  cr.closed_at,
                                                              ).toLocaleString(
                                                                  'es-BO',
                                                              )
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            {cr.status ===
                                                                'ABIERTA' && (
                                                                <button
                                                                    onClick={() =>
                                                                        forceClose(
                                                                            cr,
                                                                        )
                                                                    }
                                                                    className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/60"
                                                                    title="Forzar cierre ahora"
                                                                >
                                                                    Forzar
                                                                    cierre
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() =>
                                                                    startEdit(
                                                                        cr,
                                                                    )
                                                                }
                                                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-700"
                                                            >
                                                                Editar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr
                                                key={cr.id}
                                                className="bg-gray-800/60"
                                            >
                                                <td className="px-4 py-3 font-mono text-gray-400">
                                                    #{cr.id}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-white">
                                                    {cr.user_name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={
                                                            editForm.opening_amount
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    opening_amount:
                                                                        e
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className="w-28 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={
                                                            editForm.status
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    status: e
                                                                        .target
                                                                        .value,
                                                                }),
                                                            )
                                                        }
                                                        className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                                    >
                                                        <option value="ABIERTA">
                                                            ABIERTA
                                                        </option>
                                                        <option value="CERRADA">
                                                            CERRADA
                                                        </option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="datetime-local"
                                                        value={
                                                            editForm.opened_at
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    opened_at:
                                                                        e
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="datetime-local"
                                                        value={
                                                            editForm.closed_at
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    closed_at:
                                                                        e
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-red-500 focus:ring-red-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            disabled={
                                                                isSaving
                                                            }
                                                            onClick={() =>
                                                                saveEdit(cr.id)
                                                            }
                                                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                                        >
                                                            <Save className="h-3.5 w-3.5" />
                                                            Guardar
                                                        </button>
                                                        <button
                                                            onClick={
                                                                cancelEdit
                                                            }
                                                            className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-gray-700"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB: ESTADÍAS --- */}
                {activeTab === 'estadias' && (
                    <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
                        <div className="border-b border-gray-800 px-5 py-4">
                            <h2 className="text-sm font-bold text-gray-200">
                                Todos los Check-ins
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Activos, finalizados, transferidos o
                                cancelados. Edita cualquier campo (fechas,
                                estado, precio, operador) y los pagos
                                asociados sin restricciones de negocio.
                            </p>
                        </div>

                        <div className="max-h-[65vh] overflow-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-gray-800/90 text-xs tracking-wider text-gray-400 uppercase backdrop-blur">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Huésped</th>
                                        <th className="px-4 py-3">Hab.</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Operador</th>
                                        <th className="px-4 py-3">
                                            Check-in
                                        </th>
                                        <th className="px-4 py-3">Salida</th>
                                        <th className="px-4 py-3">Precio</th>
                                        <th className="px-4 py-3">Pagos</th>
                                        <th className="px-4 py-3 text-right">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {Checkins.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={10}
                                                className="px-4 py-8 text-center text-gray-500"
                                            >
                                                No hay check-ins registrados.
                                            </td>
                                        </tr>
                                    )}

                                    {Checkins.map((c) => (
                                        <tr
                                            key={c.id}
                                            className="hover:bg-gray-800/40"
                                        >
                                            <td className="px-4 py-3 font-mono text-gray-400">
                                                #{c.id}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-white">
                                                {c.guest_name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">
                                                {c.room_number}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                                        c.status === 'activo'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : c.status ===
                                                                'cancelado'
                                                              ? 'bg-red-500/20 text-red-400'
                                                              : 'bg-gray-500/20 text-gray-300'
                                                    }`}
                                                >
                                                    {c.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {c.operator_name ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {c.check_in_date
                                                    ? new Date(
                                                          c.check_in_date,
                                                      ).toLocaleDateString(
                                                          'es-BO',
                                                      )
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {c.check_out_date
                                                    ? new Date(
                                                          c.check_out_date,
                                                      ).toLocaleDateString(
                                                          'es-BO',
                                                      )
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">
                                                Bs {c.agreed_price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">
                                                {c.payments.length}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() =>
                                                        setCheckinToEdit(c)
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-700"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    God Mode
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB: FINANZAS (placeholder, próxima iteración) --- */}
                {activeTab === 'finanzas' && (
                    <PlaceholderPanel
                        icon={Banknote}
                        title="Finanzas (Pagos / Gastos)"
                    />
                )}
            </div>

            <GodModeCheckinModal
                show={!!checkinToEdit}
                onClose={() => setCheckinToEdit(null)}
                checkin={checkinToEdit}
                operators={Operators}
                cashRegisters={AllCashRegisters}
            />
        </AuthenticatedLayout>
    );
}

function PlaceholderPanel({
    icon: Icon,
    title,
}: {
    icon: React.ElementType;
    title: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-800 bg-gray-900 p-16 text-center">
            <Icon className="h-10 w-10 text-gray-600" />
            <h3 className="text-base font-bold text-gray-300">{title}</h3>
            <p className="max-w-sm text-sm text-gray-500">
                Este módulo todavía no tiene funcionalidad de edición. Se
                implementará en una próxima iteración.
            </p>
        </div>
    );
}
