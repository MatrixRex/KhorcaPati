import { type Budget, db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    format,
    startOfDay, endOfDay,
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    startOfYear, endOfYear,
    isWithinInterval, parseISO,
} from 'date-fns';

interface BudgetCardProps {
    budget: Budget;
    onClick?: () => void;
}

/** Returns the [start, end] ISO date strings for the current period based on interval. */
function getRecurringWindow(interval: Budget['recurringInterval']): { start: string; end: string } {
    const now = new Date();
    switch (interval) {
        case 'daily':
            return { start: format(startOfDay(now), 'yyyy-MM-dd'), end: format(endOfDay(now), 'yyyy-MM-dd') };
        case 'weekly':
            return { start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
        case 'yearly':
            return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
        case 'monthly':
        default:
            return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
}

function timelineLabel(budget: Budget): string {
    if (budget.timelineType === 'recurring') {
        const labels: Record<string, string> = {
            daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year',
        };
        return labels[budget.recurringInterval ?? 'monthly'] ?? 'This month';
    }
    // range
    if (budget.startDate && budget.endDate) {
        return `${format(parseISO(budget.startDate), 'MMM d')} – ${format(parseISO(budget.endDate), 'MMM d, yyyy')}`;
    }
    return '';
}

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
    const spent = useLiveQuery(async () => {
        const expenses = await db.expenses
            .where('category')
            .equals(budget.category)
            .toArray();

        let start: string;
        let end: string;

        if (budget.timelineType === 'range') {
            start = budget.startDate ?? '';
            end = budget.endDate ?? '';
        } else {
            const window = getRecurringWindow(budget.recurringInterval);
            start = window.start;
            end = window.end;
        }

        if (!start || !end) return 0;

        return expenses
            .filter((exp) => {
                try {
                    return isWithinInterval(parseISO(exp.date), {
                        start: parseISO(start),
                        end: parseISO(end),
                    });
                } catch {
                    return false;
                }
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
    }, [budget.category, budget.timelineType, budget.recurringInterval, budget.startDate, budget.endDate], 0);

    const percentage = Math.min((spent / budget.limitAmount) * 100, 100);
    const isAlertThresholdReached = (spent / budget.limitAmount) >= budget.alertThreshold;
    const isOverBudget = spent > budget.limitAmount;

    let progressColor = 'bg-primary';
    if (isOverBudget) {
        progressColor = 'bg-destructive';
    } else if (isAlertThresholdReached) {
        progressColor = 'bg-orange-500';
    }

    return (
        <Card
            className={`mb-3 cursor-pointer active:bg-muted/50 transition-colors ${isOverBudget ? 'border-destructive/50' : ''}`}
            onClick={onClick}
        >
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-base leading-tight">{budget.category}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{timelineLabel(budget)}</p>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium text-right shrink-0 ml-2">
                        ৳{spent.toFixed(0)} / ৳{budget.limitAmount.toFixed(0)}
                    </span>
                </div>

                <Progress value={percentage} className="h-2" indicatorClassName={progressColor} />

                {isOverBudget && (
                    <p className="text-xs text-destructive font-semibold">
                        Over by ৳{(spent - budget.limitAmount).toFixed(2)}!
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
