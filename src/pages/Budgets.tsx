import { useState } from 'react';
import { BudgetList } from '@/components/budgets/BudgetList';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { type Budget } from '@/db/schema';
import { PageContainer } from '@/components/shared/PageContainer';

export default function Budgets() {
    const [isOpen, setIsOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);

    const openAdd = () => {
        setEditingBudget(undefined);
        setIsOpen(true);
    };

    const openEdit = (budget: Budget) => {
        setEditingBudget(budget);
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setEditingBudget(undefined);
    };

    return (
        <PageContainer
            title="Budgets"
            showBackButton
            headerAction={
                <Button size="sm" onClick={openAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
                    <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
            }
        >
            <div className="flex-1">
                <BudgetList onEdit={openEdit} />
            </div>

            <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
                <SheetContent side="bottom" className="h-[90vh] sm:h-auto rounded-t-3xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto border-none shadow-2xl">
                    <div className="p-6 mb-8 text-foreground">
                        <SheetHeader className="mb-6 text-left border-b pb-4">
                            <SheetTitle className="text-xl font-black">{editingBudget ? 'Edit Budget' : 'New Budget Limit'}</SheetTitle>
                        </SheetHeader>
                        <BudgetForm
                            key={editingBudget?.id ?? 'new'}
                            initialData={editingBudget}
                            onSuccess={handleClose}
                            onCancel={handleClose}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </PageContainer>
    );
}
