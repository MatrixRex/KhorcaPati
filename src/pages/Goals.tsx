import { useState } from 'react';
import { GoalList } from '@/components/goals/GoalList';
import { GoalForm } from '@/components/goals/GoalForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Goals() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="p-4 h-full flex flex-col pt-4 pb-20">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
                </div>
                <Button size="sm" onClick={() => setIsOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
            </div>

            <div className="flex-1 overflow-auto -mx-4 px-4">
                <GoalList />
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="bottom" className="h-[90vh] sm:h-auto rounded-t-xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto">
                    <div className="p-4 sm:p-6 mb-8 text-foreground">
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle>Add Saving Goal</SheetTitle>
                        </SheetHeader>
                        <GoalForm onSuccess={() => setIsOpen(false)} onCancel={() => setIsOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
