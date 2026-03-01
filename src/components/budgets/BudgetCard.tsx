import { type Budget, db } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLiveQuery } from 'dexie-react-hooks';

interface BudgetCardProps {
    budget: Budget;
    onClick?: () => void;
}

export function BudgetCard({ budget, onClick }: BudgetCardProps) {
    // Calculate total spent for this category in the given month (e.g. "2026-03")
    const spent = useLiveQuery(async () => {
        const expenses = await db.expenses
            .where('category')
            .equals(budget.category)
            .toArray();

        return expenses
            .filter((exp) => exp.date.startsWith(budget.month))
            .reduce((sum, exp) => sum + exp.amount, 0);
    }, [budget.category, budget.month], 0);

    const percentage = Math.min((spent / budget.limitAmount) * 100, 100);
    const isAlertThresholdReached = (spent / budget.limitAmount) >= budget.alertThreshold;
    const isOverBudget = spent > budget.limitAmount;

    let progressColor = "bg-primary";
    if (isOverBudget) {
        progressColor = "bg-destructive";
    } else if (isAlertThresholdReached) {
        progressColor = "bg-orange-500";
    }

    return (
        <Card
            className={`mb-3 cursor-pointer hover:bg-muted/50 transition-colors ${isOverBudget ? 'border-destructive/50' : ''}`}
            onClick={onClick}
        >
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between shadow-sm">
                    <h3 className="font-semibold text-base">{budget.category}</h3>
                    <span className="text-sm text-muted-foreground font-medium">
                        ৳{spent.toFixed(2)} / ৳{budget.limitAmount.toFixed(2)}
                    </span>
                </div>

                <Progress
                    value={percentage}
                    className="h-2"
                    indicatorClassName={progressColor}
                />

                {isOverBudget && (
                    <p className="text-xs text-destructive font-semibold">
                        Over budget by ৳{(spent - budget.limitAmount).toFixed(2)}!
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
