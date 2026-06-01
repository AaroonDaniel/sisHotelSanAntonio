// resources/js/components/app-sidebar.tsx
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Folder,
    LayoutGrid,
    Users,
    Receipt,
    ShieldCheck,
    BedDouble,
    CalendarCheck,
    ClipboardList,
    DoorOpen,
    FileText,
    AlertTriangle,
    BarChart3,
    Wallet,
    Building2,
    Layers,
    DollarSign,
    KeyRound,
    UserCog,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    // === COMÚN (visible para cualquier usuario autenticado) ===
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
        permission: 'dashboard.ver',
    },

    // === ADMINISTRADOR ===
    {
        title: 'Usuarios',
        href: '/usuarios',
        icon: Users,
        permission: 'usuarios.ver',
    },
    {
        title: 'Roles',
        href: '/roles',
        icon: UserCog,
        permission: 'roles.gestionar',
    },
    {
        title: 'Permisos',
        href: '/permisos',
        icon: KeyRound,
        permission: 'permisos.gestionar',
    },
    {
        title: 'Bloques',
        href: '/bloques',
        icon: Building2,
        permission: 'bloques.gestionar',
    },
    {
        title: 'Pisos',
        href: '/pisos',
        icon: Layers,
        permission: 'pisos.gestionar',
    },
    {
        title: 'Tipos de habitación',
        href: '/tipohabitacion',
        icon: BedDouble,
        permission: 'tipos_habitaciones.gestionar',
    },
    {
        title: 'Precios',
        href: '/precios',
        icon: DollarSign,
        permission: 'precios.gestionar',
    },
    {
        title: 'Auditoría',
        href: '/auditoria',
        icon: ShieldCheck,
        permission: 'auditoria.ver',
    },

    // === RECEPCIONISTA ===
    {
        title: 'Huéspedes',
        href: '/invitados',
        icon: Users,
        anyPermission: ['huespedes.buscar', 'huespedes.ver'],
    },
    {
        title: 'Reservas',
        href: '/reservas',
        icon: CalendarCheck,
        anyPermission: ['reservas.crear', 'reservas.ver_todos'],
    },
    {
        title: 'Check-in / Check-out',
        href: '/checks',
        icon: ClipboardList,
        anyPermission: ['checkin.realizar', 'checkins.ver_todos'],
    },
    {
        title: 'Estado de habitaciones',
        href: '/status',
        icon: DoorOpen,
        anyPermission: ['habitaciones.estado_actual', 'habitaciones.cambiar_estado'],
    },

    // === GERENTE ===
    {
        title: 'Reportes',
        href: '/reports',
        icon: BarChart3,
        anyPermission: ['reportes.financiero', 'reportes.ocupacion', 'reportes.ventas', 'reportes.parte_diario', 'reportes.cierre_caja'],
    },
    {
        title: 'Gastos',
        href: '/gastos',
        icon: Receipt,
        anyPermission: ['gastos.ver', 'gastos.registrar'],
    },
    {
        title: 'Historial de pagos',
        href: '/historial-pagos',
        icon: Wallet,
        permission: 'huespedes.historial',
    },
    {
        title: 'Facturación',
        href: '/facturacion',
        icon: FileText,
        anyPermission: ['checkout.realizar', 'anulaciones.autorizar'],
    },
    {
        title: 'Contingencias SIAT',
        href: '/contingencias',
        icon: AlertTriangle,
        permission: 'anulaciones.autorizar',
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={'/dashboard'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* NavMain hace el filtrado por permisos */}
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}