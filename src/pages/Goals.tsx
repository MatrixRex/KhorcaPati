import { useState } from 'react';
import { GoalList } from '@/components/goals/GoalList';
import { GoalForm } from '@/components/goals/GoalForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';

export default function Goals() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <PageContainer
            title="Goals"
            showBackButton
            headerAction={
                <Button size="sm" onClick={() => setIsOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
                    <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
            }
        >
            <div className="flex-1">
                <GoalList />
            </div>

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent side="bottom" className="h-[90vh] sm:h-auto rounded-t-3xl p-0 overflow-y-auto w-full max-w-md mx-auto pointer-events-auto border-none shadow-2xl">
                    <div className="p-6 mb-8 text-foreground">
                        <SheetHeader className="mb-6 text-left border-b pb-4">
                            <SheetTitle className="text-xl font-black">Add Saving Goal</SheetTitle>
                        </SheetHeader>
                        <GoalForm onSuccess={() => setIsOpen(false)} onCancel={() => setIsOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
        </PageContainer>
    );
}
