import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import i18n from '@/i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(val: number | string): string {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0';
    
    return new Intl.NumberFormat(i18n.language).format(num);
}

export function formatAmount(amount: number | string): string {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(val)) return '0';
    
    return new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(val);
}

