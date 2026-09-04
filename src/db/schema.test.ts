import { describe, it, expect } from 'vitest';
import { db, recalculateDailySummary } from './schema';
import { createMockExpense } from '@/test/factories';

describe('Database Schema & Daily Summaries Engine', () => {
    it('aggregates top-level expenses and income correctly for a date', async () => {
        const testDate = '2026-06-15';

        // Add 2 top-level expenses and 1 top-level income
        await db.expenses.add(createMockExpense({ date: testDate, amount: 250, type: 'expense' }));
        await db.expenses.add(createMockExpense({ date: testDate, amount: 150, type: 'expense' }));
        await db.expenses.add(createMockExpense({ date: testDate, amount: 1000, type: 'income' }));

        await recalculateDailySummary(testDate);

        const summary = await db.dailySummaries.get(testDate);
        expect(summary).toBeDefined();
        expect(summary?.date).toBe(testDate);
        expect(summary?.expenseTotal).toBe(400); // 250 + 150
        expect(summary?.incomeTotal).toBe(1000);
    });

    it('ignores nested child expenses (parentId != null) to prevent double counting', async () => {
        const testDate = '2026-06-15';

        // Parent expense
        const parentId = (await db.expenses.add(createMockExpense({
            date: testDate,
            amount: 500,
            type: 'expense',
            isNested: true
        }))) as number;

        // Sub-expense belonging to parent
        await db.expenses.add(createMockExpense({
            date: testDate,
            amount: 200,
            type: 'expense',
            parentId: parentId
        }));

        await recalculateDailySummary(testDate);

        const summary = await db.dailySummaries.get(testDate);
        // Only the parent 500 should be counted, NOT 500 + 200
        expect(summary?.expenseTotal).toBe(500);
    });

    it('deletes dailySummary record when all transactions for that date are cleared', async () => {
        const testDate = '2026-06-15';

        const id = (await db.expenses.add(createMockExpense({ date: testDate, amount: 100, type: 'expense' }))) as number;
        await recalculateDailySummary(testDate);

        expect(await db.dailySummaries.get(testDate)).toBeDefined();

        // Delete the expense and recalculate
        await db.expenses.delete(id);
        await recalculateDailySummary(testDate);

        const summary = await db.dailySummaries.get(testDate);
        expect(summary).toBeUndefined();
    });
});
