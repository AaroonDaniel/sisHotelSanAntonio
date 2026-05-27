import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock } from 'lucide-react';

interface Reservation {
    id: number | string;
    date: string;
    guest: string;
}

interface ReservationsPopoverProps {
    sortedReservations: Reservation[];
    firstRes: Reservation;
    isToday: boolean;
    activeCheckin: any;
    corpState: any;
    onTriggerClick: () => void;
}

/**
 * Popover de "Reservas próximas" para cada tarjeta de habitación
 * en el calendario.
 *
 * Comportamiento:
 *  - Trigger y panel comparten un timer de cierre: salir del trigger
 *    programa un cierre con 120ms de gracia; entrar al panel cancela
 *    ese cierre. Eso permite que el cursor "viaje" del botón al panel
 *    sin que se cierre en el aire.
 *  - El panel se renderiza por Portal en <body>, con position: fixed
 *    y coordenadas calculadas con getBoundingClientRect, de modo que
 *    NO le afectan los overflow:hidden ni los z-index del calendario.
 *  - Salir del panel (onMouseLeave) lo cierra inmediatamente.
 *  - Scroll interno con max-h-80 + overflow-y-auto.
 *  - Header sticky para que el contador siga visible al hacer scroll.
 */
export default function ReservationsPopover({
    sortedReservations,
    firstRes,
    isToday,
    activeCheckin,
    corpState,
    onTriggerClick,
}: ReservationsPopoverProps) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeTimer = useRef<number | null>(null);

    // Cancela un cierre pendiente: el cursor entró a trigger o panel.
    const cancelClose = () => {
        if (closeTimer.current !== null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    // Programa cierre con margen para que el cursor pueda saltar del
    // trigger al panel sin atravesar una zona "muerta" que cierre todo.
    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => setOpen(false), 120);
    };

    // Limpieza al desmontar.
    useEffect(() => () => cancelClose(), []);

    // Calcula posición del panel respecto al viewport (fixed).
    // Lo anclamos a la esquina inferior derecha del trigger.
    const handleTriggerEnter = () => {
        cancelClose();
        if (triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setPos({
                top: r.bottom + 6,
                left: r.right,
            });
        }
        setOpen(true);
    };

    return (
        <div className="group relative flex">
            <button
                ref={triggerRef}
                onMouseEnter={handleTriggerEnter}
                onMouseLeave={scheduleClose}
                onClick={(e) => {
                    e.stopPropagation();
                    onTriggerClick();
                }}
                className={`flex w-9 cursor-pointer items-center justify-start overflow-hidden px-2.5 py-1.5 transition-all duration-300 ease-in-out group-hover:w-[150px] ${
                    isToday
                        ? 'bg-purple-600 text-white shadow-md hover:bg-purple-700'
                        : 'bg-purple-200 text-purple-900 hover:bg-purple-300'
                } ${
                    !activeCheckin && !corpState
                        ? 'rounded-tr-lg rounded-bl-xl'
                        : 'rounded-bl-xl border-r border-purple-300/50'
                }`}
            >
                <Calendar
                    className={`h-4 w-4 shrink-0 ${
                        isToday ? 'animate-pulse text-white' : 'text-purple-800'
                    }`}
                />
                <div className="ml-2 flex items-center whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span
                        className={`text-[10px] font-black tracking-tighter uppercase italic ${
                            isToday ? 'text-white' : 'text-purple-900'
                        }`}
                    >
                        {isToday ? '¡Asignar Hoy!' : `Res. ${firstRes.date}`}
                    </span>
                </div>
            </button>

            {/* Portal a <body>: inmune a overflow y stacking contexts del calendario */}
            {open &&
                createPortal(
                    <div
                        // Posicionado contra el viewport.
                        // translateX(-100%) alinea la esquina superior DERECHA del
                        // panel con la esquina inferior derecha del trigger.
                        style={{
                            position: 'fixed',
                            top: pos.top,
                            left: pos.left,
                            transform: 'translateX(-100%)',
                        }}
                        onMouseEnter={cancelClose}
                        onMouseLeave={() => setOpen(false)}
                        className="pointer-events-auto z-[9999] w-64 rounded-xl border border-purple-200 bg-white p-3 text-left shadow-2xl"
                    >
                        <p className="sticky top-0 z-10 -mt-1 mb-2 flex items-center justify-between border-b border-purple-100 bg-white pt-1 pb-1 text-[10px] font-black text-purple-600 uppercase">
                            <span>
                                <Clock className="mr-1 inline h-3 w-3" /> Entradas
                            </span>
                            <span className="rounded-full bg-purple-100 px-1.5 text-purple-800">
                                {sortedReservations.length}
                            </span>
                        </p>

                        <div className="space-y-2">
                            {sortedReservations.map((res, idx) => (
                                <div
                                    key={res.id ?? idx}
                                    className="flex flex-col border-l-2 border-purple-400 pl-2"
                                >
                                    <span
                                        className={`text-[9px] font-bold ${
                                            idx === 0 && isToday
                                                ? 'animate-pulse text-red-500'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        {res.date}
                                    </span>
                                    <span className="text-[10px] leading-tight font-black text-gray-800 uppercase">
                                        {res.guest}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}