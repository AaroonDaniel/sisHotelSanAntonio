import { Search, X } from 'lucide-react';

interface ReservationDetailModalProps {
    show: boolean;
    onClose: () => void;
    reservation: any;
    operators?: { id: number; full_name: string; nickname?: string }[];
}

const formatDateTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Modal de solo lectura -- muestra TODOS los datos ya cargados de la
// reserva (el objeto que ya trae cada fila de la lista/tabla), sin pegarle
// de nuevo al backend. Reutilizado por viewReservationModal.tsx y
// reservations/index.tsx, respetando el mismo lenguaje visual que el
// resto de los modales de Reservas (AssignRoomsModal, CancelModal): shell
// blanco redondeado, header con ícono + título + X, secciones con label
// gris chico en mayúscula, footer con botón "Cerrar".
export default function ReservationDetailModal({
    show,
    onClose,
    reservation,
    operators = [],
}: ReservationDetailModalProps) {
    if (!show || !reservation) return null;

    const operator = operators.find((o) => o.id === reservation.operator_id);
    const specialAgreement = reservation.special_agreement;
    const assignedDetails = (reservation.details || []).filter(
        (d: any) => d.room_id,
    );

    return (
        <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
            <div className="flex max-h-[85vh] w-full max-w-2xl animate-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <Search className="h-5 w-5" />
                        </div>
                        Detalle de Reserva #{reservation.id}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-6">
                    {/* Huésped / Solicitante */}
                    <section>
                        <p className="mb-2 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                            Huésped / Solicitante
                        </p>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-base font-black text-gray-800 uppercase">
                                {reservation.guest?.full_name || 'Sin nombre'}
                            </p>
                           
                            {reservation.guest?.phone && (
                                <p className="text-xs text-gray-500">
                                    Tel: {reservation.guest.phone}
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Datos de la reserva */}
                    <section>
                        <p className="mb-2 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                            Reserva
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    Estado
                                </p>
                                <p className="text-sm font-black text-gray-800 uppercase">
                                    {reservation.status}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    Tipo
                                </p>
                                <p className="text-sm font-black text-gray-800 uppercase">
                                    {specialAgreement?.type || 'Normal'}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    Llegada
                                </p>
                                <p className="text-sm font-black text-gray-800">
                                    {reservation.arrival_date}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    Noches
                                </p>
                                <p className="text-sm font-black text-gray-800">
                                    {reservation.duration_days}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    Personas
                                </p>
                                <p className="text-sm font-black text-gray-800">
                                    {reservation.guest_count}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    Registrada
                                </p>
                                <p className="text-sm font-black text-gray-800">
                                    {formatDateTime(reservation.created_at)}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Convenio, solo si es corporativo/delegación */}
                    {specialAgreement && (
                        <section>
                            <p className="mb-2 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                                Convenio (Corporativo / Delegación)
                            </p>
                            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                                <p className="text-sm font-black text-purple-800 uppercase">
                                    {specialAgreement.company_name ||
                                        'Sin nombre de empresa'}
                                </p>
                                <p className="text-xs font-bold text-purple-600 uppercase">
                                    {specialAgreement.type}
                                    {specialAgreement.status &&
                                        ` · ${specialAgreement.status}`}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Habitaciones asignadas */}
                    <section>
                        <p className="mb-2 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                            Habitaciones
                        </p>
                        {assignedDetails.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {assignedDetails.map((d: any, idx: number) => (
                                    <span
                                        key={idx}
                                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-black text-green-700 uppercase"
                                    >
                                        Hab. {d.room?.number}
                                        {d.room?.room_type?.name
                                            ? ` · ${d.room.room_type.name}`
                                            : ''}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-center text-xs font-bold text-gray-400 uppercase">
                                Sin asignar
                            </p>
                        )}
                    </section>

                    {/* Adelanto y pagos */}
                    <section>
                        <p className="mb-2 text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                            Adelanto
                        </p>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-lg font-black text-gray-800">
                                {Number(
                                    reservation.advance_payment || 0,
                                ).toFixed(2)}{' '}
                                Bs
                            </p>
                            <p className="text-xs font-bold text-gray-500 uppercase">
                                {reservation.payment_method || 'Sin adelanto'}
                            </p>
                            {operator && (
                                <p className="mt-1 text-xs text-gray-800 font-bold">
                                    Registrado por: {operator.full_name}
                                </p>
                            )}
                        </div>

                        {reservation.payments?.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {reservation.payments.map(
                                    (p: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs"
                                        >
                                            <span className="font-bold text-gray-600 uppercase">
                                                {p.type}
                                            </span>
                                            <span className="text-gray-500">
                                                {p.method}
                                                {p.bank_name
                                                    ? ` · ${p.bank_name}`
                                                    : ''}
                                            </span>
                                            <span
                                                className={`font-black ${
                                                    Number(p.amount) < 0
                                                        ? 'text-red-600'
                                                        : 'text-green-700'
                                                }`}
                                            >
                                                {Number(p.amount).toFixed(2)}{' '}
                                                Bs
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                    </section>
                </div>

                <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
