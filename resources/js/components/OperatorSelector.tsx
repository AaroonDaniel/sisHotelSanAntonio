/**
 * Selector visual de "operador" (recepcionista físico).
 *
 * Reutilizable en cualquier formulario que necesite registrar QUIÉN
 * ejecutó la acción durante la sesión global de recepción (Check-in,
 * Pagos, Gastos, Checkout...). Se integra con useForm de Inertia: recibe
 * el valor seleccionado (string, igual que cualquier campo de useForm) y
 * un onChange que recibe el nuevo id como string.
 *
 * Dos variantes:
 * - compact (para cabeceras/toolbars): solo avatares circulares en fila,
 *   sin nombre visible (tooltip con el nombre completo). Altura fija y
 *   pequeña, pensada para no deformar la cabecera de un modal.
 * - completa (default): tarjeta con avatar + nombre corto debajo, para
 *   zonas con más espacio vertical (cuerpo del formulario).
 */
export interface Operator {
    id: number;
    full_name: string;
    nickname: string;
}

interface OperatorSelectorProps {
    operators: Operator[];
    value: string | number | null | undefined;
    onChange: (operatorId: string) => void;
    label?: string;
    error?: string;
    compact?: boolean;
    /** Tamaño del avatar en modo compacto: 'sm' = w-8, 'md' = w-10, 'lg' = w-16 */
    size?: 'sm' | 'md' | 'lg';
}

const getDisplayName = (op: Operator) =>
    op.full_name || op.nickname || 'Usuario';

const getShortName = (op: Operator) => {
    const firstWord = getDisplayName(op).trim().split(/\s+/)[0] ?? '';
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
};

const getInitials = (op: Operator) => {
    const words = getDisplayName(op).trim().split(/\s+/);
    return words
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('');
};

// Paleta fija: cada operador siempre cae en el mismo color (determinado por
// su id), así que es visualmente reconocible de una sesión a otra.
const AVATAR_COLORS = [
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-lime-600',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-fuchsia-500',
    'bg-pink-500',
];

const getAvatarColor = (op: Operator) =>
    AVATAR_COLORS[op.id % AVATAR_COLORS.length];

export default function OperatorSelector({
    operators,
    value,
    onChange,
    label = 'Seleccione al usuario que está ejecutando esta acción',
    error,
    compact = false,
    size = 'sm',
}: OperatorSelectorProps) {
    if (operators.length === 0) {
        return (
            <p className="text-xs text-gray-400">
                No hay operadores activos disponibles.
            </p>
        );
    }

    if (compact) {
        const avatarSize =
            size === 'lg'
                ? 'h-16 w-16 text-lg'
                : size === 'md'
                  ? 'h-10 w-10 text-xs'
                  : 'h-8 w-8 text-[10px]';
        const nameSize =
            size === 'lg'
                ? 'max-w-[5.5rem] text-sm'
                : 'max-w-[3.75rem] text-[9px]';

        return (
            <div
                // flex-wrap + justify-center: los avatares se acomodan
                // naturalmente en varias filas si no caben, SIN scrollbar.
                className="flex flex-wrap justify-center gap-4"
                role="group"
                aria-label={label}
            >
                {operators.map((op) => {
                    const isSelected = String(value ?? '') === String(op.id);
                    // Una vez que HAY una selección, el resto de los
                    // operadores se apagan a gris (en vez de mantener su
                    // color propio) para que el elegido resalte sin
                    // ambigüedad.
                    const hasSelection =
                        value !== null &&
                        value !== undefined &&
                        String(value) !== '';
                    return (
                        <button
                            key={op.id}
                            type="button"
                            onClick={() => onChange(String(op.id))}
                            title={getDisplayName(op)}
                            aria-pressed={isSelected}
                            className="flex shrink-0 flex-col items-center gap-1 transition-all active:scale-95"
                        >
                            <span
                                className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${avatarSize} ${
                                    isSelected
                                        ? `${getAvatarColor(op)} scale-110 shadow-lg ring-2 ring-gray-800 ring-offset-2 ring-offset-white`
                                        : hasSelection
                                          ? 'bg-gray-300 opacity-70 grayscale'
                                          : `${getAvatarColor(op)} opacity-60 hover:scale-105 hover:opacity-100`
                                }`}
                            >
                                {getInitials(op)}
                            </span>
                            <span
                                className={`truncate leading-none font-semibold ${nameSize} ${
                                    isSelected
                                        ? 'text-gray-900'
                                        : hasSelection
                                          ? 'text-gray-400'
                                          : 'text-gray-500'
                                }`}
                            >
                                {op.nickname}
                            </span>
                        </button>
                    );
                })}
                {error && (
                    <span className="w-full text-center text-[11px] font-semibold text-red-500">
                        {error}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div>
            {label && (
                <label className="mb-2 block text-xs font-bold tracking-wide text-gray-500 uppercase">
                    {label}
                </label>
            )}

            <div className="flex flex-wrap gap-2">
                {operators.map((op) => {
                    const isSelected = String(value ?? '') === String(op.id);
                    return (
                        <button
                            key={op.id}
                            type="button"
                            onClick={() => onChange(String(op.id))}
                            title={getDisplayName(op)}
                            aria-pressed={isSelected}
                            className={`flex w-[4.5rem] flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all active:scale-95 ${
                                isSelected
                                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
                            }`}
                        >
                            <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(op)} ${
                                    isSelected
                                        ? 'shadow ring-2 ring-white ring-offset-2 ring-offset-emerald-50'
                                        : ''
                                }`}
                            >
                                {getInitials(op)}
                            </span>
                            <span
                                className={`max-w-full truncate text-[11px] font-semibold ${
                                    isSelected
                                        ? 'text-emerald-700'
                                        : 'text-gray-600'
                                }`}
                            >
                                {getShortName(op)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <p className="mt-1.5 text-xs font-semibold text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}
