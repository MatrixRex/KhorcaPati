import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format } from 'date-fns';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { GoalCard } from '@/components/goals/GoalCard';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';

export default function Dashboard() {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const { openEditExpense } = useUIStore();

    const expensesThisMonth = useLiveQuery(async () => {
        const all = await db.expenses.toArray();
        return all.filter(e => e.date.startsWith(currentMonth));
    }, [currentMonth]);

    const recentExpenses = useLiveQuery(
        () => db.expenses.orderBy('date').reverse().limit(3).toArray()
    );

    const budgets = useLiveQuery(
        () => db.budgets.where('month').equals(currentMonth).toArray()
    );

    const activeGoals = useLiveQuery(async () => {
        const all = await db.goals.orderBy('createdAt').reverse().toArray();
        return all.filter(g => g.currentAmount < g.targetAmount).slice(0, 2);
    });

    const totalSpent = expensesThisMonth?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalBudgetLimit = budgets?.reduce((sum, b) => sum + b.limitAmount, 0) || 0;

    return (
        <div className="p-4 h-full flex flex-col pt-10 pb-20 overflow-y-auto w-full text-foreground bg-background">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold tracking-tight">KhorocaPati</h1>
            </div>

            {/* At A Glance */}
            <Card className="mb-6 bg-primary text-primary-foreground border-none shadow-md">
                <CardContent className="p-6">
                    <p className="text-primary-foreground/80 text-sm font-medium mb-1">Spent this month ({format(new Date(), 'MMM yy')})</p>
                    <h2 className="text-4xl font-bold mb-2">৳{totalSpent.toFixed(0)}</h2>
                    {totalBudgetLimit > 0 && (
                        <p className="text-sm font-medium">Budget Limit: ৳{totalBudgetLimit.toFixed(0)}</p>
                    )}
                </CardContent>
            </Card>

            {/* Recent Expenses */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">Recent Expenses</h2>
                    <Link to="/expenses" className="text-sm text-primary font-medium hover:underline">View All</Link>
                </div>
                {!recentExpenses || recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed text-foreground/60">No expenses yet.</p>
                ) : (
                    <div className="space-y-2">
                        {recentExpenses.map(exp => (
                            <ExpenseCard key={exp.id} expense={exp} onClick={() => openEditExpense(exp)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Budget Overview */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">Budgets</h2>
                    <Link to="/budgets" className="text-sm text-primary font-medium hover:underline">Manage</Link>
                </div>
                {!budgets || budgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed text-foreground/60">No budgets set.</p>
                ) : (
                    <div className="space-y-2">
                        {budgets.map(budget => (
                            <BudgetCard key={budget.id} budget={budget} />
                        ))}
                    </div>
                )}
            </div>

            {/* Active Goals */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">Active Goals</h2>
                    <Link to="/goals" className="text-sm text-primary font-medium hover:underline">Manage</Link>
                </div>
                {!activeGoals || activeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed text-foreground/60">No active goals.</p>
                ) : (
                    <div className="space-y-2">
                        {activeGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
