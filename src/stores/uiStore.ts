import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Expense, type RecurringPayment, type Budget, type Goal } from '@/db/schema';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
    isExpenseSheetOpen: boolean;
    editingExpense?: Expense;
    initialParentId?: number | null;
    isSubRecordSheetOpen: boolean;
    editingSubRecord?: Expense;
    isRecurringPaymentSheetOpen: boolean;
    editingRecurringPayment?: RecurringPayment;
    isBudgetSheetOpen: boolean;
    editingBudget?: Budget;
    isGoalSheetOpen: boolean;
    editingGoal?: Goal;
    isRecurringPaymentsListOpen: boolean;
    isCategoryManagementOpen: boolean;
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
    openAddGoal: () => void;
    openEditGoal: (goal: Goal) => void;
    closeGoalSheet: () => void;
    openRecurringPaymentsList: () => void;
    closeRecurringPaymentsList: () => void;
    openCategoryManagement: () => void;
    closeCategoryManagement: () => void;
    openAddBudget: () => void;
    openEditBudget: (budget: Budget) => void;
    closeBudgetSheet: () => void;
    setSelectedInventoryItem: (name: string | null) => void;
    setReturnPath: (path: string | null) => void;
    setTheme: (theme: Theme) => void;
    setFontScale: (scale: number) => void;
    isInEditingMode: () => boolean;
}

export const useUIStore = create<UIState>()(
    persist(
        (set, get) => ({
            isExpenseSheetOpen: false,
            editingExpense: undefined,
            initialParentId: null,
            isSubRecordSheetOpen: false,
            editingSubRecord: undefined,
            isRecurringPaymentSheetOpen: false,
            editingRecurringPayment: undefined,
            isBudgetSheetOpen: false,
            editingBudget: undefined,
            isGoalSheetOpen: false,
            editingGoal: undefined,
            isRecurringPaymentsListOpen: false,
            isCategoryManagementOpen: false,
            selectedInventoryItem: null,
            returnPath: null,
            theme: 'system',
            fontScale: 1.1,
            expenseSessionId: '',
            subSessionId: '',

            isInEditingMode: () => {
                const state = get();
                return state.isExpenseSheetOpen || 
                       state.isSubRecordSheetOpen || 
                       state.isRecurringPaymentSheetOpen ||
                       state.isBudgetSheetOpen ||
                       state.isGoalSheetOpen ||
                       state.isRecurringPaymentsListOpen ||
                       state.isCategoryManagementOpen;
            },

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
            
            openAddBudget: () => set({
                isBudgetSheetOpen: true,
                editingBudget: undefined
            }),

            openEditBudget: (budget) => set({
                isBudgetSheetOpen: true,
                editingBudget: budget
            }),

            closeBudgetSheet: () => set({
                isBudgetSheetOpen: false,
                editingBudget: undefined
            }),

            openAddGoal: () => set({
                isGoalSheetOpen: true,
                editingGoal: undefined
            }),

            openEditGoal: (goal) => set({
                isGoalSheetOpen: true,
                editingGoal: goal
            }),

            closeGoalSheet: () => set({
                isGoalSheetOpen: false,
                editingGoal: undefined
            }),

            openRecurringPaymentsList: () => set({
                isRecurringPaymentsListOpen: true
            }),

            closeRecurringPaymentsList: () => set({
                isRecurringPaymentsListOpen: false
            }),
            openCategoryManagement: () => set({
                isCategoryManagementOpen: true
            }),
            closeCategoryManagement: () => set({
                isCategoryManagementOpen: false
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
