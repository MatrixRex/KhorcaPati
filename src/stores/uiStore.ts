import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Expense, type RecurringPayment } from '@/db/schema';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
    isExpenseSheetOpen: boolean;
    editingExpense?: Expense;
    initialParentId?: number | null;
    isSubRecordSheetOpen: boolean;
    editingSubRecord?: Expense;
    isRecurringPaymentSheetOpen: boolean;
    editingRecurringPayment?: RecurringPayment;
    selectedInventoryItem: string | null;
    returnPath: string | null;
    theme: Theme;
    fontScale: number;
    expenseSessionId: string;
    subSessionId: string;
    openAddExpense: (parentId?: number | null) => void;
    openEditExpense: (expense: Expense, returnPath?: string) => void;
    closeExpenseSheet: () => void;
    openAddSubRecord: (parentId: number) => void;
    openEditSubRecord: (expense: Expense) => void;
    closeSubRecordSheet: () => void;
    openAddRecurringPayment: () => void;
    openEditRecurringPayment: (payment: RecurringPayment) => void;
    closeRecurringPaymentSheet: () => void;
    setSelectedInventoryItem: (name: string | null) => void;
    setReturnPath: (path: string | null) => void;
    setTheme: (theme: Theme) => void;
    setFontScale: (scale: number) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            isExpenseSheetOpen: false,
            editingExpense: undefined,
            initialParentId: null,
            isSubRecordSheetOpen: false,
            editingSubRecord: undefined,
            isRecurringPaymentSheetOpen: false,
            editingRecurringPayment: undefined,
            selectedInventoryItem: null,
            returnPath: null,
            theme: 'system',
            fontScale: 1.1,
            expenseSessionId: '',
            subSessionId: '',

            openAddExpense: (parentId) => set({
                isExpenseSheetOpen: true,
                editingExpense: undefined,
                initialParentId: parentId ?? null,
                expenseSessionId: Math.random().toString(36).substring(7)
            }),

            openEditExpense: (expense, returnPath) => set({
                isExpenseSheetOpen: true,
                editingExpense: expense,
                initialParentId: null,
                returnPath: returnPath ?? null
            }),

            closeExpenseSheet: () => set({
                isExpenseSheetOpen: false,
                editingExpense: undefined,
                initialParentId: null,
                returnPath: null
            }),

            openAddSubRecord: (parentId) => set({
                isSubRecordSheetOpen: true,
                editingSubRecord: undefined,
                initialParentId: parentId,
                subSessionId: Math.random().toString(36).substring(7)
            }),

            openEditSubRecord: (expense) => set({
                isSubRecordSheetOpen: true,
                editingSubRecord: expense,
                initialParentId: expense.parentId
            }),

            closeSubRecordSheet: () => set({
                isSubRecordSheetOpen: false,
                editingSubRecord: undefined,
                initialParentId: null
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

            setTheme: (theme) => set({ theme }),
            setFontScale: (fontScale) => set({ fontScale }),
        }),
        {
            name: 'khorchapati-ui-store',
            partialize: (state) => ({ theme: state.theme, fontScale: state.fontScale }), // Persist theme and fontScale
        }
    )
);
