import { create } from 'zustand';
import { db, type Goal } from '@/db/schema';

interface GoalState {
    addGoal: (goal: Omit<Goal, 'id'>) => Promise<number>;
    updateGoal: (id: number, goal: Partial<Goal>) => Promise<number>;
    deleteGoal: (id: number) => Promise<void>;
    linkExpenseToGoal: (expenseId: number, goalId: number | null) => Promise<void>;
    recalculateGoalAmount: (goalId: number) => Promise<number>;
}

export const useGoalStore = create<GoalState>(() => ({
    addGoal: async (goal) => {
        try {
            return (await db.goals.add(goal)) as number;
        } catch (error) {
            console.error("Failed to add goal", error);
            throw error;
        }
    },

    updateGoal: async (id, goal) => {
        try {
            const updated = await db.goals.update(id, goal);
            // If amount was updated or something, we might want to ensure it's synced, 
            // but usually we recalculate from expenses now.
            return updated;
        } catch (error) {
            console.error("Failed to update goal", error);
            throw error;
        }
    },

    deleteGoal: async (id) => {
        try {
            await db.transaction('rw', db.goals, db.expenses, async () => {
                // Unlink all expenses linked to this goal
                await db.expenses.where('goalId').equals(id).modify({ goalId: null });
                await db.goals.delete(id);
            });
        } catch (error) {
            console.error("Failed to delete goal", error);
            throw error;
        }
    },

    linkExpenseToGoal: async (expenseId, goalId) => {
        try {
            await db.transaction('rw', db.goals, db.expenses, async () => {
                const expense = await db.expenses.get(expenseId);
                const oldGoalId = expense?.goalId;
                
                await db.expenses.update(expenseId, { goalId: goalId });
                
                if (goalId) {
                    const store = useGoalStore.getState();
                    await store.recalculateGoalAmount(goalId);
                }
                if (oldGoalId && oldGoalId !== goalId) {
                    const store = useGoalStore.getState();
                    await store.recalculateGoalAmount(oldGoalId);
                }
            });
        } catch (err) {
            console.error("Failed to link expense to goal", err);
            throw err;
        }
    },

    recalculateGoalAmount: async (goalId) => {
        try {
            return await db.transaction('rw', db.goals, db.expenses, async () => {
                const linkedExpenses = await db.expenses.where('goalId').equals(goalId).toArray();
                
                // Expense = money to goal (add)
                // Income = money from goal (deduct) per user request:
                // "expanse from my main, which will go into goal, and any income i make from goal... will deduct from goal"
                const total = linkedExpenses.reduce((sum, exp) => {
                    return exp.type === 'expense' ? sum + exp.amount : sum - exp.amount;
                }, 0);

                await db.goals.update(goalId, { 
                    currentAmount: Math.max(0, total),
                    updatedAt: new Date().toISOString()
                });
                return total;
            });
        } catch (err) {
            console.error("Failed to recalculate goal amount", err);
            throw err;
        }
    }
}));
