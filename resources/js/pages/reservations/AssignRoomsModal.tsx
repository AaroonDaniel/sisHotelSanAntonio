import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    BedDouble,
    Calendar,
    CheckCircle2,
    Loader2,
    Save,
    Search,
    Undo2,
    User,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface AssignRoomsModalProps {
    show: boolean;
    onClose: () => void;
    reservation: any;
    availableRooms: any[];
    /**
     * 'assign'  -> "Asignar Habitación" (Tabla 1): solo arma los grupos
     *              y bloquea las habitaciones (PATCH /rooms). Sin
     *              precio, sin Checkin, la reserva sigue 'pendiente'.
     * 'confirm' -> "Confirmar Reserva / Check-in": si la reserva YA
     *              tiene todas sus habitaciones asignadas (viene de la
     *              Tabla 2), salta directo a confirmar. Si no, hace el
     *              matchmaking primero. La reserva NUNCA pide precio --
     *              eso se define después, al editar la estadía ya
     *              creada. Solo pregunta a qué habitación se registra el
     *              adelanto cuando hace falta elegir (reserva normal,
     *              con adelanto, 2+ habitaciones). Termina creando los
     *              Checkins (PUT /reservas/{id} status=confirmada).
     */
    mode: 'assign' | 'confirm';
}

const getRoomCapacity = (room: any): number =>
    room.room_type?.capacity || room.roomType?.capacity || 1;

const isRoomAlreadyAssigned = (reservation: any): boolean =>
    (reservation?.details || []).length > 0 &&
    reservation.details.every((d: any) => d.room_id !== null);

const buildConfirmRows = (details: any[]) =>
    (details || [])
        .filter((d: any) => d.room_id)
        .map((d: any) => ({
            detailId: d.id,
            roomNumber: d.room?.number ?? String(d.room_id),
            roomId: d.room_id,
        }));

