import { create } from 'zustand';
import { db, type Expense } from '@/db/schema';
import { useGoalStore } from './goalStore';
import { useLoanStore } from './loanStore';

interface ExpenseState {
    expenses: Expense[];
    isLoading: boolean;
    loadExpenses: () => Promise<void>;
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<number>;
    updateExpense: (id: number, expense: Partial<Expense>) => Promise<number>;
    deleteExpense: (id: number) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
    expenses: [],
    isLoading: true,

    loadExpenses: async () => {
        set({ isLoading: true });
        try {
            const data = await db.expenses.toArray();
            set({ expenses: data, isLoading: false });
        } catch (e) {
            console.error(e);
            set({ isLoading: false });
        }
    },

    addExpense: async (expense) => {
        try {
            const id = await db.expenses.add(expense);
            if (expense.goalId) {
                await useGoalStore.getState().recalculateGoalAmount(expense.goalId);
            }
            if (expense.loanId) {
                await useLoanStore.getState().recalculateLoanAmount(expense.loanId);
            }
            return id as number;
        } catch (error) {
            console.error("Failed to add expense", error);
            throw error;
        }
    },

    updateExpense: async (id, expense) => {
        try {
            const oldExpense = await db.expenses.get(id);
            const oldGoalId = oldExpense?.goalId;
            
            await db.expenses.update(id, expense);
            
            const newExpense = await db.expenses.get(id);
            const newGoalId = newExpense?.goalId;
            const newLoanId = newExpense?.loanId;

            if (newGoalId) {
                await useGoalStore.getState().recalculateGoalAmount(newGoalId);
            }
            if (oldGoalId && oldGoalId !== newGoalId) {
                await useGoalStore.getState().recalculateGoalAmount(oldGoalId);
            }

            if (newLoanId) {
                await useLoanStore.getState().recalculateLoanAmount(newLoanId);
            }
            const oldLoanId = oldExpense?.loanId;
            if (oldLoanId && oldLoanId !== newLoanId) {
                await useLoanStore.getState().recalculateLoanAmount(oldLoanId);
            }
            
            return id;
        } catch (error) {
            console.error("Failed to update expense", error);
            throw error;
        }
    },

    deleteExpense: async (id) => {
        try {
            const expense = await db.expenses.get(id);
            const goalId = expense?.goalId;
            const loanId = expense?.loanId;

            await db.transaction('rw', db.expenses, async () => {
                await db.expenses.where('parentId').equals(id).delete();
                await db.expenses.delete(id);
            });

            if (goalId) {
                await useGoalStore.getState().recalculateGoalAmount(goalId);
            }
            if (loanId) {
                await useLoanStore.getState().recalculateLoanAmount(loanId);
            }
        } catch (error) {
            console.error("Failed to delete expense", error);
            throw error;
        }
    }
}));
