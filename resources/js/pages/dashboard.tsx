import DashboardKpis from '@/components/dashboard-kpis';
import { useCan } from '@/hooks/use-can';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    BedDouble,
    Briefcase,
    Building,
    CalendarDays,
    ClipboardList,
    Clock,
    Coins,
    FileBarChart,
    FileText,
    History,
    Hotel,
    Key,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    Receipt,
    ShieldAlert,
    Tag,
    User,
    UserCog,
    Users,
    Vault,
    Wallet,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';

// Interfaces Locales
interface User {
    id: number;
    name: string;
    email: string;
    nickname?: string;
    full_name?: string;
    roles?: string[]; // <-- Aseguramos que TypeScript sepa que vienen los roles
    [key: string]: any;
}

// Tipos de los datos del dashboard que vienen del DashboardController
interface DashboardKpisData {
    porcentaje_ocupacion: number;
    habitaciones_total: number;
    habitaciones_ocupadas: number;
    habitaciones_libres: number;
    habitaciones_reservadas: number;
    habitaciones_limpieza: number;
    habitaciones_mantenim: number;
    ingresos_hoy: number;
    devoluciones_hoy: number;
    egresos_hoy: number;
    neto_hoy: number;
    ingresos_mes: number;
    egresos_mes: number;
    checkins_activos: number;
    reservas_pendientes: number;
    caja_abierta: boolean;
    caja_apertura_monto: number | null;
}

interface DashboardProps {
    auth: {
        user: User;
        roles?: string[];
    };
    // Props opcionales: solo llegan cuando el backend las envía (rol Gerencia).
    // Si el usuario es Recepcionista no se usan y no rompen nada.
    kpis?: DashboardKpisData;
    ingresosMes?: Array<{ fecha: string; ingresos: number; egresos: number }>;
    ocupacionTipo?: Array<{
        nombre: string;
        total: number;
        ocupadas: number;
        libres: number;
        porcentaje: number;
    }>;
    rankingTipos?: Array<{ nombre: string; total: number }>;
    pagosMetodo?: Array<{ metodo: string; total: number }>;
}

