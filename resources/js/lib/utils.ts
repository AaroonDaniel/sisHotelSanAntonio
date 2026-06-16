import { InertiaLinkProps } from '@inertiajs/react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isSameUrl(
    url1: NonNullable<InertiaLinkProps['href']>,
    url2: NonNullable<InertiaLinkProps['href']>,
) {
    return resolveUrl(url1) === resolveUrl(url2);
}

export function resolveUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

// Transforma cualquier monto con decimales infinitos a la moneda física oficial
export const formatCurrency = (amount: number | string): number => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return 0;
    
    // Redondea a 1 decimal (10, 20, 50 centavos) y devuelve un número limpio
    return Math.round(numericAmount * 10) / 10;
};

// Si necesitas mostrarlo en texto (ej. "280.00 Bs")
export const displayBolivianos = (amount: number | string): string => {
    const rounded = formatCurrency(amount);
    return `${rounded.toFixed(2)} Bs`;
};
