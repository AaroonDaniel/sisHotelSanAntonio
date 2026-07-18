import OperatorSelector from '@/components/OperatorSelector';
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
import { Head, useForm } from '@inertiajs/react';
import {
    BedDouble,
    Building2,
    GraduationCap,
    MapPin,
    Plus,
    Save,
    Wallet,
    X,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Operator {
    id: number;
    full_name: string;
    nickname: string;
}

interface GroupAccount {
    id: number;
    name: string;
    type: 'delegacion' | 'corporativo';
    origin?: string | null;
    total_advance: number;
    total_consumed: number;
    balance: number;
    active_rooms_count: number;
    created_at: string | null;
}

interface Props {
    auth: { user: User };
    GroupAccounts: GroupAccount[];
    Operators: Operator[];
}

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n ?? 0);

const typeLabel = (type: string) =>
    type === 'delegacion' ? 'Delegación' : 'Corporativo';

const paymentMethods = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'QR', label: 'QR' },
    { value: 'TARJETA', label: 'Tarjeta' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
] as const;

export default function GroupAccountsIndex({
    auth,
    GroupAccounts,
    Operators,
}: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [advanceTarget, setAdvanceTarget] = useState<GroupAccount | null>(
        null,
    );

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        type: 'delegacion' as 'delegacion' | 'corporativo',
        origin: '',
        initial_advance: '',
        operator_id: '',
        method: 'EFECTIVO',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/group-accounts', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setIsCreateOpen(false);
            },
        });
    };

    const hasAdvance = Number(data.initial_advance) > 0;

    const {
        data: advanceData,
        setData: setAdvanceData,
        post: postAdvance,
        processing: processingAdvance,
        errors: advanceErrors,
        reset: resetAdvance,
    } = useForm({
        amount: '',
        operator_id: '',
        method: 'EFECTIVO',
    });

    const submitAdvance: FormEventHandler = (e) => {
        e.preventDefault();
        if (!advanceTarget) return;
        postAdvance(`/group-accounts/${advanceTarget.id}/advance`, {
            preserveScroll: true,
            onSuccess: () => {
                resetAdvance();
                setAdvanceTarget(null);
            },
        });
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        reset();
    };

    const closeAdvanceModal = () => {
        setAdvanceTarget(null);
        resetAdvance();
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cuentas Grupales" />

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-write flex items-center gap-3 text-2xl font-bold">
                        <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                            <Building2 className="h-6 w-6" />
                        </div>
                        Cuentas Grupales
                    </h2>
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95"
                    >
                        <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                        <span>Nueva Cuenta Grupal</span>
                    </Button>
                </div>
                <p className="-mt-4 mb-6 text-sm text-gray-500">
                    Delegaciones y cuentas corporativas unificadas: registra un
                    adelanto inicial y asigna habitaciones con Check-in Rápido —
                    el costo se descuenta automáticamente del adelanto, sin
                    cobrar en efectivo al huésped.
                </p>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Nombre
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Tipo
                                </TableHead>
                                <TableHead className="text-right text-xs font-bold text-gray-600 uppercase">
                                    Adelanto
                                </TableHead>
                                <TableHead className="text-right text-xs font-bold text-gray-600 uppercase">
                                    Consumido
                                </TableHead>
                                <TableHead className="text-right text-xs font-bold text-gray-600 uppercase">
                                    Saldo
                                </TableHead>
                                <TableHead className="text-center text-xs font-bold text-gray-600 uppercase">
                                    Habitaciones activas
                                </TableHead>
                                <TableHead className="text-right text-xs font-bold text-gray-600 uppercase">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {GroupAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-sm text-gray-500"
                                    >
                                        <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                                        Todavía no hay Cuentas Grupales creadas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                GroupAccounts.map((acc) => (
                                    <TableRow
                                        key={acc.id}
                                        className="hover:bg-gray-50/60"
                                    >
                                        <TableCell className="font-bold text-gray-800">
                                            {acc.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    acc.type === 'delegacion'
                                                        ? 'border-amber-300 bg-amber-100 text-amber-800'
                                                        : 'border-indigo-300 bg-indigo-100 text-indigo-800'
                                                }
                                            >
                                                {acc.type === 'delegacion' ? (
                                                    <GraduationCap className="h-3 w-3" />
                                                ) : (
                                                    <Building2 className="h-3 w-3" />
                                                )}
                                                {typeLabel(acc.type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-gray-700">
                                            Bs{' '}
                                            {formatCurrency(acc.total_advance)}
                                        </TableCell>
                                        <TableCell className="text-right text-gray-700">
                                            Bs{' '}
                                            {formatCurrency(acc.total_consumed)}
                                        </TableCell>
                                        <TableCell
                                            className={`text-right font-bold ${
                                                acc.balance < 0
                                                    ? 'text-red-600'
                                                    : 'text-emerald-600'
                                            }`}
                                        >
                                            Bs {formatCurrency(acc.balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600">
                                                <BedDouble className="h-3.5 w-3.5" />
                                                {acc.active_rooms_count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right text-gray-900">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setAdvanceTarget(acc)
                                                }
                                            >
                                                <Wallet className="h-3.5 w-3.5" />
                                                Agregar Abono
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* --- MODAL: NUEVA CUENTA GRUPAL (mismo diseño que el resto de
                los formularios de la app: overlay + tarjeta redondeada,
                sin componentes shadcn) --- */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
                    <div className="flex max-h-[85vh] w-full max-w-lg animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-amber-100 p-1.5 text-amber-600">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                Nueva Cuenta Grupal
                            </h2>
                            <button
                                onClick={closeCreateModal}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={submit}
                            className="flex flex-1 flex-col overflow-hidden"
                        >
                            <div className="flex-1 space-y-4 overflow-y-auto p-6">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                        Nombre del Grupo / Institución
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) =>
                                                setData(
                                                    'name',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            placeholder="EJ. COLEGIO SAN JOSÉ"
                                            className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                        />
                                    </div>
                                    {errors.name && (
                                        <p className="mt-1 text-xs font-bold text-red-500">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                        Tipo
                                    </label>
                                    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50/50 p-1 shadow-sm">
                                        {(
                                            [
                                                'delegacion',
                                                'corporativo',
                                            ] as const
                                        ).map((tipo) => (
                                            <button
                                                key={tipo}
                                                type="button"
                                                onClick={() =>
                                                    setData('type', tipo)
                                                }
                                                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                                                    data.type === tipo
                                                        ? tipo === 'delegacion'
                                                            ? 'bg-amber-100 text-amber-800 shadow-sm'
                                                            : 'bg-indigo-100 text-indigo-800 shadow-sm'
                                                        : 'text-gray-500 hover:bg-gray-200/50'
                                                }`}
                                            >
                                                {tipo === 'delegacion'
                                                    ? 'DELEGACIÓN'
                                                    : 'CORPORATIVO'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {data.type === 'delegacion' && (
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                            ¿De dónde vienen? (Procedencia)
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <MapPin className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={data.origin}
                                                onChange={(e) =>
                                                    setData(
                                                        'origin',
                                                        e.target.value.toUpperCase(),
                                                    )
                                                }
                                                placeholder="EJ. SANTA CRUZ"
                                                className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                            Se heredará automáticamente al
                                            registrar a cada huésped de esta
                                            delegación en el Check-in Rápido.
                                        </p>
                                        {errors.origin && (
                                            <p className="mt-1 text-xs font-bold text-red-500">
                                                {errors.origin}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                        Monto de Adelanto Inicial
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-400">
                                            Bs
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={data.initial_advance}
                                            onChange={(e) =>
                                                setData(
                                                    'initial_advance',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-9 text-base text-black focus:border-gray-600 focus:ring-0"
                                        />
                                    </div>
                                    {errors.initial_advance && (
                                        <p className="mt-1 text-xs font-bold text-red-500">
                                            {errors.initial_advance}
                                        </p>
                                    )}
                                </div>

                                {hasAdvance && (
                                    <>
                                        <div>
                                            <label className="mb-1.5 block text-center text-sm font-semibold text-gray-700">
                                                Operador que recibe el adelanto
                                            </label>
                                            <OperatorSelector
                                                operators={Operators}
                                                value={data.operator_id}
                                                onChange={(id) =>
                                                    setData('operator_id', id)
                                                }
                                                compact
                                                size="lg"
                                                label=""
                                            />
                                            <p className="mt-1 text-center text-xs text-gray-400">
                                                El adelanto se registra de una
                                                vez en la caja de este operador.
                                            </p>
                                            {errors.operator_id && (
                                                <p className="mt-1 text-center text-xs font-bold text-red-500">
                                                    {errors.operator_id}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Método de Pago
                                            </label>
                                            <div className="grid grid-cols-4 gap-1 rounded-xl border border-gray-200 bg-gray-50/50 p-1 shadow-sm">
                                                {paymentMethods.map((m) => (
                                                    <button
                                                        key={m.value}
                                                        type="button"
                                                        onClick={() =>
                                                            setData(
                                                                'method',
                                                                m.value,
                                                            )
                                                        }
                                                        className={`rounded-lg px-1 py-1.5 text-[11px] font-bold transition-all ${
                                                            data.method ===
                                                            m.value
                                                                ? 'bg-white text-green-700 shadow-sm ring-1 ring-gray-200'
                                                                : 'text-gray-500 hover:bg-gray-200/50'
                                                        }`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? (
                                        'Guardando...'
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" /> Crear
                                            Cuenta
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL: AGREGAR ABONO (mismo diseño) --- */}
            {advanceTarget && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
                    <div className="flex max-h-[85vh] w-full max-w-lg animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                Agregar Abono — {advanceTarget.name}
                            </h2>
                            <button
                                onClick={closeAdvanceModal}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={submitAdvance}
                            className="flex flex-1 flex-col overflow-hidden"
                        >
                            <div className="flex-1 space-y-4 overflow-y-auto p-6">
                                <p className="text-sm text-gray-500">
                                    Saldo actual: Bs{' '}
                                    <span
                                        className={
                                            advanceTarget.balance < 0
                                                ? 'font-bold text-red-600'
                                                : 'font-bold text-emerald-600'
                                        }
                                    >
                                        {formatCurrency(advanceTarget.balance)}
                                    </span>
                                </p>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                        Monto
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-gray-400">
                                            Bs
                                        </span>
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={advanceData.amount}
                                            onChange={(e) =>
                                                setAdvanceData(
                                                    'amount',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-9 text-base text-black focus:border-gray-600 focus:ring-0"
                                        />
                                    </div>
                                    {advanceErrors.amount && (
                                        <p className="mt-1 text-xs font-bold text-red-500">
                                            {advanceErrors.amount}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-center text-sm font-semibold text-gray-700">
                                        Operador que recibe el abono
                                    </label>
                                    <OperatorSelector
                                        operators={Operators}
                                        value={advanceData.operator_id}
                                        onChange={(id) =>
                                            setAdvanceData('operator_id', id)
                                        }
                                        compact
                                        size="lg"
                                        label=""
                                    />
                                    <p className="mt-1 text-center text-xs text-gray-400">
                                        El abono se registra de una vez en la
                                        caja de este operador.
                                    </p>
                                    {advanceErrors.operator_id && (
                                        <p className="mt-1 text-center text-xs font-bold text-red-500">
                                            {advanceErrors.operator_id}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                        Método de Pago
                                    </label>
                                    <div className="grid grid-cols-4 gap-1 rounded-xl border border-gray-200 bg-gray-50/50 p-1 shadow-sm">
                                        {paymentMethods.map((m) => (
                                            <button
                                                key={m.value}
                                                type="button"
                                                onClick={() =>
                                                    setAdvanceData(
                                                        'method',
                                                        m.value,
                                                    )
                                                }
                                                className={`rounded-lg px-1 py-1.5 text-[11px] font-bold transition-all ${
                                                    advanceData.method ===
                                                    m.value
                                                        ? 'bg-white text-green-700 shadow-sm ring-1 ring-gray-200'
                                                        : 'text-gray-500 hover:bg-gray-200/50'
                                                }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
                                <button
                                    type="button"
                                    onClick={closeAdvanceModal}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingAdvance}
                                    className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                                >
                                    {processingAdvance ? (
                                        'Guardando...'
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />{' '}
                                            Registrar Abono
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
