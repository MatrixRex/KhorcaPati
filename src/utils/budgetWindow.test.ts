import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBudgetWindow } from './budgetWindow';
import { type Budget } from '@/db/schema';

describe('getBudgetWindow custom reset date calculation', () => {
    beforeEach(() => {
        // Freeze time to 2026-06-14T12:00:00
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-14T12:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calculates legacy monthly budget window (no startDate)', () => {
        const budget: Budget = {
            category: 'Food',
            limitAmount: 500,
            alertThreshold: 0.8,
            timelineType: 'recurring',
            recurringInterval: 'monthly',
            startDate: null,
            endDate: null,
            createdAt: '2026-06-01T00:00:00.000Z'
        };
        const window = getBudgetWindow(budget);
        expect(window).toEqual({
            start: '2026-06-01',
            end: '2026-06-30'
        });
    });

    it('calculates monthly budget anchored to a custom date before now (e.g. 10th of June)', () => {
        const budget: Budget = {
            category: 'Food',
            limitAmount: 500,
            alertThreshold: 0.8,
            timelineType: 'recurring',
            recurringInterval: 'monthly',
            startDate: '2026-06-10',
            endDate: null,
            createdAt: '2026-06-10T00:00:00.000Z'
        };
        const window = getBudgetWindow(budget);
        expect(window).toEqual({
            start: '2026-06-10',
            end: '2026-07-09'
        });
    });

    it('calculates monthly budget anchored to a custom date after now (e.g. 15th of June)', () => {
        const budget: Budget = {
            category: 'Food',
            limitAmount: 500,
            alertThreshold: 0.8,
            timelineType: 'recurring',
            recurringInterval: 'monthly',
            startDate: '2026-06-15',
            endDate: null,
            createdAt: '2026-06-15T00:00:00.000Z'
        };
        const window = getBudgetWindow(budget);
        // Since now is June 14, the current window is from May 15 to June 14.
        expect(window).toEqual({
            start: '2026-05-15',
            end: '2026-06-14'
        });
    });

    it('caps monthly budget to last day of month if anchor is 31st (e.g. anchor Jan 31, now Feb 28)', () => {
        // Set system time to Feb 28, 2026 (non-leap year)
        vi.setSystemTime(new Date('2026-02-28T12:00:00'));

        const budget: Budget = {
            category: 'Food',
            limitAmount: 500,
            alertThreshold: 0.8,
            timelineType: 'recurring',
            recurringInterval: 'monthly',
            startDate: '2026-01-31',
            endDate: null,
            createdAt: '2026-01-31T00:00:00.000Z'
        };
        const window = getBudgetWindow(budget);
        // Current period start is Feb 28 (cap of 31st). Next period start is Mar 31.
        // End of current period is next period start - 1 day = Mar 30.
        expect(window).toEqual({
            start: '2026-02-28',
            end: '2026-03-30'
        });
    });

    it('calculates weekly budget anchored to a custom day-of-week (e.g. Wednesday)', () => {
        // 2026-06-14 is Sunday.
        // 2026-06-10 is Wednesday.
        const budget: Budget = {
            category: 'Food',
            limitAmount: 500,
            alertThreshold: 0.8,
            timelineType: 'recurring',
            recurringInterval: 'weekly',
            startDate: '2026-06-10',
            endDate: null,
            createdAt: '2026-06-10T00:00:00.000Z'
          };
          const window = getBudgetWindow(budget);
          // Since now is Sun Jun 14, the current window starts on Wed Jun 10 and ends on Tue Jun 16.
          expect(window).toEqual({
              start: '2026-06-10',
              end: '2026-06-16'
          });
    });

    it('calculates yearly budget anchored to a custom date before now (e.g. June 10)', () => {
        const budget: Budget = {
            category: 'Food',
            limitAmount: 500,
            alertThreshold: 0.8,
            timelineType: 'recurring',
            recurringInterval: 'yearly',
            startDate: '2025-06-10',
            endDate: null,
            createdAt: '2025-06-10T00:00:00.000Z'
        };
        const window = getBudgetWindow(budget);
        expect(window).toEqual({
            start: '2026-06-10',
            end: '2027-06-09'
        });
    });
});
