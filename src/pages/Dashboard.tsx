import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format } from 'date-fns';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { RecurringPaymentCard } from '@/components/recurring/RecurringPaymentCard';
import { GoalCard } from '@/components/goals/GoalCard';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';

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

    const totalSpent = expensesThisMonth?.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalIncome = expensesThisMonth?.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalBalance = totalIncome - totalSpent;

    return (
        <PageContainer
            title="খরচা পাতি"
        >
            {/* At A Glance */}
            <Card className="mb-6 bg-primary text-primary-foreground border-none shadow-xl rounded-3xl overflow-hidden group">
                <CardContent className="p-6 relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <div className="text-8xl font-black italic select-none">৳</div>
                    </div>
                    <p className="text-primary-foreground/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 relative z-10">Current Balance</p>
                    <div className="flex items-baseline gap-1 mb-4 relative z-10">
                        <span className="text-xl font-bold opacity-80 decoration-primary-foreground/30 underline decoration-2 underline-offset-4">৳</span>
                        <h2 className="text-4xl font-black tracking-tight">{totalBalance.toFixed(0)}</h2>
                    </div>

                    <div className="flex items-center gap-4 relative z-10 mt-2 border-t border-primary-foreground/10 pt-3">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase opacity-60 tracking-wider">Income</span>
                            <span className="text-sm font-black text-green-300">৳{totalIncome.toFixed(0)}</span>
                        </div>
                        <div className="w-px h-6 bg-primary-foreground/10" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase opacity-60 tracking-wider">Expenses</span>
                            <span className="text-sm font-black text-red-300">৳{totalSpent.toFixed(0)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Expenses */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">Recent Expenses</h2>
                    <Link to="/expenses" className="text-[11px] text-primary font-bold hover:underline uppercase">View All</Link>
                </div>
                {!recentExpenses || recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">No expenses yet.</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {recentExpenses.map(exp => (
                            <ExpenseCard key={exp.id} expense={exp} onClick={() => openEditExpense(exp)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Recurring Payments */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">Recurring</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-[11px] text-primary font-bold uppercase"
                        onClick={openAddRecurringPayment}
                    >
                        + Add New
                    </Button>
                </div>
                {!recurringPayments || recurringPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">No recurring payments scheduled.</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
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
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">Budgets</h2>
                    <Link to="/budgets" className="text-[11px] text-primary font-bold hover:underline uppercase">Manage</Link>
                </div>
                {!budgets || budgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">No budgets set.</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {budgets.map(budget => (
                            <BudgetCard key={budget.id} budget={budget} />
                        ))}
                    </div>
                )}
            </div>

            {/* Active Goals */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">Active Goals</h2>
                    <Link to="/goals" className="text-[11px] text-primary font-bold hover:underline uppercase">Manage</Link>
                </div>
                {!activeGoals || activeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">No active goals.</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {activeGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                )}
            </div>
        </PageContainer>
    );
}
