import { type Budget, db, type Expense } from '@/db/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatRelativeDate } from '@/utils/date';
import { getBudgetWindow } from '@/utils/budgetWindow';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useFilterStore } from '@/stores/filterStore';
import { differenceInDays, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useCategoryStore } from '@/stores/categoryStore';

interface BudgetCardProps {
    budget: Budget;
    onClick?: () => void;
}

function timelineLabel(budget: Budget): string {
    const now = startOfDay(new Date());

    if (budget.timelineType === 'recurring') {
        const window = getBudgetWindow(budget);
        if (window) {
            const endDate = endOfDay(parseISO(window.end));
            const daysLeft = differenceInDays(endDate, now);

            if (daysLeft === 0) return 'Ends today';
            if (daysLeft === 1) return '1 day remaining';
            return `${daysLeft} days remaining`;
        }

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
    const navigate = useNavigate();
    const { setCategory } = useFilterStore();

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

    const percentage = Math.min((spent / budget.limitAmount) * 100, 100);
    const isAlertThresholdReached = (spent / budget.limitAmount) >= budget.alertThreshold;
    const isOverBudget = spent > budget.limitAmount;

    let progressColor = 'bg-primary';
    if (isOverBudget) {
        progressColor = 'bg-destructive';
    } else if (isAlertThresholdReached) {
        progressColor = 'bg-orange-500';
    }

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            setCategory(budget.category);
            navigate('/expenses');
        }
    };

    const { categories } = useCategoryStore();
    const catInfo = categories.find(c => c.name.toLowerCase() === budget.category.toLowerCase());
    const catColor = catInfo?.color || '#3b82f6';

    return (
        <Card
            className={cn(
                "cursor-pointer hover:bg-muted/30 active:scale-[0.98] transition-all border-border/40 shadow-sm rounded-2xl overflow-hidden group/card relative",
                isOverBudget && "border-destructive/30 bg-destructive/5"
            )}
            style={{ 
                background: `linear-gradient(to right, ${catColor}15, transparent)`
            }}
            onClick={handleClick}
        >
            {/* Soft glow highlight based on category color */}
            <div 
                className="absolute -left-4 top-0 bottom-0 w-8 opacity-25 blur-xl pointer-events-none"
                style={{ backgroundColor: catColor }}
            />
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-sm tracking-tight truncate capitalize">{budget.category}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{timelineLabel(budget)}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-black uppercase text-right shrink-0 ml-2 bg-muted px-1.5 py-0.5 rounded-md">
                        ৳{spent.toFixed(0)} <span className="opacity-40">/</span> ৳{budget.limitAmount.toFixed(0)}
                    </span>
                </div>

                <Progress value={percentage} className="h-2 bg-muted/50" indicatorClassName={cn("transition-all duration-500", progressColor)} />

                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest shrink-0", percentage >= 100 ? "text-destructive" : "text-muted-foreground/60")}>
                            {percentage.toFixed(0)}% Utilized
                        </span>
                        {isOverBudget && overspentInfo && (
                            <span className="text-[10px] font-black text-destructive/50 whitespace-nowrap overflow-hidden text-ellipsis">
                                • {overspentInfo.daysAgo === 0 ? 'Today' : `${overspentInfo.daysAgo}d ago`}
                            </span>
                        )}
                    </div>
                    {isOverBudget && (
                        <p className="text-xs text-destructive font-black uppercase tracking-tighter shrink-0 ml-2 animate-pulse">
                            -৳{(spent - budget.limitAmount).toFixed(0)}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
