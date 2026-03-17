import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { BudgetCard } from './BudgetCard';
import { useUIStore } from '@/stores/uiStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function BudgetsListDrawer() {
    const { 
        isBudgetsListOpen, closeBudgetsList, openAddBudget, openEditBudget,
        isGoalRecordsSheetOpen, isBudgetRecordsSheetOpen, isLoanRecordsSheetOpen,
        isExpenseSheetOpen, isRecurringPaymentSheetOpen, isBudgetSheetOpen, isGoalSheetOpen, isLoanSheetOpen,
        isSubRecordSheetOpen, isGoalProgressSheetOpen, isBalanceEditDrawerOpen
    } = useUIStore();
    const { t } = useTranslation();

    const budgets = useLiveQuery(async () => {
        return await db.budgets.toArray();
    });

    const isAnyDetailOpen = isGoalRecordsSheetOpen || isBudgetRecordsSheetOpen || isLoanRecordsSheetOpen || useUIStore.getState().isCategoryRecordsOpen;
    const isAnyFormOpen = isExpenseSheetOpen || isRecurringPaymentSheetOpen || isBudgetSheetOpen || isGoalSheetOpen || isLoanSheetOpen || isBalanceEditDrawerOpen;
    const isAnySpecializedOpen = isSubRecordSheetOpen || isGoalProgressSheetOpen || useUIStore.getState().isLoanLinkerOpen;

    const stackedStyle = cn(
        "transition-all duration-500 ease-in-out origin-bottom",
        "data-[stack-level='1']:-translate-y-6 data-[stack-level='1']:scale-[0.97] data-[stack-level='1']:opacity-80 data-[stack-level='1']:brightness-[0.9] data-[stack-level='1']:pointer-events-none",
        "data-[stack-level='2']:-translate-y-12 data-[stack-level='2']:scale-[0.94] data-[stack-level='2']:opacity-60 data-[stack-level='2']:brightness-[0.8] data-[stack-level='2']:pointer-events-none",
        "data-[stack-level='3']:-translate-y-18 data-[stack-level='3']:scale-[0.91] data-[stack-level='3']:opacity-40 data-[stack-level='3']:brightness-[0.7] data-[stack-level='3']:pointer-events-none"
    );

    const getStackLevel = () => {
        let level = 0;
        if (isAnySpecializedOpen) level += 1;
        if (isAnyFormOpen) level += 1;
        if (isAnyDetailOpen) level += 1;
        return Math.min(level, 3);
    };

    return (
        <Sheet open={isBudgetsListOpen} onOpenChange={(open) => !open && closeBudgetsList()}>
                <SheetContent 
                    side="bottom" 
                    className={cn(
                        "max-h-[92dvh] h-auto rounded-t-xl p-0 glass overflow-hidden z-[60] flex flex-col",
                        stackedStyle
                    )}
                    data-stack-level={getStackLevel()}
                >
                <div className="absolute top-0 left-0 right-0 h-32 opacity-10 blur-3xl pointer-events-none bg-primary" />
                <div className="h-1.5 w-12 bg-muted/40 rounded-full mx-auto mt-3 mb-2 relative z-10 shrink-0" />
                <div className="flex-1 overflow-y-auto px-6 pb-12 relative z-10" data-scroll-container>
                    <SheetHeader className="px-0 py-4 shrink-0 border-b mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-2xl font-black tracking-tight">{t('budgets')}</SheetTitle>
                                <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                                    {budgets?.length || 0} {t('categoriesTracked')}
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
                                <h3 className="font-bold text-lg mb-1">{t('noBudgetsSet')}</h3>
                                <p className="text-sm text-muted-foreground max-w-[200px]">{t('budgetSetupDescription')}</p>
                            </div>
                            <Button onClick={openAddBudget} className="mt-4 rounded-full px-8">
                                {t('createBudget')}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 pr-1 flex flex-col gap-3 pb-8">
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
