import { useState } from 'react';
import { BudgetList } from '@/components/budgets/BudgetList';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Budgets() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="p-4 h-full flex flex-col pt-10 pb-20">
            <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Category Budgets</h1>
            </div>

            <div className="flex-1 overflow-auto -mx-4 px-4">
                <BudgetList />
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <Button
                    className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
                    onClick={() => setIsOpen(true)}
                >
                    <Plus className="w-6 h-6" />
                </Button>
                <SheetContent side="bottom" className="h-[90vh] sm:h-auto rounded-t-xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto">
                    <div className="p-4 sm:p-6 mb-8">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>Add Budget Limit</SheetTitle>
                        </SheetHeader>
                        <BudgetForm onSuccess={() => setIsOpen(false)} onCancel={() => setIsOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
