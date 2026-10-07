import { describe, it, expect, beforeEach } from 'vitest';
import { resolveSearchRange, useSearchStore } from './searchStore';

const view = { start: new Date('2026-01-01'), end: new Date('2026-01-31') };

describe('resolveSearchRange', () => {
    it('follows the view range by default', () => {
        expect(resolveSearchRange(false, null, view)).toEqual(view);
    });

    it('returns null for all time, even with an override', () => {
        const override = { timeframe: 'custom' as const, startDate: new Date('2025-01-01'), endDate: new Date('2025-02-01') };
        expect(resolveSearchRange(true, override, view)).toBeNull();
    });

    it('uses the override when set', () => {
        const override = { timeframe: 'custom' as const, startDate: new Date('2025-01-01'), endDate: new Date('2025-02-01') };
        expect(resolveSearchRange(false, override, view)).toEqual({ start: override.startDate, end: override.endDate });
    });
});

describe('searchStore', () => {
    beforeEach(() => useSearchStore.getState().reset());

    it('picking a range turns all-time off', () => {
        const s = useSearchStore.getState();
        s.setAllTime(true);
        s.setTimeframe('today');
        expect(useSearchStore.getState().allTime).toBe(false);
        expect(useSearchStore.getState().override?.timeframe).toBe('today');
    });

    it('followView clears the override and reset clears everything', () => {
        const s = useSearchStore.getState();
        s.setQuery('oil');
        s.setExpanded(true);
        s.setTimeframe('this-week');
        s.followView();
        expect(useSearchStore.getState().override).toBeNull();
        s.reset();
        expect(useSearchStore.getState()).toMatchObject({ query: '', expanded: false, allTime: false });
    });
});
