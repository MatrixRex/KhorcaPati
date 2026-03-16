import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Expense, type RecurringPayment, type Budget, type Goal, type Loan } from '@/db/schema';

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
    isGoalProgressSheetOpen: boolean;
    goalForProgress?: Goal;
    isGoalRecordsSheetOpen: boolean;
    goalForRecords?: Goal;
    isLoanSheetOpen: boolean;
    editingLoan?: Loan;
    isLoanProgressSheetOpen: boolean;
    loanForProgress?: Loan;
    isLoanRecordsSheetOpen: boolean;
    loanForRecords?: Loan;
    isBudgetRecordsSheetOpen: boolean;
    budgetForRecords?: Budget;
    isRecurringPaymentsListOpen: boolean;
    isBudgetsListOpen: boolean;
    isGoalsListOpen: boolean;
    isLoansListOpen: boolean;
    isCategoryManagementOpen: boolean;
    isBalanceEditDrawerOpen: boolean;
    isCategoryRecordsOpen: boolean;
    categoryForRecords?: string;
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
    openAddGoalProgress: (goal: Goal) => void;
    closeGoalProgressSheet: () => void;
    openGoalRecords: (goal: Goal) => void;
    closeGoalRecordsSheet: () => void;
    openAddLoan: () => void;
    openEditLoan: (loan: Loan) => void;
    closeLoanSheet: () => void;
    openAddLoanProgress: (loan: Loan) => void;
    closeLoanProgressSheet: () => void;
    openLoanRecords: (loan: Loan) => void;
    closeLoanRecordsSheet: () => void;
    openBudgetRecords: (budget: Budget) => void;
    closeBudgetRecordsSheet: () => void;
    openRecurringPaymentsList: () => void;
    closeRecurringPaymentsList: () => void;
    openBudgetsList: () => void;
    closeBudgetsList: () => void;
    openGoalsList: () => void;
    closeGoalsList: () => void;
    openLoansList: () => void;
    closeLoansList: () => void;
    openCategoryManagement: () => void;
    closeCategoryManagement: () => void;
    openBalanceEdit: () => void;
    closeBalanceEdit: () => void;
    openAddBudget: () => void;
    openEditBudget: (budget: Budget) => void;
    closeBudgetSheet: () => void;
    openCategoryRecords: (category: string) => void;
    closeCategoryRecords: () => void;
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
            isGoalProgressSheetOpen: false,
            goalForProgress: undefined,
            isGoalRecordsSheetOpen: false,
            goalForRecords: undefined,
            isLoanSheetOpen: false,
            editingLoan: undefined,
            isLoanProgressSheetOpen: false,
            loanForProgress: undefined,
            isLoanRecordsSheetOpen: false,
            loanForRecords: undefined,
            isBudgetRecordsSheetOpen: false,
            budgetForRecords: undefined,
            isRecurringPaymentsListOpen: false,
            isBudgetsListOpen: false,
            isGoalsListOpen: false,
            isLoansListOpen: false,
            isCategoryManagementOpen: false,
            isBalanceEditDrawerOpen: false,
            isCategoryRecordsOpen: false,
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
                       state.isGoalProgressSheetOpen ||
                       state.isGoalRecordsSheetOpen ||
                       state.isLoanSheetOpen ||
                       state.isLoanProgressSheetOpen ||
                       state.isLoanRecordsSheetOpen ||
                        state.isBudgetRecordsSheetOpen || 
                        state.isRecurringPaymentsListOpen ||
                        state.isBudgetsListOpen ||
                        state.isGoalsListOpen ||
                        state.isCategoryManagementOpen ||
                        state.isBalanceEditDrawerOpen ||
                        state.isCategoryRecordsOpen;
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

            openAddGoalProgress: (goal: Goal) => set({
                isGoalProgressSheetOpen: true,
                goalForProgress: goal
            }),

            closeGoalProgressSheet: () => set({
                isGoalProgressSheetOpen: false,
                goalForProgress: undefined
            }),

            openGoalRecords: (goal: Goal) => set({
                isGoalRecordsSheetOpen: true,
                goalForRecords: goal
            }),

            closeGoalRecordsSheet: () => set({
                isGoalRecordsSheetOpen: false,
                goalForRecords: undefined
            }),

            openBudgetRecords: (budget: Budget) => set({
                isBudgetRecordsSheetOpen: true,
                budgetForRecords: budget
            }),
            closeBudgetRecordsSheet: () => set({
                isBudgetRecordsSheetOpen: false,
                budgetForRecords: undefined
            }),

            openAddLoan: () => set({
                isLoanSheetOpen: true,
                editingLoan: undefined
            }),

            openEditLoan: (loan) => set({
                isLoanSheetOpen: true,
                editingLoan: loan
            }),

            closeLoanSheet: () => set({
                isLoanSheetOpen: false,
                editingLoan: undefined
            }),

            openAddLoanProgress: (loan: Loan) => set({
                isLoanProgressSheetOpen: true,
                loanForProgress: loan
            }),

            closeLoanProgressSheet: () => set({
                isLoanProgressSheetOpen: false,
                loanForProgress: undefined
            }),

            openLoanRecords: (loan: Loan) => set({
                isLoanRecordsSheetOpen: true,
                loanForRecords: loan
            }),

            closeLoanRecordsSheet: () => set({
                isLoanRecordsSheetOpen: false,
                loanForRecords: undefined
            }),

            openRecurringPaymentsList: () => set({
                isRecurringPaymentsListOpen: true
            }),

            closeRecurringPaymentsList: () => set({
                isRecurringPaymentsListOpen: false
            }),

            openBudgetsList: () => set({
                isBudgetsListOpen: true
            }),

            closeBudgetsList: () => set({
                isBudgetsListOpen: false
            }),

            openGoalsList: () => set({
                isGoalsListOpen: true
            }),

            closeGoalsList: () => set({
                isGoalsListOpen: false
            }),

            openLoansList: () => set({
                isLoansListOpen: true
            }),

            closeLoansList: () => set({
                isLoansListOpen: false
            }),
            openCategoryManagement: () => set({
                isCategoryManagementOpen: true
            }),
            closeCategoryManagement: () => set({
                isCategoryManagementOpen: false
            }),
            openBalanceEdit: () => set({
                isBalanceEditDrawerOpen: true
            }),
            closeBalanceEdit: () => set({
                isBalanceEditDrawerOpen: false
            }),
            
            openCategoryRecords: (category) => set({
                isCategoryRecordsOpen: true,
                categoryForRecords: category
            }),

            closeCategoryRecords: () => set({
                isCategoryRecordsOpen: false,
                categoryForRecords: undefined
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
