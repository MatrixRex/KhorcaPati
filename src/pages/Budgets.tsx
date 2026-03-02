import { useState } from 'react';
import { BudgetList } from '@/components/budgets/BudgetList';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type Budget } from '@/db/schema';

export default function Budgets() {
    const [isOpen, setIsOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);
    const navigate = useNavigate();

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
        <div className="p-4 h-full flex flex-col pt-4 pb-20">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
                </div>
                <Button size="sm" onClick={openAdd}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
            </div>

            <div className="flex-1 overflow-auto -mx-4 px-4">
                <BudgetList onEdit={openEdit} />
            </div>

            <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
                <SheetContent side="bottom" className="h-[90vh] sm:h-auto rounded-t-xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto">
                    <div className="p-4 sm:p-6 mb-8 text-foreground">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>{editingBudget ? 'Edit Budget' : 'Add Budget Limit'}</SheetTitle>
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
        </div>
    );
}
