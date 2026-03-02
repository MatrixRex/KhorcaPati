import { create } from 'zustand';
import { db, type Expense } from '@/db/schema';

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
        // This is essentially starting a subscription or just doing an initial fetch.
        // In React components, using useLiveQuery from dexie-react-hooks is better for reactivity,
        // but the store can be used for actions and raw data fetching.
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
            // Let dexie liveQuery handle UI updates, but we can also refetch here manually
            // if not using liveQuery, but assuming we use liveQuery in UI, this just writes to DB.
            return id as number;
        } catch (error) {
            console.error("Failed to add expense", error);
            throw error;
        }
    },

    updateExpense: async (id, expense) => {
        try {
            return await db.expenses.update(id, expense);
        } catch (error) {
            console.error("Failed to update expense", error);
            throw error;
        }
    },

    deleteExpense: async (id) => {
        try {
            // Also delete sub-expenses when deleting parent
            await db.transaction('rw', db.expenses, async () => {
                await db.expenses.where('parentId').equals(id).delete();
                await db.expenses.delete(id);
            });
        } catch (error) {
            console.error("Failed to delete expense", error);
            throw error;
        }
    }
}));
