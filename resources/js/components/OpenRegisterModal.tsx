import { router, useForm, usePage } from '@inertiajs/react'; // 1. Importamos 'router' de Inertia
import { Wallet, X } from 'lucide-react'; // 2. Importamos el ícono 'X'
import { FormEventHandler } from 'react';

export default function OpenRegisterModal() {
    const { auth }: any = usePage().props;

    const { data, setData, post, processing, errors } = useForm({
        opening_amount: '',
    });

    if (!auth.user || auth.active_register) {
        return null;
    }

    // Para el formulario manual (si ingresan un monto)
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/cash-registers/open');
    };

    // 3. Función para abrir la caja con 0 Bs cuando tocan la X
    const handleOpenWithZero = () => {
        router.post('/cash-registers/open', { opening_amount: 0 });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            {/* Se añade 'relative' al contenedor principal para posicionar la X de forma absoluta */}
            <div className="relative w-full max-w-md animate-in rounded-2xl bg-white p-8 shadow-2xl zoom-in-95">
                {/* 4. Botón X en la esquina superior derecha */}
                <button
                    onClick={handleOpenWithZero}
                    type="button"
                    className="absolute top-4 right-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Cerrar"
                >
                    <X className="h-6 w-6" />
                </button>

                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 rounded-full bg-green-50 p-5 shadow-inner">
                        <Wallet className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-800 uppercase">
                        Apertura de Caja
                    </h2>
                    <p className="mt-2 text-base text-gray-800">
                        Hola <b className="text-green-600">{auth.user.name}</b>.
                        Para iniciar tu turno y habilitar el sistema, por favor
                        declara tu efectivo base.
                    </p>
                </div>

                <form onSubmit={submit}>
                    <div className="mb-8">
                        <label className="mb-2 block text-xs font-bold tracking-wider text-gray-800 uppercase">
                            Efectivo Inicial en Caja
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-4 flex items-center font-black text-gray-500">
                                Bs
                            </span>
                            <input
                                type="number"
                                step="0.50"
                                min="0"
                                required
                                autoFocus
                                value={data.opening_amount}
                                onChange={(e) =>
                                    setData('opening_amount', e.target.value)
                                }
                                className="block w-full [appearance:textfield] rounded-xl border-2 border-gray-200 py-3 pr-4 pl-12 text-xl font-black text-gray-800 transition-colors focus:border-green-500 focus:ring-green-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                placeholder="0.00"
                            />
                        </div>
                        {errors.opening_amount && (
                            <p className="mt-2 text-xs font-bold text-red-500">
                                {errors.opening_amount}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !data.opening_amount}
                        className="w-full rounded-xl bg-green-600 py-4 text-base font-black tracking-widest text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        {processing ? 'ABRIENDO CAJA...' : 'INICIAR TURNO'}
                    </button>
                </form>
            </div>
        </div>
    );
}
