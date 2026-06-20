import { describe, it, expect } from 'vitest';
import { getBillingCycleRange } from './cycle';

describe('Billing Cycle Range Utilities', () => {
    it('calculates cycle correctly when reset date is 1', () => {
        const today = new Date(2026, 5, 21);
        const range = getBillingCycleRange(today, 1);
        expect(range.start.getDate()).toBe(1);
        expect(range.end.getDate()).toBe(30);
    });

    it('calculates cycle correctly when reset date is 10 and today is after the reset date', () => {
        const today = new Date(2026, 5, 21);
        const range = getBillingCycleRange(today, 10);
        expect(range.start.getDate()).toBe(10);
        expect(range.end.getDate()).toBe(9);
    });

    it('handles short months correctly (Feb 31 capped to 28)', () => {
        const today = new Date(2026, 1, 15);
        const range = getBillingCycleRange(today, 31);
        expect(range.start.getMonth()).toBe(0); // Jan
        expect(range.start.getDate()).toBe(31);
        expect(range.end.getMonth()).toBe(1); // Feb
        expect(range.end.getDate()).toBe(27);
    });
});
