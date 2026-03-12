import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { GoalCard } from './GoalCard';
import { useUIStore } from '@/stores/uiStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Info } from 'lucide-react';

export function GoalsListDrawer() {
    const { isGoalsListOpen, closeGoalsList, openAddGoal, openEditGoal } = useUIStore();

    const goals = useLiveQuery(async () => {
        return await db.goals.orderBy('createdAt').reverse().toArray();
    });

    return (
        <Sheet open={isGoalsListOpen} onOpenChange={(open) => !open && closeGoalsList()}>
            <SheetContent side="bottom" className="h-[92vh] rounded-t-[32px] p-0 overflow-hidden border-none bg-background">
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                <div className="px-6 pb-6 h-full flex flex-col pt-2">
                    <SheetHeader className="px-0 py-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-2xl font-black tracking-tight">Savings Goals</SheetTitle>
                                <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                                    {goals?.length || 0} Total Goals
                                </SheetDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-10 w-10 rounded-full border-2 border-primary text-primary hover:bg-primary/10 hover:scale-[1.05] active:scale-[0.95] transition-all bg-transparent"
                                onClick={openAddGoal}
                            >
                                <Plus className="w-5 h-5 stroke-[3]" />
                            </Button>
                        </div>
                    </SheetHeader>

                    {!goals || goals.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                                <Info className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">No Goals Yet</h3>
                                <p className="text-sm text-muted-foreground max-w-[200px]">Save for something special by creating a new goal.</p>
                            </div>
                            <Button onClick={openAddGoal} className="mt-4 rounded-full px-8">
                                Add First Goal
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 pb-8">
                            <div className="grid grid-cols-1 gap-3">
                                {goals.map(goal => (
                                    <GoalCard
                                        key={goal.id}
                                        goal={goal}
                                        onClick={() => openEditGoal(goal)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
