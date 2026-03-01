import { Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { useUIStore } from '@/stores/uiStore';

export function GlobalUI() {
    const location = useLocation();
    const { isExpenseSheetOpen, editingExpense, openAddExpense, closeExpenseSheet } = useUIStore();

    // Hide FAB on settings page
    const showFAB = location.pathname !== '/settings';

    return (
        <>
            {showFAB && (
                <Button
                    className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-50 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={openAddExpense}
                >
                    <Plus className="w-6 h-6" />
                </Button>
            )}

            <Sheet open={isExpenseSheetOpen} onOpenChange={(open) => !open && closeExpenseSheet()}>
                <SheetContent
                    side="bottom"
                    className="h-[90vh] sm:h-auto rounded-t-xl p-0 overflow-y-auto w-full max-w-md mx-auto z-50 pointer-events-auto"
                >
                    <div className="p-4 sm:p-6 mb-8">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
                        </SheetHeader>
                        <ExpenseForm
                            initialData={editingExpense}
                            onSuccess={closeExpenseSheet}
                            onCancel={closeExpenseSheet}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
