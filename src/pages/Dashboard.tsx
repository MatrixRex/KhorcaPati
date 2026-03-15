import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { RecurringPaymentCard } from '@/components/recurring/RecurringPaymentCard';
import { GoalCard } from '@/components/goals/GoalCard';
import { LoanCard } from '@/components/loans/LoanCard';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';
import { useSettingsStore } from '@/stores/settingsStore';
import { BalanceEditDrawer } from '@/components/shared/BalanceEditDrawer';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@/lib/utils';

export default function Dashboard() {
    const { t } = useTranslation();
    const currentMonth = format(new Date(), 'yyyy-MM');
    const { 
        openEditExpense, 
        openEditRecurringPayment, 
        openRecurringPaymentsList,
        openBudgetsList,
        openGoalsList,
        openLoansList,
        openBalanceEdit
    } = useUIStore();
    const { initialBalance } = useSettingsStore();

    const expensesThisMonth = useLiveQuery(async () => {
        const all = await db.expenses.filter(e => !e.parentId).toArray();
        return all.filter(e => e.date.startsWith(currentMonth));
    }, [currentMonth]);

    const recentExpenses = useLiveQuery(async () => {
        const topLevel = await db.expenses.filter(e => !e.parentId).toArray();
        topLevel.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (b.id || 0) - (a.id || 0);
        });
        return topLevel.slice(0, 3);
    });




    const recurringPayments = useLiveQuery(async () => {
        const all = await db.recurringPayments.orderBy('nextDueDate').toArray();
        const now = new Date();
        return all.filter(payment => {
            const nextDate = parseISO(payment.nextDueDate);
            const diffInDays = differenceInCalendarDays(nextDate, now);
            // Show overdue (any) or coming soon (within 7 days)
            return diffInDays <= 7;
        });
    });

    const budgets = useLiveQuery(
        () => db.budgets.toArray()
    );

    const activeGoals = useLiveQuery(async () => {
        const all = await db.goals.orderBy('createdAt').reverse().toArray();
        return all.filter(g => g.currentAmount < g.targetAmount).slice(0, 2);
    });

    const activeLoans = useLiveQuery(async () => {
        const all = await db.loans.orderBy('createdAt').reverse().toArray();
        return all.filter(l => l.currentAmount < l.totalAmount).slice(0, 2);
    });

    const totalSpent = expensesThisMonth?.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0) || 0;
    const totalIncome = expensesThisMonth?.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0) || 0;
    
    const allExpenses = useLiveQuery(() => db.expenses.filter(e => !e.parentId).toArray());
    const totalBalance = useMemo(() => {
        if (!allExpenses) return initialBalance;
        const derived = allExpenses.reduce((sum, exp) => {
            return exp.type === 'income' ? sum + exp.amount : sum - exp.amount;
        }, 0);
        return initialBalance + derived;
    }, [allExpenses, initialBalance]);

    return (
        <PageContainer
            title={t('appTitle')}
        >
            {/* At A Glance - Premium Gradient Card */}
            <Card 
                className="mb-6 border-none shadow-xl rounded-[28px] overflow-hidden group relative cursor-pointer active:scale-[0.98] transition-all"
                onClick={openBalanceEdit}
            >
                {/* Clean Premium Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] transition-transform duration-500 group-hover:scale-105" />
                
                <CardContent className="p-6 relative z-10">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <div className="text-8xl font-black italic select-none text-white">৳</div>
                    </div>
                    
                    <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1 relative z-10">{t('currentBalance')}</p>
                    <div className="flex items-baseline gap-1 mb-4 relative z-10">
                        <span className="text-xl font-bold text-white/40 decoration-white/20 underline decoration-2 underline-offset-4">৳</span>
                        <h2 className="text-4xl font-black tracking-tight text-white">{formatAmount(totalBalance)}</h2>
                    </div>

                    <div className="flex items-center gap-4 relative z-10 mt-2 border-t border-white/10 pt-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-white/40 tracking-wider">{t('income')}</span>
                            <span className="text-sm font-black text-[#5ed16c]">৳{formatAmount(totalIncome)}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-white/40 tracking-wider">{t('expenses')}</span>
                            <span className="text-sm font-black text-[#ff5252]">৳{formatAmount(totalSpent)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Expenses */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">{t('recentExpenses')}</h2>
                    <Link to="/expenses" className="text-xs text-primary font-bold hover:underline uppercase">{t('viewAll')}</Link>
                </div>
                {!recentExpenses || recentExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">{t('noExpenses')}</p>
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
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">{t('recurring')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={openRecurringPaymentsList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!recurringPayments || recurringPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">{t('noRecurring')}</p>
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
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">{t('budgets')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={openBudgetsList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!budgets || budgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">{t('noBudgets')}</p>
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
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">{t('activeGoals')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={openGoalsList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!activeGoals || activeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">{t('noGoals')}</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {activeGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                )}
            </div>

            {/* Active Loans */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold text-foreground/90 uppercase tracking-widest">{t('loans')}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={openLoansList}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>
                {!activeLoans || activeLoans.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-6 text-center border-2 border-dashed rounded-2xl bg-muted/20 text-foreground/50">{t('noLoans')}</p>
                ) : (
                    <div className="flex flex-col gap-[var(--item-gap)]">
                        {activeLoans.map(loan => (
                            <LoanCard key={loan.id} loan={loan} />
                        ))}
                    </div>
                )}
            </div>

            <BalanceEditDrawer />
        </PageContainer>
    );
}
