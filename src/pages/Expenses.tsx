import { useState } from 'react';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { type Expense } from '@/db/schema';

export default function Expenses() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);

    const handleEdit = (expense: Expense) => {
        setSelectedExpense(expense);
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setSelectedExpense(undefined);
    };

    return (
        <div className="p-4 h-full flex flex-col pt-10 pb-20">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            </div>

            <div className="flex-1 overflow-auto -mx-4 px-4">
                <ExpenseList onEdit={handleEdit} />
            </div>

            <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <Button
                    className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
                    onClick={() => {
                        setSelectedExpense(undefined);
                        setIsOpen(true);
                    }}
                >
                    <Plus className="w-6 h-6" />
                </Button>
                <SheetContent side="bottom" className="h-[90vh] sm:h-auto rounded-t-xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto">
                    <div className="p-4 sm:p-6 mb-8">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>{selectedExpense ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
                        </SheetHeader>
                        <ExpenseForm
                            initialData={selectedExpense}
                            onSuccess={handleClose}
                            onCancel={handleClose}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
