import { useForm } from '@inertiajs/react';
import { Receipt, X, Save, Loader2, AlertCircle } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

interface Expense {
    id: number;
    description: string;
    amount: string | number;
}

interface ExpenseModalProps {
    show: boolean;
    onClose: () => void;
    expenseToEdit?: Expense | null;
}

export default function ExpenseModal({ show, onClose, expenseToEdit }: ExpenseModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        description: '',
        amount: '',
    });

    useEffect(() => {
        if (show) {
            if (expenseToEdit) {
                setData({
                    description: expenseToEdit.description,
                    amount: String(expenseToEdit.amount),
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, expenseToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        if (expenseToEdit) {
            put(`/gastos/${expenseToEdit.id}`, {
                onSuccess: () => onClose(),
            });
        } else {
            post('/gastos', {
                onSuccess: () => onClose(),
            });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className={`flex items-center justify-between border-b px-6 py-4 ${expenseToEdit ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <h3 className={`flex items-center gap-2 text-lg font-bold ${expenseToEdit ? 'text-blue-800' : 'text-orange-800'}`}>
                        <div className={`rounded-lg p-1.5 ${expenseToEdit ? 'bg-blue-200 text-blue-700' : 'bg-orange-200 text-orange-700'}`}>
                            <Receipt className="h-5 w-5" />
                        </div>
                        {expenseToEdit ? 'Editar Gasto' : 'Registrar Gasto'}
                    </h3>
                    <button onClick={onClose} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="p-6">
                    {(errors as any).error && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <p>{(errors as any).error}</p>
                        </div>
                    )}

                    <div className="space-y-5">
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-700">Descripción / Concepto</label>
                            <input
                                type="text"
                                required
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className={`w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:ring-2 ${expenseToEdit ? 'focus:border-blue-500 focus:ring-blue-500/20' : 'focus:border-orange-500 focus:ring-orange-500/20'}`}
                            />
                            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-700">Monto (Bs)</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-bold">Bs.</span>
                                <input
                                    type="number"
                                    required
                                    step="0.10"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className={`w-full rounded-xl border border-gray-300 py-2.5 pl-12 pr-4 text-lg font-bold text-gray-900 focus:ring-2 ${expenseToEdit ? 'focus:border-blue-500 focus:ring-blue-500/20' : 'focus:border-orange-500 focus:ring-orange-500/20'}`}
                                />
                            </div>
                            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={processing} className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${expenseToEdit ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-600 hover:bg-orange-500'}`}>
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {expenseToEdit ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}