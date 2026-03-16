import { type Budget, db, type Expense } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatRelativeDate } from '@/utils/date';
import { getBudgetWindow } from '@/utils/budgetWindow';
import { cn, formatAmount } from '@/lib/utils';
import { differenceInDays, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useCategoryStore } from '@/stores/categoryStore';
import { useUIStore } from '@/stores/uiStore';

import { useTranslation } from 'react-i18next';

interface BudgetCardProps {
    budget: Budget;
    onClick?: () => void;
}

function timelineLabel(budget: Budget, t: any): string {
    const now = startOfDay(new Date());

    if (budget.timelineType === 'recurring') {
        const window = getBudgetWindow(budget);
        if (window) {
            const endDate = endOfDay(parseISO(window.end));
            const daysLeft = differenceInDays(endDate, now);

            if (daysLeft === 0) return t('endsToday');
            if (daysLeft === 1) return t('dayRemaining');
            return t('daysRemaining', { count: daysLeft });
        }

        const labels: Record<string, string> = {
            daily: t('today'), weekly: t('weekly'), monthly: t('monthly'), yearly: t('yearly'),
        };
        return labels[budget.recurringInterval ?? 'monthly'] ?? t('monthly');
    }
    if (budget.startDate && budget.endDate) {
        return `${formatRelativeDate(budget.startDate)} – ${formatRelativeDate(budget.endDate, true)}`;
    }
    return '';
}


function findOverspentInfo(budget: Budget, expenses: Expense[]) {
    const window = getBudgetWindow(budget);
    if (!window) return null;

    const filtered = expenses
        .filter(exp => {
            if (exp.type !== 'expense') return false;
            try {
                return isWithinInterval(parseISO(exp.date), {
                    start: parseISO(window.start),
                    end: parseISO(window.end),
                });
            } catch {
                return false;
            }
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningTotal = 0;
    for (const exp of filtered) {
        runningTotal += exp.amount;
        if (runningTotal > budget.limitAmount) {
            const overspentDate = startOfDay(parseISO(exp.date));
            const daysAgo = differenceInDays(startOfDay(new Date()), overspentDate);
            return { daysAgo, total: runningTotal };
        }
    }
    return null;
}

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
    const { t } = useTranslation();
    const { openBudgetRecords } = useUIStore();

    const expenses = useLiveQuery(
        () => db.expenses.where('category').equals(budget.category).toArray(),
        [budget.category]
    );

    const window = getBudgetWindow(budget);
    const budgetExpenses = expenses || [];

    // Calculate total spent in window
    const spent = budgetExpenses.reduce((sum, exp) => {
        if (exp.type !== 'expense') return sum;
        if (!window) return sum;
        try {
            const isMatch = isWithinInterval(parseISO(exp.date), {
                start: parseISO(window.start),
                end: parseISO(window.end),
            });
            return isMatch ? sum + exp.amount : sum;
        } catch {
            return sum;
        }
    }, 0);

    const overspentInfo = findOverspentInfo(budget, budgetExpenses);

    const percentage = (spent / budget.limitAmount) * 100;
    const isAlertThresholdReached = (spent / budget.limitAmount) >= budget.alertThreshold;
    const isOverBudget = spent > budget.limitAmount;


    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            openBudgetRecords(budget);
        }
    };

    const { categories } = useCategoryStore();
    const catInfo = categories.find(c => c.name.toLowerCase() === budget.category.toLowerCase());
    const catColor = catInfo?.color || '#3b82f6';

    return (
        <Card
            className={cn(
                "cursor-pointer active:scale-[0.98] transition-all border-border shadow-sm rounded-xl overflow-hidden group/card relative",
                isOverBudget && "border-destructive/30 bg-destructive/10"
            )}
            style={{ 
                background: `linear-gradient(to right, ${catColor}1F, transparent)`
            }}
            onClick={handleClick}
        >
            {/* Categorical Glow */}
            <div 
                className="card-glow"
                style={{ backgroundColor: catColor }}
            />
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-sm tracking-tight truncate capitalize">{budget.category}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{timelineLabel(budget, t)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-black uppercase text-right shrink-0 ml-2 bg-muted px-1.5 py-0.5 rounded-md">
                        ৳{formatAmount(spent)} <span className="opacity-60">/</span> ৳{formatAmount(budget.limitAmount)}
                    </span>
                </div>

                <Progress 
                    value={Math.min(percentage, 100)} 
                    className="premium-progress" 
                    indicatorClassName="premium-progress-indicator" 
                    style={{ "--progress-indicator": isOverBudget ? "var(--destructive)" : isAlertThresholdReached ? "oklch(0.65 0.25 60)" : "var(--primary)" } as any}
                />

                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest shrink-0", percentage >= 100 ? "text-destructive" : "text-muted-foreground")}>
                            {t('utilized', { count: Math.round(percentage) })}
                        </span>
                        {isOverBudget && overspentInfo && (
                            <span className="text-[10px] font-black text-destructive/80 whitespace-nowrap overflow-hidden text-ellipsis">
                                • {overspentInfo.daysAgo === 0 ? t('today') : t('daysAgo', { count: overspentInfo.daysAgo })}
                            </span>
                        )}
                    </div>
                    {isOverBudget && (
                        <p className="text-xs text-destructive font-black uppercase tracking-tighter shrink-0 ml-2 animate-pulse">
                            -৳{formatAmount(spent - budget.limitAmount)}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

