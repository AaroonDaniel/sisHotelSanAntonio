import AuthenticatedLayout, { User } from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    CalendarClock,
    Plus,
    Search,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import CreateMasterAccountModal, {
    AvailableCheckin,
    CashRegisterOption,
} from './CreateMasterAccountModal';
import AccountDetailModal, { CorporateAccount } from './AccountDetailModal';

interface Props {
    auth: { user: User };
    CorporateAccounts: CorporateAccount[];
    AvailableCheckins: AvailableCheckin[];
    CashRegisters: CashRegisterOption[];
}

export default function CorporateAccountsIndex({
    auth,
    CorporateAccounts,
    AvailableCheckins,
    CashRegisters,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    // Guardamos solo el ID, no el objeto: así, cuando Inertia recarga
    // CorporateAccounts (tras registrar un pago o agregar habitaciones), el
    // modal siempre muestra el saldo recién calculado en vez de quedarse
    // con una copia obsoleta del momento en que se abrió.
    const [accountToViewId, setAccountToViewId] = useState<number | null>(
        null,
    );
    const accountToView =
        CorporateAccounts.find((a) => a.id === accountToViewId) ?? null;

    const filteredAccounts = CorporateAccounts.filter((acc) =>
        (acc.company_name || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
    );

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Cuentas Maestras Corporativas" />
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-gray-800 transition-all group-hover:border-gray-500 group-hover:bg-gray-700">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver</span>
                </button>

                <div>
                    <h2 className="flex items-center gap-3 text-3xl font-bold text-white">
                        <Building2 className="h-8 w-8 text-emerald-500" />
                        Cuentas Maestras Corporativas
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                        Grupos de habitaciones facturados a nombre de una
                        empresa, con pagos en cuotas periódicas repartidos
                        entre las habitaciones del grupo.
                    </p>
                </div>

                <div className="py-8">
                    <div className="mx-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                        <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 bg-white p-6 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-80">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    placeholder="Buscar empresa..."
                                    className="block w-full rounded-xl border-gray-300 bg-gray-50 py-2.5 pl-10 text-sm text-black focus:border-green-500 focus:ring-green-500"
                                />
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                disabled={AvailableCheckins.length === 0}
                                title={
                                    AvailableCheckins.length === 0
                                        ? 'No hay habitaciones activas sin convenio para agrupar'
                                        : undefined
                                }
                                className="group flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-green-500 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                                <span>Nueva Cuenta Maestra</span>
                            </button>
                        </div>

                        {filteredAccounts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                                <Building2 className="h-10 w-10 text-gray-300" />
                                <p className="text-sm font-semibold text-gray-500">
                                    {CorporateAccounts.length === 0
                                        ? 'Todavía no hay Cuentas Maestras creadas.'
                                        : 'Ninguna empresa coincide con la búsqueda.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
                                {filteredAccounts.map((acc) => (
                                    <button
                                        key={acc.id}
                                        onClick={() =>
                                            setAccountToViewId(acc.id)
                                        }
                                        className="flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                                    >
                                        <div className="flex w-full items-start justify-between gap-2">
                                            <h3 className="text-base font-bold text-gray-900">
                                                {acc.company_name}
                                            </h3>
                                            <span
                                                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                                                    acc.is_in_mora
                                                        ? 'bg-red-100 text-red-700'
                                                        : acc.is_due
                                                          ? 'bg-amber-100 text-amber-700'
                                                          : 'bg-emerald-100 text-emerald-700'
                                                }`}
                                            >
                                                {acc.is_in_mora
                                                    ? 'MORA'
                                                    : acc.is_due
                                                      ? 'POR COBRAR'
                                                      : 'AL DÍA'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            Cuota cada{' '}
                                            {acc.payment_frequency_days}{' '}
                                            día(s)
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Users className="h-3.5 w-3.5" />
                                            {acc.rooms.length} habitación(es)
                                            · Bs{' '}
                                            {acc.total_daily_rate.toFixed(2)}
                                            /día grupo
                                        </div>

                                        <div className="mt-1 w-full border-t border-gray-200 pt-3">
                                            <span className="block text-xs text-gray-400">
                                                Saldo del grupo
                                            </span>
                                            <span
                                                className={`text-lg font-bold ${
                                                    acc.total_balance < 0
                                                        ? 'text-red-600'
                                                        : 'text-emerald-600'
                                                }`}
                                            >
                                                Bs{' '}
                                                {acc.total_balance.toFixed(2)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CreateMasterAccountModal
                show={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                availableCheckins={AvailableCheckins}
            />

            <AccountDetailModal
                show={!!accountToView}
                onClose={() => setAccountToViewId(null)}
                account={accountToView}
                availableCheckins={AvailableCheckins}
                cashRegisters={CashRegisters}
            />
        </AuthenticatedLayout>
    );
}
