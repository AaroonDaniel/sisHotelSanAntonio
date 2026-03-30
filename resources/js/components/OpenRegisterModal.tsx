import { FormEventHandler } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Wallet, AlertTriangle } from 'lucide-react';

export default function OpenRegisterModal() {
    // 1. Traemos la información del usuario y su caja desde el backend
    const { auth } : any = usePage().props;

    // 2. Preparamos el formulario de Inertia
    const { data, setData, post, processing, errors } = useForm({
        opening_amount: '',
    });

    // 3. EL CANDADO: Si no hay usuario, o el usuario YA TIENE una caja abierta, nos escondemos.
    if (!auth.user || auth.active_register) {
        return null; 
    }

    // 4. Enviar los datos al backend
    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/cash-registers/open'); 
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in zoom-in-95">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 rounded-full bg-green-50 p-5 shadow-inner">
                        <Wallet className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Apertura de Caja</h2>
                    <p className="mt-2 text-base text-gray-800">
                        Hola <b className="text-green-600">{auth.user.name}</b>. Para iniciar tu turno y habilitar el sistema, por favor declara tu efectivo base.
                    </p>
                </div>

                <form onSubmit={submit}>
                    <div className="mb-8">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-800">
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
                                onChange={(e) => setData('opening_amount', e.target.value)}
                                className="block w-full rounded-xl border-2 border-gray-200 py-3 pl-12 pr-4 text-xl font-black text-gray-800 transition-colors focus:border-green-500 focus:ring-green-500"
                                placeholder="0.00"
                            />
                        </div>
                        {errors.opening_amount && (
                            <p className="mt-2 text-xs font-bold text-red-500">{errors.opening_amount}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !data.opening_amount}
                        className="w-full rounded-xl bg-green-600 py-4 text-base font-black tracking-widest text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg disabled:opacity-50 active:scale-95"
                    >
                        {processing ? 'ABRIENDO CAJA...' : 'INICIAR TURNO'}
                    </button>
                </form>
            </div>
        </div>
    );
}