export default function AssignRoomsModal({
    show,
    onClose,
    reservation,
    availableRooms = [],
    mode,
}: AssignRoomsModalProps) {
    // --- FASE: 'matchmaking' (armar grupos + elegir habitación) o
    // 'confirming' (revisar habitaciones + elegir a cuál va el adelanto,
    // solo en modo 'confirm' -- nunca se pide precio acá) ---
    const [phase, setPhase] = useState<'matchmaking' | 'confirming'>(
        'matchmaking',
    );

    const totalPeople = Number(reservation?.guest_count) || 1;
    const advancePayment = Number(reservation?.advance_payment) || 0;
    // Corporativo/delegación resuelve el adelanto vía special_agreement_id
    // (saldo de grupo) -- ahí nunca hace falta elegir habitación.
    const hasSpecialAgreement = Boolean(reservation?.special_agreement_id);

    // personIndex (1..N) -> room asignada en esta sesión del modal
    const [assignedMap, setAssignedMap] = useState<Record<number, any>>({});
    // Personas actualmente tildadas, esperando que se les elija habitación
    const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
    // Habitación tentativamente clickeada en el grid, esperando el botón
    // "Confirmar Habitación" de la izquierda -- clickear una tarjeta ya NO
    // la asigna directo, solo la marca como candidata. Recién se reserva
    // (queda en assignedMap, lista para el PATCH final) al confirmar.
    const [pendingRoom, setPendingRoom] = useState<{
        id: number;
        number: string;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Habitaciones ya asignadas, listas para confirmar (sin precio). Se
    // llenan desde reservation.details (si ya venía asignada) o después
    // de guardar el matchmaking.
    const [confirmRows, setConfirmRows] = useState<
        { detailId: number; roomNumber: string; roomId: number }[]
    >([]);
    // A qué detalle/habitación se le registra el adelanto ya cobrado.
    const [advanceDetailId, setAdvanceDetailId] = useState<number | null>(
        null,
    );

    // Solo hay que preguntar cuando realmente hay ambigüedad: reserva
    // normal, con adelanto, y más de una habitación entre las que elegir.
    const needsAdvancePicker =
        !hasSpecialAgreement && advancePayment > 0 && confirmRows.length > 1;
    const canConfirm = !needsAdvancePicker || advanceDetailId !== null;

    useEffect(() => {
        if (!show || !reservation) return;

        setSearchQuery('');
        setIsProcessing(false);
        setErrorMsg(null);
        setSelectedPeople([]);
        setPendingRoom(null);

        const alreadyAssigned = isRoomAlreadyAssigned(reservation);

        if (mode === 'confirm' && alreadyAssigned) {
            // Ya pasó por "Asignar Habitación" -- directo a confirmar.
            setAssignedMap({});
            setPhase('confirming');
            const rows = buildConfirmRows(reservation.details);
            setConfirmRows(rows);
            setAdvanceDetailId(rows.length === 1 ? rows[0].detailId : null);
        } else {
            setPhase('matchmaking');
            setConfirmRows([]);
            setAdvanceDetailId(null);

            // Reconstruir cómo estaba distribuida la reserva ANTES de
            // editar: reservation_details solo guarda qué habitaciones se
            // usaron, no qué persona fue a cuál (esa parte nunca se
            // persistió), así que rellenamos personas 1..N en orden,
            // habitación por habitación, hasta la capacidad de cada una.
            // No es necesariamente el reparto exacto original, pero
            // refleja fielmente "qué habitaciones tenía" en vez de
            // arrancar en blanco -- y el usuario puede soltar (X) a
            // cualquier persona para reasignarla distinto.
            const totalPeopleNow = Number(reservation?.guest_count) || 1;
            const initialMap: Record<number, any> = {};
            if (alreadyAssigned) {
                let personCursor = 1;
                for (const detail of reservation.details as any[]) {
                    const room = detail.room;
                    if (!room) continue;
                    const capacity = getRoomCapacity(room);
                    for (
                        let i = 0;
                        i < capacity && personCursor <= totalPeopleNow;
                        i++
                    ) {
                        initialMap[personCursor] = room;
                        personCursor++;
                    }
                }
            }
            setAssignedMap(initialMap);
        }
    }, [show, reservation, mode]);

    const daysUntilArrival = useMemo(() => {
        if (!reservation?.arrival_date) return 0;
        const arrival = new Date(reservation.arrival_date);
        const today = new Date();
        arrival.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return Math.ceil(
            (arrival.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
    }, [reservation?.arrival_date]);

    // Habitaciones ya usadas por otro grupo en ESTA sesión del modal.
    const usedRoomIds = useMemo(
        () => Object.values(assignedMap).map((r: any) => r.id),
        [assignedMap],
    );

    // Filtro en vivo: capacidad >= cantidad de personas tildadas ahora mismo.
    // Se muestran en orden de número de habitación (natural: "2" antes que
    // "10"), no en el orden en que llegó el prop desde el backend.
    const filteredRooms = useMemo(() => {
        const neededCapacity = Math.max(1, selectedPeople.length);

        return availableRooms
            .filter((room) => {
                if (usedRoomIds.includes(room.id)) return false;
                if (getRoomCapacity(room) < neededCapacity) return false;

                const roomStatus = room.status?.toUpperCase() || 'DESCONOCIDO';
                // Ocupadas (con huésped adentro ahora mismo) nunca se
                // ofrecen para asignar -- a diferencia de RESERVADO, que sí
                // puede liberarse antes de la llegada.
                if (roomStatus === 'OCUPADO' || roomStatus === 'INCOMPLETO') {
                    return false;
                }
                if (roomStatus === 'RESERVADO' && daysUntilArrival <= 5) {
                    return false;
                }

                if (searchQuery) {
                    const query = searchQuery.toLowerCase().trim();
                    if (!String(room.number).toLowerCase().includes(query)) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) =>
                String(a.number).localeCompare(String(b.number), undefined, {
                    numeric: true,
                    sensitivity: 'base',
                }),
            );
    }, [availableRooms, usedRoomIds, selectedPeople, daysUntilArrival, searchQuery]);

    const unassignedPeople = useMemo(() => {
        const people: number[] = [];
        for (let i = 1; i <= totalPeople; i++) {
            if (!assignedMap[i]) people.push(i);
        }
        return people;
    }, [totalPeople, assignedMap]);

    const togglePerson = (personIndex: number) => {
        // Cambiar quién está tildado invalida cualquier habitación
        // tentativa (la capacidad requerida puede haber cambiado).
        setPendingRoom(null);
        setSelectedPeople((prev) =>
            prev.includes(personIndex)
                ? prev.filter((p) => p !== personIndex)
                : [...prev, personIndex],
        );
    };

    // Suelta a una persona ya asignada (típicamente al editar una
    // distribución reconstruida) para que vuelva al pool y se le pueda
    // elegir otra habitación. Si era la última persona de esa
    // habitación, la habitación vuelve a aparecer como disponible sola.
    const unassignPerson = (personIndex: number) => {
        setAssignedMap((prev) => {
            const next = { ...prev };
            delete next[personIndex];
            return next;
        });
    };

    // Clickear una tarjeta del grid solo la marca como candidata (o la
    // desmarca, si se clickea la misma de nuevo) -- todavía no asigna nada.
    const selectPendingRoom = (room: any) => {
        setPendingRoom((prev) => (prev?.id === room.id ? null : room));
    };

    // Botón "Confirmar Habitación" de la izquierda: acá recién se asigna
    // de verdad la habitación tentativa a las personas tildadas, y queda
    // lista para el PATCH final. Después limpia todo para pasar de una a
    // la siguiente habitación.
    const confirmRoomSelection = () => {
        if (!pendingRoom || selectedPeople.length === 0) return;
        setAssignedMap((prev) => {
            const next = { ...prev };
            selectedPeople.forEach((p) => {
                next[p] = pendingRoom;
            });
            return next;
        });
        setSelectedPeople([]);
        setSearchQuery('');
        setPendingRoom(null);
    };

    const allPeopleAssigned = unassignedPeople.length === 0;

    // Grupos únicos (room -> personas) para mostrar en el resumen izquierdo.
    const groupsSummary = useMemo(() => {
        const byRoomId: Record<number, { room: any; people: number[] }> = {};
        Object.entries(assignedMap).forEach(([personStr, room]) => {
            const person = Number(personStr);
            if (!byRoomId[room.id]) byRoomId[room.id] = { room, people: [] };
            byRoomId[room.id].people.push(person);
        });
        return Object.values(byRoomId);
    }, [assignedMap]);

    const submitMatchmaking = () => {
        setIsProcessing(true);
        setErrorMsg(null);

        const roomIds = groupsSummary.map((g) => g.room.id);

        router.patch(
            `/reservas/${reservation.id}/rooms`,
            { room_ids: roomIds },
            {
                preserveScroll: true,
                onSuccess: (page: any) => {
                    if (mode === 'assign') {
                        onClose();
                        return;
                    }

                    // mode === 'confirm': tomamos la reserva ya
                    // actualizada (con reservation_details reales, con
                    // id) desde la respuesta, y pasamos a confirmar.
                    const fresh = (page?.props?.reservations || []).find(
                        (r: any) => r.id === reservation.id,
                    );

                    if (fresh) {
                        const rows = buildConfirmRows(fresh.details);
                        setConfirmRows(rows);
                        setAdvanceDetailId(
                            rows.length === 1 ? rows[0].detailId : null,
                        );
                        setPhase('confirming');
                    } else {
                        setErrorMsg(
                            'Se guardó la asignación pero no se pudo continuar automáticamente. Cierre y use "Confirmar Reserva" de nuevo.',
                        );
                    }
                },
                onError: (errs: Record<string, string>) => {
                    setErrorMsg(Object.values(errs)[0] || 'Error al asignar.');
                },
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    const submitConfirmation = () => {
        setIsProcessing(true);
        setErrorMsg(null);

        const assignments = confirmRows.map((row) => ({
            detail_id: row.detailId,
            room_id: row.roomId,
        }));

        const payload: Record<string, any> = {
            status: 'confirmada',
            assignments,
        };
        if (advancePayment > 0 && advanceDetailId) {
            payload.advance_detail_id = advanceDetailId;
        }

        router.put(`/reservas/${reservation.id}`, payload, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs: Record<string, string>) => {
                setErrorMsg(Object.values(errs)[0] || 'Error al confirmar.');
            },
            onFinish: () => setIsProcessing(false),
        });
    };

    if (!show || !reservation) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <div className="rounded-lg bg-green-100 p-1.5 text-green-600">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        {phase === 'matchmaking'
                            ? 'ASIGNAR HABITACIONES'
                            : 'CONFIRMAR RESERVA / CHECK-IN'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {errorMsg && (
                    <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-6 py-3 text-sm font-bold text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {errorMsg}
                    </div>
                )}

                {phase === 'matchmaking' ? (
                    <div className="flex flex-1 overflow-hidden">
                        {/* COLUMNA IZQUIERDA: PERSONAS */}
                        <div className="flex w-full flex-col overflow-y-auto border-r border-gray-100 bg-white p-6 md:w-1/3 lg:w-1/4">
                            <div className="mb-4">
                                <p className="text-[11px] font-bold tracking-widest text-gray-600 uppercase">
                                    Reserva de
                                </p>
                                <h3 className="text-sm font-black text-gray-800 uppercase">
                                    {reservation.guest?.full_name}
                                </h3>
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-green-500">
                                    <Calendar className="h-3 w-3" />
                                    {daysUntilArrival === 0
                                        ? 'Llega Hoy'
                                        : daysUntilArrival === 1
                                          ? 'Llega Mañana'
                                          : daysUntilArrival < 0
                                            ? 'Reserva Pasada'
                                            : `Llega en ${daysUntilArrival} días`}
                                </div>
                            </div>

                            {pendingRoom && selectedPeople.length > 0 && (
                                <div className="mb-4 rounded-xl border-2 border-green-400 bg-green-50 p-3">
                                    <p className="mb-1 text-[11px] font-black tracking-widest text-green-700 uppercase">
                                        Asignar Hab. {pendingRoom.number} a:
                                    </p>
                                    <p className="mb-3 text-xs font-bold text-gray-700">
                                        {selectedPeople
                                            .map((p) => `Persona ${p}`)
                                            .join(', ')}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={confirmRoomSelection}
                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-[11px] font-black text-white uppercase shadow-md transition hover:bg-green-700"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Confirmar Habitación
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPendingRoom(null)
                                            }
                                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-500 transition hover:bg-gray-50"
                                            title="Cancelar selección"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <label className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase">
                                <Users className="h-3.5 w-3.5" />
                                Personas ({totalPeople - unassignedPeople.length}/
                                {totalPeople} asignadas)
                            </label>

                            <div className="space-y-2">
                                {Array.from({ length: totalPeople }, (_, i) => i + 1).map(
                                    (personIndex) => {
                                        const assignedRoom = assignedMap[personIndex];
                                        const isSelected =
                                            selectedPeople.includes(personIndex);

                                        return (
                                            <div
                                                key={personIndex}
                                                onClick={() =>
                                                    !assignedRoom &&
                                                    togglePerson(personIndex)
                                                }
                                                className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                                                    assignedRoom
                                                        ? 'border-green-200 bg-green-50'
                                                        : isSelected
                                                          ? 'cursor-pointer border-green-400 bg-green-50 ring-2 ring-green-100 ring-offset-1'
                                                          : 'cursor-pointer border-dashed border-gray-300 bg-white hover:border-green-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {!assignedRoom && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() =>
                                                                togglePerson(
                                                                    personIndex,
                                                                )
                                                            }
                                                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                        />
                                                    )}
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span className="text-xs font-bold text-gray-700 uppercase">
                                                        Persona {personIndex}
                                                    </span>
                                                </div>
                                                {assignedRoom ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-black text-green-700">
                                                            Hab.{' '}
                                                            {
                                                                assignedRoom.number
                                                            }
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                unassignPerson(
                                                                    personIndex,
                                                                );
                                                            }}
                                                            className="rounded p-0.5 text-green-500 transition-colors hover:bg-green-200 hover:text-green-800"
                                                            title="Quitar de esta habitación"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <CheckCircle2
                                                        className={`h-4 w-4 ${isSelected ? 'text-green-500' : 'text-gray-200'}`}
                                                    />
                                                )}
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: HABITACIONES DISPONIBLES */}
                        <div className="flex flex-1 flex-col bg-gray-50">
                            <div className="z-10 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
                                <div>
                                    <h3 className="text-sm font-black text-gray-800 uppercase">
                                        {pendingRoom
                                            ? `Hab. ${pendingRoom.number} seleccionada — confirme a la izquierda`
                                            : selectedPeople.length > 0
                                              ? `Elegir habitación para ${selectedPeople.length} persona(s)`
                                              : 'Tilde una o más personas a la izquierda'}
                                    </h3>
                                    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                        Mostrando habitaciones con capacidad ≥{' '}
                                        {Math.max(1, selectedPeople.length)}
                                    </p>
                                </div>
                                <div className="relative w-48">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-3.5 w-3.5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="BUSCAR HAB..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="h-8 w-full rounded-lg border-gray-200 bg-gray-50 pr-2 pl-9 text-[10px] font-bold text-gray-900 uppercase focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="relative flex-1 overflow-y-auto p-5">
                                {selectedPeople.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-gray-400 shadow-sm">
                                        <Users className="mb-3 h-12 w-12 opacity-20" />
                                        <p className="max-w-xs text-center text-xs font-bold uppercase">
                                            Tilde a las personas que van a
                                            compartir habitación (o solo una)
                                        </p>
                                    </div>
                                ) : filteredRooms.length === 0 ? (
                                    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-gray-400 shadow-sm">
                                        <AlertTriangle className="mb-3 h-12 w-12 text-orange-500 opacity-20" />
                                        <p className="max-w-xs text-center text-xs font-bold uppercase">
                                            No hay habitaciones libres con
                                            capacidad para{' '}
                                            {selectedPeople.length} persona(s)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                        {filteredRooms.map((room) => {
                                            const roomStatus =
                                                room.status?.toUpperCase() ||
                                                'DESCONOCIDO';
                                            const isFree =
                                                roomStatus === 'LIBRE' ||
                                                roomStatus === 'DISPONIBLE';
                                            const badgeColor = isFree
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : 'bg-orange-100 text-orange-700 border-orange-200';
                                            const isPending =
                                                pendingRoom?.id === room.id;

                                            return (
                                                <button
                                                    key={room.id}
                                                    onClick={() =>
                                                        selectPendingRoom(room)
                                                    }
                                                    className={`group relative flex flex-col items-center justify-center rounded-xl border-2 p-4 text-center shadow-sm transition-all duration-200 ${
                                                        isPending
                                                            ? 'border-green-500 bg-green-50 ring-2 ring-green-200 ring-offset-1'
                                                            : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                                                    }`}
                                                >
                                                    {isPending && (
                                                        <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1 text-white shadow-sm">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </div>
                                                    )}
                                                    <span className="mb-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                                                        {room.room_type?.name ||
                                                            'Habitación'}
                                                    </span>
                                                    <span className="text-3xl font-black text-gray-800">
                                                        {room.number}
                                                    </span>
                                                    <div className="mt-2 flex w-full flex-col gap-1 px-2">
                                                        <span
                                                            className={`w-full rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeColor}`}
                                                        >
                                                            {roomStatus}
                                                        </span>
                                                        <span className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                                                            Capacidad{' '}
                                                            {getRoomCapacity(
                                                                room,
                                                            )}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ============ FASE CONFIRMAR (sin precio) ============ */
                    <div className="flex-1 overflow-y-auto p-6">
                        <p className="mb-4 text-sm font-medium text-gray-600">
                            {needsAdvancePicker ? (
                                <>
                                    Esta reserva de{' '}
                                    <strong className="text-gray-900">
                                        {reservation.guest?.full_name}
                                    </strong>{' '}
                                    tiene un adelanto de{' '}
                                    <strong className="text-gray-900">
                                        {advancePayment.toFixed(2)} Bs
                                    </strong>
                                    . Elija a qué habitación se registra.
                                </>
                            ) : (
                                <>
                                    Al confirmar, se crea el registro oficial
                                    de Check-in para{' '}
                                    <strong className="text-gray-900">
                                        {reservation.guest?.full_name}
                                    </strong>
                                    . El precio de cada habitación se define
                                    después, al editar la estadía.
                                </>
                            )}
                        </p>

                        <div className="space-y-3">
                            {confirmRows.map((row) => {
                                const isAdvanceTarget =
                                    advanceDetailId === row.detailId;

                                return (
                                    <div
                                        key={row.detailId}
                                        onClick={() =>
                                            needsAdvancePicker &&
                                            setAdvanceDetailId(row.detailId)
                                        }
                                        className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                                            needsAdvancePicker
                                                ? 'cursor-pointer'
                                                : ''
                                        } ${
                                            isAdvanceTarget
                                                ? 'border-green-400 bg-green-50 ring-2 ring-green-100 ring-offset-1'
                                                : 'border-gray-200 bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <BedDouble className="h-5 w-5 text-green-500" />
                                            <span className="text-sm font-black text-gray-800 uppercase">
                                                Habitación {row.roomNumber}
                                            </span>
                                        </div>
                                        {advancePayment > 0 &&
                                            (isAdvanceTarget ? (
                                                <span className="flex items-center gap-1 rounded-full bg-green-600 px-3 py-1 text-[11px] font-black text-white uppercase">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Recibe el adelanto
                                                </span>
                                            ) : (
                                                needsAdvancePicker && (
                                                    <span className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-bold text-gray-500 uppercase">
                                                        Elegir
                                                    </span>
                                                )
                                            ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                    {phase === 'confirming' && mode === 'confirm' && !isRoomAlreadyAssigned(reservation) ? (
                        <button
                            onClick={() => setPhase('matchmaking')}
                            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            <Undo2 className="h-4 w-4" /> Volver a asignar
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                    )}

                    {phase === 'matchmaking' ? (
                        <button
                            onClick={submitMatchmaking}
                            disabled={!allPeopleAssigned || isProcessing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {allPeopleAssigned
                                ? mode === 'assign'
                                    ? 'Guardar Asignación'
                                    : 'Continuar'
                                : `Faltan ${unassignedPeople.length} persona(s)`}
                        </button>
                    ) : (
                        <button
                            onClick={submitConfirmation}
                            disabled={!canConfirm || isProcessing}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                            {canConfirm
                                ? 'Confirmar Entrada del Huésped'
                                : 'Elija a qué habitación va el adelanto'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
