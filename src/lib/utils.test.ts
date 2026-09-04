import { describe, it, expect } from 'vitest';
import { formatAmount, formatNumber, cn } from './utils';

describe('UI & Formatting Utilities', () => {
    it('cn merges class names properly', () => {
        expect(cn('px-4 py-2', 'bg-red-500', undefined, false && 'hidden')).toBe('px-4 py-2 bg-red-500');
        expect(cn('p-4', 'p-2')).toBe('p-2'); // tailwind-merge override
    });

    it('formatAmount handles numbers, decimals and strings safely', () => {
        expect(formatAmount(0)).toBe('0');
        expect(formatAmount('0')).toBe('0');
        expect(formatAmount(1250)).toBe('1,250');
        expect(formatAmount('1250')).toBe('1,250');
        expect(formatAmount(1250.75)).toBe('1,250.75');
        expect(formatAmount('invalid')).toBe('0');
    });

    it('formatNumber handles numbers and strings safely', () => {
        expect(formatNumber(0)).toBe('0');
        expect(formatNumber(1000000)).toBe('1,000,000');
        expect(formatNumber('55.5')).toBe('55.5');
        expect(formatNumber('abc')).toBe('0');
    });
});
