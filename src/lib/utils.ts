import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: number | string): string {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(val)) return '0';
    
    return new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(val);
}
