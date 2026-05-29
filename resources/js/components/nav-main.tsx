// resources/js/components/nav-main.tsx
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { resolveUrl } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useCan } from '@/hooks/use-can';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { can, canAny, hasRole } = useCan();

    const visibleItems = items.filter((item) => {
        if (item.permission     && !can(item.permission))     return false;
        if (item.anyPermission  && !canAny(item.anyPermission)) return false;
        if (item.role           && !hasRole(item.role))       return false;
        return true;
    });

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
            <SidebarMenu>
                {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={page.url.startsWith(resolveUrl(item.href))}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.href} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}