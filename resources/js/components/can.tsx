// resources/js/components/can.tsx
import { type ReactNode } from 'react';
import { useCan } from '@/hooks/use-can';

interface CanProps {
    permission?: string;
    anyPermission?: string[];
    allPermissions?: string[];
    role?: string;
    fallback?: ReactNode;
    children: ReactNode;
}

export function Can({
    permission,
    anyPermission,
    allPermissions,
    role,
    fallback = null,
    children,
}: CanProps) {
    const { can, canAny, canAll, hasRole } = useCan();

    let allowed = true;
    if (permission)      allowed = allowed && can(permission);
    if (anyPermission)   allowed = allowed && canAny(anyPermission);
    if (allPermissions)  allowed = allowed && canAll(allPermissions);
    if (role)            allowed = allowed && hasRole(role);

    return <>{allowed ? children : fallback}</>;
}