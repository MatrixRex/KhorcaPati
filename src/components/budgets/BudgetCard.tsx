import { type Budget, db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatRelativeDate } from '@/utils/date';
import { calcSpent, getBudgetWindow } from '@/utils/budgetWindow';
import { cn } from '@/lib/utils';

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
            className={cn(
                "cursor-pointer hover:bg-muted/30 active:scale-[0.98] transition-all border-border/40 shadow-sm rounded-2xl overflow-hidden group",
                isOverBudget && "border-destructive/30 bg-destructive/5"
            )}
            onClick={onClick}
        >
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-sm tracking-tight truncate capitalize">{budget.category}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{timelineLabel(budget)}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-black uppercase text-right shrink-0 ml-2 bg-muted px-1.5 py-0.5 rounded-md">
                        ৳{spent.toFixed(0)} <span className="opacity-40">/</span> ৳{budget.limitAmount.toFixed(0)}
                    </span>
                </div>

                <Progress value={percentage} className="h-2 bg-muted/50" indicatorClassName={cn("transition-all duration-500", progressColor)} />

                <div className="flex items-center justify-between mt-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", percentage >= 100 ? "text-destructive" : "text-muted-foreground/60")}>
                        {percentage.toFixed(0)}% Utilized
                    </span>
                    {isOverBudget && (
                        <p className="text-[10px] text-destructive font-black uppercase tracking-tighter animate-pulse">
                            -৳{(spent - budget.limitAmount).toFixed(0)}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
