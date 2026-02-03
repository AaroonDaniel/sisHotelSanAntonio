import { useForm } from '@inertiajs/react';
import { X, Save, Clock, ArrowRightLeft, Hourglass, Type } from 'lucide-react';
import { useEffect, FormEventHandler } from 'react';

// 1. Definimos la interfaz para el Horario
interface Schedule {
    id: number;
    name: string;
    check_in_time: string;
    check_out_time: string;
    entry_tolerance_minutes: number;
    exit_tolerance_minutes: number;
    is_active?: boolean;
}

interface ScheduleModalProps {
    show: boolean;
    onClose: () => void;
    ScheduleToEdit?: Schedule | null;
}

export default function ScheduleModal({ show, onClose, ScheduleToEdit }: ScheduleModalProps) {
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        check_in_time: '06:00', // Valor por defecto
        check_out_time: '12:00',
        entry_tolerance_minutes: 60,
        exit_tolerance_minutes: 60,
        is_active: true,
    });

    useEffect(() => {
        if (show) {
            if (ScheduleToEdit) {
                setData({
                    name: ScheduleToEdit.name,
                    check_in_time: ScheduleToEdit.check_in_time.substring(0, 5), // Ajuste formato HH:MM
                    check_out_time: ScheduleToEdit.check_out_time.substring(0, 5),
                    entry_tolerance_minutes: ScheduleToEdit.entry_tolerance_minutes,
                    exit_tolerance_minutes: ScheduleToEdit.exit_tolerance_minutes,
                    is_active: ScheduleToEdit.is_active ?? true,
                });
            } else {
                reset();
            }
            clearErrors();
        }
    }, [show, ScheduleToEdit]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const onSuccess = () => { reset(); onClose(); };
        
        if (ScheduleToEdit) {
            put(`/horarios/${ScheduleToEdit.id}`, { onSuccess });
        } else {
            post('/horarios', { onSuccess });
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            {/* Usamos el reloj pero con el color verde que pediste */}
                            <Clock className="h-5 w-5" />
                        </div>
                        {ScheduleToEdit ? 'Editar Horario' : 'Nuevo Horario'}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* --- FORMULARIO --- */}
                <form onSubmit={submit} className="p-6">
                    <div className="space-y-4">
                        
                        {/* 1. Nombre del Turno */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Nombre del Turno
                            </label>
                            
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Type className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="Ej: Horario"
                                    autoFocus
                                />
                            </div>
                            {errors.name && <p className="mt-1 text-xs text-red-500 font-bold">{errors.name}</p>}
                        </div>

                        {/* 2. Grid de Horas (Entrada / Salida) */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Hora Entrada */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Hora Entrada</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="time"
                                        value={data.check_in_time}
                                        onChange={(e) => setData('check_in_time', e.target.value)}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                    />
                                </div>
                                {errors.check_in_time && <p className="mt-1 text-xs text-red-500 font-bold">{errors.check_in_time}</p>}
                            </div>

                            {/* Hora Salida */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Hora Salida</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="time"
                                        value={data.check_out_time}
                                        onChange={(e) => setData('check_out_time', e.target.value)}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                    />
                                </div>
                                {errors.check_out_time && <p className="mt-1 text-xs text-red-500 font-bold">{errors.check_out_time}</p>}
                            </div>
                        </div>

                        {/* 3. Sección Tolerancias */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600">
                                <Hourglass className="h-3 w-3" />
                                Configuración de Tolerancias (Min)
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {/* Tolerancia Entrada */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">Antes de entrar</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.entry_tolerance_minutes}
                                            onChange={(e) => setData('entry_tolerance_minutes', parseInt(e.target.value))}
                                            className="w-full rounded-lg border border-gray-400 py-1.5 px-3 text-sm text-black focus:border-gray-600 focus:ring-0"
                                        />
                                    </div>
                                    <p className="mt-1 text-[10px] text-gray-500">Ej: 60 min antes</p>
                                </div>

                                {/* Tolerancia Salida */}
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-600">Después de salir</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={data.exit_tolerance_minutes}
                                            onChange={(e) => setData('exit_tolerance_minutes', parseInt(e.target.value))}
                                            className="w-full rounded-lg border border-gray-400 py-1.5 px-3 text-sm text-black focus:border-gray-600 focus:ring-0"
                                        />
                                    </div>
                                    <p className="mt-1 text-[10px] text-gray-500">Ej: 60 min gracia</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* --- FOOTER / BOTONES --- */}
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={processing} 
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-green-500 active:scale-95 transition disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}