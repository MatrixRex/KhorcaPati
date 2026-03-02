import { type Budget, db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatRelativeDate } from '@/utils/date';
import { calcSpent, getBudgetWindow } from '@/utils/budgetWindow';

interface BudgetCardProps {
    budget: Budget;
    onClick?: () => void;
}

function timelineLabel(budget: Budget): string {
    if (budget.timelineType === 'recurring') {
        const labels: Record<string, string> = {
            daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year',
        };
        return labels[budget.recurringInterval ?? 'monthly'] ?? 'This month';
    }
    if (budget.startDate && budget.endDate) {
        return `${formatRelativeDate(budget.startDate)} – ${formatRelativeDate(budget.endDate, true)}`;
    }
    return '';
}

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
    const expenses = useLiveQuery(
        () => db.expenses.where('category').equals(budget.category).toArray(),
        [budget.category]
    );

    const window = getBudgetWindow(budget);
    const spent = expenses && window ? calcSpent(budget, expenses) : 0;

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
            className={`cursor-pointer active:bg-muted/50 transition-colors shadow-none ${isOverBudget ? 'border-destructive/50' : ''}`}
            onClick={onClick}
        >
            <CardContent className="px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-sm leading-tight">{budget.category}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{timelineLabel(budget)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium text-right shrink-0 ml-2">
                        ৳{spent.toFixed(0)} / ৳{budget.limitAmount.toFixed(0)}
                    </span>
                </div>

                <Progress value={percentage} className="h-1.5" indicatorClassName={progressColor} />

                {isOverBudget && (
                    <p className="text-[10px] text-destructive font-semibold">
                        Over by ৳{(spent - budget.limitAmount).toFixed(2)}!
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
