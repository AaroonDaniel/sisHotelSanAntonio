// resources/js/hooks/use-can.ts
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export function useCan() {
    const { auth } = usePage<SharedData>().props;
    const permissions = auth?.user?.permissions ?? [];
    const roles       = auth?.user?.roles ?? [];

    const can = (permission: string): boolean =>
        permissions.includes(permission);

    const canAny = (perms: string[]): boolean =>
        perms.some((p) => permissions.includes(p));

    const canAll = (perms: string[]): boolean =>
        perms.every((p) => permissions.includes(p));

    const hasRole = (role: string): boolean =>
        roles.includes(role);

    const hasAnyRole = (rls: string[]): boolean =>
        rls.some((r) => roles.includes(r));

    return { can, canAny, canAll, hasRole, hasAnyRole, permissions, roles };
}