import { create } from 'zustand';
import { db, type Budget } from '@/db/schema';

interface BudgetState {
    addBudget: (budget: Omit<Budget, 'id'>) => Promise<number>;
    updateBudget: (id: number, budget: Partial<Budget>) => Promise<number>;
    deleteBudget: (id: number) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>(() => ({
    addBudget: async (budget) => {
        try {
            return (await db.budgets.add(budget)) as number;
        } catch (error) {
            console.error("Failed to add budget", error);
            throw error;
        }
    },

    updateBudget: async (id, budget) => {
        try {
            return await db.budgets.update(id, budget);
        } catch (error) {
            console.error("Failed to update budget", error);
            throw error;
        }
    },

    deleteBudget: async (id) => {
        try {
            await db.budgets.delete(id);
        } catch (error) {
            console.error("Failed to delete budget", error);
            throw error;
        }
    }
}));
