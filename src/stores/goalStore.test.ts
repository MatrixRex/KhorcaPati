import { describe, it, expect } from 'vitest';
import { db } from '@/db/schema';
import { useGoalStore } from './goalStore';
import { useExpenseStore } from './expenseStore';
import { createMockGoal, createMockExpense } from '@/test/factories';

describe('Goal Store Business Logic', () => {
    it('addGoal creates goal and auto-archives if target is already met', async () => {
        const store = useGoalStore.getState();

        const goalId1 = await store.addGoal(createMockGoal({ targetAmount: 10000, currentAmount: 2000 }));
        const goal1 = await db.goals.get(goalId1);
        expect(goal1?.isArchived).toBe(false);

        const goalId2 = await store.addGoal(createMockGoal({ targetAmount: 5000, currentAmount: 5000 }));
        const goal2 = await db.goals.get(goalId2);
        expect(goal2?.isArchived).toBe(true);
    });

    it('recalculateGoalAmount calculates net contributions (expense adds, income deducts) with floor at 0', async () => {
        const store = useGoalStore.getState();
        const goalId = await store.addGoal(createMockGoal({ targetAmount: 2000 }));

        // Add expense of 1000 linked to goal
        await db.expenses.add(createMockExpense({ amount: 1000, type: 'expense', goalId }));
        // Add expense of 500 linked to goal
        await db.expenses.add(createMockExpense({ amount: 500, type: 'expense', goalId }));
        // Add income of 300 linked to goal (withdrawal)
        await db.expenses.add(createMockExpense({ amount: 300, type: 'income', goalId }));

        const total = await store.recalculateGoalAmount(goalId);
        expect(total).toBe(1200); // 1000 + 500 - 300

        const goal = await db.goals.get(goalId);
        expect(goal?.currentAmount).toBe(1200);
        expect(goal?.isArchived).toBe(false);

        // Add 1000 more expense to reach target (1200 + 1000 = 2200 >= 2000)
        await db.expenses.add(createMockExpense({ amount: 1000, type: 'expense', goalId }));
        await store.recalculateGoalAmount(goalId);

        const completedGoal = await db.goals.get(goalId);
        expect(completedGoal?.currentAmount).toBe(2200);
        expect(completedGoal?.isArchived).toBe(true);
    });

    it('deleteGoal unlinks expenses without deleting the expense records', async () => {
        const store = useGoalStore.getState();
        const goalId = await store.addGoal(createMockGoal({ targetAmount: 5000 }));

        const expId = await useExpenseStore.getState().addExpense(createMockExpense({
            amount: 1000,
            type: 'expense',
            goalId
        }));

        expect((await db.expenses.get(expId))?.goalId).toBe(goalId);

        // Delete goal
        await store.deleteGoal(goalId);

        // Goal is deleted from DB
        expect(await db.goals.get(goalId)).toBeUndefined();

        // Expense record still exists, but its goalId is unlinked to null
        const expense = await db.expenses.get(expId);
        expect(expense).toBeDefined();
        expect(expense?.goalId).toBeNull();
    });

    it('archiveGoal toggles isArchived status', async () => {
        const store = useGoalStore.getState();
        const goalId = await store.addGoal(createMockGoal({ targetAmount: 5000 }));

        expect((await db.goals.get(goalId))?.isArchived).toBe(false);

        await store.archiveGoal(goalId, true);
        expect((await db.goals.get(goalId))?.isArchived).toBe(true);

        await store.archiveGoal(goalId, false);
        expect((await db.goals.get(goalId))?.isArchived).toBe(false);
    });
});
