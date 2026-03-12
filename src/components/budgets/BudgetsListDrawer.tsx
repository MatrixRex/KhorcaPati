import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { BudgetCard } from './BudgetCard';
import { useUIStore } from '@/stores/uiStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Info } from 'lucide-react';

export function BudgetsListDrawer() {
    const { isBudgetsListOpen, closeBudgetsList, openAddBudget, openEditBudget } = useUIStore();

    const budgets = useLiveQuery(async () => {
        return await db.budgets.toArray();
    });

    return (
        <Sheet open={isBudgetsListOpen} onOpenChange={(open) => !open && closeBudgetsList()}>
            <SheetContent side="bottom" className="h-[92vh] rounded-t-[32px] p-0 overflow-hidden border-none bg-background">
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2" />
                <div className="px-6 pb-6 h-full flex flex-col pt-2">
                    <SheetHeader className="px-0 py-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-2xl font-black tracking-tight">Budgets</SheetTitle>
                                <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                                    {budgets?.length || 0} Categories Tracked
                                </SheetDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-10 w-10 rounded-full border-2 border-primary text-primary hover:bg-primary/10 hover:scale-[1.05] active:scale-[0.95] transition-all bg-transparent"
                                onClick={openAddBudget}
                            >
                                <Plus className="w-5 h-5 stroke-[3]" />
                            </Button>
                        </div>
                    </SheetHeader>

                    {!budgets || budgets.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                                <Info className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">No Budgets Set</h3>
                                <p className="text-sm text-muted-foreground max-w-[200px]">Set spending limits for different categories to stay on track.</p>
                            </div>
                            <Button onClick={openAddBudget} className="mt-4 rounded-full px-8">
                                Create Budget
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 pb-8">
                            <div className="grid grid-cols-1 gap-3">
                                {budgets.map(budget => (
                                    <BudgetCard
                                        key={budget.id}
                                        budget={budget}
                                        onClick={() => openEditBudget(budget)}
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
