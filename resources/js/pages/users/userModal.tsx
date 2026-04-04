import { useForm } from '@inertiajs/react';
import {
    Clock,
    KeyRound,
    MapPin,
    Phone,
    Save,
    UserCircle,
    X,
    ShieldCheck
} from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface UserModalProps {
    show: boolean;
    onClose: () => void;
    userToEdit?: User | null;
    roles: any[];
}

export interface User {
    id: number;
    nickname: string;
    full_name: string;
    phone: string;
    address: string;
    shift?: string;
    is_active: boolean;
    roles?: any[];
}

export default function UserModal({
    show,
    onClose,
    userToEdit,
    roles,
}: UserModalProps) {
    const isEditing = !!userToEdit;

    const [isCustomShift, setIsCustomShift] = useState(false);
    const [customStart, setCustomStart] = useState('08:00');
    const [customEnd, setCustomEnd] = useState('16:00');

    const shiftOptions = [
        { label: 'MAÑANA (08:00 a 16:00)', value: '08:00 a 16:00' },
        { label: 'TARDE (16:00 a 00:00)', value: '16:00 a 00:00' },
        { label: 'NOCHE (00:00 a 08:00)', value: '00:00 a 08:00' },
    ];

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm({
            nickname: '',
            full_name: '',
            phone: '',
            address: '',
            shift: '',
            password: '',
            role: ''
        });

    useEffect(() => {
        if (show) {
            if (userToEdit) {
                const existingShift = userToEdit.shift || '';
                const isPredefined = shiftOptions.some(opt => opt.value === existingShift);
                
                if (!isPredefined && existingShift !== '') {
                    setIsCustomShift(true);
                    setData('shift', 'OTRO');
                    
                    const parts = existingShift.split(' a ');
                    if (parts.length === 2) {
                        setCustomStart(parts[0]);
                        setCustomEnd(parts[1]);
                    }
                } else {
                    setIsCustomShift(false);
                    setData('shift', existingShift);
                }

                setData(prev => ({
                    ...prev,
                    nickname: userToEdit.nickname || '',
                    full_name: userToEdit.full_name || '',
                    phone: userToEdit.phone || '',
                    address: userToEdit.address || '',
                    password: '',
                    role: userToEdit.roles && userToEdit.roles.length > 0 ? userToEdit.roles[0].name : '',
                }));

            } else {
                reset();
                setIsCustomShift(false);
            }
            clearErrors();
        }
    }, [show, userToEdit]);

    useEffect(() => {
        if (isCustomShift) {
            setData('shift', `${customStart} a ${customEnd}`);
        }
    }, [customStart, customEnd, isCustomShift]);

    const handleShiftSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'OTRO') {
            setIsCustomShift(true);
        } else {
            setIsCustomShift(false);
            setData('shift', val);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (userToEdit) {
            put(`/usuarios/${userToEdit.id}`, options);
        } else {
            post('/usuarios', options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200 fade-in">
            {/* CONTENEDOR PRINCIPAL: flex-col, overflow-hidden y max-h-[90vh] para no salir de la pantalla */}
            <div className="flex w-full max-w-lg max-h-[80vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 animate-in zoom-in-95">
                
                {/* HEADER: Fijo (shrink-0) */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <UserCircle className="h-5 w-5" />
                        </div>
                        {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* FORM: Debe ser flex-col y ocupar el espacio restante (flex-1), ocultando el desborde general */}
                <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
                    
                    {/* BODY (ÁREA SCROLLABLE): flex-1 y overflow-y-auto */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        
                        {/* Nombre Completo */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nombre Completo</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <UserCircle className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.full_name}
                                    onChange={(e) => setData('full_name', e.target.value.toUpperCase())}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="EJ: JUAN PEREZ"
                                />
                            </div>
                            {errors.full_name && <p className="mt-1 text-xs font-bold text-red-500">{errors.full_name}</p>}
                        </div>

                        {/* Nickname y Teléfono */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nickname</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-gray-400">@</div>
                                    <input
                                        type="text"
                                        value={data.nickname}
                                        onChange={(e) => setData('nickname', e.target.value.toLowerCase().replace(/\s/g, ''))}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base font-semibold text-blue-600 focus:border-gray-600 focus:ring-0"
                                        placeholder="jperez"
                                    />
                                </div>
                                {errors.nickname && <p className="mt-1 text-xs font-bold text-red-500">{errors.nickname}</p>}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Teléfono</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                        placeholder="77123456"
                                    />
                                </div>
                                {errors.phone && <p className="mt-1 text-xs font-bold text-red-500">{errors.phone}</p>}
                            </div>
                        </div>

                        {/* Dirección */}
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Dirección / Zona</label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value.toUpperCase())}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                    placeholder="EJ: ZONA CENTRAL"
                                />
                            </div>
                            {errors.address && <p className="mt-1 text-xs font-bold text-red-500">{errors.address}</p>}
                        </div>

                        {/* Turno y Rol */}
                        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                            {/* Selector de Turno Principal */}
                            <div className="flex flex-col gap-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Horario Asignado</label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <select
                                            value={isCustomShift ? 'OTRO' : data.shift}
                                            onChange={handleShiftSelectChange}
                                            className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-sm font-medium text-black focus:border-gray-600 focus:ring-0"
                                            required
                                        >
                                            <option value="" disabled>SELECCIONAR...</option>
                                            {shiftOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                            <option value="OTRO">OTRO HORARIO (Personalizado)</option>
                                        </select>
                                    </div>
                                    {errors.shift && !isCustomShift && <p className="mt-1 text-xs font-bold text-red-500">{errors.shift}</p>}
                                </div>

                                {/* Inputs que aparecen si eliges "OTRO" */}
                                {isCustomShift && (
                                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-2 animate-in slide-in-from-top-2">
                                        <input
                                            type="time"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-full rounded border border-blue-200 px-2 py-1.5 text-xs font-bold text-blue-900 focus:border-blue-500 focus:ring-0"
                                            required
                                        />
                                        <span className="text-xs font-bold text-blue-400">A</span>
                                        <input
                                            type="time"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full rounded border border-blue-200 px-2 py-1.5 text-xs font-bold text-blue-900 focus:border-blue-500 focus:ring-0"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Selector de Cargo (Rol) */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-blue-700">Cargo (Rol)</label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <select
                                        value={data.role}
                                        onChange={(e) => setData('role', e.target.value)}
                                        className="w-full rounded-lg border border-blue-300 bg-blue-50 py-2 pr-3 pl-10 text-sm font-bold text-blue-900 focus:border-blue-600 focus:ring-0"
                                        required
                                    >
                                        <option value="" disabled>SELECCIONAR CARGO...</option>
                                        {roles && roles.map((r: any) => (
                                            <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                {errors.role && <p className="mt-1 text-xs font-bold text-red-500">{errors.role}</p>}
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                Contraseña {isEditing && <span className="text-xs font-normal text-gray-400">(Dejar en blanco para no cambiar)</span>}
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <KeyRound className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black focus:border-gray-600 focus:ring-0"
                                    placeholder="********"
                                    required={!isEditing}
                                />
                            </div>
                            {errors.password && <p className="mt-1 text-xs font-bold text-red-500">{errors.password}</p>}
                        </div>
                    </div>

                    {/* FOOTER: Fijo en la parte inferior (shrink-0) */}
                    <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 bg-gray-50 p-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-green-500 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? 'Guardando...' : <><Save className="h-4 w-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}