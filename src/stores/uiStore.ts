import { create } from 'zustand';
import { type Expense } from '@/db/schema';

interface UIState {
    isExpenseSheetOpen: boolean;
    editingExpense?: Expense;
    openAddExpense: () => void;
    openEditExpense: (expense: Expense) => void;
    closeExpenseSheet: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isExpenseSheetOpen: false,
    editingExpense: undefined,

    openAddExpense: () => set({
        isExpenseSheetOpen: true,
        editingExpense: undefined
    }),

    openEditExpense: (expense) => set({
        isExpenseSheetOpen: true,
        editingExpense: expense
    }),

    closeExpenseSheet: () => set({
        isExpenseSheetOpen: false,
        editingExpense: undefined
    }),
}));
