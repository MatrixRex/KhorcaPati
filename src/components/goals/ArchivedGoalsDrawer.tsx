import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { GoalCard } from './GoalCard';
import { useUIStore } from '@/stores/uiStore';
import { useGoalStore } from '@/stores/goalStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Info, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DevBadge } from '@/components/shared/DevBadge';

export function ArchivedGoalsDrawer() {
    const { 
        isArchivedGoalsListOpen, closeArchivedGoalsList, openGoalRecords,
        isGoalRecordsSheetOpen, isBudgetRecordsSheetOpen, isLoanRecordsSheetOpen,
        isExpenseSheetOpen, isRecurringPaymentSheetOpen, isBudgetSheetOpen, isGoalSheetOpen, isLoanSheetOpen,
        isSubRecordSheetOpen, isGoalProgressSheetOpen, isBalanceEditDrawerOpen
    } = useUIStore();
    const { t } = useTranslation();
    const archiveGoal = useGoalStore(state => state.archiveGoal);

    const goals = useLiveQuery(async () => {
        const allGoals = await db.goals.orderBy('createdAt').reverse().toArray();
        return allGoals.filter(g => g.isArchived);
    }) || [];

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
        <Sheet open={isArchivedGoalsListOpen} onOpenChange={(open) => !open && closeArchivedGoalsList()}>
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
                        <div>
                            <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-1.5">
                                {t('archivedGoals')}
                                <DevBadge id="d:archived-goals" />
                            </SheetTitle>
                            <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60 mt-1">
                                {goals.length} {t('totalGoals')}
                            </SheetDescription>
                        </div>
                    </SheetHeader>

                    {goals.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                                <Info className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">{t('noArchivedGoals')}</h3>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 pr-1 flex flex-col gap-3 pb-8">
                            <div className="grid grid-cols-1 gap-3">
                                {goals.map(goal => (
                                    <div key={goal.id} className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <GoalCard
                                                goal={goal}
                                                onClick={() => openGoalRecords(goal)}
                                            />
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-10 w-10 rounded-xl bg-background/50 border-border hover:bg-primary/10 hover:text-primary active:scale-95 transition-all duration-200 shrink-0 shadow-sm"
                                            onClick={() => archiveGoal(goal.id!, false)}
                                            title={t('unarchive')}
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
