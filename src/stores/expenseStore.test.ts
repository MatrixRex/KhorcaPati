import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import { useExpenseStore } from './expenseStore';
import { useGoalStore } from './goalStore';
import { useLoanStore } from './loanStore';
import { createMockExpense, createMockGoal, createMockLoan } from '@/test/factories';

describe('Expense Store Business Logic', () => {
    beforeEach(async () => {
        useExpenseStore.setState({ expenses: [], isLoading: false });
    });

    it('addExpense adds top-level expense and updates daily summaries', async () => {
        const store = useExpenseStore.getState();
        const testDate = '2026-06-20';

        const id = await store.addExpense(createMockExpense({
            date: testDate,
            amount: 750,
            type: 'expense'
        }));

        expect(id).toBeDefined();

        // Verify record in Dexie
        const inDb = await db.expenses.get(id);
        expect(inDb?.amount).toBe(750);

        // Verify daily summary was automatically calculated
        const summary = await db.dailySummaries.get(testDate);
        expect(summary?.expenseTotal).toBe(750);

        // Verify store state refreshed
        expect(useExpenseStore.getState().expenses.length).toBe(1);
    });

    it('updateExpense recalculates daily summary on both old and new dates if date is changed', async () => {
        const store = useExpenseStore.getState();
        const oldDate = '2026-06-10';
        const newDate = '2026-06-12';

        const id = await store.addExpense(createMockExpense({
            date: oldDate,
            amount: 500,
            type: 'expense'
        }));

        expect((await db.dailySummaries.get(oldDate))?.expenseTotal).toBe(500);

        // Update the date of the expense
        await store.updateExpense(id, { date: newDate });

        // Old date summary should be pruned (since net is now 0)
        expect(await db.dailySummaries.get(oldDate)).toBeUndefined();

        // New date summary should exist
        expect((await db.dailySummaries.get(newDate))?.expenseTotal).toBe(500);
    });

    it('deleteExpense performs cascading deletion of child sub-records in transaction', async () => {
        const store = useExpenseStore.getState();
        const testDate = '2026-06-15';

        // Add parent expense
        const parentId = await store.addExpense(createMockExpense({
            date: testDate,
            amount: 1000,
            type: 'expense',
            isNested: true
        }));

        // Add 2 child sub-records
        await store.addExpense(createMockExpense({
            date: testDate,
            amount: 600,
            type: 'expense',
            parentId
        }));
        await store.addExpense(createMockExpense({
            date: testDate,
            amount: 400,
            type: 'expense',
            parentId
        }));

        // Verify 3 expenses exist
        expect(await db.expenses.count()).toBe(3);

        // Delete the parent expense
        await store.deleteExpense(parentId);

        // Both parent and child expenses should be deleted!
        expect(await db.expenses.count()).toBe(0);
        expect(await db.dailySummaries.get(testDate)).toBeUndefined();
    });

    it('triggers Goal amount recalculation when an expense linked to a Goal is added or removed', async () => {
        const goalId = await useGoalStore.getState().addGoal(createMockGoal({ targetAmount: 5000 }));
        const store = useExpenseStore.getState();

        // Expense towards goal increases goal currentAmount
        const expId = await store.addExpense(createMockExpense({
            amount: 1500,
            type: 'expense',
            goalId
        }));

        const goalAfterAdd = await db.goals.get(goalId);
        expect(goalAfterAdd?.currentAmount).toBe(1500);

        // Delete expense unlinks and deducts from goal
        await store.deleteExpense(expId);
        const goalAfterDelete = await db.goals.get(goalId);
        expect(goalAfterDelete?.currentAmount).toBe(0);
    });

    it('triggers Loan amount recalculation when an expense linked to a Loan is added or updated', async () => {
        // Taken loan (borrowed from someone)
        const loanId = await useLoanStore.getState().addLoan(createMockLoan({ type: 'taken' }));
        const store = useExpenseStore.getState();

        // Repayment expense towards taken loan increases loan currentAmount (repayments)
        const expId = await store.addExpense(createMockExpense({
            amount: 2000,
            type: 'expense',
            loanId
        }));

        const loanAfterAdd = await db.loans.get(loanId);
        expect(loanAfterAdd?.currentAmount).toBe(2000);

        // Update amount of repayment
        await store.updateExpense(expId, { amount: 3000 });
        const loanAfterUpdate = await db.loans.get(loanId);
        expect(loanAfterUpdate?.currentAmount).toBe(3000);
    });
});
