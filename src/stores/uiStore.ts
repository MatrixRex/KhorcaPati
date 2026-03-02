import { create } from 'zustand';
import { type Expense } from '@/db/schema';

interface UIState {
    isExpenseSheetOpen: boolean;
    editingExpense?: Expense;
    selectedInventoryItem: string | null;
    returnPath: string | null;
    openAddExpense: () => void;
    openEditExpense: (expense: Expense, returnPath?: string) => void;
    closeExpenseSheet: () => void;
    setSelectedInventoryItem: (name: string | null) => void;
    setReturnPath: (path: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isExpenseSheetOpen: false,
    editingExpense: undefined,
    selectedInventoryItem: null,
    returnPath: null,

    openAddExpense: () => set({
        isExpenseSheetOpen: true,
        editingExpense: undefined
    }),

    openEditExpense: (expense, returnPath) => set({
        isExpenseSheetOpen: true,
        editingExpense: expense,
        returnPath: returnPath ?? null
    }),

    closeExpenseSheet: () => set({
        isExpenseSheetOpen: false,
        editingExpense: undefined,
        returnPath: null
    }),

    setSelectedInventoryItem: (name) => set({
        selectedInventoryItem: name
    }),

    setReturnPath: (path) => set({
        returnPath: path
    }),
}));
