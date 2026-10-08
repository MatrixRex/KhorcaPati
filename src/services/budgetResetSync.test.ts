import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/schema';
import { useSettingsStore } from '@/stores/settingsStore';
import { createMockBudget } from '@/test/factories';
import { syncBudgetsToResetDate, watchResetDateForBudgets } from './budgetResetSync';

const startDates = async () => (await db.budgets.toArray()).map(b => [b.category, b.startDate]);

describe('syncBudgetsToResetDate', () => {
    beforeEach(async () => {
        await db.budgets.clear();
        useSettingsStore.setState({ resetDate: 1, budgetResetDay: 1 });
    });

    it('makes monthly budgets on the old reset day follow the new one, leaving the rest alone', async () => {
        await db.budgets.bulkAdd([
            createMockBudget({ category: 'Food', startDate: '2026-05-01' }),
            createMockBudget({ category: 'Rent', startDate: '2026-05-10' }),
            createMockBudget({ category: 'Bills', startDate: null }),
            createMockBudget({ category: 'Fuel', recurringInterval: 'weekly', startDate: '2026-05-01' }),
            createMockBudget({ category: 'Trip', timelineType: 'range', recurringInterval: null, startDate: '2026-05-01', endDate: '2026-05-30' }),
        ]);
        useSettingsStore.setState({ resetDate: 25 });

        expect(await syncBudgetsToResetDate()).toBe(1);
        expect(await startDates()).toEqual([
            ['Food', null], ['Rent', '2026-05-10'], ['Bills', null], ['Fuel', '2026-05-01'], ['Trip', '2026-05-01'],
        ]);
        expect(useSettingsStore.getState().budgetResetDay).toBe(25);
        // Nothing left to do until the reset date changes again.
        expect(await syncBudgetsToResetDate()).toBe(0);
    });

    it('treats a start date on the last day of a short month as the old reset day', async () => {
        useSettingsStore.setState({ resetDate: 31, budgetResetDay: 31 });
        await db.budgets.add(createMockBudget({ startDate: '2026-02-28' }));
        useSettingsStore.setState({ resetDate: 5 });
        expect(await syncBudgetsToResetDate()).toBe(1);
    });

    it('assumes the default 1st for users who changed the reset date before this sync existed', async () => {
        await db.budgets.add(createMockBudget({ startDate: '2026-04-01' }));
        useSettingsStore.setState({ resetDate: 15, budgetResetDay: undefined });
        expect(await syncBudgetsToResetDate()).toBe(1);
        expect(useSettingsStore.getState().budgetResetDay).toBe(15);
    });
});

describe('watchResetDateForBudgets', () => {
    beforeEach(async () => {
        await db.budgets.clear();
        useSettingsStore.setState({ resetDate: 1, budgetResetDay: 1 });
    });

    it('syncs only once the reset date stops changing, so dragging past other days leaves them alone', async () => {
        await db.budgets.bulkAdd([
            createMockBudget({ category: 'Food', startDate: '2026-05-01' }),
            createMockBudget({ category: 'Rent', startDate: '2026-05-10' }),
        ]);
        const stop = watchResetDateForBudgets(50);
        for (let day = 2; day <= 15; day++) useSettingsStore.setState({ resetDate: day });
        await vi.waitFor(async () => expect(await startDates()).toEqual([['Food', null], ['Rent', '2026-05-10']]));
        expect(useSettingsStore.getState().budgetResetDay).toBe(15);
        stop();
    });
});
