import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { RecurringPaymentForm } from '@/components/recurring/RecurringPaymentForm';
import { useUIStore } from '@/stores/uiStore';
import { useCategoryStore } from '@/stores/categoryStore';

export function GlobalUI() {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        isExpenseSheetOpen, editingExpense, initialParentId, returnPath, openAddExpense, closeExpenseSheet,
        isSubRecordSheetOpen, editingSubRecord, closeSubRecordSheet,
        isRecurringPaymentSheetOpen, editingRecurringPayment, closeRecurringPaymentSheet,
        theme,
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

    const handleCloseRecurring = () => {
        closeRecurringPaymentSheet();
    };

    useEffect(() => {
        ensureDefaultCategory();
        loadCategories();
    }, [ensureDefaultCategory, loadCategories]);

    // Hide FAB on settings page
    const showFAB = location.pathname !== '/settings';

    return (
        <>
            {showFAB && (
                <Button
                    className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => openAddExpense()}
                >
                    <Plus className="w-6 h-6" />
                </Button>
            )}

            {/* Main Expense Sheet */}
            <Sheet open={isExpenseSheetOpen} onOpenChange={(open) => !open && handleCloseExpense()}>
                <SheetContent side="bottom" className="h-[92vh] rounded-t-[32px] p-0 overflow-hidden border-none bg-background">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="px-6 pb-6 h-full overflow-y-auto pt-2">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle>{editingExpense ? 'Edit Record' : 'Add Record'}</SheetTitle>
                        </SheetHeader>
                        <ExpenseForm
                            key={editingExpense?.id || (initialParentId && !isSubRecordSheetOpen ? `parent-${initialParentId}` : 'new-parent')}
                            initialData={editingExpense}
                            onSuccess={handleCloseExpense}
                            onCancel={handleCloseExpense}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Sub-Record Sheet */}
            <Sheet open={isSubRecordSheetOpen} onOpenChange={(open) => !open && handleCloseSubRecord()}>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-[32px] p-0 overflow-hidden border-none bg-background z-[60]">
                    <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                    <div className="px-6 pb-6 h-full overflow-y-auto pt-2">
                        <SheetHeader className="mb-6 text-left">
                            <SheetTitle>{editingSubRecord ? 'Edit Sub-Record' : 'Add Sub-Record'}</SheetTitle>
                        </SheetHeader>
                        <ExpenseForm
                            key={editingSubRecord?.id || (initialParentId ? `sub-${initialParentId}` : 'new-sub')}
                            initialData={editingSubRecord}
                            hideCollectionToggle
                            onSuccess={handleCloseSubRecord}
                            onCancel={handleCloseSubRecord}
                        />
                    </div>
                </SheetContent>
            </Sheet>


            {/* Recurring Payment Sheet */}
            <Sheet open={isRecurringPaymentSheetOpen} onOpenChange={(open) => !open && handleCloseRecurring()}>
                <SheetContent
                    side="bottom"
                    className="h-[90vh] sm:h-auto rounded-t-xl p-0 overflow-y-auto w-full max-w-md mx-auto z-50 pointer-events-auto"
                >
                    <div className="p-4 sm:p-6 mb-8">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>{editingRecurringPayment ? 'Edit Recurring Payment' : 'Add Recurring Payment'}</SheetTitle>
                        </SheetHeader>
                        <RecurringPaymentForm
                            initialData={editingRecurringPayment}
                            onSuccess={handleCloseRecurring}
                            onCancel={handleCloseRecurring}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
