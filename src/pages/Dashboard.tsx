import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format } from 'date-fns';
import { formatRelativeDate } from '@/utils/date';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { RecurringPaymentCard } from '@/components/recurring/RecurringPaymentCard';
import { GoalCard } from '@/components/goals/GoalCard';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';

export default function Dashboard() {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const { openEditExpense, openAddRecurringPayment, openEditRecurringPayment } = useUIStore();

    const expensesThisMonth = useLiveQuery(async () => {
        const all = await db.expenses.toArray();
        return all.filter(e => e.date.startsWith(currentMonth));
    }, [currentMonth]);

    const recentExpenses = useLiveQuery(
        () => db.expenses.orderBy('date').reverse().limit(3).toArray()
    );

    const recurringPayments = useLiveQuery(
        () => db.recurringPayments.orderBy('nextDueDate').toArray()
    );

    const budgets = useLiveQuery(
        () => db.budgets.toArray()
    );

    const activeGoals = useLiveQuery(async () => {
        const all = await db.goals.orderBy('createdAt').reverse().toArray();
        return all.filter(g => g.currentAmount < g.targetAmount).slice(0, 2);
    });

    const totalSpent = expensesThisMonth?.reduce((sum, e) => sum + e.amount, 0) || 0;
    // Sum limit of recurring-monthly budgets for the "this month" overview
    const totalBudgetLimit = budgets
        ?.filter(b => b.timelineType === 'recurring' && b.recurringInterval === 'monthly')
        .reduce((sum, b) => sum + b.limitAmount, 0) || 0;

    return (
        <div className="p-4 h-full flex flex-col pt-4 pb-20 overflow-y-auto w-full text-foreground bg-background">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold tracking-tight">খরচা পাতি</h1>
            </div>

            {/* At A Glance */}
            <Card className="mb-4 bg-primary text-primary-foreground border-none shadow-lg">
                <CardContent className="p-5">
                    <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-wider mb-1">Spent this month</p>
                    <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-xl font-bold opacity-90">৳</span>
                        <h2 className="text-3xl font-bold tracking-tight">{totalSpent.toFixed(0)}</h2>
                    </div>
                    {totalBudgetLimit > 0 && (
                        <div className="flex items-center justify-between text-[11px] font-medium opacity-80 border-t border-primary-foreground/10 pt-2">
                            <span>Budget Limit</span>
                            <span>৳{totalBudgetLimit.toFixed(0)}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Expenses */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-base font-bold text-foreground/90">Recent Expenses</h2>
                    <Link to="/expenses" className="text-xs text-primary font-semibold hover:underline">View All</Link>
                </div>
                {!recentExpenses || recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed text-foreground/60">No expenses yet.</p>
                ) : (
                    <div className="space-y-1">
                        {recentExpenses.map(exp => (
                            <ExpenseCard key={exp.id} expense={exp} onClick={() => openEditExpense(exp)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Recurring Payments */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-base font-bold text-foreground/90">Recurring Payments</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs text-primary font-semibold"
                        onClick={openAddRecurringPayment}
                    >
                        + Add New
                    </Button>
                </div>
                {!recurringPayments || recurringPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed text-foreground/60">No recurring payments scheduled.</p>
                ) : (
                    <div className="space-y-1">
                        {recurringPayments.map(payment => (
                            <RecurringPaymentCard
                                key={payment.id}
                                payment={payment}
                                onClick={() => openEditRecurringPayment(payment)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Budget Overview */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-base font-bold text-foreground/90">Budgets</h2>
                    <Link to="/budgets" className="text-xs text-primary font-semibold hover:underline">Manage</Link>
                </div>
                {!budgets || budgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed text-foreground/60">No budgets set.</p>
                ) : (
                    <div className="space-y-1">
                        {budgets.map(budget => (
                            <BudgetCard key={budget.id} budget={budget} />
                        ))}
                    </div>
                )}
            </div>

            {/* Active Goals */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="text-base font-bold text-foreground/90">Active Goals</h2>
                    <Link to="/goals" className="text-xs text-primary font-semibold hover:underline">Manage</Link>
                </div>
                {!activeGoals || activeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg border-dashed text-foreground/60">No active goals.</p>
                ) : (
                    <div className="space-y-1">
                        {activeGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
