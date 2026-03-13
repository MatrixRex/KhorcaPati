import * as React from 'react';
import { useEffect } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { RecurringPaymentForm } from '@/components/recurring/RecurringPaymentForm';
import { RecurringPaymentsListDrawer } from '@/components/recurring/RecurringPaymentsListDrawer';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { BudgetRecordsList } from '@/components/budgets/BudgetRecordsList';
import { BudgetsListDrawer } from '@/components/budgets/BudgetsListDrawer';
import { GoalForm } from '@/components/goals/GoalForm';
import { GoalLinker } from '@/components/goals/GoalLinker';
import { GoalRecordsList } from '@/components/goals/GoalRecordsList';
import { GoalsListDrawer } from '@/components/goals/GoalsListDrawer';
import { CategoryManagementDrawer } from '@/components/shared/CategoryManagementDrawer';
import { useUIStore } from '@/stores/uiStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTranslation } from 'react-i18next';

export function GlobalUI() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const {
        isExpenseSheetOpen, editingExpense, initialParentId, returnPath, openAddExpense, closeExpenseSheet,
        isSubRecordSheetOpen, editingSubRecord, closeSubRecordSheet,
        isRecurringPaymentSheetOpen, editingRecurringPayment, closeRecurringPaymentSheet,
        isBudgetSheetOpen, editingBudget, closeBudgetSheet,
        isBudgetRecordsSheetOpen, budgetForRecords, closeBudgetRecordsSheet,
        isGoalSheetOpen, editingGoal, closeGoalSheet,
        isGoalProgressSheetOpen, goalForProgress, closeGoalProgressSheet,
        isGoalRecordsSheetOpen, goalForRecords, closeGoalRecordsSheet,
        openEditGoal, openEditBudget,
        isRecurringPaymentsListOpen,
        isBudgetsListOpen,
        isGoalsListOpen,
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

    const handleCloseExpense = React.useCallback(() => {
        const path = returnPath;
        closeExpenseSheet();
        if (path) {
            navigate(path);
        }
    }, [returnPath, closeExpenseSheet, navigate]);

    const handleCloseSubRecord = React.useCallback(() => {
        closeSubRecordSheet();
    }, [closeSubRecordSheet]);


    // Add beforeunload listener to prevent accidental reload/close when editing
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isExpenseSheetOpen || isSubRecordSheetOpen || isRecurringPaymentSheetOpen || isBudgetSheetOpen || isBudgetRecordsSheetOpen || isGoalSheetOpen || isGoalProgressSheetOpen || isGoalRecordsSheetOpen || isRecurringPaymentsListOpen || isBudgetsListOpen || isGoalsListOpen || isCategoryManagementOpen) {
                e.preventDefault();
                e.returnValue = ''; // Required for some browsers
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isExpenseSheetOpen, isSubRecordSheetOpen, isRecurringPaymentSheetOpen, isBudgetSheetOpen, isBudgetRecordsSheetOpen, isGoalSheetOpen, isGoalProgressSheetOpen, isGoalRecordsSheetOpen, isRecurringPaymentsListOpen, isBudgetsListOpen, isGoalsListOpen, isCategoryManagementOpen]);

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
            <BudgetsListDrawer />
            <GoalsListDrawer />
            <CategoryManagementDrawer />

            {/* Main Expense Sheet */}
            <Sheet open={isExpenseSheetOpen} onOpenChange={(open) => !open && handleCloseExpense()}>
                <SheetContent side="bottom" className="max-h-[92dvh] h-auto rounded-t-[32px] p-0 border-none bg-background">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="px-6 pb-6 overflow-y-auto pt-2">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle>{editingExpense ? t('editRecord') : t('addRecord')}</SheetTitle>
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
                            <SheetTitle>{editingSubRecord ? t('editSubRecord') : t('addSubRecord')}</SheetTitle>
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
                            <SheetTitle>{editingRecurringPayment ? t('editRecurring') : t('addRecurring')}</SheetTitle>
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
                            <SheetTitle className="text-xl font-black">{editingBudget ? t('editBudget') : t('newBudgetLimit')}</SheetTitle>
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
                            <SheetTitle className="text-xl font-black">{editingGoal ? t('editSavingGoal') : t('addSavingGoal')}</SheetTitle>
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
                            <SheetTitle className="text-xl font-black">{t('linkRecordsToGoal')}</SheetTitle>
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
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-tight text-primary">{t('goalSavingsDetail')}</span>
                                    <SheetTitle className="text-2xl font-black">{goalForRecords?.title}</SheetTitle>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-full hover:bg-primary/10 text-primary transition-all"
                                    onClick={() => {
                                        if (goalForRecords) {
                                            openEditGoal(goalForRecords);
                                            closeGoalRecordsSheet();
                                        }
                                    }}
                                >
                                    <Edit2 className="w-5 h-5" />
                                </Button>
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
            {/* Budget Records Sheet */}
            <Sheet open={isBudgetRecordsSheetOpen} onOpenChange={(open) => !open && closeBudgetRecordsSheet()}>
                <SheetContent side="bottom" className="max-h-[92dvh] h-auto sm:h-auto rounded-t-[32px] p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto border-none shadow-2xl bg-background">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="p-6 pb-12 text-foreground">
                        <SheetHeader className="mb-6 text-left border-b pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-tight text-primary">{t('budgetUsageDetail')}</span>
                                    <SheetTitle className="text-2xl font-black capitalize">{budgetForRecords?.category}</SheetTitle>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-full hover:bg-primary/10 text-primary transition-all"
                                    onClick={() => {
                                        if (budgetForRecords) {
                                            openEditBudget(budgetForRecords);
                                            closeBudgetRecordsSheet();
                                        }
                                    }}
                                >
                                    <Edit2 className="w-5 h-5" />
                                </Button>
                            </div>
                        </SheetHeader>
                        <div className="mt-6">
                            {budgetForRecords && (
                                <BudgetRecordsList budget={budgetForRecords} />
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
