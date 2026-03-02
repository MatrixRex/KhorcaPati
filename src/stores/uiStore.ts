import { create } from 'zustand';
import { type Expense, type RecurringPayment } from '@/db/schema';

interface UIState {
    isExpenseSheetOpen: boolean;
    editingExpense?: Expense;
    isRecurringPaymentSheetOpen: boolean;
    editingRecurringPayment?: RecurringPayment;
    selectedInventoryItem: string | null;
    returnPath: string | null;
    openAddExpense: () => void;
    openEditExpense: (expense: Expense, returnPath?: string) => void;
    closeExpenseSheet: () => void;
    openAddRecurringPayment: () => void;
    openEditRecurringPayment: (payment: RecurringPayment) => void;
    closeRecurringPaymentSheet: () => void;
    setSelectedInventoryItem: (name: string | null) => void;
    setReturnPath: (path: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isExpenseSheetOpen: false,
    editingExpense: undefined,
    isRecurringPaymentSheetOpen: false,
    editingRecurringPayment: undefined,
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

    openAddRecurringPayment: () => set({
        isRecurringPaymentSheetOpen: true,
        editingRecurringPayment: undefined
    }),

    openEditRecurringPayment: (payment) => set({
        isRecurringPaymentSheetOpen: true,
        editingRecurringPayment: payment
    }),

    closeRecurringPaymentSheet: () => set({
        isRecurringPaymentSheetOpen: false,
        editingRecurringPayment: undefined
    }),

    setSelectedInventoryItem: (name) => set({
        selectedInventoryItem: name
    }),

    setReturnPath: (path) => set({
        returnPath: path
    }),
}));
