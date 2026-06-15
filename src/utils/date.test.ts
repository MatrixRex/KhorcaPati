import { describe, it, expect } from 'vitest';
import { getNearbyDates } from './date';

describe('getNearbyDates', () => {
    it('should generate correct list of dates', () => {
        const today = new Date(2026, 5, 15); // June 15, 2026
        const list = getNearbyDates(today, 5);
        expect(list).toHaveLength(5);
        expect(list[0].formattedValue).toBe('2026-06-15');
        expect(list[1].formattedValue).toBe('2026-06-14');
        expect(list[4].formattedValue).toBe('2026-06-11');
    });
});
