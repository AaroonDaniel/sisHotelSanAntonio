import { useForm } from '@inertiajs/react';
import { Brush, CheckCircle, Camera, Wrench, X, AlertTriangle, FileText, Save } from 'lucide-react';
import { FormEventHandler, useState, useRef } from 'react';

interface CleanConfirmModalProps {
    show: boolean;
    onClose: () => void;
    room: any;
}

export default function CleanConfirmModal({ show, onClose, room }: CleanConfirmModalProps) {
    const [isReportingDamage, setIsReportingDamage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Formulario para Habilitar Limpieza (Ruta Original)
    const { put: cleanPut, processing: isCleaning } = useForm();

    // Formulario para Reportar Mantenimiento (Con Foto y Detalles)
    const { data, setData, post: maintenancePost, processing: isMaintaining, reset, errors, clearErrors } = useForm({
        issue: '',
        description: '',
        photo: null as File | null,
    });

    // --- ACCIÓN 1: CAMINO FELIZ (Todo limpio) ---
    const submitClean: FormEventHandler = (e) => {
        e.preventDefault();
        if (room) {
            cleanPut(`/rooms/${room.id}/clean`, {
                preserveScroll: true, // <-- Mantenemos el scroll como en tu estándar
                onSuccess: () => onClose(),
            });
        }
    };

    // --- ACCIÓN 2: CAMINO TRISTE (Enviar a Mantenimiento) ---
    const submitMaintenance: FormEventHandler = (e) => {
        e.preventDefault();
        if (room) {
            maintenancePost(`/rooms/${room.id}/maintenance`, {
                preserveScroll: true,
                forceFormData: true, // Importante para enviar la foto
                onSuccess: () => {
                    handleClose();
                },
            });
        }
    };

    // Resetea el modal al cerrarlo o cancelar
    const handleClose = () => {
        setIsReportingDamage(false);
        reset();
        clearErrors();
        onClose();
    };

    if (!show || !room) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* ========================================================= */}
                {/* VISTA 1: PREGUNTA INICIAL (¿Está limpia o dañada?) */}
                {/* ========================================================= */}
                {!isReportingDamage ? (
                    <div className="p-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
                            <Brush className="h-7 w-7" />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-gray-800">
                            ¿Habitación {room.number} lista?
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                            Selecciona el estado actual de la habitación tras la revisión del personal.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={submitClean}
                                disabled={isCleaning}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50"
                            >
                                {isCleaning ? 'Habilitando...' : <><CheckCircle className="h-5 w-5" /> Sí, está limpia y disponible</>}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setIsReportingDamage(true); clearErrors(); }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100 hover:text-red-700 active:scale-95"
                            >
                                <AlertTriangle className="h-4 w-4" /> Reportar daño / Mantenimiento
                            </button>

                            <button
                                type="button"
                                onClick={handleClose}
                                className="mt-2 text-sm font-semibold text-gray-400 hover:text-gray-600"
                            >
                                Cancelar y cerrar
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ========================================================= */
                    /* VISTA 2: FORMULARIO DE MANTENIMIENTO (Estilo FloorModal)  */
                    /* ========================================================= */
                    <form onSubmit={submitMaintenance}>
                        {/* Header estilo FloorModal */}
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                                <div className="rounded-lg bg-red-100 p-1.5 text-red-600">
                                    <Wrench className="h-5 w-5" />
                                </div>
                                Reportar Daño
                            </h2>
                            <button type="button" onClick={() => setIsReportingDamage(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 transition">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body con cajas exactas a FloorModal */}
                        <div className="p-6 space-y-4">
                            {/* Problema / Issue */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    ¿Qué se dañó? <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <AlertTriangle className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={data.issue}
                                        onChange={(e) => setData('issue', e.target.value.toUpperCase())}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0"
                                        placeholder="EJ: PANTALLA ROTA"
                                    />
                                </div>
                                {errors.issue && <p className="mt-1 text-xs text-red-500 font-bold">{errors.issue}</p>}
                            </div>

                            {/* Detalles Adicionales */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    Detalles adicionales (Opcional)
                                </label>
                                <div className="relative">
                                    <div className="absolute top-2.5 left-0 flex items-start pl-3 pointer-events-none">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value.toUpperCase())}
                                        className="w-full rounded-lg border border-gray-400 py-2 pr-3 pl-10 text-base text-black uppercase focus:border-gray-600 focus:ring-0 resize-none"
                                        placeholder="EJ: SUCEDIÓ EN EL BAÑO..."
                                    />
                                </div>
                            </div>

                            {/* Foto de Evidencia */}
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                    Foto de Evidencia (Opcional)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={(e) => setData('photo', e.target.files ? e.target.files[0] : null)}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm font-bold uppercase transition-all ${data.photo ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-400 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-500'}`}
                                >
                                    <Camera className="h-5 w-5" />
                                    {data.photo ? `FOTO: ${data.photo.name}` : 'SUBIR FOTO DEL DAÑO'}
                                </button>
                            </div>
                        </div>

                        {/* Footer estilo FloorModal */}
                        <div className="px-6 pb-6">
                            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsReportingDamage(false)}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isMaintaining || !data.issue}
                                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-red-500 active:scale-95 transition disabled:opacity-50"
                                >
                                    {isMaintaining ? 'Guardando...' : <><Save className="h-4 w-4" /> Bloquear Habitación</>}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}