export default function Dashboard({
    auth,
    kpis,
    ingresosMes,
    ocupacionTipo,
    rankingTipos,
    pagosMetodo,
}: DashboardProps) {
    // --- LÓGICA DE SEGURIDAD (ROLES) ---
    // Extraemos los roles del usuario logueado. Si no hay, es un array vacío.
    const userRoles = auth.user?.roles || [];
    // Verificamos si tiene el rol de Admin
    const isAdmin = userRoles.some(
        (role) => role.toLowerCase() === 'administrador',
    );
    // Gerencia = Administrador o Gerente (ven KPIs y reportes)
    const isGerencia =
        isAdmin || userRoles.some((r) => r.toLowerCase() === 'gerente');
    // Helpers de permisos para mostrar/ocultar módulos del menú
    const { can, canAny } = useCan();
    const puedeVer = (item: any): boolean => {
        if (item.adminOnly) return isAdmin;
        if (item.anyPerm) return canAny(item.anyPerm);
        if (item.perm) return can(item.perm);
        return true;
    };
    // --- ESTADOS PARA LA LÓGICA DE REPORTE ---
    const [loading, setLoading] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorDetails, setErrorDetails] = useState<string[]>([]);

    // Toggle de vista del dashboard: 'menu' = grid de iconos (Parámetros/Procesos/Reportes),
    // 'panel' = panel gerencial con KPIs y gráficos.
    // Por defecto inicia en 'menu' para no alterar el comportamiento existente.
    // Solo es relevante para Gerencia; los demás roles solo ven el menú.
    const [vista, setVista] = useState<'menu' | 'panel'>('menu');

    // --- DEFINICIÓN DE MÓDULOS (AHORA ADENTRO PARA QUE LEA LOS ROLES) ---
    const hotelModules = [
        {
            title: 'Parámetros',
            theme: 'blue',
            items: [
                {
                    name: 'Bloques',
                    icon: Building,
                    url: '/bloques',
                    perm: 'bloques.gestionar',
                },
                {
                    name: 'Pisos',
                    icon: Layers,
                    url: '/pisos',
                    perm: 'pisos.gestionar',
                },
                {
                    name: 'Tipos Hab.',
                    icon: BedDouble,
                    url: '/tipohabitacion',
                    perm: 'tipos_habitaciones.gestionar',
                },
                {
                    name: 'Precios',
                    icon: Tag,
                    url: '/precios',
                    perm: 'precios.gestionar',
                },
                {
                    name: 'Habitaciones',
                    icon: Hotel,
                    url: '/habitaciones',
                    adminOnly: true,
                },
                {
                    name: 'Servicios',
                    icon: ClipboardList,
                    url: '/servicios',
                    adminOnly: true,
                },
                {
                    name: 'Huéspedes',
                    icon: Users,
                    url: '/invitados',
                    anyPerm: ['huespedes.ver', 'huespedes.buscar'],
                },
                {
                    name: 'Horarios',
                    icon: Clock,
                    url: '/horarios',
                    adminOnly: true,
                },
                {
                    name: 'Personal',
                    icon: User,
                    url: '/usuarios',
                    perm: 'usuarios.ver',
                },

                ...(isAdmin
                    ? [
                          { name: 'Permisos', icon: Key, url: '/permisos' },
                          {
                              name: 'Cargos/Roles',
                              icon: UserCog,
                              url: '/roles',
                          },
                      ]
                    : []),
            ],
        },
        {
            title: 'Procesos',
            theme: 'red',
            items: [
                {
                    name: 'Nueva Reserva',
                    icon: CalendarDays,
                    url: '/admin/reservas',
                    anyPerm: ['reservas.crear', 'reservas.ver_todos'],
                },
                {
                    name: 'Asignación',
                    icon: BedDouble,
                    url: '/checks',
                    anyPerm: ['checkin.realizar', 'checkins.ver_todos'],
                },
                {
                    name: 'Cuentas Corporativas',
                    icon: Building,
                    url: '/corporate-accounts',
                    anyPerm: ['checkin.realizar', 'checkins.ver_todos'],
                },
                {
                    name: 'Detalles de asignación',
                    icon: Briefcase,
                    url: '/checkindetails',
                    anyPerm: ['checkin.realizar', 'checkins.ver_todos'],
                },
                {
                    name: 'Facturación',
                    icon: Receipt,
                    url: '/facturacion',
                    anyPerm: [
                        'facturar.emitir',
                        'checkout.realizar',
                        'anulaciones.autorizar',
                    ],
                },
                {
                    name: 'Historial de Habitaciones',
                    icon: History,
                    url: '/room-history',
                    anyPerm: ['checkin.realizar', 'checkins.ver_todos'],
                },

                {
                    name: 'Mantenimiento',
                    icon: Wrench,
                    url: '/mantenimientos',
                    anyPerm: ['mantenimiento.notificar_averia'],
                },
                {
                    name: 'Gastos',
                    icon: FileText,
                    url: '/historial-gastos',
                    anyPerm: [
                        'gastos.ver',
                        'gastos.registrar',
                        'gastos.aprobar',
                    ],
                },
                {
                    name: 'Adelantos y Devoluciones',
                    icon: Coins,
                    url: '/historial-pagos',
                    anyPerm: ['caja.registrar_pago', 'huespedes.historial'],
                },
                {
                    name: 'Eventos Significativos',
                    icon: ShieldAlert,
                    url: '/contingencias',
                    anyPerm: ['auditoria.ver', 'anulaciones.autorizar'],
                },
            ],
        },
        {
            title: 'Reportes',
            theme: 'amber',
            items: [
                {
                    name: 'Parte Diario',
                    icon: FileBarChart,
                    url: '/reports',
                    anyPerm: ['reportes.parte_diario'],
                },
                {
                    name: 'Cierre de Caja',
                    icon: Wallet,
                    url: '/reports/financial',
                    anyPerm: ['reportes.cierre_caja'],
                },
                {
                    name: 'Aperturas y Cierres',
                    icon: Vault,
                    url: '/admin/shift-reports',
                    anyPerm: ['reportes.financiero'],
                },
                /*
                {
                    name: 'Ingresos y Egresos diarios',
                    icon: FileText,
                    url: '/reports/financialMovement',
                    anyPerm: ['reportes.financiero', 'reportes.ventas'],
                },
                */
            ],
        },
    ]
        .map((group) => ({ ...group, items: group.items.filter(puedeVer) }))
        .filter((group) => group.items.length > 0);

    const getThemeClasses = (theme: string) => {
        switch (theme) {
            case 'red':
                return 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-500/20 border-red-500/30';
            case 'blue':
                return 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-blue-500/20 border-blue-500/30';
            case 'amber':
                return 'bg-gradient-to-br from-amber-600 to-amber-800 shadow-amber-500/20 border-amber-500/30';
            default:
                return 'bg-gray-700';
        }
    };

    const handleGenerateDailyBook = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/reports/check-daily-book');
            if (response.data.can_generate) {
                window.open('/reports/daily-book-pdf', '_blank');
            } else {
                setErrorDetails(response.data.details || []);
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error('Error validando libro diario', error);
            alert('Error de conexión al verificar los datos.');
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item: any) => {
        if (item.name === 'Libro Diario') {
            handleGenerateDailyBook();
        } else {
            router.visit(item.url);
        }
    };

    return (
        <AuthenticatedLayout user={auth.user as any}>
            <Head title="Panel Principal" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header dinámico:
                    - vista 'menu'  -> "Panel de Control" + bienvenida al usuario
                    - vista 'panel' -> "Panel Gerencial" + descripción de KPIs
                    Esto evita que aparezca "Bienvenido de nuevo" cuando
                    el usuario ya está mirando indicadores. */}
                <div className="mb-2 flex items-end justify-between">
                    <div className="flex items-end gap-4">
                        <div>
                            {vista === 'menu' ? (
                                <>
                                    <h2 className="text-3xl font-bold text-white">
                                        Panel de Control
                                    </h2>
                                    <p className="mt-2 text-gray-100">
                                        Bienvenido de nuevo,{' '}
                                        <span className="font-semibold text-white dark:text-gray-100">
                                            {auth.user.name}
                                        </span>
                                        .
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-bold text-white">
                                        Panel Gerencial
                                    </h2>
                                    <p className="mt-2 text-gray-100">
                                        Indicadores clave consolidados en tiempo
                                        real
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Botón toggle de vista: solo visible para Gerencia.
                            Alterna entre menú de iconos y panel gerencial con KPIs. */}
                        {isGerencia && (
                            <button
                                type="button"
                                onClick={() =>
                                    setVista(
                                        vista === 'menu' ? 'panel' : 'menu',
                                    )
                                }
                                className="mb-1 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
                                title={
                                    vista === 'menu'
                                        ? 'Ver Panel Gerencial con KPIs'
                                        : 'Volver al menú de módulos'
                                }
                            >
                                {vista === 'menu' ? (
                                    <>
                                        <LayoutDashboard className="h-4 w-4" />
                                        Panel Gerencial
                                    </>
                                ) : (
                                    <>
                                        <LayoutGrid className="h-4 w-4" />
                                        Ver Módulos
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="hidden text-right sm:block">
                        <p className="text-sm text-gray-400">
                            Fecha del Sistema
                        </p>
                        <p className="font-mono text-lg font-bold text-white">
                            {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {/* ============== VISTA: PANEL GERENCIAL ==============
                    Se muestra cuando Gerencia presiona el botón verde.
                    Cierra HU-12 y Escenario 12 de la Tabla 4.23. */}
                {isGerencia && vista === 'panel' && kpis && (
                    <DashboardKpis
                        kpis={kpis}
                        ingresosMes={ingresosMes ?? []}
                        ocupacionTipo={ocupacionTipo ?? []}
                        rankingTipos={rankingTipos ?? []}
                        pagosMetodo={pagosMetodo ?? []}
                    />
                )}

                {/* ============== VISTA: MENÚ DE MÓDULOS ==============
                    Vista por defecto. Recepcionistas siempre la ven.
                    Gerencia la ve hasta que pulsa el toggle. */}
                {vista === 'menu' && (
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {hotelModules.map((group, groupIndex) => (
                            <div
                                key={groupIndex}
                                className="flex flex-col gap-6"
                            >
                                {/* Título de Columna */}
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`h-8 w-1 rounded-full bg-${group.theme}-500 shadow-[0_0_10px_currentColor] text-${group.theme}-500`}
                                    ></div>
                                    <h3 className="text-xl font-bold tracking-wider text-white uppercase">
                                        {group.title}
                                    </h3>
                                </div>

                                {/* Contenedor de Botones */}
                                <div className="grid grid-cols-2 gap-3 px-2 pb-8">
                                    {group.items.map((item, itemIndex) => (
                                        <button
                                            key={itemIndex}
                                            onClick={() =>
                                                handleItemClick(item)
                                            }
                                            disabled={
                                                loading &&
                                                item.name === 'Libro Diario'
                                            }
                                            className={`group relative flex h-28 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 p-3 text-center backdrop-blur-md transition-all duration-300 hover:z-20 hover:scale-105 hover:shadow-2xl hover:brightness-110 ${getThemeClasses(group.theme)} disabled:cursor-wait disabled:opacity-70`}
                                        >
                                            <div className="absolute -top-10 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:scale-150"></div>

                                            <div className="relative z-10 mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-white shadow-inner backdrop-blur-sm transition-transform group-hover:scale-110 group-hover:rotate-12">
                                                <item.icon
                                                    className={`h-6 w-6 ${loading && item.name === 'Libro Diario' ? 'animate-pulse' : ''}`}
                                                />
                                            </div>

                                            <div className="relative z-10 flex flex-col justify-center">
                                                <span className="text-sm leading-tight font-bold text-white drop-shadow-md">
                                                    {loading &&
                                                    item.name === 'Libro Diario'
                                                        ? 'Verificando...'
                                                        : item.name}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Error */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl bg-white shadow-2xl duration-200 zoom-in-95">
                        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-red-700">
                                <AlertTriangle className="h-6 w-6" />
                                No se puede generar
                            </h3>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 text-center">
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                                    <FileText className="h-7 w-7 text-red-600" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-800">
                                    Datos Incompletos
                                </h4>
                                <p className="mt-1 text-sm text-gray-500">
                                    Para generar el Libro Diario, debes
                                    completar la información de los siguientes
                                    huéspedes activos:
                                </p>
                            </div>

                            <div className="max-h-48 overflow-y-auto rounded-xl border border-red-100 bg-red-50/50 p-3">
                                <ul className="space-y-2">
                                    {errorDetails.map((detail, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-center gap-2 rounded-lg border border-red-100 bg-white p-2 text-sm font-medium text-red-800 shadow-sm"
                                        >
                                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                            {detail}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="rounded-xl bg-gray-800 px-6 py-2 text-sm font-bold text-white shadow-md transition hover:bg-gray-700"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
