import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db, type Budget } from '@/db/schema';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { TrendingDown, Receipt, Calendar, Edit2 } from 'lucide-react';
import { getBudgetWindow } from '@/utils/budgetWindow';
import { cn, formatAmount } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatRelativeDate } from '@/utils/date';
import { useUIStore } from '@/stores/uiStore';

interface BudgetRecordsListProps {
    budget: Budget;
}

export function BudgetRecordsList({ budget }: BudgetRecordsListProps) {
    const { t } = useTranslation();
    const openEditExpense = useUIStore((state) => state.openEditExpense);
    const window = getBudgetWindow(budget);
    
    const expenses = useLiveQuery(() => 
        db.expenses
            .where('category')
            .equals(budget.category)
            .reverse()
            .toArray()
    , [budget.category]) || [];

    const filteredExpenses = expenses.filter(exp => {
        if (exp.type !== 'expense') return false;
        if (!window) return true;
        try {
            return isWithinInterval(parseISO(exp.date), {
                start: parseISO(window.start),
                end: parseISO(window.end),
            });
        } catch {
            return false;
        }
    });

    const totalSpent = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remaining = Math.max(0, budget.limitAmount - totalSpent);

    if (filteredExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <Receipt className="w-8 h-8 text-muted-foreground/20" />
                </div>
                <h4 className="label-header !text-muted-foreground">{t('noRecords')}</h4>
                <p className="label-caption text-muted-foreground/60 mt-2">
                    {t('recordsInPeriod', { category: budget.category })}
                </p>
            </div>
        );
    }

    const percentage = (totalSpent / budget.limitAmount) * 100;
    const isOver = totalSpent > budget.limitAmount;

    return (
        <div className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-3 px-1">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex flex-col">
                        <span className="label-header">
                            {t('budgetProgress')}
                        </span>
                        <span className={cn(
                            "text-value-md",
                            isOver ? "text-destructive" : "text-primary"
                        )}>
                            {t('percentDone', { percent: Math.round(percentage) })}
                        </span>
                    </div>
                    {window?.end && (
                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg border border-border/20">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className="label-caption !text-[8px] text-muted-foreground">
                                {formatRelativeDate(window.end, true)}
                            </span>
                        </div>
                    )}
                </div>
                <Progress
                    value={Math.min(percentage, 100)}
                    className="premium-progress"
                    indicatorClassName="premium-progress-indicator"
                    style={{ "--progress-indicator": isOver ? "var(--destructive)" : "var(--primary)" } as any}
                />
                <div className="flex justify-between items-center label-caption text-muted-foreground/40 mt-1">
                    <span>৳{formatAmount(totalSpent)} {t('spent')}</span>
                    <span>৳{formatAmount(remaining)} {t('remaining')}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="stats-card-destructive">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="w-3 h-3 text-destructive" />
                        <span className="label-caption text-destructive/60">{t('spent')}</span>
                    </div>
                    <div className="text-value-lg">
                        ৳{formatAmount(totalSpent)}
                    </div>
                </div>
                <div className="stats-card-primary">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-primary" />
                        </div>
                        <span className="label-caption text-primary/60">{t('remaining')}</span>
                    </div>
                    <div className="text-value-lg">
                        ৳{formatAmount(remaining)}
                    </div>
                </div>
            </div>

            <div className="label-header !text-muted-foreground mb-4 ml-1">
                {t('recordsForCategory', { category: budget.category })}
            </div>

            <div className="space-y-3">
                {filteredExpenses.map((exp) => (
                    <div
                        key={exp.id}
                        className={cn(
                            "record-item-glass",
                            exp.isNested && "stacked-card-effect"
                        )}
                    >
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-primary/10 text-primary font-black text-xs">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black truncate capitalize leading-tight">
                                    {exp.note || exp.category}
                                </span>
                                <div className="flex items-center gap-1.5 label-caption text-muted-foreground/60 mt-0.5">
                                    <span>{format(parseISO(exp.date), 'dd MMM yy')}</span>
                                    {exp.isNested && (
                                        <>
                                            <span>•</span>
                                            <span className="text-primary/60 lowercase first-letter:uppercase">{t('nestedRecord')}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-base font-black tabular-nums text-destructive">
                                    ৳{formatAmount(exp.amount)}
                                </span>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 rounded-xl text-primary bg-primary/5 transition-all"
                                onClick={() => openEditExpense(exp)}
                            >
                                <Edit2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
