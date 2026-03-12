import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { RecurringPaymentForm } from '@/components/recurring/RecurringPaymentForm';
import { RecurringPaymentsListDrawer } from '@/components/recurring/RecurringPaymentsListDrawer';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { GoalForm } from '@/components/goals/GoalForm';
import { GoalLinker } from '@/components/goals/GoalLinker';
import { GoalRecordsList } from '@/components/goals/GoalRecordsList';
import { CategoryManagementDrawer } from '@/components/shared/CategoryManagementDrawer';
import { useUIStore } from '@/stores/uiStore';
import { useCategoryStore } from '@/stores/categoryStore';

export function GlobalUI() {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        isExpenseSheetOpen, editingExpense, initialParentId, returnPath, openAddExpense, closeExpenseSheet,
        isSubRecordSheetOpen, editingSubRecord, closeSubRecordSheet,
        isRecurringPaymentSheetOpen, editingRecurringPayment, closeRecurringPaymentSheet,
        isBudgetSheetOpen, editingBudget, closeBudgetSheet,
        isGoalSheetOpen, editingGoal, closeGoalSheet,
        isGoalProgressSheetOpen, goalForProgress, closeGoalProgressSheet,
        isGoalRecordsSheetOpen, goalForRecords, closeGoalRecordsSheet,
        isRecurringPaymentsListOpen,
        isCategoryManagementOpen,
        theme, expenseSessionId, subSessionId
    } = useUIStore();
    const { ensureDefaultCategory, loadCategories } = useCategoryStore();

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = () => {
            root.classList.remove('light', 'dark');
            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(theme);
            }
        };

        applyTheme();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const handleCloseExpense = () => {
        const path = returnPath;
        closeExpenseSheet();
        if (path) {
            navigate(path);
        }
    };

    const handleCloseSubRecord = () => {
        closeSubRecordSheet();
    };


    // Add beforeunload listener to prevent accidental reload/close when editing
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isExpenseSheetOpen || isSubRecordSheetOpen || isRecurringPaymentSheetOpen || isBudgetSheetOpen || isGoalSheetOpen || isGoalProgressSheetOpen || isGoalRecordsSheetOpen || isRecurringPaymentsListOpen || isCategoryManagementOpen) {
                e.preventDefault();
                e.returnValue = ''; // Required for some browsers
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isExpenseSheetOpen, isSubRecordSheetOpen, isRecurringPaymentSheetOpen, isBudgetSheetOpen, isGoalSheetOpen, isGoalProgressSheetOpen, isGoalRecordsSheetOpen]);

    useEffect(() => {
        const init = async () => {
            await ensureDefaultCategory();
            await loadCategories();
        };
        init();
    }, [ensureDefaultCategory, loadCategories]);

    // Hide FAB on settings page
    const showFAB = location.pathname !== '/settings';

    return (
        <>
            {showFAB && (
                <Button
                    className="fixed bottom-20 right-4 h-14 w-14 rounded-full z-50 bg-primary text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-[1.1] active:scale-[0.9] transition-all duration-300 border-4 border-background"
                    onClick={() => openAddExpense()}
                >
                    <Plus className="w-7 h-7 stroke-[3]" />
                </Button>
            )}

            <RecurringPaymentsListDrawer />
            <CategoryManagementDrawer />

            {/* Main Expense Sheet */}
            <Sheet open={isExpenseSheetOpen} onOpenChange={(open) => !open && handleCloseExpense()}>
                <SheetContent side="bottom" className="max-h-[92dvh] h-auto rounded-t-[32px] p-0 border-none bg-background">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="px-6 pb-6 overflow-y-auto pt-2">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle>{editingExpense ? 'Edit Record' : 'Add Record'}</SheetTitle>
                        </SheetHeader>
                        <ExpenseForm
                            key={editingExpense?.id || `new-parent-${expenseSessionId}`}
                            initialData={editingExpense}
                            parentId={editingExpense ? undefined : (isSubRecordSheetOpen ? null : initialParentId)}
                            onSuccess={handleCloseExpense}
                            onCancel={handleCloseExpense}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Sub-Record Sheet */}
            <Sheet open={isSubRecordSheetOpen} onOpenChange={(open) => !open && handleCloseSubRecord()}>
                <SheetContent side="bottom" className="max-h-[85dvh] h-auto rounded-t-[32px] p-0 border-none bg-background z-[60]">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="px-6 pb-6 overflow-y-auto pt-2">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle>{editingSubRecord ? 'Edit Sub-Record' : 'Add Sub-Record'}</SheetTitle>
                        </SheetHeader>
                        <ExpenseForm
                            key={editingSubRecord?.id || `new-sub-${subSessionId}`}
                            initialData={editingSubRecord}
                            parentId={editingSubRecord ? undefined : initialParentId}
                            hideCollectionToggle
                            onSuccess={handleCloseSubRecord}
                            onCancel={handleCloseSubRecord}
                        />
                    </div>
                </SheetContent>
            </Sheet>


            {/* Recurring Payment Sheet */}
            <Sheet open={isRecurringPaymentSheetOpen} onOpenChange={(open) => !open && closeRecurringPaymentSheet()}>
                <SheetContent
                    side="bottom"
                    className="max-h-[90dvh] h-auto sm:h-auto rounded-t-xl p-0 overflow-y-auto w-full max-w-md mx-auto z-50 pointer-events-auto"
                >
                    <div className="p-4 sm:p-6 mb-8">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>{editingRecurringPayment ? 'Edit Recurring Payment' : 'Add Recurring Payment'}</SheetTitle>
                        </SheetHeader>
                        <RecurringPaymentForm
                            initialData={editingRecurringPayment}
                            onSuccess={closeRecurringPaymentSheet}
                            onCancel={closeRecurringPaymentSheet}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Budget Sheet */}
            <Sheet open={isBudgetSheetOpen} onOpenChange={(open) => !open && closeBudgetSheet()}>
                <SheetContent side="bottom" className="max-h-[90dvh] h-auto sm:h-auto rounded-t-3xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto border-none shadow-2xl">
                    <div className="p-6 mb-8 text-foreground">
                        <SheetHeader className="mb-6 text-left border-b pb-4">
                            <SheetTitle className="text-xl font-black">{editingBudget ? 'Edit Budget' : 'New Budget Limit'}</SheetTitle>
                        </SheetHeader>
                        <BudgetForm
                            key={editingBudget?.id ?? 'new-budget'}
                            initialData={editingBudget}
                            onSuccess={closeBudgetSheet}
                            onCancel={closeBudgetSheet}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Goal Sheet */}
            <Sheet open={isGoalSheetOpen} onOpenChange={(open) => !open && closeGoalSheet()}>
                <SheetContent side="bottom" className="max-h-[90dvh] h-auto sm:h-auto rounded-t-3xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto border-none shadow-2xl">
                    <div className="p-6 mb-8 text-foreground">
                        <SheetHeader className="mb-6 text-left border-b pb-4">
                            <SheetTitle className="text-xl font-black">{editingGoal ? 'Edit Saving Goal' : 'Add Saving Goal'}</SheetTitle>
                        </SheetHeader>
                        <GoalForm
                            initialData={editingGoal}
                            onSuccess={closeGoalSheet}
                            onCancel={closeGoalSheet}
                        />
                    </div>
                </SheetContent>
            </Sheet>
            {/* Goal Linker Sheet (repurposed from Progress) */}
            <Sheet open={isGoalProgressSheetOpen} onOpenChange={(open) => !open && closeGoalProgressSheet()}>
                <SheetContent side="bottom" className="max-h-[92dvh] h-auto sm:h-auto rounded-t-[32px] p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto border-none shadow-2xl bg-background">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="p-6 pb-12 text-foreground">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle className="text-xl font-black">Link Records to Goal</SheetTitle>
                        </SheetHeader>
                        {goalForProgress && (
                            <GoalLinker
                                goal={goalForProgress}
                                onSuccess={closeGoalProgressSheet}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Goal Records Sheet */}
            <Sheet open={isGoalRecordsSheetOpen} onOpenChange={(open) => !open && closeGoalRecordsSheet()}>
                <SheetContent side="bottom" className="max-h-[92dvh] h-auto sm:h-auto rounded-t-[32px] p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto border-none shadow-2xl bg-background">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="p-6 pb-12 text-foreground">
                        <SheetHeader className="mb-6 text-left border-b pb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-tight text-primary">Goal Savings Detail</span>
                                <SheetTitle className="text-2xl font-black">{goalForRecords?.title}</SheetTitle>
                            </div>
                        </SheetHeader>
                        <div className="mt-6">
                            {goalForRecords && (
                                <GoalRecordsList goal={goalForRecords} />
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
